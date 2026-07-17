-- Increment 1: profiles, roles, auth trigger, RLS
-- Place this file at supabase/migrations/20260717000000_init_auth_and_roles.sql
-- in your local repo, then run: supabase db push

-- 1. Roles enum
create type public.app_role as enum ('homeowner', 'trade', 'admin');

-- 2. user_roles (roles NEVER live on profiles)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- 3. is_admin() SECURITY DEFINER
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  )
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- user_roles policies: read own row only, only admins can write
create policy "user_roles_select_own"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "user_roles_admin_select_all"
  on public.user_roles for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "user_roles_admin_insert"
  on public.user_roles for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "user_roles_admin_update"
  on public.user_roles for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "user_roles_admin_delete"
  on public.user_roles for delete to authenticated
  using (public.is_admin(auth.uid()));

-- 4. profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "profiles_insert_admin"
  on public.profiles for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using (public.is_admin(auth.uid()));

-- 5. Signup trigger: creates profile + role row from raw_user_meta_data.
--    "admin" is never honored — defaults to homeowner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  chosen_role public.app_role;
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  );

  meta_role := new.raw_user_meta_data->>'role';
  if meta_role = 'trade' then
    chosen_role := 'trade';
  else
    chosen_role := 'homeowner';
  end if;

  insert into public.user_roles (user_id, role) values (new.id, chosen_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
