-- Increment: admin user management + audit log

-- 1. admin_audit_log
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete set null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('grant_role', 'revoke_role')),
  role public.app_role not null,
  created_at timestamptz not null default now()
);

grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;

alter table public.admin_audit_log enable row level security;

create policy "audit_admin_select"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "audit_admin_insert"
  on public.admin_audit_log for insert to authenticated
  with check (
    public.is_admin(auth.uid())
    and actor_user_id = auth.uid()
  );

-- 2. admin_list_users(): returns id/email/full_name/roles for every user.
--    SECURITY DEFINER so it can read auth.users; gated to admins.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  roles public.app_role[],
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select
      u.id,
      u.email::text,
      p.full_name,
      coalesce(
        (select array_agg(ur.role order by ur.role)
         from public.user_roles ur
         where ur.user_id = u.id),
        '{}'::public.app_role[]
      ) as roles,
      u.created_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- 3. Guard: prevent an admin from removing THEIR OWN admin role via the app.
--    (Service role / direct DB access bypasses this by design.)
create or replace function public.prevent_self_admin_revoke()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and old.user_id = auth.uid() then
    raise exception 'Admins cannot remove their own admin role from the app';
  end if;
  return old;
end;
$$;

drop trigger if exists user_roles_prevent_self_admin_revoke on public.user_roles;
create trigger user_roles_prevent_self_admin_revoke
  before delete on public.user_roles
  for each row execute function public.prevent_self_admin_revoke();
