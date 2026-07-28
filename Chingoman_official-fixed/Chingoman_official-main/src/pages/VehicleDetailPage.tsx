import { useEffect, useState } from 'react';
import {
  ArrowLeft, BadgeCheck, Calendar, Gauge, Fuel, ShipWheel, BatteryCharging,
  MapPin, Ship, ShieldCheck, Lock, FileText, MessageSquare, Heart, Share2,
  Calculator, Zap, Cog, Palette, CheckCircle2, AlertTriangle, Phone, Car,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Inspection } from '@/types';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { formatUSD, calculateCIF } from '@/lib/cif';
import {
  VEHICLE_TYPE_LABELS, VEHICLE_TYPE_COLORS, SOH_RATING, CHARGING_ADVICE,
  RHD_WARNING, DESTINATION_PORTS,
} from '@/lib/constants';
import { AuthModal } from '@/components/AuthModal';

interface VehicleDetailPageProps {
  vehicleId: string;
}

export function VehicleDetailPage({ vehicleId }: VehicleDetailPageProps) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [cifPreview, setCifPreview] = useState<{ totalCIF: number; landedCost: number } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('vehicles').select('*').eq('id', vehicleId).maybeSingle();
      const v = data as Vehicle | null;
      setVehicle(v);
      if (v) {
        const { data: insp } = await supabase
          .from('inspections')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .maybeSingle();
        setInspection(insp as Inspection | null);

        const cif = calculateCIF({
          carValue: Number(v.price_usd),
          portChina: v.port_china,
          portDestination: 'Tema, Ghana',
          vehicleType: v.vehicle_type,
        });
        setCifPreview({ totalCIF: cif.totalCIF, landedCost: cif.landedCost });
      }
      setLoading(false);
    }
    load();
  }, [vehicleId]);

  useEffect(() => {
    if (user && profile && vehicle) {
      supabase
        .from('favorites')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', profile.id)
        .then(({ data }) => setFavorited(!!data && data.length > 0));
    }
  }, [user, profile, vehicle]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        <p className="animate-pulse">Loading vehicle details...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 text-lg">Vehicle not found.</p>
        <button onClick={() => navigate({ name: 'browse' })} className="mt-4 text-green-600 font-semibold hover:underline">
          ← Back to Browse
        </button>
      </div>
    );
  }

  const soh = vehicle.battery_soh !== null ? SOH_RATING(vehicle.battery_soh) : null;
  const typeColor = VEHICLE_TYPE_COLORS[vehicle.vehicle_type] ?? VEHICLE_TYPE_COLORS.ICE;
  const chargingAdvice = vehicle.charging_type ? CHARGING_ADVICE[vehicle.charging_type] : null;
  const images = vehicle.images ?? [];

  function toggleFavorite() {
    if (!user || !profile) { setAuthOpen(true); return; }
    if (favorited) {
      supabase.from('favorites').delete().eq('vehicle_id', vehicle!.id).eq('user_id', profile.id)
        .then(({ error }) => { if (!error) setFavorited(false); });
    } else {
      supabase.from('favorites').insert({ vehicle_id: vehicle!.id, user_id: profile.id })
        .then(({ error }) => { if (!error) setFavorited(true); });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={() => navigate({ name: 'browse' })}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Browse
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div>
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 relative">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Car className="w-10 h-10 mb-2" />
                  <span className="text-sm font-medium">No photos uploaded yet</span>
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${typeColor}`}>
                  {VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}
                </span>
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-900/80 text-white backdrop-blur-sm">
                  {vehicle.steering_side}
                </span>
              </div>
              {vehicle.is_verified && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                  <BadgeCheck className="w-4 h-4" /> Verified Inspection
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      activeImage === i ? 'border-green-500' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Specs grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <SpecItem icon={Calendar} label="Year" value={String(vehicle.year)} />
              <SpecItem icon={Gauge} label="Mileage" value={vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString()} km` : 'N/A'} />
              <SpecItem icon={Fuel} label="Fuel Type" value={vehicle.fuel_type || vehicle.vehicle_type} />
              <SpecItem icon={ShipWheel} label="Steering" value={vehicle.steering_side} />
              <SpecItem icon={Cog} label="Transmission" value={vehicle.transmission || 'Automatic'} />
              <SpecItem icon={Palette} label="Color" value={vehicle.color || 'N/A'} />
              {vehicle.engine_cc ? <SpecItem icon={Zap} label="Engine" value={`${vehicle.engine_cc} cc`} /> : null}
              {vehicle.range_km ? <SpecItem icon={MapPin} label="Range" value={`${vehicle.range_km} km`} /> : null}
              <SpecItem icon={Ship} label="Port" value={vehicle.port_china} />
            </div>
          </div>

          {/* Description */}
          {vehicle.description && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Description</h2>
              <p className="text-slate-600 leading-relaxed">{vehicle.description}</p>
            </div>
          )}

          {/* EV / Battery section */}
          {vehicle.vehicle_type !== 'ICE' && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">EV & Battery Health</h2>
              </div>

              {soh && vehicle.battery_soh !== null && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Battery State of Health (SOH)</span>
                    <span className={`text-lg font-bold ${soh.color}`}>{vehicle.battery_soh}% — {soh.label}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        vehicle.battery_soh >= 80 ? 'bg-emerald-500' :
                        vehicle.battery_soh >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${vehicle.battery_soh}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{soh.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-5">
                {vehicle.battery_capacity_kwh && (
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Battery Capacity</p>
                    <p className="text-lg font-bold text-slate-900">{vehicle.battery_capacity_kwh} kWh</p>
                  </div>
                )}
                {vehicle.range_km && (
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Range (CLTC)</p>
                    <p className="text-lg font-bold text-slate-900">{vehicle.range_km} km</p>
                  </div>
                )}
              </div>

              {chargingAdvice && (
                <div className="bg-white rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      Charging Compatibility — {vehicle.charging_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{chargingAdvice}</p>
                </div>
              )}
            </div>
          )}

          {/* LHD/RHD warning */}
          {vehicle.steering_side === 'LHD' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm mb-1">Left-Hand Drive Notice</p>
                <p className="text-sm text-amber-700 leading-relaxed">{RHD_WARNING}</p>
              </div>
            </div>
          )}

          {/* Inspection report */}
          {inspection && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Verified Inspection Report</h2>
                  <p className="text-sm text-slate-500">
                    Inspected by {inspection.company} on {new Date(inspection.inspection_date).toLocaleDateString()} at {inspection.port_china}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <ScoreBar label="Engine" score={inspection.engine_score} />
                <ScoreBar label="Body" score={inspection.body_score} />
                <ScoreBar label="Interior" score={inspection.interior_score} />
                <ScoreBar label="Electrical" score={inspection.electrical_score} />
                {inspection.battery_score > 0 && <ScoreBar label="Battery" score={inspection.battery_score} />}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-slate-900">{inspection.overall_grade}</div>
                <div className="text-sm text-slate-500">
                  Overall grade assigned by {inspection.inspector_name}
                </div>
              </div>

              {inspection.notes && (
                <p className="text-sm text-slate-600 mt-3 italic">"{inspection.notes}"</p>
              )}

              {inspection.report_url && (
                
                  href={inspection.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-green-600 font-semibold hover:underline"
                >
                  <FileText className="w-4 h-4" /> View Full Report PDF
                </a>
              )}
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">Staged Payment Protection</p>
                <p className="text-xs text-slate-500 mt-0.5">You never pay the full amount upfront — your final payment is only due once your vehicle's shipment has been verified.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-3">
              <Lock className="w-8 h-8 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">Secure Transaction</p>
                <p className="text-xs text-slate-500 mt-0.5">All communications and payments are handled through the Chin-go-man platform. Never pay sellers directly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sticky purchase panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{vehicle.make} {vehicle.model}</h1>
              </div>
              <p className="text-sm text-slate-500 mb-4">{vehicle.year} · {vehicle.listing_type === 'marketer' ? 'Marketer Listing' : 'Direct from Seller'}</p>

              <div className="mb-4">
                <p className="text-xs text-slate-500">Vehicle Price (FOB)</p>
                <p className="text-3xl font-bold text-slate-900">{formatUSD(Number(vehicle.price_usd))}</p>
              </div>

              {/* CIF preview */}
              {cifPreview && (
                <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">Estimated Landed Cost</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>CIF to Tema, Ghana</span>
                      <span className="font-medium">{formatUSD(cifPreview.totalCIF)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>+ Est. Duties & Levies</span>
                      <span className="font-medium">{formatUSD(cifPreview.landedCost - cifPreview.totalCIF)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-green-200">
                      <span className="font-bold text-slate-900">Est. Landed Cost</span>
                      <span className="font-bold text-green-700">{formatUSD(cifPreview.landedCost)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate({ name: 'cif' })}
                    className="mt-3 w-full text-sm text-green-600 font-semibold hover:underline text-center"
                  >
                    Calculate for other ports →
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => { if (!user) setAuthOpen(true); else setShowContact(true); }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" /> Contact Seller
                </button>
                <div className="flex gap-2.5">
                  <button
                    onClick={toggleFavorite}
                    className={`flex-1 border py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                      favorited
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500' : ''}`} /> {favorited ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>

              {/* Contact info reveal */}
              {showContact && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-sm font-semibold text-slate-900">Seller Information</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {vehicle.is_verified ? 'Verified seller' : 'Unverified seller'}
                  </div>
                  {vehicle.listing_type === 'marketer' && (
                    <p className="text-xs text-slate-500">
                      This is a marketer listing — the marketer is based in Ghana and facilitates the purchase of a vehicle currently in China.
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Use the in-app messaging system for your safety. Chin-go-man's staged payment process protects every transaction.
                  </p>
                </div>
              )}
            </div>

            {/* Trust summary */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Trust Summary
              </h3>
              <div className="space-y-2 text-sm">
                <TrustRow label="Inspection Verified" value={vehicle.is_verified} />
                <TrustRow label="Inspection Report" value={!!inspection} />
                <TrustRow label="Battery SOH Reported" value={vehicle.battery_soh !== null} />
                <TrustRow label="Staged Payments Available" value={true} />
                <TrustRow label="Shipping Available" value={vehicle.shipping_available} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-700">{score}/10</span>
      </div>
    </div>
  );
}

function TrustRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <span className="text-xs text-slate-400">No</span>
      )}
    </div>
  );
}
