import { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '@/lib/exchangeRate';

export function CurrencySelector({ className = '' }: { className?: string }) {
  const { currency, setCurrency, detectingLocation } = useCurrency();
  const [open, setOpen] = useState(false);
  const active = SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      >
        <span>{active.flag}</span>
        <span>{active.code}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
            {!detectingLocation && currency !== 'USD' && (
              <div className="flex items-center gap-1.5 px-4 pb-2 mb-1 border-b border-slate-100 text-[11px] text-slate-400">
                <MapPin className="w-3 h-3" /> Set for your location — change anytime
              </div>
            )}
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  c.code === currency ? 'text-green-700 bg-green-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{c.flag}</span>
                <span className="flex-1 text-left">{c.name}</span>
                <span className="text-xs text-slate-400">{c.code}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
