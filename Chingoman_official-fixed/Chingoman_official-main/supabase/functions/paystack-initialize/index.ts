// Starts a Paystack transaction for a listing fee ($15 standard / $25
// premium). Called by the client right after it creates a pending,
// payment_status='unpaid' vehicle row. Returns the Paystack checkout URL to
// redirect the browser to. The Paystack SECRET key never touches the client
// — it only ever lives in this function's environment.
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getCallerProfile, createAdminClient } from '../_shared/supabaseClients.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const PAYSTACK_CURRENCY = Deno.env.get('PAYSTACK_CURRENCY') ?? 'USD';
// Amounts are in the smallest unit of PAYSTACK_CURRENCY (cents for USD,
// pesewas for GHS). Defaults assume USD; if your Paystack account settles in
// GHS, set these two env vars to the pesewas equivalent of $15 / $25 instead.
const STANDARD_AMOUNT_MINOR = Number(Deno.env.get('LISTING_FEE_STANDARD_MINOR') ?? 1500);
const PREMIUM_AMOUNT_MINOR = Number(Deno.env.get('LISTING_FEE_PREMIUM_MINOR') ?? 2500);
const PAYSTACK_CALLBACK_URL = Deno.env.get('PAYSTACK_CALLBACK_URL') ?? 'https://chin-go-man.com/payment/callback';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (!PAYSTACK_SECRET_KEY) {
    return jsonResponse({ error: 'Payments are not configured on the server yet (PAYSTACK_SECRET_KEY missing).' }, 500);
  }

  let body: { vehicle_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const vehicleId = body.vehicle_id;
  if (!vehicleId) return jsonResponse({ error: 'vehicle_id is required' }, 400);

  const { profile, error: authError } = await getCallerProfile(req);
  if (!profile) return jsonResponse({ error: authError ?? 'Not authenticated' }, 401);

  const admin = createAdminClient();

  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .select('id, seller_id, tier, status, payment_status, make, model, year')
    .eq('id', vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle) return jsonResponse({ error: 'Listing not found' }, 404);
  if (vehicle.seller_id !== profile.id) return jsonResponse({ error: 'Forbidden' }, 403);
  if (vehicle.payment_status === 'paid' || vehicle.payment_status === 'waived') {
    return jsonResponse({ error: 'This listing has already been paid for.' }, 409);
  }

  const tier = vehicle.tier === 'premium' ? 'premium' : 'standard';
  const amountMinor = tier === 'premium' ? PREMIUM_AMOUNT_MINOR : STANDARD_AMOUNT_MINOR;
  const amountUsd = tier === 'premium' ? 25 : 15;
  const reference = `listing_${vehicle.id}_${Date.now()}`;

  const { error: insertPaymentError } = await admin.from('listing_payments').insert({
    vehicle_id: vehicle.id,
    profile_id: profile.id,
    tier,
    amount_usd: amountUsd,
    currency: PAYSTACK_CURRENCY,
    provider: 'paystack',
    provider_reference: reference,
    status: 'pending',
  });

  if (insertPaymentError) {
    return jsonResponse({ error: `Could not start payment: ${insertPaymentError.message}` }, 500);
  }

  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: profile.email,
      amount: amountMinor,
      currency: PAYSTACK_CURRENCY,
      reference,
      callback_url: PAYSTACK_CALLBACK_URL,
      metadata: {
        vehicle_id: vehicle.id,
        profile_id: profile.id,
        tier,
        listing_label: `${vehicle.year ?? ''} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim(),
      },
    }),
  });

  const paystackData = await paystackResponse.json();

  if (!paystackResponse.ok || !paystackData?.status) {
    await admin.from('listing_payments').update({ status: 'failed', raw_response: paystackData }).eq('provider_reference', reference);
    return jsonResponse({ error: paystackData?.message ?? 'Could not start payment with Paystack.' }, 502);
  }

  return jsonResponse({
    ok: true,
    authorization_url: paystackData.data.authorization_url,
    reference,
    tier,
    amount_usd: amountUsd,
  });
});
