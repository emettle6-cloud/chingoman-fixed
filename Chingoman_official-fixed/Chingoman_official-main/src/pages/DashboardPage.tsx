import { useEffect, useState } from 'react';
import { Car, Heart, MessageSquare, Ship, TrendingUp, Plus, Eye, PackageX, RotateCcw, Wrench, Phone, MessageCircle, CheckCircle2, AlertCircle, ShieldCheck, Hourglass, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Favorite, SparePart } from '@/types';
import { VehicleCard } from '@/components/VehicleCard';
import { SparePartCard } from '@/components/SparePartCard';
import { formatUSD } from '@/lib/cif';
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, LISTING_FEES } from '@/lib/constants';

function SellerVerificationBanner() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const status = profile?.seller_verification_status ?? 'none';

  if (status === 'approved') return null;

  if (status === 'pending') {
    return (
      <div className="mb-8 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-2xl px-5 py-4">
        <Hourglass className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <span>Your seller verification application is under review. We'll email you once it's approved and you can start listing vehicles.</span>
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl px-5 py-4">
      <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <span>
          {status === 'rejected'
            ? "Your seller verification wasn't approved. You can review your details and re-apply."
            : "You'll need to get verified before you can list a vehicle for sale."}
        </span>
        <button onClick={() => navigate({ name: 'sell' })} className="block mt-1.5 font-semibold hover:underline">
          {status === 'rejected' ? 'Re-apply for verification →' : 'Get verified →'}
        </button>
      </div>
    </div>
  );
}

