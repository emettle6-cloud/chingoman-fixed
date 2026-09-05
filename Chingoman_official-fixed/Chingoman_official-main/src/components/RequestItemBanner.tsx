import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { RequestItemModal } from './RequestItemModal';
import type { ItemRequestType } from '@/types';

interface Props {
  itemType?: ItemRequestType;
  className?: string;
}

// Drop this into Browse / Spare Parts (or anywhere else) so people who don't
// see what they want can ask us to go find it, instead of just leaving.
export function RequestItemBanner({ itemType = 'vehicle', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const noun = itemType === 'vehicle' ? 'vehicle' : itemType === 'spare_part' ? 'part' : 'item';

  return (
    <>
      <div className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-white text-green-600 items-center justify-center shrink-0">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Can't find the {noun} you're after?</p>
            <p className="text-sm text-slate-500">Tell us what you need and we'll try to source it for you.</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          Request an Item
        </button>
      </div>
      <RequestItemModal open={open} onClose={() => setOpen(false)} defaultItemType={itemType} />
    </>
  );
}
