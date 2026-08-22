import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Shared by paystack-verify (browser return trip) and paystack-webhook
// (Paystack's server-to-server callback) so a payment is settled exactly the
// same way no matter which path notices success first. Idempotent: calling
// this twice for the same reference is a no-op the second time.
export async function settlePaidTransaction(
  admin: SupabaseClient,
  paystackData: Record<string, any>,
): Promise<{ ok: boolean; alreadyProcessed?: boolean; error?: string }> {
  const reference: string | undefined = paystackData?.reference;
  if (!reference) return { ok: false, error: 'Missing reference in Paystack payload' };

  const { data: payment, error: paymentError } = await admin
    .from('listing_payments')
    .select('*')
    .eq('provider_reference', reference)
    .maybeSingle();

  if (paymentError || !payment) return { ok: false, error: 'No matching listing_payments row for this reference' };

  if (payment.status === 'paid') {
    return { ok: true, alreadyProcessed: true };
  }

  const success = paystackData?.status === 'success';

  const { error: updatePaymentError } = await admin
    .from('listing_payments')
    .update({
      status: success ? 'paid' : 'failed',
      paid_at: success ? new Date().toISOString() : null,
      raw_response: paystackData,
    })
    .eq('id', payment.id);

  if (updatePaymentError) return { ok: false, error: updatePaymentError.message };

  if (!success) return { ok: true };

  const { error: updateVehicleError } = await admin
    .from('vehicles')
    .update({
      payment_status: 'paid',
      is_featured: payment.tier === 'premium' ? true : undefined,
    })
    .eq('id', payment.vehicle_id);

  if (updateVehicleError) return { ok: false, error: updateVehicleError.message };

  return { ok: true };
}
