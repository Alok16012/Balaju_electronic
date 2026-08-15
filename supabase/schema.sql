-- Balaji Electronic — QR catalogue CRM schema.
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

create index if not exists cart_events_phone_idx       on cart_events (phone, occurred_at desc);
create index if not exists favourite_events_phone_idx  on favourite_events (phone, occurred_at desc);
create index if not exists orders_phone_idx            on orders (phone, placed_at desc);
create index if not exists leads_captured_idx          on leads (captured_at desc);

-- New Supabase projects can opt out of automatic Data API exposure. Grant the
-- table privileges explicitly; RLS policies below still decide which rows each
-- role can access.
grant select, insert, update on table leads to anon, authenticated;
grant select, insert on table cart_events to anon, authenticated;
grant select, insert on table favourite_events to anon, authenticated;
grant select, insert on table orders to anon, authenticated;
grant select, insert, update on table customer_state to anon, authenticated;

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

create policy "anon captures leads"       on leads            for insert to anon with check (true);
create policy "anon updates own lead"     on leads            for update to anon using (true) with check (true);
create policy "anon logs cart"            on cart_events      for insert to anon with check (true);
create policy "anon logs favourites"      on favourite_events for insert to anon with check (true);
create policy "anon places orders"        on orders           for insert to anon with check (true);
create policy "anon writes basket"        on customer_state   for insert to anon with check (true);
create policy "anon updates basket"       on customer_state   for update to anon using (true) with check (true);
create policy "anon reads own basket"     on customer_state   for select to anon using (true);

create policy "admin reads leads"         on leads            for select to authenticated using (true);
create policy "admin reads cart"          on cart_events      for select to authenticated using (true);
create policy "admin reads favourites"    on favourite_events for select to authenticated using (true);
create policy "admin reads orders"        on orders           for select to authenticated using (true);
create policy "admin reads baskets"       on customer_state   for select to authenticated using (true);
