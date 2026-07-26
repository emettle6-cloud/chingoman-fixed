import { useEffect, useState } from 'react';
import {
  Search, ShieldCheck, Lock, BatteryCharging, BadgeCheck, ClipboardCheck,
  Ship, TrendingUp, ArrowRight, Car, Calculator, FileText, Zap, Fuel, Gauge,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@/types';
import { VehicleCard } from '@/components/VehicleCard';
import { TRUST_FEATURES, MONETIZATION_FEATURES, VEHICLE_TYPE_LABELS } from '@/lib/constants';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck, Lock, BatteryCharging, BadgeCheck, Ship, TrendingUp,
};

export function HomePage() {
  const { navigate } = useRouter();
  const [featured, setFeatured] = useState<Vehicle[]>([]);
  const [searchMake, setSearchMake] = useState('');
  const [searchType, setSearchType] = useState('');

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'active')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setFeatured((data as Vehicle[]) ?? []));
  }, []);

  const powertrainOptions = Object.entries(VEHICLE_TYPE_LABELS);

  function handleSearch() {
    navigate({ name: 'browse', make: searchMake || undefined, type: searchType || undefined });
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt=""
            className="w-full h-full object-cover opacity-25 animate-fade-in-slow"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/80 to-slate-900/95" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 border border-green-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Ship className="w-4 h-4" />
              China → Ghana & West Africa
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Import Quality Cars<br />from China with{' '}
              <span className="text-green-400">Confidence</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl">
              Browse verified used vehicles from Chinese ports — domestic brands like BYD, NIO, and Li Auto,
              plus international models. Transparent pricing, port inspections, and escrow protection.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 max-w-2xl">
              <select
                value={searchMake}
                onChange={(e) => setSearchMake(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border-0 text-slate-700 bg-slate-50 focus:ring-2 focus:ring-green-200 outline-none"
              >
                <option value="">All Makes</option>
                {['BYD', 'Tesla', 'NIO', 'Li Auto', 'Xpeng', 'Toyota', 'BMW', 'Mercedes-Benz', 'Chery', 'Geely', 'Haval', 'GAC', 'Aito'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border-0 text-slate-700 bg-slate-50 focus:ring-2 focus:ring-green-200 outline-none"
              >
                <option value="">All Powertrains</option>
                {powertrainOptions.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" /> Search
              </button>
            </div>

            <div className="flex flex-wrap gap-6 mt-8 text-sm text-slate-300">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Inspections</span>
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-400" /> Escrow Protection</span>
              <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /> CIF Calculator</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Car, label: 'Vehicles Listed', value: '16+' },
              { icon: ShieldCheck, label: 'Verified Inspections', value: '100%' },
              { icon: Ship, label: 'Destination Ports', value: '5' },
              { icon: Zap, label: 'EV & Hybrid Ready', value: 'Yes' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Featured Vehicles</h2>
            <p className="text-slate-500 mt-1">Hand-picked cars from verified sellers across China</p>
          </div>
          <button
            onClick={() => navigate({ name: 'browse' })}
            className="hidden sm:flex items-center gap-2 text-green-600 font-semibold hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Car className="w-12 h-12 mx-auto mb-3" />
            <p>Loading featured vehicles...</p>
          </div>
        )}

        <div className="sm:hidden mt-6">
          <button
            onClick={() => navigate({ name: 'browse' })}
            className="w-full flex items-center justify-center gap-2 text-green-600 font-semibold py-3"
          >
            View All Vehicles <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Powertrain showcase */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Every Powertrain. Every Need.</h2>
          <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">
            From traditional petrol to cutting-edge electric, find the right vehicle for West African roads.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Fuel, title: 'ICE (Petrol/Diesel)', desc: 'Proven reliability. Toyota, BMW, Mercedes, Chery, Geely and more. Easiest to maintain and fuel across West Africa.', color: 'text-slate-600 bg-slate-100' },
              { icon: Gauge, title: 'Hybrid & PHEV', desc: 'Best of both worlds. BYD Song Pro DM, Li Auto L9, Honda Accord PHEV. Electric range for city, petrol for highway.', color: 'text-blue-600 bg-blue-50' },
              { icon: Zap, title: 'Pure Electric (EV)', desc: 'Lowest running costs. BYD Han, Tesla Model 3, NIO ES6, Xpeng P7. Battery SOH reported on every listing.', color: 'text-emerald-600 bg-emerald-50' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className={`w-14 h-14 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <ShieldCheck className="w-4 h-4" /> Trust & Safety
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Buy with Total Confidence</h2>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
            We solve the used car trust problem with verified inspections, escrow payments, and full transparency.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon] ?? ShieldCheck;
            return (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monetization section */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">Built for the African Import Market</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              Three ways Chin-go-man creates value for importers, marketers, and buyers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MONETIZATION_FEATURES.map((feature, i) => {
              const Icon = ICONS[feature.icon] ?? TrendingUp;
              return (
                <div key={feature.title} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-bold text-slate-700">0{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Import Your Next Car?</h2>
          <p className="text-green-50 mb-8 max-w-xl mx-auto">
            Browse verified vehicles, calculate your landed cost, and connect with trusted marketers in Ghana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate({ name: 'browse' })}
              className="bg-white text-green-600 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              Browse Vehicles
            </button>
            <button
              onClick={() => navigate({ name: 'cif' })}
              className="bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors border border-green-400"
            >
              Calculate CIF Cost
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
