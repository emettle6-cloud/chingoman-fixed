import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, FileText, ShieldCheck, Star, Trash2, PackageX, RotateCcw, Car, Wrench, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vehicle, SparePart } from '@/types';
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from '@/lib/constants';
import { QuickImportPanel } from '@/components/QuickImportPanel';

type Tab = 'vehicles' | 'parts' | 'import';

export function AdminDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('vehicles');

  const [pending, setPending] = useState<Vehicle[]>([]);
  const [active, setActive] = useState<Vehicle[]>([]);
  const [unavailable, setUnavailable] = useState<Vehicle[]>([]);

  const [pendingParts, setPendingParts] = useState<SparePart[]>([]);
  const [activeParts, setActiveParts] = useState<SparePart[]>([]);
  const [unavailableParts, setUnavailableParts] = useState<SparePart[]>([]);

  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: pendingData }, { data: activeData }, { data: unavailableData },
      { data: pendingPartsData }, { data: activePartsData }, { data: unavailablePartsData },
    ] = await Promise.all([
      supabase.from('vehicles').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('vehicles').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').in('status', ['sold', 'out_of_stock']).order('updated_at', { ascending: false }),
      supabase.from('spare_parts').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('spare_parts').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('spare_parts').select('*').in('status', ['sold', 'out_of_stock']).order('updated_at', { ascending: false }),
    ]);
    setPending((pendingData as Vehicle[]) ?? []);
    setActive((activeData as Vehicle[]) ?? []);
    setUnavailable((unavailableData as Vehicle[]) ?? []);
    setPendingParts((pendingPartsData as SparePart[]) ?? []);
    setActiveParts((activePartsData as SparePart[]) ?? []);
    setUnavailableParts((unavailablePartsData as SparePart[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.is_admin) loadAll();
  }, [profile, loadAll]);

  // ---- Vehicles ----
  async function approve(id: string) {
    setActioningId(id);
    const { error } = await supabase.from('vehicles').update({ status: 'active', is_verified: true }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not approve listing: ${error.message}`); return; }
    loadAll();
  }

  async function reject(id: string) {
    setActioningId(id);
    const { error } = await supabase.from('vehicles').update({ status: 'rejected' }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not reject listing: ${error.message}`); return; }
    setPending((prev) => prev.filter((v) => v.id !== id));
  }

  async function setStatus(id: string, status: 'active' | 'sold' | 'out_of_stock') {
    setActioningId(id);
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not update status: ${error.message}`); return; }
    loadAll();
  }

  async function toggleFeatured(id: string, current: boolean) {
    setActioningId(id);
    const { error } = await supabase.from('vehicles').update({ is_featured: !current }).eq('id', id);
    setActioningId(null);
    if (!error) setActive((prev) => prev.map((v) => (v.id === id ? { ...v, is_featured: !current } : v)));
  }

  async function deleteListing(id: string, label: string) {
    const confirmed = window.confirm(`Delete "${label}"? This can't be undone.`);
    if (!confirmed) return;
    setActioningId(id);
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    setActioningId(null);
    if (!error) loadAll();
    else alert(`Could not delete listing: ${error.message}`);
  }

  // ---- Spare parts ----
  async function approvePart(id: string) {
    setActioningId(id);
    const { error } = await supabase.from('spare_parts').update({ status: 'active' }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not approve part: ${error.message}`); return; }
    loadAll();
  }

  async function rejectPart(id: string) {
    setActioningId(id);
    const { error } = await supabase.from('spare_parts').update({ status: 'rejected' }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not reject part: ${error.message}`); return; }
    setPendingParts((prev) => prev.filter((p) => p.id !== id));
  }

  async function setPartStatus(id: string, status: 'active' | 'sold' | 'out_of_stock') {
    setActioningId(id);
    const { error } = await supabase.from('spare_parts').update({ status }).eq('id', id);
    setActioningId(null);
    if (error) { alert(`Could not update status: ${error.message}`); return; }
    loadAll();
  }

  async function togglePartFeatured(id: string, current: boolean) {
    setActioningId(id);
    const { error } = await supabase.from('spare_parts').update({ is_featured: !current }).eq('id', id);
    setActioningId(null);
    if (!error) setActiveParts((prev) => prev.map((p) => (p.id === id ? { ...p, is_featured: !current } : p)));
  }

  async function deletePart(id: string, label: string) {
    const confirmed = window.confirm(`Delete "${label}"? This can't be undone.`);
    if (!confirmed) return;
    setActioningId(id);
    const { error } = await supabase.from('spare_parts').delete().eq('id', id);
    setActioningId(null);
    if (!error) loadAll();
    else alert(`Could not delete part: ${error.message}`);
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
      <p className="text-slate-500 mb-6">
        Review inspection reports, approve or reject pending listings, and manage featured vehicles and parts.
      </p>

      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <button
          onClick={() => setTab('vehicles')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'vehicles' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4" /> Vehicles {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setTab('parts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'parts' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" /> Spare Parts {pendingParts.length > 0 && `(${pendingParts.length})`}
        </button>
        <button
          onClick={() => setTab('import')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'import' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wand2 className="w-4 h-4" /> Quick Import
        </button>
      </div>

      {tab === 'import' ? (
        <QuickImportPanel />
      ) : loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : tab === 'vehicles' ? (
        <>
          {/* Pending review */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Pending Review</h2>
          {pending.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 mb-10">
              Nothing pending review right now.
            </div>
          ) : (
            <div className="space-y-4 mb-10">
              {pending.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{v.year} {v.make} {v.model}</p>
                    <p className="text-sm text-slate-500">${v.price_usd?.toLocaleString()} · {v.port_china}</p>
                    {v.inspection_report_url ? (
                      <a href={v.inspection_report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline mt-1">
                        <FileText className="w-4 h-4" /> View inspection report
                      </a>
                    ) : (
                      <p className="text-sm text-red-500 mt-1">No inspection report attached</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => reject(v.id)} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => approve(v.id)} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active listings */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Active Listings</h2>
          {active.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No active listings yet.
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{v.year} {v.make} {v.model}</p>
                    <p className="text-sm text-slate-500">${v.price_usd?.toLocaleString()} · {v.port_china}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setStatus(v.id, 'out_of_stock')} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-200 hover:bg-amber-50 disabled:opacity-50">
                      <PackageX className="w-4 h-4" /> Out of Stock
                    </button>
                    <button onClick={() => setStatus(v.id, 'sold')} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">
                      Mark Sold
                    </button>
                    <button
                      onClick={() => toggleFeatured(v.id, v.is_featured)}
                      disabled={actioningId === v.id}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border disabled:opacity-50 transition-colors ${
                        v.is_featured ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${v.is_featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {v.is_featured ? 'Featured' : 'Feature this listing'}
                    </button>
                    <button onClick={() => deleteListing(v.id, `${v.year} ${v.make} ${v.model}`)} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sold / Out of stock */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3 mt-10">Sold / Out of Stock</h2>
          {unavailable.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              Nothing marked sold or out of stock right now.
            </div>
          ) : (
            <div className="space-y-3">
              {unavailable.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{v.year} {v.make} {v.model}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${VEHICLE_STATUS_COLORS[v.status]}`}>
                        {VEHICLE_STATUS_LABELS[v.status]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">${v.price_usd?.toLocaleString()} · {v.port_china}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setStatus(v.id, 'active')} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-green-700 border border-green-200 hover:bg-green-50 disabled:opacity-50">
                      <RotateCcw className="w-4 h-4" /> Mark Available
                    </button>
                    <button onClick={() => deleteListing(v.id, `${v.year} ${v.make} ${v.model}`)} disabled={actioningId === v.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Pending parts */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Pending Review</h2>
          {pendingParts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 mb-10">
              Nothing pending review right now.
            </div>
          ) : (
            <div className="space-y-4 mb-10">
              {pendingParts.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-500">${p.price_usd?.toLocaleString()} · {p.category} · {p.port_china}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => rejectPart(p.id)} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => approvePart(p.id)} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active parts */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Active Listings</h2>
          {activeParts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No active spare parts yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activeParts.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-500">${p.price_usd?.toLocaleString()} · {p.category} · {p.port_china}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setPartStatus(p.id, 'out_of_stock')} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-200 hover:bg-amber-50 disabled:opacity-50">
                      <PackageX className="w-4 h-4" /> Out of Stock
                    </button>
                    <button onClick={() => setPartStatus(p.id, 'sold')} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">
                      Mark Sold
                    </button>
                    <button
                      onClick={() => togglePartFeatured(p.id, p.is_featured)}
                      disabled={actioningId === p.id}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border disabled:opacity-50 transition-colors ${
                        p.is_featured ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${p.is_featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {p.is_featured ? 'Featured' : 'Feature this listing'}
                    </button>
                    <button onClick={() => deletePart(p.id, p.name)} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sold / Out of stock parts */}
          <h2 className="text-lg font-semibold text-slate-900 mb-3 mt-10">Sold / Out of Stock</h2>
          {unavailableParts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              Nothing marked sold or out of stock right now.
            </div>
          ) : (
            <div className="space-y-3">
              {unavailableParts.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${VEHICLE_STATUS_COLORS[p.status]}`}>
                        {VEHICLE_STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">${p.price_usd?.toLocaleString()} · {p.category} · {p.port_china}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setPartStatus(p.id, 'active')} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-green-700 border border-green-200 hover:bg-green-50 disabled:opacity-50">
                      <RotateCcw className="w-4 h-4" /> Mark Available
                    </button>
                    <button onClick={() => deletePart(p.id, p.name)} disabled={actioningId === p.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
