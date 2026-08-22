import { useRef, useState } from 'react';
import { ShieldCheck, Upload, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ID_TYPES } from '@/lib/constants';
import type { Role } from '@/pages/SellPage';

interface Props {
  role: Exclude<Role, 'select'>;
  onBack: () => void;
  onSubmitted: () => void | Promise<void>;
  wasRejected?: boolean;
}

export function SellerVerificationForm({ role, onBack, onSubmitted, wasRejected }: Props) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    whatsapp: profile?.whatsapp ?? '',
    country: profile?.country || 'Ghana',
    city: profile?.city ?? '',
    idType: ID_TYPES[0] as string,
    idNumber: '',
    businessName: '',
    businessRegNo: '',
    yearsExperience: '',
    sourcingDetails: '',
    referenceUrl: '',
    consent: false,
  });
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!profile) {
      setError("Your account isn't fully loaded yet. Please sign out and sign back in, then try again.");
      return;
    }
    if (!form.phone) {
      setError('Please provide a phone number so we can reach you if we have questions.');
      return;
    }
    if (!form.idNumber.trim()) {
      setError('Please provide your ID number.');
      return;
    }
    if (!idDocument) {
      setError('Please upload a photo or scan of your ID (or business registration document).');
      return;
    }
    if (!form.consent) {
      setError('Please confirm the information you provided is accurate before submitting.');
      return;
    }

    setSubmitting(true);

    const ext = idDocument.name.split('.').pop();
    const docPath = `${profile.id}/${Date.now()}-id.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(docPath, idDocument);

    if (uploadError) {
      setSubmitting(false);
      setError(`Could not upload your document: ${uploadError.message}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('verification-documents').getPublicUrl(docPath);

    const { data: application, error: insertError } = await supabase
      .from('seller_verification_requests')
      .insert({
        profile_id: profile.id,
        requested_role: role,
        full_name: form.fullName || profile.full_name,
        email: profile.email,
        phone: form.phone,
        whatsapp: form.whatsapp || null,
        country: form.country,
        city: form.city,
        id_type: form.idType,
        id_number: form.idNumber,
        id_document_url: publicUrl,
        business_name: role === 'marketer' ? (form.businessName || null) : null,
        business_registration_no: role === 'marketer' ? (form.businessRegNo || null) : null,
        years_experience: role === 'marketer' ? (form.yearsExperience || null) : null,
        sourcing_details: role === 'marketer' ? (form.sourcingDetails || null) : null,
        reference_url: form.referenceUrl || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      setSubmitting(false);
      setError(`Could not submit your application: ${insertError.message}`);
      return;
    }

    // Best-effort — the application is already saved either way, so a failed
    // email just means chichi@chin-go-man.com finds out from the admin
    // dashboard queue instead of their inbox.
    if (application) {
      try {
        await supabase.functions.invoke('notify-verification-request', {
          body: { request_id: application.id },
        });
      } catch {
        // ignore — not fatal
      }
    }

    setSubmitting(false);
    setSubmitted(true);
    await onSubmitted();
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Application Submitted</h2>
        <p className="text-slate-500">
          Thanks — our team has received your verification details and will review them shortly.
          We'll email you once you're approved to list on Chin-go-man. This usually takes 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">Verification required before you can list</p>
          <p className="text-xs text-emerald-800 mt-1">
            To keep Chin-go-man free of scam listings, every {role === 'marketer' ? 'marketer' : 'direct seller'} is
            verified by our team before their first listing goes live. Fill in the details below — we'll review them
            and email you once you're approved.
          </p>
        </div>
      </div>

      {wasRejected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Your previous application wasn't approved. You're welcome to update your details below and re-apply.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-bold text-slate-900 text-lg">Your Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Legal Name">
            <input required type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="form-input" />
          </Field>
          <Field label="Email">
            <input disabled type="email" value={profile?.email ?? ''} className="form-input bg-slate-50 text-slate-500" />
          </Field>
          <Field label="Phone Number">
            <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+233 20 000 0000" className="form-input" />
          </Field>
          <Field label="WhatsApp Number">
            <input type="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+233 20 000 0000" className="form-input" />
          </Field>
          <Field label="Country">
            <input required type="text" value={form.country} onChange={(e) => update('country', e.target.value)} className="form-input" />
          </Field>
          <Field label="City">
            <input required type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Accra" className="form-input" />
          </Field>
          <Field label="ID Type">
            <select value={form.idType} onChange={(e) => update('idType', e.target.value)} className="form-input bg-white">
              {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ID Number">
            <input required type="text" value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} className="form-input" />
          </Field>
        </div>

        {role === 'marketer' && (
          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Marketer / Business Details</h3>
            <p className="text-xs text-slate-400 mb-3">Optional, but a business name and track record speed up review.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business / Trading Name">
                <input type="text" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} className="form-input" />
              </Field>
              <Field label="Business Registration No.">
                <input type="text" value={form.businessRegNo} onChange={(e) => update('businessRegNo', e.target.value)} className="form-input" />
              </Field>
              <Field label="Years Sourcing Vehicles from China">
                <input type="text" value={form.yearsExperience} onChange={(e) => update('yearsExperience', e.target.value)} placeholder="e.g. 3 years" className="form-input" />
              </Field>
              <Field label="Website / Facebook / Instagram">
                <input type="url" value={form.referenceUrl} onChange={(e) => update('referenceUrl', e.target.value)} placeholder="https://facebook.com/yourpage" className="form-input" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="How do you source vehicles from China?">
                <textarea rows={3} value={form.sourcingDetails} onChange={(e) => update('sourcingDetails', e.target.value)} placeholder="e.g. I work with inspection agents at Guangzhou port and coordinate with buyers directly..." className="form-input resize-none" />
              </Field>
            </div>
          </div>
        )}

        {role === 'direct' && (
          <Field label="Link to a page/profile that confirms who you are (optional)">
            <input type="url" value={form.referenceUrl} onChange={(e) => update('referenceUrl', e.target.value)} placeholder="https://facebook.com/yourprofile" className="form-input" />
          </Field>
        )}

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {role === 'marketer' ? 'ID or Business Registration Document (Required)' : 'ID Document (Required)'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            A clear photo or scan of the ID you selected above. Kept private — only you and our verification team can view it.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 text-sm text-green-600 font-semibold hover:underline">
            Choose File
          </button>
          {idDocument && <p className="text-xs text-slate-600 mt-2">Selected: {idDocument.name}</p>}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => update('consent', e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-600">
            I confirm the information and documents provided are accurate. I understand providing false information
            may result in a permanent ban from Chin-go-man.
          </span>
        </label>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit for Verification'}
        </button>
      </form>

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          outline: none;
          transition: all 0.2s;
          font-size: 0.875rem;
          background: white;
        }
        .form-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px #bbf7d0;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
