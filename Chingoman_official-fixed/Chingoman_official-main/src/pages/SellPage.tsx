import { useRef, useState } from 'react';
import {
  UserCheck, Store, ArrowRight, CheckCircle2, Info,
  Lock, Upload, AlertTriangle, ImagePlus, X, BatteryCharging, Plug,
  ShieldCheck, Hourglass, Star, CreditCard,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { SellerVerificationForm } from '@/components/SellerVerificationForm';
import { supabase } from '@/lib/supabase';
import { MAKES, CHINESE_PORTS, VEHICLE_TYPE_LABELS, YEAR_RANGE, LISTING_FEES } from '@/lib/constants';
import type { ListingTier } from '@/types';

export type Role = 'select' | 'marketer' | 'direct';

const CHARGING_TYPE_OPTIONS = [
  'CCS2', 'CCS2 / CHAdeMO', 'CCS2 / GB/T', 'GB/T', 'NIO Swap/CCS2', 'Tesla CCS2', 'AC Level 2', 'AC Level 1',
];

export function SellPage() {
  const { navigate } = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [role, setRole] = useState<Role>('select');
  const [authOpen, setAuthOpen] = useState(false);
  const [submittedVehicleId, setSubmittedVehicleId] = useState<string | null>(null);
  const [form, setForm] = useState({
    make: '', model: '', year: '2023', vehicleType: 'ICE',
    steeringSide: 'LHD', price: '', mileage: '', color: '',
    portChina: 'Guangzhou', description: '',
    phone: '', whatsapp: '',
    batteryCapacity: '', batterySOH: '', rangeKm: '', chargingType: 'CCS2', hasHomeCharger: false,
    tier: 'standard' as ListingTier,
  });
  const [inspectionFile, setInspectionFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 10;
  const MIN_PHOTOS = 3;
  const isElectrified = form.vehicleType !== 'ICE';

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, MAX_PHOTOS - photos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...incoming]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  function startFlow(r: Role) {
    if (!user) { setAuthOpen(true); return; }
    setRole(r);
  }

  async function payForListing(vehicleId: string) {
    setPayError(null);
    setPayLoading(true);
    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      body: { vehicle_id: vehicleId },
    });
    setPayLoading(false);

    if (error || !data?.authorization_url) {
      setPayError(
        data?.error ?? error?.message ??
        "Could not start payment. Your listing is saved — you can try paying again from your Dashboard.",
      );
      return;
    }

    window.location.href = data.authorization_url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!user || !profile) {
      setSubmitError('Your account isn\'t fully loaded yet. Please sign out and sign back in, then try again.');
      return;
    }
    if (!form.phone && !form.whatsapp) {
      setSubmitError('Please provide at least one contact method (phone or WhatsApp) so buyers can reach you.');
      return;
    }
    if (!inspectionFile) {
      setSubmitError('Please upload an inspection report before submitting.');
      return;
    }
    if (photos.length < MIN_PHOTOS) {
      setSubmitError(`Please upload at least ${MIN_PHOTOS} photos of the vehicle before submitting.`);
      return;
    }

    setUploading(true);

    // Keep the seller's contact details on their profile, so buyers reaching out later have a current number.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone: form.phone, whatsapp: form.whatsapp })
      .eq('id', profile.id);

    if (profileError) {
      setUploading(false);
      setSubmitError(`Could not save contact details: ${profileError.message}`);
      return;
    }

    const fileExt = inspectionFile.name.split('.').pop();
    const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('inspection-reports')
      .upload(filePath, inspectionFile);

    if (uploadError) {
      setUploading(false);
      setSubmitError(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('inspection-reports')
      .getPublicUrl(filePath);

    // Upload every photo the seller selected, in the order they arranged them.
    const uploadedImageUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photoFile = photos[i].file;
      const photoExt = photoFile.name.split('.').pop();
      const photoPath = `${profile.id}/${Date.now()}-${i}.${photoExt}`;

      const { error: photoUploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(photoPath, photoFile);

      if (photoUploadError) {
        setUploading(false);
        setSubmitError(`Photo upload failed: ${photoUploadError.message}`);
        return;
      }

      const { data: { publicUrl: photoUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(photoPath);

      uploadedImageUrls.push(photoUrl);
    }

    const { data: vehicle, error: insertError } = await supabase.from('vehicles').insert({
      seller_id: profile.id,
      make: form.make,
      model: form.model,
      year: Number(form.year),
      vehicle_type: form.vehicleType,
      steering_side: form.steeringSide,
      price_usd: Number(form.price),
      mileage_km: form.mileage ? Number(form.mileage) : null,
      color: form.color || null,
      port_china: form.portChina,
      listing_type: role === 'select' ? 'direct' : role,
      description: form.description,
      status: 'pending',
      shipping_available: true,
      is_verified: false,
      is_featured: false,
      payment_status: 'unpaid',
      tier: form.tier,
      images: uploadedImageUrls,
      inspection_report_url: publicUrl,
      battery_capacity_kwh: isElectrified && form.batteryCapacity ? Number(form.batteryCapacity) : null,
      battery_soh: isElectrified && form.batterySOH ? Number(form.batterySOH) : null,
      range_km: isElectrified && form.rangeKm ? Number(form.rangeKm) : null,
      charging_type: isElectrified ? form.chargingType : null,
      has_home_charger: isElectrified ? form.hasHomeCharger : false,
    }).select().single();

    setUploading(false);

    if (insertError) {
      setSubmitError(`Could not create listing: ${insertError.message}`);
      return;
    }

    if (vehicle) {
      setSubmittedVehicleId(vehicle.id);
      // Immediately hand off to Paystack — the listing already exists as a
      // pending/unpaid draft, so if this fails the seller can retry from
      // their Dashboard without losing any of the details or photos above.
      payForListing(vehicle.id);
    }
  }

  // ---- Gate: not signed in yet is handled by startFlow(); everything below
  // assumes `user` exists once role !== 'select'. ----

  if (submittedVehicleId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">One Last Step — Pay the Listing Fee</h1>
        <p className="text-slate-500 mb-6">
          Your vehicle details are saved. To send it for admin review, pay the {form.tier === 'premium' ? 'Premium' : 'Standard'} listing
          fee (${LISTING_FEES[form.tier].amountUsd}). You'll be redirected to Paystack to complete payment securely.
        </p>
        {payError && <p className="text-sm text-red-600 mb-4">{payError}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => payForListing(submittedVehicleId)}
            disabled={payLoading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {payLoading ? 'Redirecting...' : `Pay $${LISTING_FEES[form.tier].amountUsd} & Submit`}
          </button>
          <button onClick={() => navigate({ name: 'dashboard' })} className="border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors">
            Pay Later from Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900">List a Vehicle on Chin-go-man</h1>
        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
          Choose your role to get started. Marketers list cars in China on behalf of buyers in Ghana.
          Direct sellers list their own vehicles for sale.
        </p>
      </div>

      {/* Role selection */}
      {role === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Marketer */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-green-300 transition-colors p-6 cursor-pointer group" onClick={() => startFlow('marketer')}>
            <div className="w-14 h-14 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
              <Store className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">I'm a Marketer</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              You are based in Ghana and help buyers source vehicles from China. You list cars currently
              located in Chinese ports and facilitate the import process.
            </p>
            <div className="space-y-2 mb-5">
              <RoleStep text="Get verified by our team (one-time)" />
              <RoleStep text="List a vehicle from a Chinese port" />
              <RoleStep text="Provide inspection reports from Chinese ports" />
              <RoleStep text="Pay a flat listing fee per vehicle" />
            </div>
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:gap-3 transition-all">
              Continue as Marketer <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Direct Buyer / Seller */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-green-300 transition-colors p-6 cursor-pointer group" onClick={() => startFlow('direct')}>
            <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">I'm a Direct Seller</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              You own a vehicle in China (or have direct access) and want to sell it to buyers in Ghana
              and West Africa without going through a marketer.
            </p>
            <div className="space-y-2 mb-5">
              <RoleStep text="Get verified by our team (one-time)" />
              <RoleStep text="List your own vehicle directly" />
              <RoleStep text="Upload your own inspection documents" />
              <RoleStep text="Pay a flat listing fee (no commission)" />
            </div>
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:gap-3 transition-all">
              Continue as Direct Seller <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Verification gate */}
      {role !== 'select' && !profile && (
        <div className="text-center text-slate-400 py-16">Loading your account...</div>
      )}

      {role !== 'select' && profile && profile.seller_verification_status !== 'approved' && (
        <>
          {profile.seller_verification_status === 'pending' ? (
            <PendingReviewNotice onBack={() => setRole('select')} />
          ) : (
            <SellerVerificationForm
              role={role}
              onBack={() => setRole('select')}
              onSubmitted={refreshProfile}
              wasRejected={profile.seller_verification_status === 'rejected'}
            />
          )}
        </>
      )}

      {/* Listing form — only once the seller is verified */}
      {role !== 'select' && profile?.seller_verification_status === 'approved' && (
        <div>
          <div className="bg-slate-50 rounded-2xl p-5 mb-6 flex gap-3">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {role === 'marketer' ? 'Marketer Listing' : 'Direct Seller Listing'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {role === 'marketer'
                  ? 'You are listing a vehicle on behalf of a buyer. The car is currently in China. You will coordinate shipping and customs.'
                  : 'You are listing your own vehicle for sale. Buyers will contact you directly through the platform.'}
                {' '}All listings require a verified inspection report and admin approval before going live.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-bold text-slate-900 text-lg">Vehicle Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Make (Brand)">
                <select required value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className="form-input">
                  <option value="">Select make</option>
                  {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>
              <FormField label="Model">
                <input required type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Han EV" className="form-input" />
              </FormField>
              <FormField label="Year">
                <input required type="number" min={YEAR_RANGE.min} max={YEAR_RANGE.max} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="form-input" />
              </FormField>
              <FormField label="Powertrain">
                <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="form-input">
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Steering Side">
                <select value={form.steeringSide} onChange={(e) => setForm({ ...form, steeringSide: e.target.value })} className="form-input">
                  <option value="LHD">LHD (Left-Hand Drive)</option>
                  <option value="RHD">RHD (Right-Hand Drive)</option>
                </select>
              </FormField>
              <FormField label="Chinese Port">
                <select value={form.portChina} onChange={(e) => setForm({ ...form, portChina: e.target.value })} className="form-input">
                  {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Price (FOB, USD)">
                <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="25000" className="form-input" />
              </FormField>
              <FormField label="Mileage (km)">
                <input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="20000" className="form-input" />
              </FormField>
              <FormField label="Color">
                <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Pearl White" className="form-input" />
              </FormField>
            </div>

            {/* EV / Hybrid battery details */}
            {isElectrified && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BatteryCharging className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">Battery & Charging Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Battery Capacity (kWh)">
                    <input type="number" step="0.1" value={form.batteryCapacity} onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })} placeholder="e.g. 75" className="form-input" />
                  </FormField>
                  <FormField label="Battery State of Health (SOH %)">
                    <input type="number" min={0} max={100} value={form.batterySOH} onChange={(e) => setForm({ ...form, batterySOH: e.target.value })} placeholder="e.g. 92" className="form-input" />
                  </FormField>
                  <FormField label="Range (km, CLTC)">
                    <input type="number" value={form.rangeKm} onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} placeholder="e.g. 450" className="form-input" />
                  </FormField>
                  <FormField label="Charging Connector Type">
                    <select value={form.chargingType} onChange={(e) => setForm({ ...form, chargingType: e.target.value })} className="form-input">
                      {CHARGING_TYPE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormField>
                </div>
                <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasHomeCharger}
                    onChange={(e) => setForm({ ...form, hasHomeCharger: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-1.5">
                    <Plug className="w-4 h-4 text-emerald-600" /> Home charger included with this vehicle
                  </span>
                </label>
              </div>
            )}

            {/* Contact details */}
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Your Contact Details</h3>
              <p className="text-xs text-slate-400 mb-3">
                Shown to buyers only after they message you about this listing — not published publicly on the listing itself.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone Number">
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233 20 000 0000" className="form-input" />
                </FormField>
                <FormField label="WhatsApp Number">
                  <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+233 20 000 0000" className="form-input" />
                </FormField>
              </div>
            </div>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe the vehicle condition, features, service history, and any notable details..."
                className="form-input resize-none"
              />
            </FormField>

            {/* Vehicle photo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Vehicle Photos (Required — min {MIN_PHOTOS}, max {MAX_PHOTOS})
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Upload real photos of the actual vehicle you're listing — exterior, interior, and engine bay.
                Buyers trust listings with clear, honest photos, and your listing won't be approved without them.
              </p>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                  {photos.map((p, i) => (
                    <div key={p.preview} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={p.preview} alt={`Vehicle photo ${i + 1}`} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < MAX_PHOTOS && (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                  <ImagePlus className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    {photos.length === 0 ? 'Add photos of your vehicle' : 'Add more photos'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPG or PNG. The first photo becomes the cover image.</p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-3 text-sm text-green-600 font-semibold hover:underline"
                  >
                    Choose Photos
                  </button>
                </div>
              )}
            </div>

            {/* Inspection upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Inspection Report (Required)</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload a verified inspection report from SGS, TÜV, or CMA. Your listing will remain pending until verified.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setInspectionFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm text-green-600 font-semibold hover:underline"
              >
                Choose File
              </button>
              {inspectionFile && (
                <p className="text-xs text-slate-600 mt-2">Selected: {inspectionFile.name}</p>
              )}
            </div>

            {/* Listing fee / tier */}
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Listing Plan</h3>
              <p className="text-xs text-slate-400 mb-3">Paid securely via Paystack once you submit. Your listing goes to admin review either way.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TierOption
                  selected={form.tier === 'standard'}
                  onSelect={() => setForm({ ...form, tier: 'standard' })}
                  title={LISTING_FEES.standard.label}
                  price={LISTING_FEES.standard.amountUsd}
                  description={LISTING_FEES.standard.description}
                />
                <TierOption
                  selected={form.tier === 'premium'}
                  onSelect={() => setForm({ ...form, tier: 'premium' })}
                  title={LISTING_FEES.premium.label}
                  price={LISTING_FEES.premium.amountUsd}
                  description={LISTING_FEES.premium.description}
                  highlight
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}

            {/* Trust info */}
            <div className="bg-emerald-50 rounded-xl p-4 flex gap-3">
              <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold mb-1">Staged Payment Protection</p>
                <p className="text-xs">Buyers never pay the full amount upfront — final payment is only released once the vehicle's shipment has been verified.</p>
              </div>
            </div>

            {form.steeringSide === 'LHD' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold mb-0.5">LHD Notice for Ghana Buyers</p>
                  <p className="text-xs">Ghana uses RHD. LHD vehicles require conversion ($2,000-5,000) or may only be used privately. Make sure buyers are aware.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setRole('select')} className="px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {uploading ? 'Submitting...' : `Continue to Payment ($${LISTING_FEES[form.tier].amountUsd})`}
              </button>
            </div>
          </form>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signup" />

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          outline: none;
          transition: all 0.2s;
          font-size: 0.875rem;
          background: white;
        }
        .form-input:focus {
          border-color: #ea580c;
          box-shadow: 0 0 0 2px #fed7aa;
        }
      `}</style>
    </div>
  );
}

function PendingReviewNotice({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl border border-slate-200 p-10">
      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
        <Hourglass className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Your Application is Under Review</h2>
      <p className="text-slate-500 mb-6">
        Our team is verifying the details you submitted. We'll email you as soon as you're approved to list
        vehicles — this usually takes 1-2 business days.
      </p>
      <button onClick={onBack} className="text-green-600 font-semibold hover:underline">
        ← Back
      </button>
    </div>
  );
}

function TierOption({
  selected, onSelect, title, price, description, highlight,
}: {
  selected: boolean; onSelect: () => void; title: string; price: number; description: string; highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border-2 p-4 transition-colors ${
        selected ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
          {highlight && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
          {title}
        </span>
        <span className="font-bold text-slate-900">${price}</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </button>
  );
}

function RoleStep({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {text.startsWith('Get verified') ? (
        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      )} {text}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
