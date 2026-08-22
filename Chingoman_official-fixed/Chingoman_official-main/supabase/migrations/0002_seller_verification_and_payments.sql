-- Chin-go-man: seller verification gate + listing payments + RLS hardening
-- Run this AFTER 0001_init.sql, on top of your live schema. It is written to be
-- safe to re-run and safe to apply to a database that has already drifted from
-- 0001 (e.g. it already has a `spare_parts` or `reviews` table created by hand)
-- by using `if not exists` / `drop policy if exists` everywhere.
--
-- WHAT THIS MIGRATION FIXES
-- 1. Two RLS holes that let ANY signed-in user bypass admin approval entirely:
--      - `profiles` UPDATE policy had no WITH CHECK, so a user could run
--        `update profiles set is_admin = true` on their own row and grant
--        themselves admin access to /admin.
--      - `vehicles` UPDATE policy had no WITH CHECK, so any seller could run
--        `update vehicles set status = 'active', is_verified = true` on their
--        own pending listing and publish it without ever going through the
--        admin dashboard.
-- 2. A missing admin bypass policy: there was no RLS policy letting an admin
--    read/update/delete OTHER people's vehicles or spare parts at all, which
--    means the current Admin Dashboard's Approve/Reject/Feature/Delete actions
--    fail under RLS for anything the admin didn't list themselves (unless the
--    project is quietly using a service-role key somewhere it shouldn't be).
-- 3. Adds the actual gate the product now needs: marketers/direct sellers can
--    no longer INSERT a vehicle row at all until an admin has approved a
--    seller-verification application from them, enforced in the database
--    (not just hidden in the UI), plus a real payment gate before a listing
--    can go 'active'.

-- ============================================================
-- 0. Helper: is the current user an admin? (SECURITY DEFINER so it can be
--    used inside RLS policies on OTHER tables without recursive-RLS issues,
--    and inside triggers.)
-- ============================================================
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_admin from profiles p where p.auth_user_id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to anon, authenticated;

-- ============================================================
-- 1. profiles: close the self-escalation hole, add seller verification state
-- ============================================================
alter table profiles
  add column if not exists seller_verification_status text not null default 'none'
    check (seller_verification_status in ('none', 'pending', 'approved', 'rejected'));

alter table profiles
  add column if not exists seller_verified_at timestamptz;

-- Column-level protection: a non-admin can still update their own profile
-- (name, phone, whatsapp, bio, avatar...) but may never move the columns that
-- grant privilege or trust, no matter what the RLS USING clause allows.
create or replace function public.profiles_protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins, the service role (edge functions), and cascading updates fired
  -- from another trigger already in flight (pg_trigger_depth() > 1 — this is
  -- how sync_seller_verification_status below is allowed to flip
  -- seller_verification_status even though the human who triggered it, by
  -- submitting or being reviewed on an application, is not an admin) are all
  -- exempt from the escalation guard. A raw, top-level client UPDATE from an
  -- ordinary user is not.
  if not (public.is_admin_user() or auth.role() = 'service_role' or pg_trigger_depth() > 1) then
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
    if new.is_verified is distinct from old.is_verified then
      new.is_verified := old.is_verified;
    end if;
    if new.seller_verification_status is distinct from old.seller_verification_status then
      new.seller_verification_status := old.seller_verification_status;
    end if;
    if new.seller_verified_at is distinct from old.seller_verified_at then
      new.seller_verified_at := old.seller_verified_at;
    end if;
    if new.rating is distinct from old.rating then
      new.rating := old.rating;
    end if;
    if new.total_reviews is distinct from old.total_reviews then
      new.total_reviews := old.total_reviews;
    end if;
    if new.auth_user_id is distinct from old.auth_user_id then
      new.auth_user_id := old.auth_user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_10_profiles_protect_privileged on profiles;
create trigger trg_10_profiles_protect_privileged
  before update on profiles
  for each row execute function public.profiles_protect_privileged_columns();

