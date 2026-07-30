import { useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, X, Lock } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import { CHINESE_PORTS, PART_CATEGORIES, PART_CONDITIONS } from '@/lib/constants';

export function SellPartPage() {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', category: PART_CATEGORIES[0] as string, condition: PART_CONDITIONS[1] as string,
    price: '', portChina: 'Guangzhou', description: '',
    compatibleMake: '', compatibleModel: '', yearFrom: '', yearTo: '',
  });
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 8;
  const MIN_PHOTOS = 1;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!user || !profile) {
      setAuthOpen(true);
      return;
    }
    if (!form.name.trim()) {
      setSubmitError('Please give the part a name.');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setSubmitError('Please enter a valid price.');
      return;
    }
    if (photos.length < MIN_PHOTOS) {
      setSubmitError('Please upload at least one photo of the part.');
      return;
    }

    setUploading(true);

    const uploadedImageUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photoFile = photos[i].file;
      const photoExt = photoFile.name.split('.').pop();
      const photoPath = `${profile.id}/${Date.now()}-${i}.${photoExt}`;

      const { error: photoUploadError } = await supabase.storage
        .from('spare-part-images')
        .upload(photoPath, photoFile);

      if (photoUploadError) {
        setUploading(false);
        setSubmitError(`Photo upload failed: ${photoUploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('spare-part-images')
        .getPublicUrl(photoPath);

      uploadedImageUrls.push(publicUrl);
    }

    const { data: part, error: insertError } = await supabase.from('spare_parts').insert({
      seller_id: profile.id,
      name: form.name.trim(),
      category: form.category,
      condition: form.condition,
      price_usd: Number(form.price),
      port_china: form.portChina,
      description: form.description || null,
      compatible_make: form.compatibleMake || null,
      compatible_model: form.compatibleModel || null,
      compatible_year_from: form.yearFrom ? Number(form.yearFrom) : null,
      compatible_year_to: form.yearTo ? Number(form.yearTo) : null,
      images: uploadedImageUrls,
      status: 'pending',
    }).select().single();

    setUploading(false);

    if (insertError) {
      setSubmitError(`Could not create listing: ${insertError.message}`);
      return;
    }

    if (part) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Part Submitted!</h1>
        <p className="text-slate-500 mb-6">
          Your spare part has been submitted for review. Once approved, it'll go live on Chin-go-man.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate({ name: 'parts' })} className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
            Browse Spare Parts
          </button>
          <button
            onClick={() => {
              photos.forEach((p) => URL.revokeObjectURL(p.preview));
              setPhotos([]);
              setForm({
                name: '', category: PART_CATEGORIES[0], condition: PART_CONDITIONS[1],
                price: '', portChina: 'Guangzhou', description: '',
                compatibleMake: '', compatibleModel: '', yearFrom: '', yearTo: '',
              });
              setSubmitted(false);
            }}
            className="border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            List Another Part
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-1">List a Spare Part</h1>
      <p className="text-slate-500 mb-8">Sell genuine or used parts sourced from China to buyers across Ghana and beyond.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <FormField label="Part Name">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. BYD Han EV Front Bumper"
            className="form-input"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input bg-white">
              {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Condition">
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="form-input bg-white">
              {PART_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Price (USD)">
            <input type="number" required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150" className="form-input" />
          </FormField>
          <FormField label="Shipping Port (China)">
            <select value={form.portChina} onChange={(e) => setForm({ ...form, portChina: e.target.value })} className="form-input bg-white">
              {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Vehicle Compatibility (optional)</h3>
          <p className="text-xs text-slate-400 mb-3">Helps buyers find the right part for their car.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FormField label="Compatible Make">
              <input type="text" value={form.compatibleMake} onChange={(e) => setForm({ ...form, compatibleMake: e.target.value })} placeholder="e.g. BYD" className="form-input" />
            </FormField>
            <FormField label="Compatible Model">
              <input type="text" value={form.compatibleModel} onChange={(e) => setForm({ ...form, compatibleModel: e.target.value })} placeholder="e.g. Han EV" className="form-input" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Year From">
              <input type="number" value={form.yearFrom} onChange={(e) => setForm({ ...form, yearFrom: e.target.value })} placeholder="2020" className="form-input" />
            </FormField>
            <FormField label="Year To">
              <input type="number" value={form.yearTo} onChange={(e) => setForm({ ...form, yearTo: e.target.value })} placeholder="2024" className="form-input" />
            </FormField>
          </div>
        </div>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Describe the part's condition, any wear, and why it was removed..."
            className="form-input resize-none"
          />
        </FormField>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Part Photos (Required — min {MIN_PHOTOS}, max {MAX_PHOTOS})
          </label>
          <p className="text-xs text-slate-400 mb-3">Upload real photos of the actual part being sold.</p>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                  <img src={p.preview} alt={`Part photo ${i + 1}`} className="w-full h-full object-cover" />
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
                {photos.length === 0 ? 'Add photos of the part' : 'Add more photos'}
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

        {submitError && <p className="text-sm text-red-600 text-center">{submitError}</p>}

        <div className="bg-emerald-50 rounded-xl p-4 flex gap-3">
          <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold mb-1">Secure Transaction</p>
            <p className="text-xs">All communications and payments are handled through the Chin-go-man platform. Never pay sellers directly.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {uploading ? 'Submitting...' : 'Submit Part for Review'}
        </button>
      </form>

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
          border-color: #16a34a;
          box-shadow: 0 0 0 2px #bbf7d0;
        }
      `}</style>
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
