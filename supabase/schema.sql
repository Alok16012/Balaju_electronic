-- Balaji Electronic -- QR catalogue CRM schema.
-- Paste into the Supabase SQL editor, then set VITE_SUPABASE_URL and
-- VITE_SUPABASE_PUBLISHABLE_KEY (or the browser-safe legacy anon key while a
-- project is awaiting publishable-key Data API support) in .env.local. Without
-- those the app runs the same
-- feature set against localStorage, so this file is optional for a demo.
--
-- Phone number is the join key across all four tables: one number reconstructs
-- a customer's full journey from scan -> favourite -> cart -> order.

create table if not exists leads (
  phone       text primary key,
  id          text,
  name        text not null,
  source      text default 'direct',
  device      text,
  visits      integer default 1,
  captured_at timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create table if not exists cart_events (
  id            text primary key,
  phone         text not null references leads(phone) on delete cascade,
  customer_name text,
  product_id    integer,
  sku           text,
  product_name  text,
  category      text,
  price         integer,
  qty           integer default 1,
  action        text default 'add',
  occurred_at   timestamptz not null default now()
);

create table if not exists favourite_events (
  id            text primary key,
  phone         text not null references leads(phone) on delete cascade,
  customer_name text,
  product_id    integer,
  sku           text,
  product_name  text,
  category      text,
  price         integer,
  action        text default 'add',
  occurred_at   timestamptz not null default now()
);

create table if not exists orders (
  id            text primary key,
  order_ref     text not null,
  phone         text not null references leads(phone) on delete cascade,
  customer_name text,
  mode          text,
  method        text,
  total         integer,
  items         jsonb not null default '[]'::jsonb,
  placed_at     timestamptz not null default now()
);

-- The live basket, so a customer who scans again on another device sees the
-- same cart and favourites against their number.
create table if not exists customer_state (
  phone      text primary key references leads(phone) on delete cascade,
  cart       jsonb not null default '[]'::jsonb,
  saved      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Every page load, identified or not. This is what makes a scan visible before
-- the lead gate is filled in: without it the panel only ever sees the people
-- who chose to type their number, so a printed code that gets scanned fifty
-- times and converts twice looks identical to one nobody scanned at all.
--
-- Deliberately technical context only. A web page cannot discover who a visitor
-- is, so phone and customer_name stay null until somebody enters them at the
-- gate; they are filled in here only when this browser already captured a lead.
-- There is no foreign key on phone for that reason -- most rows have none, and
-- one that does must not wait on the lead row before it becomes durable.
create table if not exists visits (
  id            text primary key,
  visitor_id    text,
  phone         text,
  customer_name text,
  source        text,
  sku           text,
  category      text,
  mode          text,
  path          text,
  referrer      text,
  device        text,
  user_agent    text,
  language      text,
  screen        text,
  occurred_at   timestamptz not null default now()
);

create index if not exists cart_events_phone_idx       on cart_events (phone, occurred_at desc);
create index if not exists favourite_events_phone_idx  on favourite_events (phone, occurred_at desc);
create index if not exists orders_phone_idx            on orders (phone, placed_at desc);
create index if not exists leads_captured_idx          on leads (captured_at desc);
create index if not exists visits_occurred_idx         on visits (occurred_at desc);
create index if not exists visits_visitor_idx          on visits (visitor_id, occurred_at desc);

-- New Supabase projects can opt out of automatic Data API exposure. Grant the
-- table privileges explicitly; RLS policies below still decide which rows each
-- role can access.
-- anon never updates leads directly: an UPDATE has to read the row it targets,
-- which would need a SELECT policy exposing every customer's name and number.
-- Returning scanners go through the capture_lead() function at the end instead.
grant select, insert on table leads to anon, authenticated;
grant select, insert on table cart_events to anon, authenticated;
grant select, insert on table favourite_events to anon, authenticated;
grant select, insert on table orders to anon, authenticated;
grant select, insert, update on table customer_state to anon, authenticated;
grant select, insert on table visits to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The catalogue runs on the anon key, so anon may only write. Reading the CRM
-- requires a signed-in Supabase Auth user, which is what the admin panel's
-- email/password login obtains.
--
-- CAVEAT worth knowing before going live: `customer_state` needs an anon read
-- so a returning scanner gets their basket back, and the only thing guarding a
-- row is the phone number in the query. Anyone who guesses a number can read
-- that basket. If that matters, replace the direct table access with an OTP
-- step or a security-definer RPC that verifies the number first.
-- ---------------------------------------------------------------------------

alter table leads             enable row level security;
alter table cart_events       enable row level security;
alter table favourite_events  enable row level security;
alter table orders            enable row level security;
alter table customer_state    enable row level security;
alter table visits            enable row level security;

-- `create policy` has no IF NOT EXISTS, so drop first to keep this file safe to
-- re-run over a project that already has an earlier version of the schema.
drop policy if exists "anon captures leads"    on leads;
drop policy if exists "anon logs cart"         on cart_events;
drop policy if exists "anon logs favourites"   on favourite_events;
drop policy if exists "anon places orders"     on orders;
drop policy if exists "anon writes basket"     on customer_state;
drop policy if exists "anon updates basket"    on customer_state;
drop policy if exists "anon reads own basket"  on customer_state;
drop policy if exists "admin reads leads"      on leads;
drop policy if exists "admin reads cart"       on cart_events;
drop policy if exists "admin reads favourites" on favourite_events;
drop policy if exists "admin reads orders"     on orders;
drop policy if exists "admin reads baskets"    on customer_state;
drop policy if exists "anon logs visits"       on visits;
drop policy if exists "admin reads visits"     on visits;

-- Superseded by capture_lead(); it never worked, because an UPDATE needs a
-- SELECT policy to find its row and anon deliberately has none on leads.
drop policy if exists "anon updates own lead"  on leads;
revoke update on table leads from anon;

create policy "anon captures leads"       on leads            for insert to anon with check (true);
create policy "anon logs cart"            on cart_events      for insert to anon with check (true);
create policy "anon logs favourites"      on favourite_events for insert to anon with check (true);
create policy "anon places orders"        on orders           for insert to anon with check (true);
create policy "anon writes basket"        on customer_state   for insert to anon with check (true);
create policy "anon updates basket"       on customer_state   for update to anon using (true) with check (true);
create policy "anon reads own basket"     on customer_state   for select to anon using (true);
create policy "anon logs visits"          on visits           for insert to anon with check (true);

create policy "admin reads leads"         on leads            for select to authenticated using (true);
create policy "admin reads cart"          on cart_events      for select to authenticated using (true);
create policy "admin reads favourites"    on favourite_events for select to authenticated using (true);
create policy "admin reads orders"        on orders           for select to authenticated using (true);
create policy "admin reads baskets"       on customer_state   for select to authenticated using (true);
create policy "admin reads visits"        on visits           for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Lead capture
--
-- A returning scanner has to bump last_seen and visits, but phone is the
-- primary key so a plain insert hits a duplicate, and anon cannot run the
-- update itself: Postgres needs a SELECT policy to read the row an UPDATE
-- targets, and granting that would let anyone with the browser key list every
-- customer. This runs the upsert as the owner instead, so anon gets exactly one
-- capability -- record a scan -- and still cannot read the table.
-- ---------------------------------------------------------------------------

create or replace function capture_lead(
  p_id text, p_phone text, p_name text, p_source text,
  p_device text, p_visits integer, p_last_seen timestamptz
) returns void
language sql
security definer
set search_path = public
as $capture_lead$
  insert into leads (id, phone, name, source, device, visits, last_seen)
  values (
    p_id, p_phone, p_name, coalesce(p_source, 'direct'),
    p_device, coalesce(p_visits, 1), coalesce(p_last_seen, now())
  )
  on conflict (phone) do update set
    name      = excluded.name,
    source    = coalesce(excluded.source, leads.source),
    device    = excluded.device,
    last_seen = excluded.last_seen,
    -- A scan from a second device starts its own local count at 1, so take the
    -- higher of the two rather than letting it walk backwards. captured_at is
    -- never in this list, which keeps the original first-seen timestamp.
    visits    = greatest(leads.visits, excluded.visits);
$capture_lead$;

revoke all on function capture_lead(text, text, text, text, text, integer, timestamptz) from public;
grant execute on function capture_lead(text, text, text, text, text, integer, timestamptz) to anon, authenticated;