function ContactInfoCard() {
  const { profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhone(profile?.phone ?? '');
    setWhatsapp(profile?.whatsapp ?? '');
  }, [profile?.phone, profile?.whatsapp]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSaved(false);

    if (!phone && !whatsapp) {
      setError('Add at least one contact method so buyers can reach you.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone, whatsapp })
      .eq('id', profile.id);
    setSaving(false);

    if (updateError) {
      setError(`Could not save contact info: ${updateError.message}`);
      return;
    }

    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const missingContact = profile && !profile.phone && !profile.whatsapp;

  return (
    <div className="mb-10 bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-1">Contact Info</h2>
      <p className="text-sm text-slate-500 mb-4">
        This phone number and WhatsApp number are shown to buyers on all of your active listings.
      </p>

      {missingContact && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>You haven't set a phone or WhatsApp number yet, so buyers currently see no way to call or message you directly on your listings. Add one below.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 20 000 0000"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none transition-all text-sm bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Number
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+233 20 000 0000"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none transition-all text-sm bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Contact Info'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [myListings, setMyListings] = useState<Vehicle[]>([]);
  const [myParts, setMyParts] = useState<SparePart[]>([]);
  const [favorites, setFavorites] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState({ listings: 0, favorites: 0, views: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function completePayment(vehicleId: string) {
    setPayingId(vehicleId);
    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      body: { vehicle_id: vehicleId },
    });
    setPayingId(null);
    if (error || !data?.authorization_url) {
      alert(data?.error ?? error?.message ?? 'Could not start payment. Please try again in a moment.');
      return;
    }
    window.location.href = data.authorization_url;
  }

  function loadListings() {
    if (!profile) return;
    supabase
      .from('vehicles')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const vehicles = (data as Vehicle[]) ?? [];
        setMyListings(vehicles);
        setStats((s) => ({ ...s, listings: vehicles.length, views: vehicles.reduce((sum, v) => sum + (v.views || 0), 0) }));
      });

    supabase
      .from('spare_parts')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyParts((data as SparePart[]) ?? []));
  }

  async function updateListingStatus(id: string, status: 'active' | 'sold' | 'out_of_stock') {
    setUpdatingId(id);
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) { alert(`Could not update listing: ${error.message}`); return; }
    setMyListings((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  async function updatePartStatus(id: string, status: 'active' | 'sold' | 'out_of_stock') {
    setUpdatingId(id);
    const { error } = await supabase.from('spare_parts').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) { alert(`Could not update listing: ${error.message}`); return; }
    setMyParts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  useEffect(() => {
    if (!user || !profile) return;

    loadListings();

    supabase
      .from('favorites')
      .select('vehicle_id')
      .eq('user_id', profile.id)
      .then(({ data: favs }) => {
        const favIds = (favs as Favorite[]) ?? [];
        setStats((s) => ({ ...s, favorites: favIds.length }));
        if (favIds.length > 0) {
          supabase
            .from('vehicles')
            .select('*')
            .in('id', favIds.map((f) => f.vehicle_id))
            .then(({ data }) => setFavorites((data as Vehicle[]) ?? []));
        }
      });
  }, [user, profile]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400 animate-pulse">Loading dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 text-lg">Please sign in to view your dashboard.</p>
        <button onClick={() => navigate({ name: 'home' })} className="mt-4 text-green-600 font-semibold hover:underline">
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate({ name: 'sell-part' })}
            className="border border-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> List a Part
          </button>
          <button
            onClick={() => navigate({ name: 'sell' })}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> List a Vehicle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Car} label="My Listings" value={String(stats.listings)} color="text-green-600 bg-green-50" />
        <StatCard icon={Heart} label="Saved Vehicles" value={String(stats.favorites)} color="text-red-600 bg-red-50" />
        <StatCard icon={Eye} label="Total Views" value={String(stats.views)} color="text-blue-600 bg-blue-50" />
        <StatCard icon={TrendingUp} label="Account Type" value={profile?.user_type === 'marketer' ? 'Marketer' : 'Buyer'} color="text-emerald-600 bg-emerald-50" />
      </div>

      <SellerVerificationBanner />

      <ContactInfoCard />

      {/* My listings */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">My Listings</h2>
        {myListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((v) => (
              <div key={v.id}>
                <VehicleCard vehicle={v} />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${VEHICLE_STATUS_COLORS[v.status]}`}>
                    {VEHICLE_STATUS_LABELS[v.status]}
                  </span>
                  {v.status === 'pending' && v.payment_status === 'unpaid' && (
                    <button
                      onClick={() => completePayment(v.id)}
                      disabled={payingId === v.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-2.5 py-1 rounded-full"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> {payingId === v.id ? 'Redirecting...' : `Pay $${LISTING_FEES[v.tier === 'premium' ? 'premium' : 'standard'].amountUsd} to Submit`}
                    </button>
                  )}
                  {(v.status === 'active' || v.status === 'sold' || v.status === 'out_of_stock') && (
                    <div className="flex items-center gap-1.5">
                      {v.status === 'active' ? (
                        <>
                          <button
                            onClick={() => updateListingStatus(v.id, 'out_of_stock')}
                            disabled={updatingId === v.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
                          >
                            <PackageX className="w-3.5 h-3.5" /> Out of Stock
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            onClick={() => updateListingStatus(v.id, 'sold')}
                            disabled={updatingId === v.id}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Mark Sold
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => updateListingStatus(v.id, 'active')}
                          disabled={updatingId === v.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Mark Available
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-medium">No listings yet</p>
            <button onClick={() => navigate({ name: 'sell' })} className="mt-3 text-green-600 font-semibold hover:underline">
              List your first vehicle →
            </button>
          </div>
        )}
      </div>

      {/* My spare parts */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">My Spare Parts</h2>
        {myParts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myParts.map((p) => (
              <div key={p.id}>
                <SparePartCard part={p} />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${VEHICLE_STATUS_COLORS[p.status]}`}>
                    {VEHICLE_STATUS_LABELS[p.status]}
                  </span>
                  {(p.status === 'active' || p.status === 'sold' || p.status === 'out_of_stock') && (
                    <div className="flex items-center gap-1.5">
                      {p.status === 'active' ? (
                        <>
                          <button
                            onClick={() => updatePartStatus(p.id, 'out_of_stock')}
                            disabled={updatingId === p.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
                          >
                            <PackageX className="w-3.5 h-3.5" /> Out of Stock
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            onClick={() => updatePartStatus(p.id, 'sold')}
                            disabled={updatingId === p.id}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Mark Sold
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => updatePartStatus(p.id, 'active')}
                          disabled={updatingId === p.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Mark Available
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Wrench className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-medium">No spare parts listed yet</p>
            <button onClick={() => navigate({ name: 'sell-part' })} className="mt-3 text-green-600 font-semibold hover:underline">
              List your first part →
            </button>
          </div>
        )}
      </div>

      {/* Saved vehicles */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Saved Vehicles</h2>
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Heart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-medium">No saved vehicles yet</p>
            <button onClick={() => navigate({ name: 'browse' })} className="mt-3 text-green-600 font-semibold hover:underline">
              Browse vehicles →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
