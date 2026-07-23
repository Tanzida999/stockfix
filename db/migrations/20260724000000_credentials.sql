-- Increment 4: Trade credentials + verification
-- Move this file into supabase/migrations/ and run `supabase db push`,
-- or paste into the Supabase SQL editor and run.
--
-- Prerequisite: create a PRIVATE storage bucket named exactly 'credentials'
-- in the Supabase dashboard before running this migration. The storage
-- policies below target that bucket.

-- =========================================================
-- 1. Enums
-- =========================================================
create type public.credential_type as enum (
  'gas_safe',
  'niceic',
  'public_liability_insurance',
  'company_registration'
);

create type public.credential_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- =========================================================
-- 2. is_verified flag on trade_profiles
-- =========================================================
alter table public.trade_profiles
  add column if not exists is_verified boolean not null default false;

-- =========================================================
-- 3. trade_credentials
-- =========================================================
create table public.trade_credentials (
  id uuid primary key default gen_random_uuid(),
  trade_user_id uuid not null references public.trade_profiles(user_id) on delete cascade,
  credential_type public.credential_type not null,
  register_number text,
  document_url text,
  status public.credential_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trade_credentials_trade_user_idx
  on public.trade_credentials (trade_user_id);
create index trade_credentials_status_idx
  on public.trade_credentials (status);

grant select, insert on public.trade_credentials to authenticated;
grant all on public.trade_credentials to service_role;
-- NOTE: no anon grant — credentials are private.

alter table public.trade_credentials enable row level security;

-- Owner can read/insert their own credentials
create policy "trade_credentials_owner_select"
  on public.trade_credentials for select to authenticated
  using (auth.uid() = trade_user_id);

create policy "trade_credentials_owner_insert"
  on public.trade_credentials for insert to authenticated
  with check (auth.uid() = trade_user_id);

-- Owners CANNOT update or delete once submitted — only admins can.
-- Admin: full access
create policy "trade_credentials_admin_all"
  on public.trade_credentials for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger trade_credentials_set_updated_at
  before update on public.trade_credentials
  for each row execute function public.set_updated_at();

-- =========================================================
-- 4. Approval side-effect: set trade_profiles.is_verified
--    when a REQUIRED credential is approved.
--
--    The required credential type is looked up from the categories
--    the trade offers (categories.required_register). If any approved
--    credential matches one of their required registers, is_verified = true.
--    If none match anymore (e.g. admin rejects), is_verified = false.
-- =========================================================
create or replace function public.recompute_trade_verification(_trade_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  matches boolean;
begin
  select exists (
    select 1
    from public.trade_credentials tc
    join public.trade_profile_categories tpc
      on tpc.trade_user_id = tc.trade_user_id
    join public.categories c
      on c.id = tpc.category_id
    where tc.trade_user_id = _trade_user_id
      and tc.status = 'approved'
      and c.required_register is not null
      and c.required_register = tc.credential_type::text
  ) into matches;

  update public.trade_profiles
    set is_verified = coalesce(matches, false)
    where user_id = _trade_user_id;
end;
$$;

create or replace function public.trade_credentials_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_trade_verification(old.trade_user_id);
    return old;
  else
    perform public.recompute_trade_verification(new.trade_user_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trade_credentials_verify_trigger on public.trade_credentials;
create trigger trade_credentials_verify_trigger
  after insert or update or delete on public.trade_credentials
  for each row execute function public.trade_credentials_after_change();

-- =========================================================
-- 5. Storage policies for the private 'credentials' bucket
-- Path convention: credentials/<user_id>/<filename>
-- =========================================================
drop policy if exists "credentials_owner_select" on storage.objects;
create policy "credentials_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "credentials_owner_insert" on storage.objects;
create policy "credentials_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "credentials_owner_update" on storage.objects;
create policy "credentials_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "credentials_owner_delete" on storage.objects;
create policy "credentials_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "credentials_admin_all" on storage.objects;
create policy "credentials_admin_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'credentials' and public.is_admin(auth.uid()))
  with check (bucket_id = 'credentials' and public.is_admin(auth.uid()));
