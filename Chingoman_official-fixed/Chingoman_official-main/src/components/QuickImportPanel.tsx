import { useState } from 'react';
import { Wand2, Car, Wrench, ImagePlus, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CHINESE_PORTS, YEAR_RANGE, PART_CATEGORIES, PART_CONDITIONS } from '@/lib/constants';
import type { VehicleType } from '@/types';

interface ParsedFields {
  title: string;
  price: number | null;
  images: string[];
  description: string;
}

const IMAGE_URL_RE = /https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;

// Best-effort extraction from an arbitrary pasted JSON blob — every source
// site names its fields differently, so this looks for common patterns
// rather than assuming one exact schema. The admin reviews and corrects
// everything below before it's ever submitted.
function extractFields(raw: string): { parsed: ParsedFields | null; error: string | null } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    // Not valid JSON — fall back to scanning the raw text for image URLs and a price,
    // so a person pasting a chunk of HTML or a loose text blob still gets something.
    const images = Array.from(new Set(raw.match(IMAGE_URL_RE) ?? [])).slice(0, 10);
    const priceMatch = raw.match(/(?:price|cost)["\s:]*\$?\s*([\d,]+(?:\.\d+)?)/i);
    if (images.length === 0 && !priceMatch) {
      return { parsed: null, error: "That doesn't look like JSON and no price or image URLs were found in it. Paste the raw API response or product JSON." };
    }
    return {
      parsed: {
        title: '',
        price: priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null,
        images,
        description: '',
      },
      error: null,
    };
  }

  let title = '';
  let price: number | null = null;
  let description = '';
  const images = new Set<string>();

  const titleKeys = /^(title|name|product[_-]?name|subject|productTitle)$/i;
  const priceKeys = /^(price|cost|unit[_-]?price|min[_-]?price|amount|salePrice)$/i;
  const descKeys = /^(description|desc|detail|details|productDescription)$/i;
  const imageKeys = /^(image|images|photo|photos|picture|pictures|thumbnail|thumbnails|imageUrl|pictureUrl|imgUrl)s?$/i;

  function visit(node: unknown, depth: number) {
    if (depth > 6 || node === null || node === undefined) return;

    if (typeof node === 'string' && IMAGE_URL_RE.test(node)) {
      const found = node.match(IMAGE_URL_RE);
      found?.forEach((u) => images.add(u));
      IMAGE_URL_RE.lastIndex = 0;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }

    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (!title && titleKeys.test(key) && typeof value === 'string') title = value;
        if (price === null && priceKeys.test(key)) {
          const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
          if (!Number.isNaN(num) && num > 0) price = num;
        }
        if (!description && descKeys.test(key) && typeof value === 'string' && value.length > 20) description = value;
        if (imageKeys.test(key)) {
          if (typeof value === 'string' && /^https?:\/\//.test(value)) images.add(value);
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (typeof v === 'string' && /^https?:\/\//.test(v)) images.add(v);
              else if (v && typeof v === 'object') visit(v, depth + 1);
            });
          }
        }
        visit(value, depth + 1);
      }
    }
  }

  visit(data, 0);

  if (!title && price === null && images.size === 0) {
    return { parsed: null, error: "Couldn't find a title, price, or images in that JSON. You can still fill everything in manually below." };
  }

  return {
    parsed: { title, price, images: Array.from(images).slice(0, 10), description },
    error: null,
  };
}

// Cheap heuristic to pre-fill year/make/model from a title like
// "2022 BYD Han EV Premium" — admin corrects whatever it gets wrong.
function guessVehicleFields(title: string) {
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  const withoutYear = title.replace(yearMatch?.[0] ?? '', '').trim();
  const words = withoutYear.split(/\s+/).filter(Boolean);
  const make = words[0] ?? '';
  const model = words.slice(1).join(' ');
  return { year, make, model };
}

