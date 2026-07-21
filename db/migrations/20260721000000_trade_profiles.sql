-- Increment 3: trade profiles + search
-- Copy this file into supabase/migrations/ and run `supabase db push`,
-- OR paste the contents into the Supabase SQL Editor and Run.

-- =========================================================
-- 1. trade_profiles
-- =========================================================
create table public.trade_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  bio text,
  phone text,
  portfolio_image_urls text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.trade_profiles to authenticated;
grant select on public.trade_profiles to anon;
grant all on public.trade_profiles to service_role;

alter table public.trade_profiles enable row level security;

-- Owner: full access to own row
create policy "trade_profiles_owner_select"
  on public.trade_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "trade_profiles_owner_insert"
  on public.trade_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "trade_profiles_owner_update"
  on public.trade_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public: only published rows
create policy "trade_profiles_public_select_published"
  on public.trade_profiles for select
  to anon, authenticated
  using (published = true);

-- Admin: full access
create policy "trade_profiles_admin_all"
  on public.trade_profiles for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trade_profiles_set_updated_at
  before update on public.trade_profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- 2. trade_profile_categories
-- =========================================================
create table public.trade_profile_categories (
  trade_user_id uuid not null references public.trade_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (trade_user_id, category_id)
);

create index trade_profile_categories_category_idx
  on public.trade_profile_categories (category_id);

grant select, insert, delete on public.trade_profile_categories to authenticated;
grant select on public.trade_profile_categories to anon;
grant all on public.trade_profile_categories to service_role;

alter table public.trade_profile_categories enable row level security;

create policy "tpc_owner_select"
  on public.trade_profile_categories for select to authenticated
  using (auth.uid() = trade_user_id);

create policy "tpc_owner_insert"
  on public.trade_profile_categories for insert to authenticated
  with check (auth.uid() = trade_user_id);

create policy "tpc_owner_delete"
  on public.trade_profile_categories for delete to authenticated
  using (auth.uid() = trade_user_id);

create policy "tpc_public_select_published"
  on public.trade_profile_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.trade_profiles tp
      where tp.user_id = trade_profile_categories.trade_user_id
        and tp.published = true
    )
  );

create policy "tpc_admin_all"
  on public.trade_profile_categories for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 3. trade_profile_areas
-- =========================================================
create table public.trade_profile_areas (
  trade_user_id uuid not null references public.trade_profiles(user_id) on delete cascade,
  outward_code text not null references public.postcode_districts(outward_code) on delete cascade,
  primary key (trade_user_id, outward_code)
);

create index trade_profile_areas_outward_idx
  on public.trade_profile_areas (outward_code);

grant select, insert, delete on public.trade_profile_areas to authenticated;
grant select on public.trade_profile_areas to anon;
grant all on public.trade_profile_areas to service_role;

alter table public.trade_profile_areas enable row level security;

create policy "tpa_owner_select"
  on public.trade_profile_areas for select to authenticated
  using (auth.uid() = trade_user_id);

create policy "tpa_owner_insert"
  on public.trade_profile_areas for insert to authenticated
  with check (auth.uid() = trade_user_id);

create policy "tpa_owner_delete"
  on public.trade_profile_areas for delete to authenticated
  using (auth.uid() = trade_user_id);

create policy "tpa_public_select_published"
  on public.trade_profile_areas for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.trade_profiles tp
      where tp.user_id = trade_profile_areas.trade_user_id
        and tp.published = true
    )
  );

create policy "tpa_admin_all"
  on public.trade_profile_areas for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 4. Storage bucket policies for 'portfolio'
-- (Create the bucket in the Supabase dashboard as PUBLIC first,
--  named exactly 'portfolio'. Then this block adds the RLS policies.)
-- =========================================================
-- Public read
drop policy if exists "portfolio_public_read" on storage.objects;
create policy "portfolio_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'portfolio');

-- Owner upload: file must live under a folder named after their user id
drop policy if exists "portfolio_owner_insert" on storage.objects;
create policy "portfolio_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "portfolio_owner_update" on storage.objects;
create policy "portfolio_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "portfolio_owner_delete" on storage.objects;
create policy "portfolio_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
