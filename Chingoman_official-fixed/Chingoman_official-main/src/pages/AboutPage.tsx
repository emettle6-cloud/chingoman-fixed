import {
  ShieldCheck, Lock, BatteryCharging, BadgeCheck, ClipboardCheck,
  Ship, TrendingUp, Target, Users, Zap,
} from 'lucide-react';
import { TRUST_FEATURES, MONETIZATION_FEATURES } from '@/lib/constants';
import { useRouter } from '@/context/RouterContext';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck, Lock, BatteryCharging, BadgeCheck, Ship, TrendingUp,
};

export function AboutPage() {
  const { navigate } = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <img src="/assets/chingoman_officail_logo_transparent.png" alt="Chin-go-man" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-900">About Chin-go-man</h1>
        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
          The trusted marketplace for importing quality used vehicles from China to Ghana and West Africa.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Chin-go-man bridges the gap between Chinese automotive supply and West African demand. We make it safe
          and transparent to buy used vehicles from China — whether domestic brands like BYD, NIO, and Li Auto,
          or international brands manufactured and sold in the Chinese market. Our platform provides verified
          inspections, escrow protection, and full cost transparency so buyers in Ghana, Nigeria, and beyond can
          import with confidence.
        </p>
      </div>

      {/* Who we serve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">For Buyers</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Browse verified vehicles, calculate your full landed cost, and purchase with escrow protection.
            Every vehicle includes inspection reports and — for EVs — battery State of Health data.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <Ship className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">For Marketers</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            List vehicles from Chinese ports, manage the import process, and earn commission on successful sales.
            Get verified on the platform to build trust with buyers across West Africa.
          </p>
        </div>
      </div>

      {/* Trust features */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Trust & Safety Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRUST_FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon] ?? ShieldCheck;
            return (
              <div key={feature.title} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monetization */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">How Chin-go-man Earns</h2>
        <div className="space-y-3">
          {MONETIZATION_FEATURES.map((feature, i) => {
            const Icon = ICONS[feature.icon] ?? TrendingUp;
            return (
              <div key={feature.title} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-green-400 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{i + 1}. {feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-3xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Join Chin-go-man Today</h2>
        <p className="text-green-50 mb-6 max-w-xl mx-auto">Start browsing verified vehicles or list your first car for import to West Africa.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate({ name: 'browse' })} className="bg-white text-green-600 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors">
            Browse Vehicles
          </button>
          <button onClick={() => navigate({ name: 'sell' })} className="border border-green-400 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
            List a Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}