export function QuickImportPanel() {
  const [rawInput, setRawInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFields | null>(null);
  const [kind, setKind] = useState<'vehicle' | 'part'>('vehicle');

  const [markupType, setMarkupType] = useState<'percent' | 'flat'>('percent');
  const [markupValue, setMarkupValue] = useState('10');
  const [sourcePrice, setSourcePrice] = useState('');
  const [finalPrice, setFinalPrice] = useState('');

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('ICE');
  const [steeringSide, setSteeringSide] = useState<'LHD' | 'RHD'>('LHD');
  const [portChina, setPortChina] = useState<string>(CHINESE_PORTS[0]);

  const [partName, setPartName] = useState('');
  const [partCategory, setPartCategory] = useState<string>(PART_CATEGORIES[0]);
  const [partCondition, setPartCondition] = useState<string>(PART_CONDITIONS[1]);

  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleParse() {
    setSubmitError(null);
    const { parsed: result, error } = extractFields(rawInput);
    setParseError(error);
    if (!result) return;

    setParsed(result);
    setDescription(result.description);
    setImages(result.images);
    if (result.price !== null) {
      setSourcePrice(String(result.price));
      applyMarkup(result.price, markupType, markupValue);
    }
    if (result.title) {
      const guess = guessVehicleFields(result.title);
      if (guess.year) setYear(String(guess.year));
      setMake(guess.make);
      setModel(guess.model);
      setPartName(result.title);
    }
  }

  function applyMarkup(base: number, type: 'percent' | 'flat', value: string) {
    const num = Number(value) || 0;
    const result = type === 'percent' ? base * (1 + num / 100) : base + num;
    setFinalPrice(result.toFixed(2));
  }

  function onMarkupChange(type: 'percent' | 'flat', value: string) {
    setMarkupType(type);
    setMarkupValue(value);
    if (sourcePrice) applyMarkup(Number(sourcePrice), type, value);
  }

  function onSourcePriceChange(value: string) {
    setSourcePrice(value);
    if (value) applyMarkup(Number(value), markupType, markupValue);
  }

  function addImageUrl() {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resetAll() {
    setRawInput(''); setParseError(null); setParsed(null);
    setSourcePrice(''); setFinalPrice(''); setMake(''); setModel(''); setYear('');
    setPartName(''); setDescription(''); setImages([]); setSubmitted(false); setSubmitError(null);
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!finalPrice || Number(finalPrice) <= 0) {
      setSubmitError('Enter a valid final price.');
      return;
    }
    if (images.length === 0) {
      setSubmitError('Add at least one image URL.');
      return;
    }

    setSubmitting(true);

    if (kind === 'vehicle') {
      if (!make || !model || !year) {
        setSubmitting(false);
        setSubmitError('Make, model, and year are required.');
        return;
      }
      const { error } = await supabase.from('vehicles').insert({
        seller_id: null,
        make, model, year: Number(year),
        vehicle_type: vehicleType,
        steering_side: steeringSide,
        price_usd: Number(finalPrice),
        port_china: portChina,
        images,
        description: description || null,
        status: 'pending',
      });
      setSubmitting(false);
      if (error) { setSubmitError(`Could not create listing: ${error.message}`); return; }
    } else {
      if (!partName) {
        setSubmitting(false);
        setSubmitError('Part name is required.');
        return;
      }
      const { error } = await supabase.from('spare_parts').insert({
        seller_id: null,
        name: partName,
        category: partCategory,
        condition: partCondition,
        price_usd: Number(finalPrice),
        port_china: portChina,
        images,
        description: description || null,
        status: 'pending',
      });
      setSubmitting(false);
      if (error) { setSubmitError(`Could not create listing: ${error.message}`); return; }
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
        <p className="font-semibold text-slate-900">Listing created</p>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          It's in "Pending Review" on the {kind === 'vehicle' ? 'Vehicles' : 'Spare Parts'} tab — approve it from there to make it live.
        </p>
        <button onClick={resetAll} className="text-green-600 font-semibold hover:underline text-sm">
          Import another listing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        Paste the raw JSON you copied from the source listing (its API response, or a product-data block from the page).
        This tool never fetches anything itself — you bring the data, it just extracts fields, applies your markup, and
        builds the listing. Everything is editable before you submit, and it goes to Pending Review like any other listing.
      </div>

      {/* Step 1: paste + parse */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Paste listing data</label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={6}
          placeholder='{"title": "2022 BYD Han EV", "price": 24500, "images": ["https://..."], "description": "..."}'
          className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm font-mono outline-none focus:border-green-400 resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleParse}
            disabled={!rawInput.trim()}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Wand2 className="w-4 h-4" /> Extract Fields
          </button>
          {parseError && (
            <span className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {parseError}
            </span>
          )}
          {parsed && !parseError && (
            <span className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Extracted — review and complete the fields below
            </span>
          )}
        </div>
      </div>

      {/* Step 2: listing type */}
      <div className="flex gap-2">
        <button
          onClick={() => setKind('vehicle')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
            kind === 'vehicle' ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Car className="w-4 h-4" /> Vehicle
        </button>
        <button
          onClick={() => setKind('part')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
            kind === 'part' ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wrench className="w-4 h-4" /> Spare Part
        </button>
      </div>

      {/* Step 3: details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {kind === 'vehicle' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Make"><input value={make} onChange={(e) => setMake(e.target.value)} className="input" placeholder="BYD" /></Field>
            <Field label="Model"><input value={model} onChange={(e) => setModel(e.target.value)} className="input" placeholder="Han EV" /></Field>
            <Field label="Year">
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input" placeholder="2022" min={YEAR_RANGE.min} max={YEAR_RANGE.max} />
            </Field>
            <Field label="Type">
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} className="input bg-white">
                {(['ICE', 'Hybrid', 'PHEV', 'EREV', 'EV'] as VehicleType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Steering">
              <select value={steeringSide} onChange={(e) => setSteeringSide(e.target.value as 'LHD' | 'RHD')} className="input bg-white">
                <option value="LHD">LHD</option>
                <option value="RHD">RHD</option>
              </select>
            </Field>
            <Field label="Port (China)">
              <select value={portChina} onChange={(e) => setPortChina(e.target.value)} className="input bg-white">
                {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Part Name"><input value={partName} onChange={(e) => setPartName(e.target.value)} className="input" placeholder="Front Bumper" /></Field>
            <Field label="Category">
              <select value={partCategory} onChange={(e) => setPartCategory(e.target.value)} className="input bg-white">
                {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Condition">
              <select value={partCondition} onChange={(e) => setPartCondition(e.target.value)} className="input bg-white">
                {PART_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Port (China)">
              <select value={portChina} onChange={(e) => setPortChina(e.target.value)} className="input bg-white">
                {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        )}

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" />
        </Field>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Images ({images.length})</label>
          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
              {images.map((url, i) => (
                <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                  <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
              placeholder="https://... image URL"
              className="input flex-1"
            />
            <button onClick={addImageUrl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <ImagePlus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <Field label="Source Price (USD)">
            <input type="number" value={sourcePrice} onChange={(e) => onSourcePriceChange(e.target.value)} className="input" placeholder="20000" />
          </Field>
          <Field label="Your Markup">
            <div className="flex gap-1.5">
              <select value={markupType} onChange={(e) => onMarkupChange(e.target.value as 'percent' | 'flat', markupValue)} className="input bg-white w-24">
                <option value="percent">%</option>
                <option value="flat">$ flat</option>
              </select>
              <input type="number" value={markupValue} onChange={(e) => onMarkupChange(markupType, e.target.value)} className="input" />
            </div>
          </Field>
          <Field label="Final Listed Price (USD)">
            <input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} className="input font-semibold" />
          </Field>
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {submitting ? 'Creating...' : 'Create Pending Listing'}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        .input:focus { border-color: #16a34a; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
