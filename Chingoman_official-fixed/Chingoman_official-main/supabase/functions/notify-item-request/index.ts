// Sends the "someone couldn't find what they wanted" email to the company
// inbox once a visitor submits the item-request form (see
// RequestItemModal.tsx). Unlike notify-verification-request, this one does
// NOT require the caller to be signed in — item requests are open to
// anonymous visitors too — so it only trusts a request_id that already
// exists in the database (uuids aren't guessable) and re-reads the row
// itself with the service-role key rather than trusting anything else the
// client sends.
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseClients.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const NOTIFY_TO_EMAIL = Deno.env.get('ITEM_REQUEST_NOTIFY_EMAIL') ?? Deno.env.get('VERIFICATION_NOTIFY_EMAIL') ?? 'chichi@chin-go-man.com';
const NOTIFY_FROM_EMAIL = Deno.env.get('VERIFICATION_NOTIFY_FROM_EMAIL') ?? 'Chin-go-man <onboarding@resend.dev>';
const ADMIN_DASHBOARD_URL = Deno.env.get('ADMIN_DASHBOARD_URL') ?? 'https://chin-go-man.com/admin';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let body: { request_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const requestId = body.request_id;
  if (!requestId) return jsonResponse({ error: 'request_id is required' }, 400);

  const admin = createAdminClient();

  const { data: itemRequest, error: fetchError } = await admin
    .from('item_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError || !itemRequest) return jsonResponse({ error: 'Item request not found' }, 404);

  if (!RESEND_API_KEY) {
    await admin
      .from('item_requests')
      .update({ notify_error: 'RESEND_API_KEY is not configured' })
      .eq('id', requestId);
    // Not a hard failure for the caller — the request is safely saved and
    // visible in the admin dashboard's Item Requests tab either way.
    return jsonResponse({ ok: true, emailed: false, reason: 'Email not configured' });
  }

  const itemTypeLabel = itemRequest.item_type === 'vehicle'
    ? 'a vehicle'
    : itemRequest.item_type === 'spare_part'
      ? 'a spare part'
      : 'something';

  const html = `
    <h2>New "can't find it" request</h2>
    <p>Someone is looking for ${escapeHtml(itemTypeLabel)} that isn't currently on the site.</p>
    <p><strong>Name:</strong> ${escapeHtml(itemRequest.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(itemRequest.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(itemRequest.phone || 'Not provided')}${itemRequest.whatsapp ? ` (WhatsApp: ${escapeHtml(itemRequest.whatsapp)})` : ''}</p>
    ${itemRequest.budget_usd ? `<p><strong>Budget:</strong> $${escapeHtml(String(itemRequest.budget_usd))}</p>` : ''}
    <p><strong>What they're looking for:</strong></p>
    <p>${escapeHtml(itemRequest.description).replace(/\n/g, '<br>')}</p>
    <p>Manage this in the <a href="${ADMIN_DASHBOARD_URL}">admin dashboard</a>'s Item Requests tab.</p>
  `;

  let notifyError: string | null = null;
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFY_FROM_EMAIL,
        to: [NOTIFY_TO_EMAIL],
        reply_to: itemRequest.email,
        subject: `Item request: someone is looking for ${itemTypeLabel}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      notifyError = `Resend API error ${resendResponse.status}: ${text}`;
    }
  } catch (err) {
    notifyError = err instanceof Error ? err.message : String(err);
  }

  await admin
    .from('item_requests')
    .update({ notified_at: notifyError ? null : new Date().toISOString(), notify_error: notifyError })
    .eq('id', requestId);

  if (notifyError) return jsonResponse({ ok: true, emailed: false, reason: notifyError });
  return jsonResponse({ ok: true, emailed: true });
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
