-- Increment 5: configurable multi-level service option tree (drill-down flow)
-- Copy into supabase/migrations/ and run `supabase db push`,
-- OR paste the contents into the Supabase SQL Editor and Run.

-- =========================================================
-- 1. service_options — self-referencing tree per category
-- =========================================================
create table if not exists public.service_options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  parent_id uuid references public.service_options(id) on delete cascade,
  label text not null,
  slug text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, parent_id, slug)
);

create index if not exists service_options_category_idx
  on public.service_options (category_id, parent_id, sort_order);

grant select on public.service_options to anon, authenticated;
grant insert, update, delete on public.service_options to authenticated;
grant all on public.service_options to service_role;

alter table public.service_options enable row level security;

create policy "service_options_public_select"
  on public.service_options for select
  to anon, authenticated
  using (is_active);

create policy "service_options_admin_all"
  on public.service_options for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 2. Seed the tree
-- =========================================================

-- ---------- Plumber ----------
with cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, null, v.label, v.slug, v.ord
from cat, (values
  ('Boilers, heating & radiators', 'boilers-heating-radiators', 1),
  ('Bathroom appliances & fixtures', 'bathroom-appliances-fixtures', 2),
  ('Kitchen appliances & fixtures', 'kitchen-appliances-fixtures', 3),
  ('Leaks, pipework & water pumps', 'leaks-pipework-water-pumps', 4),
  ('An emergency', 'an-emergency', 5),
  ('Blockages & power flushing', 'blockages-power-flushing', 6),
  ('Outside taps', 'outside-taps', 7),
  ('Other / I''m not sure', 'other', 8)
) as v(label, slug, ord)
on conflict do nothing;

-- Plumber > Boilers, heating & radiators
with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'plumbers' and so.slug = 'boilers-heating-radiators' and so.parent_id is null
), cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Boilers', 'boilers', 1),
  ('Radiators', 'radiators', 2),
  ('Gas central heating', 'gas-central-heating', 3),
  ('Unvented hot water cylinders', 'unvented-hot-water-cylinders', 4),
  ('Underfloor heating', 'underfloor-heating', 5),
  ('Thermostats & heating controls', 'thermostats-heating-controls', 6)
) as v(label, slug, ord)
on conflict do nothing;

-- Plumber > Bathroom appliances & fixtures
with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'plumbers' and so.slug = 'bathroom-appliances-fixtures' and so.parent_id is null
), cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Showers', 'showers', 1),
  ('Baths', 'baths', 2),
  ('Toilets', 'toilets', 3),
  ('Basins & taps', 'basins-taps', 4),
  ('Full bathroom installation', 'full-bathroom-installation', 5)
) as v(label, slug, ord)
on conflict do nothing;

-- Plumber > Kitchen appliances & fixtures
with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'plumbers' and so.slug = 'kitchen-appliances-fixtures' and so.parent_id is null
), cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Kitchen sinks & taps', 'kitchen-sinks-taps', 1),
  ('Dishwashers', 'dishwashers', 2),
  ('Washing machines', 'washing-machines', 3),
  ('Waste disposal units', 'waste-disposal-units', 4)
) as v(label, slug, ord)
on conflict do nothing;

-- Plumber > Leaks, pipework & water pumps
with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'plumbers' and so.slug = 'leaks-pipework-water-pumps' and so.parent_id is null
), cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Leaking pipes', 'leaking-pipes', 1),
  ('Burst pipes', 'burst-pipes', 2),
  ('Water pumps', 'water-pumps', 3),
  ('Stopcocks & valves', 'stopcocks-valves', 4)
) as v(label, slug, ord)
on conflict do nothing;

-- Plumber > Blockages & power flushing
with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'plumbers' and so.slug = 'blockages-power-flushing' and so.parent_id is null
), cat as (select id from public.categories where slug = 'plumbers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Blocked drains', 'blocked-drains', 1),
  ('Blocked toilets', 'blocked-toilets', 2),
  ('Blocked sinks', 'blocked-sinks', 3),
  ('Power flushing', 'power-flushing', 4)
) as v(label, slug, ord)
on conflict do nothing;

-- ---------- Electrician ----------
with cat as (select id from public.categories where slug = 'electricians')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, null, v.label, v.slug, v.ord
from cat, (values
  ('Lighting', 'lighting', 1),
  ('Sockets & switches', 'sockets-switches', 2),
  ('Fuse boards & consumer units', 'fuse-boards-consumer-units', 3),
  ('Rewiring', 'rewiring', 4),
  ('Electrical safety checks & certificates', 'safety-checks-certificates', 5),
  ('EV charging points', 'ev-charging-points', 6),
  ('An emergency', 'an-emergency', 7),
  ('Other / I''m not sure', 'other', 8)
) as v(label, slug, ord)
on conflict do nothing;

with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'electricians' and so.slug = 'lighting' and so.parent_id is null
), cat as (select id from public.categories where slug = 'electricians')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Indoor lighting', 'indoor-lighting', 1),
  ('Outdoor & security lighting', 'outdoor-security-lighting', 2),
  ('Downlights & spotlights', 'downlights-spotlights', 3),
  ('Smart lighting', 'smart-lighting', 4)
) as v(label, slug, ord)
on conflict do nothing;

with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'electricians' and so.slug = 'fuse-boards-consumer-units' and so.parent_id is null
), cat as (select id from public.categories where slug = 'electricians')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Consumer unit upgrade', 'consumer-unit-upgrade', 1),
  ('Fault finding', 'fault-finding', 2),
  ('Circuit breaker tripping', 'circuit-breaker-tripping', 3)
) as v(label, slug, ord)
on conflict do nothing;

-- ---------- Gas & Heating Engineer ----------
with cat as (select id from public.categories where slug = 'gas-heating-engineers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, null, v.label, v.slug, v.ord
from cat, (values
  ('Boilers', 'boilers', 1),
  ('Central heating', 'central-heating', 2),
  ('Gas appliances & cookers', 'gas-appliances-cookers', 3),
  ('Gas safety certificates', 'gas-safety-certificates', 4),
  ('An emergency', 'an-emergency', 5),
  ('Other / I''m not sure', 'other', 6)
) as v(label, slug, ord)
on conflict do nothing;

with parent as (
  select so.id from public.service_options so
  join public.categories c on c.id = so.category_id
  where c.slug = 'gas-heating-engineers' and so.slug = 'boilers' and so.parent_id is null
), cat as (select id from public.categories where slug = 'gas-heating-engineers')
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select cat.id, parent.id, v.label, v.slug, v.ord
from cat, parent, (values
  ('Combi boilers', 'combi-boilers', 1),
  ('System boilers', 'system-boilers', 2),
  ('Back boilers', 'back-boilers', 3)
) as v(label, slug, ord)
on conflict do nothing;

-- ---------- Final level: job type, applied to every leaf-ish node ----------
-- Adds Installation / Repair / Service / Replacement under each second-level option.
with second_level as (
  select so.id, so.category_id
  from public.service_options so
  where so.parent_id is not null
    and not exists (
      select 1 from public.service_options child where child.parent_id = so.id
    )
)
insert into public.service_options (category_id, parent_id, label, slug, sort_order)
select sl.category_id, sl.id, v.label, v.slug, v.ord
from second_level sl, (values
  ('Installation', 'installation', 1),
  ('Repair', 'repair', 2),
  ('Service', 'service', 3),
  ('Replacement', 'replacement', 4)
) as v(label, slug, ord)
on conflict do nothing;
