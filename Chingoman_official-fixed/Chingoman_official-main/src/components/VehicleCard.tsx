import { Gauge, Calendar, Fuel, ShipWheel, BadgeCheck, BatteryCharging, MapPin, Camera } from 'lucide-react';
import type { Vehicle } from '@/types';
import { VEHICLE_TYPE_COLORS, VEHICLE_TYPE_SHORT, SOH_RATING, VEHICLE_STATUS_LABELS } from '@/lib/constants';
import { formatUSD } from '@/lib/cif';
import { useRouter } from '@/context/RouterContext';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { navigate } = useRouter();
  const soh = vehicle.battery_soh !== null ? SOH_RATING(vehicle.battery_soh) : null;
  const typeColor = VEHICLE_TYPE_COLORS[vehicle.vehicle_type] ?? VEHICLE_TYPE_COLORS.ICE;
  const image = vehicle.images?.[0] ?? null;
  const unavailable = vehicle.status === 'sold' || vehicle.status === 'out_of_stock';

  return (
    <button
      onClick={() => navigate({ name: 'vehicle', id: vehicle.id })}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={`${vehicle.make} ${vehicle.model}`}
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
              {VEHICLE_STATUS_LABELS[vehicle.status]}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeColor}`}>
            {VEHICLE_TYPE_SHORT[vehicle.vehicle_type] ?? vehicle.vehicle_type}
          </span>
          {vehicle.is_featured && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
              Featured
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/80 text-white backdrop-blur-sm">
            {vehicle.steering_side}
          </span>
        </div>
        {vehicle.is_verified && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold">
            <BadgeCheck className="w-3.5 h-3.5" /> Verified
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-slate-900 text-lg leading-tight">
            {vehicle.make} {vehicle.model}
          </h3>
          <span className="text-xs font-medium text-slate-500">{vehicle.listing_type === 'marketer' ? 'Marketer' : 'Direct'}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {vehicle.year}</span>
          {vehicle.mileage_km !== null && (
            <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {vehicle.mileage_km.toLocaleString()} km</span>
          )}
          <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> {vehicle.fuel_type || vehicle.vehicle_type}</span>
        </div>

        {soh && vehicle.vehicle_type !== 'ICE' && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-600">Battery SOH:</span>
            <span className={`font-semibold ${soh.color}`}>{vehicle.battery_soh}% ({soh.label})</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <MapPin className="w-3.5 h-3.5" /> Ships from {vehicle.port_china}
        </div>

        <div className="flex items-end justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Price (FOB)</p>
            <p className={`text-xl font-bold ${unavailable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatUSD(Number(vehicle.price_usd))}</p>
          </div>
          <span className="text-xs font-medium text-green-600 group-hover:underline">View Details →</span>
        </div>
      </div>
    </button>
  );
}