-- Admins need a real policy to update OTHER people's profiles (e.g. to
-- approve a seller-verification application, which lives on the applicant's
-- profile row, not the admin's own).
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- The original INSERT policy (0001_init.sql) only checked
-- `auth.uid() = auth_user_id` with no restriction on the row's other
-- columns — meaning a brand-new user could INSERT their own profile with
-- `is_admin: true` (or `seller_verification_status: 'approved'`, etc.)
-- directly, before any profile row exists for them, since the UPDATE-time
-- trigger above only guards UPDATEs, not INSERTs. Close that off too: an
-- ordinary signed-in user may only ever insert a profile for themselves that
-- starts from a clean, unprivileged state; admins (or the service role) can
-- still insert arbitrary rows if that's ever needed operationally.
drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check (
    public.is_admin_user()
    or auth.role() = 'service_role'
    or (
      auth.uid() = auth_user_id
      and is_admin = false
      and is_verified = false
      and seller_verification_status = 'none'
      and seller_verified_at is null
      and rating = 0
      and total_reviews = 0
    )
  );

-- ============================================================
-- 2. vehicles: close the self-approval hole, add payment/tier gating
-- ============================================================
alter table vehicles
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'waived', 'refunded'));

alter table vehicles
  add column if not exists tier text not null default 'standard'
    check (tier in ('standard', 'premium'));

-- Column-level protection mirroring the profiles trigger above: a seller can
-- still edit their own listing's details and toggle it between
-- active/sold/out_of_stock (existing Dashboard behaviour), but can never set
-- status to 'active' from 'pending'/'rejected'/'draft' themselves, and can
-- never touch is_verified / is_featured / payment_status / seller_id.
create or replace function public.vehicles_protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin_user() or auth.role() = 'service_role') then
    if new.status is distinct from old.status then
      if not (
        old.status in ('active', 'sold', 'out_of_stock')
        and new.status in ('active', 'sold', 'out_of_stock')
      ) then
        new.status := old.status;
      end if;
    end if;
    if new.is_verified is distinct from old.is_verified then
      new.is_verified := old.is_verified;
    end if;
    if new.is_featured is distinct from old.is_featured then
      new.is_featured := old.is_featured;
    end if;
    if new.payment_status is distinct from old.payment_status then
      new.payment_status := old.payment_status;
    end if;
    if new.tier is distinct from old.tier then
      new.tier := old.tier;
    end if;
    if new.seller_id is distinct from old.seller_id then
      new.seller_id := old.seller_id;
    end if;
    if new.views is distinct from old.views then
      new.views := old.views;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_10_vehicles_protect_privileged on vehicles;
create trigger trg_10_vehicles_protect_privileged
  before update on vehicles
  for each row execute function public.vehicles_protect_privileged_columns();

-- Unconditional payment gate: nobody, including admins acting through the
-- dashboard, can flip a listing to 'active' unless it has been paid for (or
-- explicitly comped with payment_status = 'waived'). This is what makes the
-- "$15-25 per listing" fee a real requirement rather than a UI suggestion.
create or replace function public.vehicles_enforce_payment_before_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.payment_status not in ('paid', 'waived') then
    raise exception 'Cannot activate vehicle %: listing fee has not been paid (payment_status=%)', new.id, new.payment_status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_20_vehicles_enforce_payment on vehicles;
create trigger trg_20_vehicles_enforce_payment
  before insert or update on vehicles
  for each row execute function public.vehicles_enforce_payment_before_active();

-- Replace the old "any signed-in user can insert" policy with one that also
-- requires: (a) the seller has an admin-approved verification application,
-- and (b) the row being inserted is honestly a fresh, unpaid, unpublished
-- pending listing (a client can't sneak in status='active' or is_featured=true
-- on the insert itself). Admins keep an explicit bypass on the seller-identity
-- check specifically, since AdminEditModal/QuickImportPanel insert "house"
-- listings with seller_id = null — the pending/unpaid/unverified defaults
-- still apply to those, so they go through the same approval+payment pipeline.
drop policy if exists "Signed-in users can create listings for themselves" on vehicles;
create policy "Verified sellers can create pending listings for themselves"
  on vehicles for insert
  with check (
    status = 'pending'
    and is_verified = false
    and is_featured = false
    and payment_status = 'unpaid'
    and (
      public.is_admin_user()
      or auth.role() = 'service_role'
      or exists (
        select 1 from profiles p
        where p.id = vehicles.seller_id
          and p.auth_user_id = auth.uid()
          and p.seller_verification_status = 'approved'
      )
    )
  );

