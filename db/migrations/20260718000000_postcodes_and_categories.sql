-- Increment 2: postcode districts + categories
-- Copy this file into supabase/migrations/ locally and run: supabase db push
-- Or paste its contents into the Supabase SQL Editor and run.

-- =========================================================
-- 1. postcode_districts
-- =========================================================
create table public.postcode_districts (
  outward_code text primary key,
  town text not null,
  county text,
  region text,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

create index postcode_districts_town_lower_idx
  on public.postcode_districts (lower(town));

grant select on public.postcode_districts to anon, authenticated;
grant all on public.postcode_districts to service_role;

alter table public.postcode_districts enable row level security;

create policy "postcode_districts_public_select"
  on public.postcode_districts for select
  to anon, authenticated
  using (true);

create policy "postcode_districts_admin_insert"
  on public.postcode_districts for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "postcode_districts_admin_update"
  on public.postcode_districts for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "postcode_districts_admin_delete"
  on public.postcode_districts for delete to authenticated
  using (public.is_admin(auth.uid()));

-- =========================================================
-- 2. normalise_outward()
-- =========================================================
create or replace function public.normalise_outward(input text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  cleaned text;
  outward text;
  found text;
begin
  if input is null then
    return null;
  end if;
  cleaned := upper(regexp_replace(input, '\s+', '', 'g'));
  outward := substring(cleaned from '^[A-Z]{1,2}[0-9][A-Z0-9]?');
  if outward is null then
    return null;
  end if;
  select outward_code into found
    from public.postcode_districts
    where outward_code = outward;
  return found;
end;
$$;

grant execute on function public.normalise_outward(text) to anon, authenticated;

-- =========================================================
-- 3. Seed Greater Manchester + surrounding districts
-- =========================================================
insert into public.postcode_districts (outward_code, town, county, region) values
  ('M1',  'Manchester City Centre',        'Greater Manchester', 'North West'),
  ('M2',  'Manchester City Centre',        'Greater Manchester', 'North West'),
  ('M3',  'Salford / City Centre',         'Greater Manchester', 'North West'),
  ('M4',  'Ancoats / Northern Quarter',    'Greater Manchester', 'North West'),
  ('M5',  'Salford',                       'Greater Manchester', 'North West'),
  ('M6',  'Salford',                       'Greater Manchester', 'North West'),
  ('M7',  'Broughton / Cheetham Hill',     'Greater Manchester', 'North West'),
  ('M8',  'Cheetham Hill',                 'Greater Manchester', 'North West'),
  ('M9',  'Blackley / Harpurhey',          'Greater Manchester', 'North West'),
  ('M11', 'Openshaw / Clayton',            'Greater Manchester', 'North West'),
  ('M12', 'Longsight / Ardwick',           'Greater Manchester', 'North West'),
  ('M13', 'Ardwick / University',          'Greater Manchester', 'North West'),
  ('M14', 'Rusholme / Fallowfield',        'Greater Manchester', 'North West'),
  ('M15', 'Hulme',                         'Greater Manchester', 'North West'),
  ('M16', 'Old Trafford / Whalley Range',  'Greater Manchester', 'North West'),
  ('M17', 'Trafford Park',                 'Greater Manchester', 'North West'),
  ('M18', 'Gorton',                        'Greater Manchester', 'North West'),
  ('M19', 'Levenshulme / Burnage',         'Greater Manchester', 'North West'),
  ('M20', 'Didsbury',                      'Greater Manchester', 'North West'),
  ('M21', 'Chorlton-cum-Hardy',            'Greater Manchester', 'North West'),
  ('M22', 'Wythenshawe (Northenden)',      'Greater Manchester', 'North West'),
  ('M23', 'Wythenshawe (Baguley)',         'Greater Manchester', 'North West'),
  ('M24', 'Middleton',                     'Greater Manchester', 'North West'),
  ('M25', 'Prestwich',                     'Greater Manchester', 'North West'),
  ('M26', 'Radcliffe',                     'Greater Manchester', 'North West'),
  ('M27', 'Swinton / Pendlebury',          'Greater Manchester', 'North West'),
  ('M28', 'Worsley / Walkden',             'Greater Manchester', 'North West'),
  ('M29', 'Tyldesley',                     'Greater Manchester', 'North West'),
  ('M30', 'Eccles',                        'Greater Manchester', 'North West'),
  ('M31', 'Partington',                    'Greater Manchester', 'North West'),
  ('M32', 'Stretford',                     'Greater Manchester', 'North West'),
  ('M33', 'Sale',                          'Greater Manchester', 'North West'),
  ('M34', 'Denton / Audenshaw',            'Greater Manchester', 'North West'),
  ('M35', 'Failsworth',                    'Greater Manchester', 'North West'),
  ('M38', 'Little Hulton',                 'Greater Manchester', 'North West'),
  ('M40', 'Newton Heath / Moston',         'Greater Manchester', 'North West'),
  ('M41', 'Urmston',                       'Greater Manchester', 'North West'),
  ('M43', 'Droylsden',                     'Greater Manchester', 'North West'),
  ('M44', 'Cadishead / Irlam',             'Greater Manchester', 'North West'),
  ('M45', 'Whitefield',                    'Greater Manchester', 'North West'),
  ('M46', 'Atherton',                      'Greater Manchester', 'North West'),
  ('M50', 'Salford Quays',                 'Greater Manchester', 'North West'),
  ('M90', 'Manchester Airport',            'Greater Manchester', 'North West'),

  -- Bolton
  ('BL0', 'Ramsbottom',                    'Greater Manchester', 'North West'),
  ('BL1', 'Bolton (North & West)',         'Greater Manchester', 'North West'),
  ('BL2', 'Bolton (North East)',           'Greater Manchester', 'North West'),
  ('BL3', 'Bolton (South)',                'Greater Manchester', 'North West'),
  ('BL4', 'Farnworth / Kearsley',          'Greater Manchester', 'North West'),
  ('BL5', 'Westhoughton',                  'Greater Manchester', 'North West'),
  ('BL6', 'Horwich / Blackrod',            'Greater Manchester', 'North West'),
  ('BL7', 'Bromley Cross / Egerton',       'Greater Manchester', 'North West'),
  ('BL8', 'Bury / Tottington',             'Greater Manchester', 'North West'),
  ('BL9', 'Bury',                          'Greater Manchester', 'North West'),

  -- Oldham / Rochdale
  ('OL1', 'Oldham',                        'Greater Manchester', 'North West'),
  ('OL2', 'Royton / Shaw',                 'Greater Manchester', 'North West'),
  ('OL3', 'Saddleworth',                   'Greater Manchester', 'North West'),
  ('OL4', 'Lees / Grotton',                'Greater Manchester', 'North West'),
  ('OL5', 'Mossley',                       'Greater Manchester', 'North West'),
  ('OL6', 'Ashton-under-Lyne',             'Greater Manchester', 'North West'),
  ('OL7', 'Ashton-under-Lyne (West)',      'Greater Manchester', 'North West'),
  ('OL8', 'Oldham (South)',                'Greater Manchester', 'North West'),
  ('OL9', 'Chadderton',                    'Greater Manchester', 'North West'),
  ('OL10','Heywood',                       'Greater Manchester', 'North West'),
  ('OL11','Rochdale (South)',              'Greater Manchester', 'North West'),
  ('OL12','Rochdale (North)',              'Greater Manchester', 'North West'),
  ('OL13','Bacup',                         'Lancashire',         'North West'),
  ('OL14','Todmorden',                     'West Yorkshire',     'Yorkshire and the Humber'),
  ('OL15','Littleborough',                 'Greater Manchester', 'North West'),
  ('OL16','Rochdale (East)',               'Greater Manchester', 'North West'),

  -- Stockport
  ('SK1', 'Stockport (Central)',           'Greater Manchester', 'North West'),
  ('SK2', 'Stockport (South East)',        'Greater Manchester', 'North West'),
  ('SK3', 'Edgeley / Cheadle Heath',       'Greater Manchester', 'North West'),
  ('SK4', 'Heaton',                        'Greater Manchester', 'North West'),
  ('SK5', 'Reddish / Brinnington',         'Greater Manchester', 'North West'),
  ('SK6', 'Marple / Romiley / Bredbury',   'Greater Manchester', 'North West'),
  ('SK7', 'Bramhall / Hazel Grove',        'Greater Manchester', 'North West'),
  ('SK8', 'Cheadle / Gatley',              'Greater Manchester', 'North West'),
  ('SK9', 'Wilmslow / Alderley Edge',      'Cheshire',           'North West'),
  ('SK10','Macclesfield (North)',          'Cheshire',           'North West'),
  ('SK11','Macclesfield (South)',          'Cheshire',           'North West'),
  ('SK12','Poynton / Disley',              'Cheshire',           'North West'),
  ('SK13','Glossop / Hadfield',            'Derbyshire',         'East Midlands'),
  ('SK14','Hyde / Mottram',                'Greater Manchester', 'North West'),
  ('SK15','Stalybridge',                   'Greater Manchester', 'North West'),
  ('SK16','Dukinfield',                    'Greater Manchester', 'North West'),
  ('SK17','Buxton',                        'Derbyshire',         'East Midlands'),
  ('SK22','New Mills',                     'Derbyshire',         'East Midlands'),
  ('SK23','Chapel-en-le-Frith',            'Derbyshire',         'East Midlands'),

  -- Warrington / Altrincham
  ('WA1', 'Warrington (Central)',          'Cheshire',           'North West'),
  ('WA2', 'Warrington (North)',            'Cheshire',           'North West'),
  ('WA3', 'Culcheth / Golborne',           'Cheshire',           'North West'),
  ('WA4', 'Warrington (South)',            'Cheshire',           'North West'),
  ('WA5', 'Warrington (West)',             'Cheshire',           'North West'),
  ('WA6', 'Frodsham / Helsby',             'Cheshire',           'North West'),
  ('WA7', 'Runcorn',                       'Cheshire',           'North West'),
  ('WA8', 'Widnes',                        'Cheshire',           'North West'),
  ('WA9', 'St Helens (South)',             'Merseyside',         'North West'),
  ('WA10','St Helens (Central)',           'Merseyside',         'North West'),
  ('WA11','St Helens (North)',             'Merseyside',         'North West'),
  ('WA12','Newton-le-Willows',             'Merseyside',         'North West'),
  ('WA13','Lymm',                          'Cheshire',           'North West'),
  ('WA14','Altrincham / Hale',             'Greater Manchester', 'North West'),
  ('WA15','Hale / Timperley',              'Greater Manchester', 'North West'),
  ('WA16','Knutsford',                     'Cheshire',           'North West'),

  -- Wigan
  ('WN1', 'Wigan (Central)',               'Greater Manchester', 'North West'),
  ('WN2', 'Ince / Hindley',                'Greater Manchester', 'North West'),
  ('WN3', 'Wigan (South West)',            'Greater Manchester', 'North West'),
  ('WN4', 'Ashton-in-Makerfield',          'Greater Manchester', 'North West'),
  ('WN5', 'Orrell / Pemberton',            'Greater Manchester', 'North West'),
  ('WN6', 'Standish / Shevington',         'Greater Manchester', 'North West'),
  ('WN7', 'Leigh',                         'Greater Manchester', 'North West'),
  ('WN8', 'Skelmersdale',                  'Lancashire',         'North West');

-- =========================================================
-- 4. categories
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id),
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  required_register text
);

grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;

alter table public.categories enable row level security;

create policy "categories_public_select_active"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

create policy "categories_admin_select_all"
  on public.categories for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "categories_admin_insert"
  on public.categories for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "categories_admin_update"
  on public.categories for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "categories_admin_delete"
  on public.categories for delete to authenticated
  using (public.is_admin(auth.uid()));

insert into public.categories (name, slug, sort_order, icon, required_register) values
  ('Plumber',                 'plumbers',              1, 'wrench', null),
  ('Electrician',             'electricians',          2, 'zap',    'niceic'),
  ('Gas & Heating Engineer',  'gas-heating-engineers', 3, 'flame',  'gas_safe');
