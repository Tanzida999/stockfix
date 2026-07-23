-- Increment 4: Leads (contact requests from homeowners to trades)
-- Copy this file into supabase/migrations/ and run `supabase db push`,
-- OR paste the contents into the Supabase SQL Editor and Run.

-- =========================================================
-- 1. Add contact_email to trade_profiles so the notifier
--    can email the trade without service-role auth lookups.
-- =========================================================
alter table public.trade_profiles
  add column if not exists contact_email text;

-- =========================================================
-- 2. lead_status enum
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum ('new', 'contacted', 'closed');
  end if;
end$$;

-- =========================================================
-- 3. leads table
-- =========================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  trade_user_id uuid not null references public.trade_profiles(user_id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  homeowner_name text not null,
  homeowner_phone text not null,
  homeowner_email text not null,
  message text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);

create index leads_trade_user_idx on public.leads (trade_user_id, created_at desc);
create index leads_status_idx on public.leads (trade_user_id, status);

grant select, insert, update, delete on public.leads to authenticated;
-- Public can INSERT (contact form is open to anyone, no login).
grant insert on public.leads to anon;
grant all on public.leads to service_role;

alter table public.leads enable row level security;

-- Anyone (including anon) can INSERT a lead — the contact form is open.
-- Restrict what they can set: cannot pre-set status to anything other than 'new'.
create policy "leads_public_insert"
  on public.leads for insert
  to anon, authenticated
  with check (status = 'new');

-- Owning trade can read their own leads.
create policy "leads_owner_select"
  on public.leads for select to authenticated
  using (auth.uid() = trade_user_id);

-- Owning trade can update status/notes on their own leads.
create policy "leads_owner_update"
  on public.leads for update to authenticated
  using (auth.uid() = trade_user_id)
  with check (auth.uid() = trade_user_id);

-- Admin: full access.
create policy "leads_admin_all"
  on public.leads for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
