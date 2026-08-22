// Sends the "a marketer/direct seller wants to be verified" email to the
// company inbox once someone submits the seller-verification form. Called by
// the client right after it inserts a row into seller_verification_requests
// (see SellerVerificationForm.tsx). Deliberately re-reads the request from
// the database by id with the service-role key rather than trusting the
// email content the client sends — the client only ever gets to say *which*
// request to notify about, never what the email says.
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getCallerProfile, createAdminClient } from '../_shared/supabaseClients.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const NOTIFY_TO_EMAIL = Deno.env.get('VERIFICATION_NOTIFY_EMAIL') ?? 'chichi@chin-go-man.com';
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

  const { profile, error: authError } = await getCallerProfile(req);
  if (!profile) return jsonResponse({ error: authError ?? 'Not authenticated' }, 401);

  const admin = createAdminClient();

  const { data: application, error: fetchError } = await admin
    .from('seller_verification_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError || !application) return jsonResponse({ error: 'Verification request not found' }, 404);

  // Only the applicant themselves may trigger their own notification email —
  // stops someone from spamming the company inbox with arbitrary request ids.
  if (application.profile_id !== profile.id) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (!RESEND_API_KEY) {
    await admin
      .from('seller_verification_requests')
      .update({ notify_error: 'RESEND_API_KEY is not configured' })
      .eq('id', requestId);
    // Not a hard failure for the caller — the application is safely saved
    // and visible in the admin dashboard either way.
    return jsonResponse({ ok: true, emailed: false, reason: 'Email not configured' });
  }

  // A signed URL so whoever opens the email can view the ID document without
  // the verification-documents bucket ever being public.
  let documentLink = '';
  try {
    const path = new URL(application.id_document_url).pathname.split('/verification-documents/')[1];
    if (path) {
      const { data: signed } = await admin.storage
        .from('verification-documents')
        .createSignedUrl(decodeURIComponent(path), 60 * 60 * 24 * 7);
      documentLink = signed?.signedUrl ?? application.id_document_url;
    } else {
      documentLink = application.id_document_url;
    }
  } catch {
    documentLink = application.id_document_url;
  }

  const html = `
    <h2>New seller verification application</h2>
    <p><strong>Role requested:</strong> ${escapeHtml(application.requested_role)}</p>
    <p><strong>Name:</strong> ${escapeHtml(application.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(application.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(application.phone)}${application.whatsapp ? ` (WhatsApp: ${escapeHtml(application.whatsapp)})` : ''}</p>
    <p><strong>Location:</strong> ${escapeHtml(application.city)}, ${escapeHtml(application.country)}</p>
    <p><strong>ID type / number:</strong> ${escapeHtml(application.id_type)} — ${escapeHtml(application.id_number)}</p>
    ${application.business_name ? `<p><strong>Business name:</strong> ${escapeHtml(application.business_name)}</p>` : ''}
    ${application.business_registration_no ? `<p><strong>Business registration no.:</strong> ${escapeHtml(application.business_registration_no)}</p>` : ''}
    ${application.years_experience ? `<p><strong>Experience:</strong> ${escapeHtml(application.years_experience)}</p>` : ''}
    ${application.sourcing_details ? `<p><strong>How they source vehicles:</strong> ${escapeHtml(application.sourcing_details)}</p>` : ''}
    ${application.reference_url ? `<p><strong>Reference:</strong> <a href="${escapeHtml(application.reference_url)}">${escapeHtml(application.reference_url)}</a></p>` : ''}
    <p><strong>ID / business document:</strong> <a href="${documentLink}">View document</a> (link expires in 7 days)</p>
    <p>Review and approve or reject this application in the <a href="${ADMIN_DASHBOARD_URL}">admin dashboard</a>.</p>
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
        reply_to: application.email,
        subject: `New ${application.requested_role} verification application: ${application.full_name}`,
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
    .from('seller_verification_requests')
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
