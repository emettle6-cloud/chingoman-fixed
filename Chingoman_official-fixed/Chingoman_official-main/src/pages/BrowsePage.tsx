import { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, X, Search, Car } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, VehicleType, SteeringSide } from '@/types';
import { VehicleCard } from '@/components/VehicleCard';
import { MAKES, YEAR_RANGE, POWERTRAIN_GROUPS, VEHICLE_TYPE_LABELS } from '@/lib/constants';
import { useRouter } from '@/context/RouterContext';
import { RequestItemBanner } from '@/components/RequestItemBanner';

interface Filters {
  make: string;
  model: string;
  yearMin: string;
  yearMax: string;
  powertrain: string;
  steering: string;
  listingType: string;
  verifiedOnly: boolean;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

const DEFAULT_FILTERS: Filters = {
  make: '', model: '', yearMin: '', yearMax: '', powertrain: '',
  steering: '', listingType: '', verifiedOnly: false,
  minPrice: '', maxPrice: '', sortBy: 'newest',
};

export function BrowsePage() {
  const { route } = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobile, setShowMobile] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (route.name === 'browse') {
      const initial: Filters = { ...DEFAULT_FILTERS };
      if (route.make) initial.make = route.make;
      if (route.type) initial.powertrain = route.type;
      setFilters(initial);
    }
  }, [route]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('vehicles').select('*').eq('status', 'active');

    if (filters.make) query = query.eq('make', filters.make);
    if (filters.model) query = query.ilike('model', `%${filters.model}%`);
    if (filters.yearMin) query = query.gte('year', Number(filters.yearMin));
    if (filters.yearMax) query = query.lte('year', Number(filters.yearMax));
    if (filters.powertrain) query = query.eq('vehicle_type', filters.powertrain as VehicleType);
    if (filters.steering) query = query.eq('steering_side', filters.steering as SteeringSide);
    if (filters.listingType) query = query.eq('listing_type', filters.listingType);
    if (filters.verifiedOnly) query = query.eq('is_verified', true);
    if (filters.minPrice) query = query.gte('price_usd', Number(filters.minPrice));
    if (filters.maxPrice) query = query.lte('price_usd', Number(filters.maxPrice));

    // Premium-tier listings (paid placement) always float to the top of
    // Browse results, regardless of which sort the visitor picked — the
    // chosen sort just decides the order within/after that.
    query = query.order('is_featured', { ascending: false });

    switch (filters.sortBy) {
      case 'price-low': query = query.order('price_usd', { ascending: true }); break;
      case 'price-high': query = query.order('price_usd', { ascending: false }); break;
      case 'year-new': query = query.order('year', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;
    setVehicles((data as Vehicle[]) ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const activeCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'sortBy' && v !== '' && v !== false && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Browse Vehicles</h1>
        <p className="text-slate-500 mt-1">Find your next car from verified sellers across China</p>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <FilterPanel filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} activeCount={activeCount} />
        </aside>

        {/* Mobile filter toggle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <button
              onClick={() => setShowMobile(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <span className="text-sm text-slate-500">{loading ? 'Loading...' : `${vehicles.length} results`}</span>
          </div>

          {/* Sort bar */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">{loading ? 'Loading...' : `${vehicles.length} vehicles found`}</span>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-green-400"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="year-new">Year: Newest</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : vehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Car className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No vehicles match your filters</p>
              <button onClick={resetFilters} className="mt-3 text-green-600 font-semibold hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          {!loading && <RequestItemBanner itemType="vehicle" className="mt-6" />}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobile(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Filters</h3>
              <button onClick={() => setShowMobile(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} activeCount={activeCount} />
            <button
              onClick={() => setShowMobile(false)}
              className="mt-4 w-full bg-green-600 text-white font-semibold py-3 rounded-xl"
            >
              Show {vehicles.length} Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  filters, updateFilter, resetFilters, activeCount,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  activeCount: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </h3>
        {activeCount > 0 && (
          <button onClick={resetFilters} className="text-xs text-green-600 font-medium hover:underline">
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Make */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Make (Brand)</label>
          <select
            value={filters.make}
            onChange={(e) => updateFilter('make', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white"
          >
            <option value="">All Makes</option>
            {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Model</label>
          <input
            type="text"
            value={filters.model}
            onChange={(e) => updateFilter('model', e.target.value)}
            placeholder="e.g. Han EV"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
          />
        </div>

        {/* Year range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Year ({YEAR_RANGE.min}–{YEAR_RANGE.max})</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={YEAR_RANGE.min}
              max={YEAR_RANGE.max}
              value={filters.yearMin}
              onChange={(e) => updateFilter('yearMin', e.target.value)}
              placeholder="Min"
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
            />
            <input
              type="number"
              min={YEAR_RANGE.min}
              max={YEAR_RANGE.max}
              value={filters.yearMax}
              onChange={(e) => updateFilter('yearMax', e.target.value)}
              placeholder="Max"
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
            />
          </div>
        </div>

        {/* Powertrain */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Powertrain</label>
          <div className="space-y-1.5">
            {POWERTRAIN_GROUPS.map((group) => (
              <label key={group.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="powertrain"
                  checked={filters.powertrain === group.value}
                  onChange={() => updateFilter('powertrain', group.value)}
                  className="text-green-600 focus:ring-green-400"
                />
                <span className="text-sm text-slate-600">{group.label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="powertrain"
                checked={filters.powertrain === ''}
                onChange={() => updateFilter('powertrain', '')}
                className="text-green-600 focus:ring-green-400"
              />
              <span className="text-sm text-slate-600">All Powertrains</span>
            </label>
          </div>
        </div>

        {/* Steering */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Steering</label>
          <select
            value={filters.steering}
            onChange={(e) => updateFilter('steering', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white"
          >
            <option value="">Any</option>
            <option value="LHD">LHD (Left-Hand Drive)</option>
            <option value="RHD">RHD (Right-Hand Drive)</option>
          </select>
        </div>

        {/* Listing type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Listing Type</label>
          <select
            value={filters.listingType}
            onChange={(e) => updateFilter('listingType', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white"
          >
            <option value="">All Listings</option>
            <option value="direct">Direct Buyer</option>
            <option value="marketer">Marketer</option>
          </select>
        </div>

        {/* Price range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Price Range (USD)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', e.target.value)}
              placeholder="Min $"
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
            />
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              placeholder="Max $"
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
            />
          </div>
        </div>

        {/* Verified only */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
            className="rounded text-green-600 focus:ring-green-400"
          />
          <span className="text-sm font-medium text-slate-700">Verified inspections only</span>
        </label>
      </div>
    </div>
  );
}
