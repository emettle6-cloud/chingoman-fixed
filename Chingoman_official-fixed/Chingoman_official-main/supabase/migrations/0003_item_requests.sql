-- Chin-go-man: "Can't find what you want?" item request form.
-- Lets any visitor (signed in or not) submit a request describing a vehicle
-- or spare part they couldn't find on the site, so the team can go source it.
-- Safe to re-run: uses `if not exists` / `drop policy if exists` throughout,
-- matching the convention in 0001/0002. Run this AFTER 0001 and 0002.

create table if not exists item_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete set null,
  item_type text not null default 'vehicle' check (item_type in ('vehicle', 'spare_part', 'other')),
  full_name text not null,
  email text not null,
  phone text not null default '',
  whatsapp text,
  description text not null,
  budget_usd numeric,
  status text not null default 'new' check (status in ('new', 'contacted', 'fulfilled', 'closed')),
  admin_notes text,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table item_requests enable row level security;

-- Anyone — signed in or anonymous — can submit a request, but only ever as a
-- fresh, unreviewed request tied to themselves (or nobody, if they're not
-- signed in). This mirrors the "Anyone can request a shipping quote" policy
-- already in 0001, just with the extra guard against impersonating another
-- profile or self-approving a request on insert.
drop policy if exists "Anyone can submit an item request" on item_requests;
create policy "Anyone can submit an item request"
  on item_requests for insert
  with check (
    status = 'new'
    and admin_notes is null
    and notified_at is null
    and (
      requester_id is null
      or requester_id in (select id from profiles where auth_user_id = auth.uid())
    )
  );

drop policy if exists "Requesters can read their own item requests" on item_requests;
create policy "Requesters can read their own item requests"
  on item_requests for select
  using (requester_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists "Admins can read all item requests" on item_requests;
create policy "Admins can read all item requests"
  on item_requests for select
  using (public.is_admin_user());

-- The notify-item-request edge function (service role) needs to stamp
-- notified_at/notify_error after sending the email; admins need to update
-- status/admin_notes from the dashboard. Both share one policy.
drop policy if exists "Admins and the notify function can update item requests" on item_requests;
create policy "Admins and the notify function can update item requests"
  on item_requests for update
  using (public.is_admin_user() or auth.role() = 'service_role')
  with check (public.is_admin_user() or auth.role() = 'service_role');

drop policy if exists "Admins can delete item requests" on item_requests;
create policy "Admins can delete item requests"
  on item_requests for delete
  using (public.is_admin_user());

create index if not exists idx_item_requests_status on item_requests(status);
create index if not exists idx_item_requests_requester on item_requests(requester_id);
