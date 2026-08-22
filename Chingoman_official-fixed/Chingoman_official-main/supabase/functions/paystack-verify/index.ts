// Called by PaymentCallbackPage.tsx when the browser returns from Paystack's
// checkout page. This is the fast path for the person who stays in their
// browser; paystack-webhook is the durable backstop for anyone who closes
// the tab before the redirect completes. Both call the same
// settlePaidTransaction helper, so whichever runs first wins and the other
// is a safe no-op.
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getCallerProfile, createAdminClient } from '../_shared/supabaseClients.ts';
import { settlePaidTransaction } from '../_shared/settlePayment.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (!PAYSTACK_SECRET_KEY) {
    return jsonResponse({ error: 'Payments are not configured on the server yet (PAYSTACK_SECRET_KEY missing).' }, 500);
  }

  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const reference = body.reference;
  if (!reference) return jsonResponse({ error: 'reference is required' }, 400);

  const { profile, error: authError } = await getCallerProfile(req);
  if (!profile) return jsonResponse({ error: authError ?? 'Not authenticated' }, 401);

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from('listing_payments')
    .select('profile_id, status, vehicle_id, tier')
    .eq('provider_reference', reference)
    .maybeSingle();

  if (!payment) return jsonResponse({ error: 'Unknown payment reference' }, 404);
  if (payment.profile_id !== profile.id) return jsonResponse({ error: 'Forbidden' }, 403);

  if (payment.status === 'paid') {
    return jsonResponse({ ok: true, status: 'paid', vehicle_id: payment.vehicle_id, tier: payment.tier });
  }

  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const verifyData = await verifyResponse.json();

  if (!verifyResponse.ok || !verifyData?.status) {
    return jsonResponse({ error: verifyData?.message ?? 'Could not verify payment with Paystack.' }, 502);
  }

  const result = await settlePaidTransaction(admin, verifyData.data);
  if (!result.ok) return jsonResponse({ error: result.error ?? 'Could not settle payment' }, 500);

  const paid = verifyData.data?.status === 'success';
  return jsonResponse({
    ok: true,
    status: paid ? 'paid' : 'failed',
    vehicle_id: payment.vehicle_id,
    tier: payment.tier,
  });
});
