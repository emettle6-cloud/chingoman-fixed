import { useState } from 'react';
import { X, CheckCircle2, PackageSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ItemRequestType } from '@/types';
import { ITEM_REQUEST_TYPE_LABELS } from '@/lib/constants';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultItemType?: ItemRequestType;
}

// "Can't find what you're looking for?" request form. Open to anyone —
// signed in or not — since a visitor deciding whether to trust the site
// shouldn't have to create an account just to ask if a car exists. See
// RequestItemBanner.tsx for the CTA that opens this.
export function RequestItemModal({ open, onClose, defaultItemType = 'vehicle' }: Props) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    itemType: defaultItemType as ItemRequestType,
    fullName: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    whatsapp: profile?.whatsapp ?? '',
    description: '',
    budget: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    onClose();
    // Reset after the close animation-less unmount so a reopened modal
    // doesn't show someone else's stale success screen on a shared device.
    setTimeout(() => {
      setSubmitted(false);
      setError(null);
      setForm((f) => ({ ...f, description: '', budget: '' }));
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim()) { setError('Please tell us your name.'); return; }
    if (!form.email.trim()) { setError('Please provide an email so we can get back to you.'); return; }
    if (!form.description.trim()) { setError('Please describe what you\'re looking for.'); return; }

    setSubmitting(true);

    const { data: created, error: insertError } = await supabase
      .from('item_requests')
      .insert({
        requester_id: profile?.id ?? null,
        item_type: form.itemType,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        description: form.description.trim(),
        budget_usd: form.budget ? Number(form.budget) : null,
      })
      .select()
      .single();

    if (insertError) {
      setSubmitting(false);
      setError(`Could not submit your request: ${insertError.message}`);
      return;
    }

    // Best-effort — the request is already saved either way, so a failed
    // email just means the team finds it from the admin dashboard queue
    // instead of their inbox.
    if (created) {
      try {
        await supabase.functions.invoke('notify-item-request', {
          body: { request_id: created.id },
        });
      } catch {
        // ignore — not fatal
      }
    }

    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-green-600" /> Can't Find What You Want?
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1.5">Request Sent</h3>
            <p className="text-sm text-slate-500 mb-6">
              Thanks — we've received your request and will reach out at {form.email || 'the contact you provided'} if
              we find a match.
            </p>
            <button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5">
              Tell us what you're after and we'll try to source it for you, even if it's not currently listed.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">What are you looking for?</label>
                <select
                  value={form.itemType}
                  onChange={(e) => update('itemType', e.target.value as ItemRequestType)}
                  className="form-input bg-white"
                >
                  {Object.entries(ITEM_REQUEST_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                  <input required type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+233 20 000 0000" className="form-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp (optional)</label>
                  <input type="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+233 20 000 0000" className="form-input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Describe what you need</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="e.g. Looking for a 2021-2023 BYD Han EV, any color, budget around $28,000. Or: rear brake calipers for a 2020 Tesla Model 3."
                  className="form-input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Budget (USD, optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(e) => update('budget', e.target.value)}
                    className="form-input pl-7"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </>
        )}
      </div>

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
