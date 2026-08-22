# Seller Verification + Listing Payments — Deployment Guide

This covers everything added to gate vehicle listings behind admin-approved
seller verification, and to charge the $15 standard / $25 premium listing
fee through Paystack. Nothing here goes live until you complete the steps
below — the code ships "off" until the migration is applied and the edge
function secrets are set.

## What changed, in one paragraph

Marketers and direct sellers can no longer create a vehicle listing at all
(enforced in the database, not just hidden in the UI) until an admin approves
a verification application they submit from the Sell page. Once approved,
submitting a vehicle now requires paying a listing fee via Paystack before it
enters the admin's Pending Review queue, and a listing can't be flipped to
"active" — by anyone, including an admin — unless it's marked paid (or an
admin explicitly waives the fee). Premium-tier payments automatically feature
the vehicle (top of Browse, homepage carousel). A verification submission
also emails chichi@chin-go-man.com via Resend.

## 1. Apply the database migration

```bash
supabase db push
```

or paste `supabase/migrations/0002_seller_verification_and_payments.sql` into
the Supabase SQL Editor and run it. It's written to be safe to run against
your live database as-is (uses `if not exists` / `drop policy if exists`
throughout), but **take a backup first** as always before a schema change —
this migration also tightens several Row Level Security policies (see
"Security fixes" below), which is a real behavior change.

## 2. Deploy the four edge functions

```bash
supabase functions deploy notify-verification-request
supabase functions deploy paystack-initialize
supabase functions deploy paystack-verify
supabase functions deploy paystack-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag on `paystack-webhook` is required — Paystack's
servers call this endpoint directly and have no Supabase user session to send
a JWT with. It's authenticated instead by checking Paystack's own HMAC
signature header, not by Supabase's JWT check.

## 3. Set edge function secrets

```bash
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=your-anon-key \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  PAYSTACK_SECRET_KEY=sk_live_xxx \
  PAYSTACK_CURRENCY=USD \
  PAYSTACK_CALLBACK_URL=https://chin-go-man.com/payment/callback \
  RESEND_API_KEY=re_xxx \
  VERIFICATION_NOTIFY_EMAIL=chichi@chin-go-man.com \
  VERIFICATION_NOTIFY_FROM_EMAIL="Chin-go-man <onboarding@resend.dev>" \
  ADMIN_DASHBOARD_URL=https://chin-go-man.com/admin
