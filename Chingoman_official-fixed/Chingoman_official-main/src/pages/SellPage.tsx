import { useRef, useState } from 'react';
import {
  UserCheck, Store, ArrowRight, CheckCircle2, Info, Ship, FileText,
  Lock, BadgeCheck, Upload, AlertTriangle,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import { MAKES, CHINESE_PORTS, VEHICLE_TYPE_LABELS, YEAR_RANGE } from '@/lib/constants';

type Role = 'select' | 'marketer' | 'direct';

export function SellPage() {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [role, setRole] = useState<Role>('select');
  const [authOpen, setAuthOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    make: '', model: '', year: '2023', vehicleType: 'ICE',
    steeringSide: 'LHD', price: '', mileage: '', color: '',
    portChina: 'Guangzhou', description: '',
  });
  const [inspectionFile, setInspectionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startFlow(r: Role) {
    if (!user) { setAuthOpen(true); return; }
    setRole(r);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setSubmitError(null);

    if (!inspectionFile) {
      setSubmitError('Please upload an inspection report before submitting.');
      return;
    }

    setUploading(true);

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
      listing_type: role,
      description: form.description,
      status: 'pending',
      shipping_available: true,
      is_verified: false,
      is_featured: false,
      images: [],
      inspection_report_url: publicUrl,
    }).select().single();

    setUploading(false);

    if (insertError) {
      setSubmitError(`Could not create listing: ${insertError.message}`);
      return;
    }

    if (vehicle) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Listing Submitted!</h1>
        <p className="text-slate-500 mb-6">
          Your vehicle has been submitted for review. Once our team verifies the inspection report,
          your listing will go live on Chin-go-man.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate({ name: 'browse' })} className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
            Browse Vehicles
          </button>
          <button onClick={() => { setSubmitted(false); setRole('select'); }} className="border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors">
            List Another
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
              <RoleStep text="List a vehicle from a Chinese port" />
              <RoleStep text="Provide inspection reports from Chinese ports" />
              <RoleStep text="Coordinate shipping to Tema or Lagos" />
              <RoleStep text="Earn commission on successful sales" />
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
              <RoleStep text="List your own vehicle directly" />
              <RoleStep text="Upload your own inspection documents" />
              <RoleStep text="Negotiate directly with buyers" />
              <RoleStep text="Pay a flat listing fee (no commission)" />
            </div>
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:gap-3 transition-all">
              Continue as Direct Seller <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Listing form */}
      {role !== 'select' && (
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
                {' '}All listings require a verified inspection report before going live.
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

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe the vehicle condition, features, service history, and any notable details..."
                className="form-input resize-none"
              />
            </FormField>

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

            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}

            {/* Trust info */}
            <div className="bg-emerald-50 rounded-xl p-4 flex gap-3">
              <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold mb-1">Escrow Protection</p>
                <p className="text-xs">All transactions are protected by escrow. Buyers' payments are held until the vehicle clears customs and passes inspection at the destination port.</p>
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
                {uploading ? 'Submitting...' : 'Submit Listing for Review'}
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

function RoleStep({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {text}
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
