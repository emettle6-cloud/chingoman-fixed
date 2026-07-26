import { useEffect, useState } from 'react';
import { Car, Heart, MessageSquare, Ship, TrendingUp, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Favorite } from '@/types';
import { VehicleCard } from '@/components/VehicleCard';
import { formatUSD } from '@/lib/cif';

export function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [myListings, setMyListings] = useState<Vehicle[]>([]);
  const [favorites, setFavorites] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState({ listings: 0, favorites: 0, views: 0 });

  useEffect(() => {
    if (!user || !profile) return;

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
        <button
          onClick={() => navigate({ name: 'sell' })}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> List a Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Car} label="My Listings" value={String(stats.listings)} color="text-green-600 bg-green-50" />
        <StatCard icon={Heart} label="Saved Vehicles" value={String(stats.favorites)} color="text-red-600 bg-red-50" />
        <StatCard icon={Eye} label="Total Views" value={String(stats.views)} color="text-blue-600 bg-blue-50" />
        <StatCard icon={TrendingUp} label="Account Type" value={profile?.user_type === 'marketer' ? 'Marketer' : 'Buyer'} color="text-emerald-600 bg-emerald-50" />
      </div>

      {/* My listings */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">My Listings</h2>
        {myListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
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
