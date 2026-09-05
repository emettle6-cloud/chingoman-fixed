import { useEffect, useState } from 'react';
import {
  ArrowLeft, BadgeCheck, Calendar, Gauge, Fuel, ShipWheel, BatteryCharging,
  MapPin, Ship, ShieldCheck, Lock, FileText, MessageSquare, Heart, Share2,
  Calculator, Zap, Cog, Palette, CheckCircle2, Car, Plug, Send,
  Star, PackageX, Phone, MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Inspection, Review, Profile } from '@/types';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { formatUSD, calculateCIF } from '@/lib/cif';
import { useCurrency } from '@/context/CurrencyContext';
import {
  VEHICLE_TYPE_LABELS, VEHICLE_TYPE_COLORS, SOH_RATING, CHARGING_ADVICE,
  VEHICLE_STATUS_LABELS,
} from '@/lib/constants';
import { AuthModal } from '@/components/AuthModal';
import { DutyCheckDropdown } from '@/components/DutyCheckDropdown';

interface VehicleDetailPageProps {
  vehicleId: string;
}

export function VehicleDetailPage({ vehicleId }: VehicleDetailPageProps) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const { currency, format: formatSelected } = useCurrency();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [cifPreview, setCifPreview] = useState<{ totalCIF: number; landedCost: number } | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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

        if (v.seller_id) {
          const { data: sellerData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', v.seller_id)
            .maybeSingle();
          setSeller(sellerData as Profile | null);

          const { data: reviewData } = await supabase
            .from('reviews')
            .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
            .eq('seller_id', v.seller_id)
            .order('created_at', { ascending: false });
          setReviews((reviewData as Review[]) ?? []);
        }
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

  async function sendMessage() {
    if (!user || !profile || !vehicle) return;
    if (!vehicle.seller_id) {
      setMessageError('This listing has no seller on record — please contact support instead.');
      return;
    }
    if (vehicle.seller_id === profile.id) {
      setMessageError('This is your own listing.');
      return;
    }
    if (!messageText.trim()) return;

    setSendingMessage(true);
    setMessageError(null);

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: vehicle.seller_id,
      vehicle_id: vehicle.id,
      content: messageText.trim(),
    });

    setSendingMessage(false);

    if (error) {
      setMessageError(`Could not send message: ${error.message}`);
      return;
    }

    setMessageText('');
    setMessageSent(true);
  }

  async function submitReview() {
    if (!user || !profile || !vehicle?.seller_id) return;
    if (profile.id === vehicle.seller_id) {
      setReviewError("You can't review your own listing.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);

    const { error } = await supabase.from('reviews').insert({
      seller_id: vehicle.seller_id,
      reviewer_id: profile.id,
      vehicle_id: vehicle.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });

    setSubmittingReview(false);

    if (error) {
      setReviewError(
        error.code === '23505'
          ? "You've already reviewed this seller for this vehicle."
          : `Could not submit review: ${error.message}`
      );
      return;
    }

    setReviewSubmitted(true);
    setReviewComment('');
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
      .eq('seller_id', vehicle.seller_id)
      .order('created_at', { ascending: false });
    setReviews((reviewData as Review[]) ?? []);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={() => navigate({ name: 'browse' })}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Browse
      </button>

      {(vehicle.status === 'sold' || vehicle.status === 'out_of_stock') && (
        <div className="mb-4 flex items-center gap-3 bg-slate-900 text-white rounded-xl px-5 py-3.5">
          <PackageX className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            This vehicle is {VEHICLE_STATUS_LABELS[vehicle.status].toLowerCase()} and is no longer available for purchase.
            {vehicle.status === 'out_of_stock' && ' The seller may restock a similar unit — message them to ask.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div>
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 relative">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={`${vehicle.make} ${vehicle.model}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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

              {vehicle.has_home_charger && (
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
                  <Plug className="w-4 h-4" /> Home charger included with this vehicle
                </div>
              )}

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
                <a
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

          {/* Seller-submitted report, shown when no formal scored inspection has been recorded yet */}
          {!inspection && vehicle.inspection_report_url && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Inspection Report</h2>
                  <p className="text-sm text-slate-500">Submitted by the seller with this listing.</p>
                </div>
              </div>
              <a
                href={vehicle.inspection_report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-green-600 font-semibold hover:underline"
              >
                <FileText className="w-4 h-4" /> View Report
              </a>
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

          {/* Seller reviews */}
          {seller && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Seller Reviews</h2>
                {seller.total_reviews > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-slate-900">{seller.rating.toFixed(1)}</span>
                    <span className="text-sm text-slate-500">({seller.total_reviews} review{seller.total_reviews === 1 ? '' : 's'})</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No reviews yet</span>
                )}
              </div>

              {reviews.length > 0 && (
                <div className="space-y-4 mb-5">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 text-sm">{r.reviewer?.full_name || 'Chin-go-man user'}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                      <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Leave a review */}
              {user && profile && profile.id !== vehicle.seller_id && (
                <div className="bg-slate-50 rounded-xl p-4">
                  {reviewSubmitted ? (
                    <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Thanks — your review has been posted.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Leave a review for this seller</p>
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button key={i} type="button" onClick={() => setReviewRating(i + 1)}>
                            <Star className={`w-6 h-6 ${i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={2}
                        placeholder="Share how your purchase went (optional)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-green-400 resize-none mb-2"
                      />
                      {reviewError && <p className="text-xs text-red-600 mb-2">{reviewError}</p>}
                      <button
                        onClick={submitReview}
                        disabled={submittingReview}
                        className="text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </>
                  )}
                </div>
              )}
              {!user && (
                <button onClick={() => setAuthOpen(true)} className="text-sm text-green-600 font-semibold hover:underline">
                  Sign in to leave a review →
                </button>
              )}
            </div>
          )}
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
                {currency !== 'USD' && formatSelected(Number(vehicle.price_usd)) && (
                  <p className="text-sm text-slate-400 mt-0.5">≈ {formatSelected(Number(vehicle.price_usd))}</p>
                )}
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
                      <span className="text-right">
                        <span className="block font-bold text-green-700">{formatUSD(cifPreview.landedCost)}</span>
                        {currency !== 'USD' && formatSelected(cifPreview.landedCost) && (
                          <span className="block text-xs text-slate-400">≈ {formatSelected(cifPreview.landedCost)}</span>
                        )}
                      </span>
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

              {/* GRA official duty check — right under the landed-cost estimate so
                  buyers can cross-check our figure against the official one without
                  leaving the listing. */}
              <div className="flex justify-center mb-4">
                <DutyCheckDropdown />
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => { if (!user) setAuthOpen(true); else setShowContact(true); }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  {vehicle.status === 'sold' || vehicle.status === 'out_of_stock' ? 'Ask About Similar Vehicles' : 'Contact Seller'}
                </button>

                {seller && (seller.phone || seller.whatsapp) && (
                  <div className="flex gap-2.5">
                    {seller.phone && (
                      user ? (
                        <a
                          href={`tel:${seller.phone}`}
                          className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      ) : (
                        <button
                          onClick={() => setAuthOpen(true)}
                          className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </button>
                      )
                    )}
                    {seller.whatsapp && (
                      user ? (
                        <a
                          href={`https://wa.me/${seller.whatsapp.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 border border-emerald-200 bg-emerald-50 py-2.5 rounded-xl font-medium text-sm text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                      ) : (
                        <button
                          onClick={() => setAuthOpen(true)}
                          className="flex-1 border border-emerald-200 bg-emerald-50 py-2.5 rounded-xl font-medium text-sm text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                      )
                    )}
                  </div>
                )}

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

              {/* Message composer */}
              {showContact && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {messageSent ? (
                    <div className="text-center py-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-900">Message sent</p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">
                        The seller will reply through Chin-go-man's messaging system.
                      </p>
                      <button
                        onClick={() => navigate({ name: 'messages', withProfileId: vehicle.seller_id ?? undefined, vehicleId: vehicle.id })}
                        className="text-sm text-green-600 font-semibold hover:underline"
                      >
                        View conversation →
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900 mb-1">Message the Seller</p>
                      <p className="text-xs text-slate-500 mb-3">
                        Sent securely through Chin-go-man's in-app messaging. Never send payment outside the platform.
                      </p>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={3}
                        placeholder={`Hi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}...`}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-green-400 resize-none"
                      />
                      {messageError && <p className="text-xs text-red-600 mt-1.5">{messageError}</p>}
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !messageText.trim()}
                        className="mt-2.5 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Send className="w-4 h-4" /> {sendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </>
                  )}
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
                <TrustRow label="Inspection Report" value={!!inspection || !!vehicle.inspection_report_url} />
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