-- Admin bypass policies (previously missing entirely — this is why the
-- existing Admin Dashboard's approve/reject/feature/delete actions would
-- fail under RLS for any listing the admin didn't personally create).
drop policy if exists "Admins can read all vehicles" on vehicles;
create policy "Admins can read all vehicles"
  on vehicles for select
  using (public.is_admin_user());

drop policy if exists "Admins can update any vehicle" on vehicles;
create policy "Admins can update any vehicle"
  on vehicles for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can delete any vehicle" on vehicles;
create policy "Admins can delete any vehicle"
  on vehicles for delete
  using (public.is_admin_user());

create index if not exists idx_vehicles_payment_status on vehicles(payment_status);

-- ============================================================
-- 3. spare_parts: same self-approval + missing-admin-policy hole.
--    Table is created here defensively in case it doesn't exist yet on this
--    database; if it already exists (as it does in production, per the app's
--    AdminDashboardPage/SellPartPage code) this block is a no-op and only the
--    policies below take effect.
-- ============================================================
create table if not exists spare_parts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete set null,
  name text not null,
  category text not null,
  compatible_make text,
  compatible_model text,
  compatible_year_from integer,
  compatible_year_to integer,
  condition text not null default 'used',
  price_usd numeric not null,
  quantity integer not null default 1,
  port_china text not null default 'Guangzhou',
  images text[] not null default '{}',
  description text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  status text not null default 'pending' check (status in ('active', 'sold', 'draft', 'pending', 'out_of_stock', 'rejected')),
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spare_parts enable row level security;

drop policy if exists "Active parts are publicly readable" on spare_parts;
create policy "Active parts are publicly readable"
  on spare_parts for select
  using (status = 'active');

drop policy if exists "Sellers can read their own parts regardless of status" on spare_parts;
create policy "Sellers can read their own parts regardless of status"
  on spare_parts for select
  using (seller_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists "Signed-in users can create parts for themselves" on spare_parts;
create policy "Signed-in users can create parts for themselves"
  on spare_parts for insert
  with check (
    status = 'pending'
    and is_verified = false
    and is_featured = false
    and (
      public.is_admin_user()
      or auth.role() = 'service_role'
      or seller_id in (select id from profiles where auth_user_id = auth.uid())
    )
  );

drop policy if exists "Sellers can update their own parts" on spare_parts;
create policy "Sellers can update their own parts"
  on spare_parts for update
  using (seller_id in (select id from profiles where auth_user_id = auth.uid()));

create or replace function public.spare_parts_protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin_user() or auth.role() = 'service_role') then
    if new.status is distinct from old.status then
      if not (
        old.status in ('active', 'sold', 'out_of_stock')
        and new.status in ('active', 'sold', 'out_of_stock')
      ) then
        new.status := old.status;
      end if;
    end if;
    if new.is_verified is distinct from old.is_verified then
      new.is_verified := old.is_verified;
    end if;
    if new.is_featured is distinct from old.is_featured then
      new.is_featured := old.is_featured;
    end if;
    if new.seller_id is distinct from old.seller_id then
      new.seller_id := old.seller_id;
    end if;
    if new.views is distinct from old.views then
      new.views := old.views;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_10_spare_parts_protect_privileged on spare_parts;
create trigger trg_10_spare_parts_protect_privileged
  before update on spare_parts
  for each row execute function public.spare_parts_protect_privileged_columns();

drop policy if exists "Admins can read all parts" on spare_parts;
create policy "Admins can read all parts"
  on spare_parts for select
  using (public.is_admin_user());

drop policy if exists "Admins can update any part" on spare_parts;
create policy "Admins can update any part"
  on spare_parts for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can delete any part" on spare_parts;
create policy "Admins can delete any part"
  on spare_parts for delete
  using (public.is_admin_user());

create index if not exists idx_spare_parts_status on spare_parts(status);
create index if not exists idx_spare_parts_seller on spare_parts(seller_id);

-- ============================================================
-- 4. seller_verification_requests: the "prove you're a legit person/business"
--    application marketers and direct sellers must have approved before they
--    can list anything.
-- ============================================================
create table if not exists seller_verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  requested_role text not null check (requested_role in ('marketer', 'direct')),
  full_name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  country text not null default 'Ghana',
  city text not null default '',
  id_type text not null,
  id_number text not null,
  id_document_url text not null,
  business_name text,
  business_registration_no text,
  years_experience text,
  sourcing_details text,
  reference_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz not null default now()
);

