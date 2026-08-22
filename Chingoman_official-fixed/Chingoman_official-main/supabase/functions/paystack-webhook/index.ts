// Public webhook Paystack calls server-to-server on payment events. This is
// the durable source of truth for "was this listing actually paid for" —
// unlike paystack-verify (which only runs if the shopper's browser makes it
// back to our callback page), Paystack retries this endpoint until it gets a
// 200, so a closed tab or flaky connection can't leave a paid listing stuck
// looking unpaid.
//
// IMPORTANT (see the deployment README): this function must be deployed with
// `--no-verify-jwt`, because Paystack has no Supabase JWT to send — the
// request is authenticated instead by checking the x-paystack-signature
// header against an HMAC-SHA512 of the raw body, computed with your Paystack
// secret key. Never trust this endpoint's payload without that check.
import { createAdminClient } from '../_shared/supabaseClients.ts';
import { settlePaidTransaction } from '../_shared/settlePayment.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!PAYSTACK_SECRET_KEY) return new Response('Webhook not configured', { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  const valid = await verifySignature(rawBody, signature, PAYSTACK_SECRET_KEY);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: { event?: string; data?: Record<string, any> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // charge.success is the only event that should ever mark a listing paid.
  // Other events (e.g. transfer events on your other Paystack products, if
  // any) are acknowledged but ignored here.
  if (event.event === 'charge.success' && event.data) {
    const admin = createAdminClient();
    const result = await settlePaidTransaction(admin, event.data);
    if (!result.ok) {
      // Log-only: still return 200 so Paystack doesn't hammer retries for a
      // reference that will never resolve (e.g. a test-mode event against a
      // reference that doesn't exist in this environment). Check your
      // Supabase function logs if listings aren't unlocking after payment.
      console.error('paystack-webhook settle error:', result.error);
    }
  }

  return new Response('ok', { status: 200 });
});

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign'],
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    const computedHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return timingSafeEqual(computedHex, signature);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
