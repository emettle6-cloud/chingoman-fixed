import { useEffect, useRef, useState } from 'react';
import { Landmark, ChevronDown, ExternalLink } from 'lucide-react';
import { GRA_DUTY_CALCULATOR_URL, GRA_DUTY_CHECK_STEPS } from '@/lib/constants';

interface Props {
  className?: string;
  label?: string;
}

// A button that opens a dropdown panel walking someone through checking the
// *official* import duty for a used vehicle on the Ghana Revenue Authority's
// UNIPASS portal — separate from (and more authoritative than) our own CIF
// Calculator's estimate. Self-contained so it can be dropped onto any page.
export function DutyCheckDropdown({ className = '', label = 'Check Official Duty (GRA)' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
      >
        <Landmark className="w-4 h-4" />
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[22rem] max-w-[90vw] bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:left-0 right-0 sm:right-auto">
          <p className="font-bold text-slate-900 text-sm mb-1">How to check your official duty</p>
          <p className="text-xs text-slate-500 mb-4">
            The Ghana Revenue Authority's UNIPASS portal gives the official, binding duty amount for a used vehicle —
            follow these steps:
          </p>
          <ol className="space-y-2.5 mb-4">
            {GRA_DUTY_CHECK_STEPS.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={GRA_DUTY_CALCULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Open GRA Duty Calculator <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
