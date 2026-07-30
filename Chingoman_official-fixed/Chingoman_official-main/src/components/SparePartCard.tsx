import { Wrench, MapPin, Camera } from 'lucide-react';
import type { SparePart } from '@/types';
import { VEHICLE_STATUS_LABELS } from '@/lib/constants';
import { formatUSD } from '@/lib/cif';
import { useRouter } from '@/context/RouterContext';

interface SparePartCardProps {
  part: SparePart;
}

export function SparePartCard({ part }: SparePartCardProps) {
  const { navigate } = useRouter();
  const image = part.images?.[0] ?? null;
  const unavailable = part.status === 'sold' || part.status === 'out_of_stock';
  const fitment = [part.compatible_make, part.compatible_model].filter(Boolean).join(' ');

  return (
    <button
      onClick={() => navigate({ name: 'part', id: part.id })}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={part.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${unavailable ? 'grayscale opacity-70' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <Camera className="w-8 h-8 mb-1.5" />
            <span className="text-xs font-medium">No photo yet</span>
          </div>
        )}
        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
            <span className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide bg-slate-900 text-white shadow-lg">
              {VEHICLE_STATUS_LABELS[part.status]}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Wrench className="w-3 h-3" /> {part.category}
          </span>
          {part.is_featured && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
              Featured
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{part.name}</h3>
        {fitment && (
          <p className="text-xs text-slate-500 mb-2">
            Fits: {fitment}
            {part.compatible_year_from ? ` (${part.compatible_year_from}${part.compatible_year_to && part.compatible_year_to !== part.compatible_year_from ? `–${part.compatible_year_to}` : ''})` : ''}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{part.condition}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <MapPin className="w-3.5 h-3.5" /> Ships from {part.port_china}
        </div>
        <div className="flex items-end justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Price</p>
            <p className={`text-xl font-bold ${unavailable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatUSD(Number(part.price_usd))}</p>
          </div>
          <span className="text-xs font-medium text-green-600 group-hover:underline">View Details →</span>
        </div>
      </div>
    </button>
  );
}