```

Notes:
- **`SUPABASE_SERVICE_ROLE_KEY` is extremely sensitive.** It bypasses every
  RLS policy. It must only ever exist as an edge function secret — never in
  `.env`, never in anything Vite bundles, never committed.
- `PAYSTACK_CURRENCY` / amounts: the functions default to charging in USD
  cents ($15.00 / $25.00 → 1500 / 2500). If your Paystack account isn't
  enabled for USD settlement, set `PAYSTACK_CURRENCY=GHS` and override
  `LISTING_FEE_STANDARD_MINOR` / `LISTING_FEE_PREMIUM_MINOR` (in pesewas) to
  whatever your live GHS/USD rate makes those two fees equal to.
- If you don't have a Resend account yet, sign up at resend.com, verify a
  sending domain (or use their `onboarding@resend.dev` for testing), and
  create an API key. Until `RESEND_API_KEY` is set, verification requests
  still save correctly and show up in the admin dashboard's Seller
  Verification tab — they just won't also land in the inbox.

## 4. Register the Paystack webhook

In the Paystack dashboard: Settings → API Keys & Webhooks → set the webhook
URL to:

```
https://your-project.supabase.co/functions/v1/paystack-webhook
```

This is the durable path — it's what marks a listing paid even if the buyer
closes the tab before being redirected back to `/payment/callback`. The
`paystack-verify` function (called from `/payment/callback`) is the fast path
for whoever stays in their browser; both are idempotent and safe to run twice
for the same payment.

## 4b. Existing sellers with live listings

`seller_verification_status` defaults to `'none'` for every profile,
including sellers who already have active listings today. After this
migration, those sellers will hit the verification gate the next time they
try to list a *new* vehicle — their existing active listings are untouched,
this only affects future submissions. If you want your established,
already-trusted marketers to skip re-applying, bulk-approve them once right
after the migration:

```sql
update profiles
set seller_verification_status = 'approved', seller_verified_at = now()
where id in (select distinct seller_id from vehicles where seller_id is not null);
```

Run that only if you're comfortable trusting everyone with an existing
listing; otherwise leave it out and let the normal review queue handle them.

## 5. Storage bucket

The migration creates a **private** `verification-documents` bucket (unlike
`vehicle-images`/`inspection-reports`, this one is not public — it holds ID
documents). No manual step needed if the migration ran successfully; if your
Supabase project restricts `storage.buckets` inserts from SQL, create it
manually in the dashboard (Storage → New bucket → name
`verification-documents`, **Public: off**) and re-run just the storage
policy statements at the bottom of the migration file.

## Security fixes included in this migration

While implementing the verification gate, two pre-existing holes were found
and closed — worth knowing about since they change existing behavior:

1. **Profile self-escalation.** The old `profiles` UPDATE policy had no
   `WITH CHECK`, so any signed-in user could call
   `supabase.from('profiles').update({ is_admin: true })` on their own row
   and grant themselves admin access. Fixed with a trigger that blocks
   non-admins from touching `is_admin`, `is_verified`, or
   `seller_verification_status` on their own profile.
2. **Listing self-approval.** The old `vehicles` UPDATE policy had the same
   gap — any seller could set `status: 'active', is_verified: true` on their
   own pending listing and publish it without admin review. Also fixed via
   trigger; sellers can still toggle their own listing between
   active/sold/out_of_stock (existing Dashboard behavior), just not out of
   pending/rejected/draft, and never `is_featured`/`payment_status` directly.
3. **Missing admin RLS policies.** There was no policy letting an admin
   read/update/delete *other people's* vehicles or spare parts at all — the
   existing Admin Dashboard's Approve/Reject/Feature/Delete buttons should
   have been failing under RLS for anything the admin didn't personally
   list (unless something elsewhere was using a service-role key client-side,
   which would be its own serious problem). This migration adds the missing
   `is_admin_user()`-gated policies so those actions actually work.

If your production database has drifted further from `0001_init.sql` than
what's checked into this repo (it has at least a `spare_parts` and `reviews`
table that aren't in that file), re-run `supabase db diff` or pull a fresh
schema dump before your next migration, so `0001`/`0002` stay a trustworthy
record of what's actually live.

## How the flow works end-to-end

1. Marketer/direct seller clicks "List a Vehicle" → picks a role → is asked
   to sign in if not already.
2. If `profiles.seller_verification_status` isn't `'approved'`, they see the
   verification form instead of the vehicle form (or a "pending review"
   notice if they already applied). Submitting uploads an ID/business
   document to the private bucket, inserts a row into
   `seller_verification_requests`, and emails chichi@chin-go-man.com.
3. Admin reviews it in **Admin Dashboard → Seller Verification**, approves or
   rejects. Approving flips `profiles.seller_verification_status` to
   `'approved'` automatically (via a DB trigger — no separate admin action
   needed).
4. Once approved, the seller fills out the vehicle form, picks Standard
   ($15) or Premium ($25), and submits. This creates the vehicle row
   (`status: 'pending'`, `payment_status: 'unpaid'`) and immediately starts a
   Paystack checkout.
5. On successful payment (`paystack-verify` and/or `paystack-webhook`),
   `payment_status` flips to `'paid'`, and Premium listings are auto-featured.
6. The listing now appears in **Admin Dashboard → Vehicles → Pending
   Review**, tagged Paid/Premium. Approving it (or "Waive Fee & Approve" to
   comp it) sets `status: 'active'` — which the database will now refuse to
   do for any listing that isn't paid or waived, even from the admin
   dashboard.

## What's out of scope here

- Spare parts (`SellPartPage.tsx`) were **not** gated behind verification or
  payment — the request was specifically about vehicle listings. The same
  self-approval RLS hole on `spare_parts` was fixed for security, but no
  verification/payment requirement was added there. Say the word if you want
  that extended too.
- Refunds are not automated — `listing_payments.status` supports
  `'refunded'` as a value for you to set manually (or scripted later) when a
  rejected/paid listing needs a refund issued through the Paystack dashboard.
