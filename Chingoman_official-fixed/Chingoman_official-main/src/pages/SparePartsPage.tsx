import { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, X, Wrench, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SparePart } from '@/types';
import { SparePartCard } from '@/components/SparePartCard';
import { PART_CATEGORIES } from '@/lib/constants';
import { useRouter } from '@/context/RouterContext';
import { RequestItemBanner } from '@/components/RequestItemBanner';

interface Filters {
  category: string;
  make: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

const DEFAULT_FILTERS: Filters = { category: '', make: '', minPrice: '', maxPrice: '', sortBy: 'newest' };

export function SparePartsPage() {
  const { route, navigate } = useRouter();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobile, setShowMobile] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (route.name === 'parts' && route.category) {
      setFilters((f) => ({ ...f, category: route.category ?? '' }));
    }
  }, [route]);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('spare_parts').select('*').eq('status', 'active');

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.make) query = query.ilike('compatible_make', `%${filters.make}%`);
    if (filters.minPrice) query = query.gte('price_usd', Number(filters.minPrice));
    if (filters.maxPrice) query = query.lte('price_usd', Number(filters.maxPrice));

    switch (filters.sortBy) {
      case 'price-low': query = query.order('price_usd', { ascending: true }); break;
      case 'price-high': query = query.order('price_usd', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;
    setParts((data as SparePart[]) ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const activeCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'sortBy' && v !== '' && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Spare Parts</h1>
          <p className="text-slate-500 mt-1">Genuine and used parts sourced directly from China</p>
        </div>
        <button
          onClick={() => navigate({ name: 'sell-part' })}
          className="hidden sm:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> List a Part
        </button>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-72 shrink-0">
          <FilterPanel filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} activeCount={activeCount} />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <button
              onClick={() => setShowMobile(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <span className="text-sm text-slate-500">{loading ? 'Loading...' : `${parts.length} results`}</span>
          </div>

          <div className="hidden lg:flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">{loading ? 'Loading...' : `${parts.length} parts found`}</span>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-green-400"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
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
          ) : parts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {parts.map((p) => (
                <SparePartCard key={p.id} part={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No spare parts match your filters</p>
              <button onClick={resetFilters} className="mt-3 text-green-600 font-semibold hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          <button
            onClick={() => navigate({ name: 'sell-part' })}
            className="sm:hidden w-full mt-6 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> List a Part
          </button>

          {!loading && <RequestItemBanner itemType="spare_part" className="mt-6" />}
        </div>
      </div>

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
              Show {parts.length} Results
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white"
          >
            <option value="">All Categories</option>
            {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Compatible Make</label>
          <input
            type="text"
            value={filters.make}
            onChange={(e) => updateFilter('make', e.target.value)}
            placeholder="e.g. BYD"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
          />
        </div>

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
      </div>
    </div>
  );
}