alter table seller_verification_requests enable row level security;

drop policy if exists "Applicants can read their own verification requests" on seller_verification_requests;
create policy "Applicants can read their own verification requests"
  on seller_verification_requests for select
  using (profile_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists "Admins can read all verification requests" on seller_verification_requests;
create policy "Admins can read all verification requests"
  on seller_verification_requests for select
  using (public.is_admin_user());

-- Applicants may only ever submit a request for themselves, and only while
-- they don't already have one pending review (prevents queue-spamming and
-- keeps "seller_verification_status" in sync with a single active request).
drop policy if exists "Users can submit their own verification request" on seller_verification_requests;
create policy "Users can submit their own verification request"
  on seller_verification_requests for insert
  with check (
    status = 'pending'
    and profile_id in (
      select id from profiles
      where auth_user_id = auth.uid()
        and seller_verification_status <> 'pending'
    )
  );

drop policy if exists "Admins can update any verification request" on seller_verification_requests;
create policy "Admins can update any verification request"
  on seller_verification_requests for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Whenever an application is submitted or reviewed, keep profiles.seller_verification_status
-- in lockstep automatically, so nothing can get out of sync (and so no client
-- code has to be trusted to update both rows correctly).
create or replace function public.sync_seller_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update profiles set seller_verification_status = 'pending' where id = new.profile_id;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      update profiles set seller_verification_status = 'approved', seller_verified_at = now() where id = new.profile_id;
    elsif new.status = 'rejected' then
      update profiles set seller_verification_status = 'rejected' where id = new.profile_id;
    elsif new.status = 'pending' then
      update profiles set seller_verification_status = 'pending' where id = new.profile_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_10_sync_seller_verification_status on seller_verification_requests;
create trigger trg_10_sync_seller_verification_status
  after insert or update on seller_verification_requests
  for each row execute function public.sync_seller_verification_status();

create index if not exists idx_verification_requests_profile on seller_verification_requests(profile_id);
create index if not exists idx_verification_requests_status on seller_verification_requests(status);

-- ============================================================
-- 5. listing_payments: audit trail of every listing-fee payment attempt.
--    No INSERT/UPDATE policy is granted to regular users on purpose — rows
--    are only ever written by the Paystack edge functions using the
--    service_role key, which bypasses RLS. That's what stops a seller from
--    ever being able to fake their own "paid" row from the browser.
-- ============================================================
create table if not exists listing_payments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  tier text not null check (tier in ('standard', 'premium')),
  amount_usd numeric not null,
  currency text not null default 'USD',
  provider text not null default 'paystack',
  provider_reference text not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

alter table listing_payments enable row level security;

drop policy if exists "Users can read their own listing payments" on listing_payments;
create policy "Users can read their own listing payments"
  on listing_payments for select
  using (profile_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists "Admins can read all listing payments" on listing_payments;
create policy "Admins can read all listing payments"
  on listing_payments for select
  using (public.is_admin_user());

create index if not exists idx_listing_payments_vehicle on listing_payments(vehicle_id);
create index if not exists idx_listing_payments_reference on listing_payments(provider_reference);

-- ============================================================
-- 6. Private storage bucket for verification ID/business documents.
--    Unlike vehicle-images/inspection-reports, this bucket must NOT be
--    public — it holds ID documents.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload their own verification documents" on storage.objects;
create policy "Users can upload their own verification documents"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select id::text from profiles where auth_user_id = auth.uid())
  );

drop policy if exists "Users and admins can read verification documents" on storage.objects;
create policy "Users and admins can read verification documents"
  on storage.objects for select
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = (select id::text from profiles where auth_user_id = auth.uid())
      or public.is_admin_user()
    )
  );
