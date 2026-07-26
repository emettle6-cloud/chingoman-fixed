-- Chin-go-man initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh project
-- before deploying the app. It creates every table the client code queries and
-- locks them down with Row Level Security so the public anon key stays safe to ship.

-- ============ profiles ============
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  country text not null default '',
  city text not null default '',
  user_type text not null default 'buyer' check (user_type in ('buyer', 'marketer', 'admin')),
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  avatar_url text not null default '',
  bio text not null default '',
  rating numeric not null default 0,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are publicly readable"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = auth_user_id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = auth_user_id);

-- ============ vehicles ============
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete set null,
  make text not null,
  model text not null,
  year integer not null,
  vehicle_type text not null check (vehicle_type in ('ICE', 'Hybrid', 'PHEV', 'EREV', 'EV')),
  powertrain_detail text,
  steering_side text not null default 'LHD' check (steering_side in ('LHD', 'RHD')),
  price_usd numeric not null,
  mileage_km integer,
  condition text not null default 'used',
  color text,
  transmission text,
  engine_cc integer,
  fuel_type text,
  battery_capacity_kwh numeric,
  battery_soh numeric,
  range_km integer,
  charging_type text,
  port_china text not null default 'Guangzhou',
  listing_type text not null default 'direct' check (listing_type in ('marketer', 'direct')),
  shipping_available boolean not null default true,
  images text[] not null default '{}',
  inspection_report_url text,
  inspection_date date,
  inspection_company text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  description text,
  status text not null default 'pending' check (status in ('active', 'sold', 'draft', 'pending')),
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vehicles enable row level security;

create policy "Active vehicles are publicly readable"
  on vehicles for select
  using (status = 'active');

create policy "Sellers can read their own listings regardless of status"
  on vehicles for select
  using (
    seller_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Signed-in users can create listings for themselves"
  on vehicles for insert
  with check (
    seller_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Sellers can update their own listings"
  on vehicles for update
  using (
    seller_id in (select id from profiles where auth_user_id = auth.uid())
  );

-- ============ inspections ============
create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  inspector_name text not null default '',
  company text not null default '',
  inspection_date date not null default now(),
  port_china text not null default '',
  overall_grade text not null default '',
  engine_score numeric not null default 0,
  body_score numeric not null default 0,
  interior_score numeric not null default 0,
  electrical_score numeric not null default 0,
  battery_score numeric not null default 0,
  report_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table inspections enable row level security;

create policy "Inspections are publicly readable"
  on inspections for select
  using (true);

-- ============ shipping_quotes ============
create table if not exists shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete set null,
  buyer_auth_id uuid references auth.users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  port_china text not null default '',
  port_destination text not null default '',
  vehicle_price_usd numeric not null default 0,
  estimated_freight_usd numeric,
  estimated_insurance_usd numeric,
  estimated_cif_usd numeric,
  notes text,
  status text not null default 'estimate',
  created_at timestamptz not null default now()
);

alter table shipping_quotes enable row level security;

create policy "Anyone can request a shipping quote"
  on shipping_quotes for insert
  with check (true);

create policy "Users can read their own quotes"
  on shipping_quotes for select
  using (auth.uid() = buyer_auth_id);

-- ============ favorites ============
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

alter table favorites enable row level security;

create policy "Users can read their own favorites"
  on favorites for select
  using (
    user_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can add their own favorites"
  on favorites for insert
  with check (
    user_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can remove their own favorites"
  on favorites for delete
  using (
    user_id in (select id from profiles where auth_user_id = auth.uid())
  );

-- ============ messages ============
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Users can read messages they sent or received"
  on messages for select
  using (
    sender_id in (select id from profiles where auth_user_id = auth.uid())
    or receiver_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can send messages as themselves"
  on messages for insert
  with check (
    sender_id in (select id from profiles where auth_user_id = auth.uid())
  );

-- ============ indexes ============
create index if not exists idx_vehicles_status on vehicles(status);
create index if not exists idx_vehicles_seller on vehicles(seller_id);
create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_inspections_vehicle on inspections(vehicle_id);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_messages_receiver on messages(receiver_id);
