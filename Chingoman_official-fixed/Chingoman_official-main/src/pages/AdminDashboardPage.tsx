import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@/types';

export function AdminDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.is_admin) loadPending();
  }, [profile]);

  async function loadPending() {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPending((data as Vehicle[]) ?? []);
    setLoading(false);
  }

  async function approve(id: string) {
    setActioningId(id);
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'active', is_verified: true })
      .eq('id', id);
    setActioningId(null);
    if (!error) setPending((prev) => prev.filter((v) => v.id !== id));
  }

  async function reject(id: string) {
    setActioningId(id);
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'rejected' })
      .eq('id', id);
    setActioningId(null);
    if (!error) setPending((prev) => prev.filter((v) => v.id !== id));
  }

  if (authLoading) return null;

  if (!profile?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">Admins only</h1>
        <p className="text-slate-500 mt-2">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Listing Approvals</h1>
      <p className="text-slate-500 mb-8">Review inspection reports and approve or reject pending listings.</p>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : pending.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
          Nothing pending review right now.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((v) => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{v.year} {v.make} {v.model}</p>
                <p className="text-sm text-slate-500">${v.price_usd?.toLocaleString()} · {v.port_china}</p>
                {v.inspection_report_url ? (
                  
                    href={v.inspection_report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline mt-1"
                  >
                    <FileText className="w-4 h-4" /> View inspection report
                  </a>
                ) : (
                  <p className="text-sm text-red-500 mt-1">No inspection report attached</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => reject(v.id)}
                  disabled={actioningId === v.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => approve(v.id)}
                  disabled={actioningId === v.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
