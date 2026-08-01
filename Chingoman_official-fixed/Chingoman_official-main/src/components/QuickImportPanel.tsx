import { useState } from 'react';
import { Wand2, Car, Wrench, ImagePlus, X, CheckCircle2, AlertTriangle, ScanText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { importImageToStorage, type ImportImageBucket } from '@/lib/importImage';
import { CHINESE_PORTS, YEAR_RANGE, PART_CATEGORIES, PART_CONDITIONS } from '@/lib/constants';
import type { VehicleType } from '@/types';

interface ParsedFields {
  title: string;
  price: number | null;
  images: string[];
  description: string;
}

interface ImageEntry {
  id: string;
  sourceUrl: string;
  hostedUrl: string | null;
  status: 'importing' | 'done' | 'failed';
  error?: string;
}

const IMAGE_URL_RE = /https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;

function getMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function getAllMetaContent(html: string, re: RegExp): string[] {
  return Array.from(html.matchAll(re)).map((m) => m[1]).filter(Boolean);
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

// Extraction for a full page's HTML source — the easy path, since getting this
// only takes right-click → View Page Source → Select All → Copy on the listing,
// no dev tools or knowledge of APIs required. Looks for the same Open Graph and
// JSON-LD product tags nearly every e-commerce site already embeds for Google
// Shopping / social link previews, then falls back to a generic scan.
function extractFromHtml(html: string): ParsedFields {
  let title = getMetaContent(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]*)<\/title>/i,
  ]) ?? '';

  let description = getMetaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  ]) ?? '';

  const priceStr = getMetaContent(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']*)["']/i,
    /"price"\s*:\s*"?([\d.]+)"?/i,
    /(?:price|cost)["\s:]*\$?\s*([\d,]+(?:\.\d+)?)/i,
  ]);
  let price = priceStr ? Number(priceStr.replace(/,/g, '')) : null;
  if (price !== null && (Number.isNaN(price) || price <= 0)) price = null;

  const images = new Set<string>();
  getAllMetaContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/gi).forEach((u) => images.add(u));

  // JSON-LD product schema, if present, often has cleaner data than the meta tags.
  const ldBlocks = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const block of ldBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (!title && typeof item.name === 'string') title = item.name;
        if (!description && typeof item.description === 'string') description = item.description;
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (price === null && offer?.price) {
          const num = Number(offer.price);
          if (!Number.isNaN(num) && num > 0) price = num;
        }
        const imgField = item.image;
        if (typeof imgField === 'string') images.add(imgField);
        if (Array.isArray(imgField)) imgField.forEach((u: unknown) => typeof u === 'string' && images.add(u));
      }
    } catch {
      // Not valid JSON in this block — skip it, other sources may still work.
    }
  }

  // Generic fallback: any image-looking URL in the page, in case none of the above matched.
  if (images.size === 0) {
    (html.match(IMAGE_URL_RE) ?? []).slice(0, 20).forEach((u) => images.add(u));
  }

  return {
    title: decodeEntities(title).trim(),
    price,
    images: Array.from(images).slice(0, 10),
    description: decodeEntities(description).trim(),
  };
}

// Best-effort extraction from a pasted JSON blob (e.g. copied from a Network
// tab response) — every source names its fields differently, so this looks
// for common patterns rather than assuming one exact schema.
function extractFromJson(data: unknown): ParsedFields {
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
  return { title, price, images: Array.from(images).slice(0, 10), description };
}

// Entry point: tries JSON first (for anyone who does have a raw API response),
// otherwise treats the paste as page HTML — the easier, recommended path.
// The admin reviews and corrects everything below before it's ever submitted.
function extractFields(raw: string): { parsed: ParsedFields | null; error: string | null } {
  let result: ParsedFields;

  try {
    const data = JSON.parse(raw);
    result = extractFromJson(data);
  } catch {
    result = extractFromHtml(raw);
  }

  if (!result.title && result.price === null && result.images.length === 0) {
    return {
      parsed: null,
      error: "Couldn't find a title, price, or images in that. Make sure you copied the full page source (Ctrl+U or right-click → View Page Source, then Select All → Copy) — you can still fill everything in manually below.",
    };
  }

  return { parsed: result, error: null };
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

// OCR text has no field labels to key off, so this just looks for a
// dollar-sign or "price"-adjacent number, and takes the first substantial
// line as a title guess — much rougher than the page-source path, hence
// the raw text stays visible for the admin to read and copy from directly.
function guessFieldsFromOcrText(text: string): { title: string; price: number | null } {
  const priceMatch = text.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/) ?? text.match(/(?:price|cost)[^\d]{0,10}([\d,]+(?:\.\d{1,2})?)/i);
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null;

  const titleLine = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 8 && l.length < 100 && !/^\$?\d[\d,.\s]*$/.test(l));

  return { title: titleLine ?? '', price: price && price > 0 ? price : null };
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
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showAutofill, setShowAutofill] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');

  async function handleScreenshotUpload(file: File) {
    setOcrError(null);
    setOcrText('');
    setOcrLoading(true);
    try {
      // Loaded on demand so this ~2MB OCR engine never ships to visitors
      // who aren't using this admin tool.
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(file, 'eng');
      const text = data.text.trim();
      setOcrText(text);

      if (!text) {
        setOcrError("Couldn't read any text from that image — try a clearer or higher-resolution screenshot.");
        return;
      }

      const guess = guessFieldsFromOcrText(text);
      if (guess.price !== null) {
        setSourcePrice(String(guess.price));
        applyMarkup(guess.price, markupType, markupValue);
      }
      if (guess.title) {
        const vehicleGuess = guessVehicleFields(guess.title);
        if (vehicleGuess.year) setYear(String(vehicleGuess.year));
        setMake(vehicleGuess.make);
        setModel(vehicleGuess.model);
        setPartName(guess.title);
      }
    } catch (err) {
      setOcrError(`Could not read that image: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setOcrLoading(false);
    }
  }

  function handleParse() {
    setSubmitError(null);
    const { parsed: result, error } = extractFields(rawInput);
    setParseError(error);
    if (!result) return;

    setParsed(result);
    setDescription(result.description);
    setImages([]);
    result.images.forEach((url) => startImageImport(url));
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

  function bucketForKind(): ImportImageBucket {
    return kind === 'vehicle' ? 'vehicle-images' : 'spare-part-images';
  }

  // Downloads the image server-side and re-hosts it in our own storage, so
  // the listing doesn't keep depending on a third-party URL that can be
  // hotlink-blocked, moved, or taken down. Falls back to the original URL
  // (shown with a warning) if the import fails.
  function startImageImport(sourceUrl: string) {
    const id = crypto.randomUUID();
    setImages((prev) => [...prev, { id, sourceUrl, hostedUrl: null, status: 'importing' }]);
    importImageToStorage(sourceUrl, bucketForKind())
      .then((hostedUrl) => {
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, hostedUrl, status: 'done' } : img)));
      })
      .catch((err: unknown) => {
        setImages((prev) => prev.map((img) => (
          img.id === id
            ? { ...img, status: 'failed', error: err instanceof Error ? err.message : 'Import failed' }
            : img
        )));
      });
  }

  function addImageUrl() {
    if (newImageUrl.trim()) {
      startImageImport(newImageUrl.trim());
      setNewImageUrl('');
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
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
    if (images.some((img) => img.status === 'importing')) {
      setSubmitError('Still importing images — wait a moment for that to finish, then submit.');
      return;
    }

    const finalImages = images.map((img) => img.hostedUrl ?? img.sourceUrl);

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
        images: finalImages,
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
        images: finalImages,
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1.5">
        <p className="font-semibold">How this works — no API or tech knowledge needed:</p>
        <p>1. Open the listing on the source site, in another tab.</p>
        <p>2. Type the title, price, and description into the fields below (whatever you see on the page).</p>
        <p>3. For each photo: right-click it on the source page → <span className="font-medium">"Copy image address"</span> (or "Copy image link") → paste it into the Images box below.</p>
        <p>4. Set your markup, check the final price, and submit. It goes to Pending Review — nothing goes live until you approve it.</p>
      </div>

      {/* Optional shortcut for anyone comfortable copying page source, to save typing */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAutofill((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2"><Wand2 className="w-4 h-4 text-slate-400" /> Optional: auto-fill the fields for you</span>
          <span className="text-xs text-slate-400">{showAutofill ? 'Hide' : 'Show'}</span>
        </button>
        {showAutofill && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
            <p className="text-xs text-slate-500">
              On the source listing: right-click the page → <span className="font-medium">"View Page Source"</span> (or Ctrl+U /
              Cmd+Option+U) → Ctrl+A (Cmd+A) to select all → Ctrl+C (Cmd+C) to copy. Paste it below. This tool never fetches
              anything on its own — you bring the page, it just reads what you pasted.
            </p>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={5}
              placeholder="Paste the full page source here..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm font-mono outline-none focus:border-green-400 resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleParse}
                disabled={!rawInput.trim()}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Wand2 className="w-4 h-4" /> Fill Fields Below
              </button>
              {parseError && (
                <span className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {parseError}
                </span>
              )}
              {parsed && !parseError && (
                <span className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Filled in below — review and correct anything before submitting
                </span>
              )}
            </div>

            {/* Screenshot OCR */}
            <div className="pt-3 mt-1 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">
                Or upload a screenshot of the listing — this reads text out of the image in your browser (nothing is
                uploaded anywhere). It's rougher than page source since it can't tell which text is the price vs.
                anything else, so double-check what it finds.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                {ocrLoading ? 'Reading image...' : 'Upload Screenshot'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={ocrLoading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScreenshotUpload(f); }}
                />
              </label>
              {ocrError && (
                <p className="text-xs text-amber-700 flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {ocrError}
                </p>
              )}
              {ocrText && (
                <div className="mt-2.5">
                  <p className="text-xs font-medium text-slate-600 mb-1">Text found in the image (copy anything you need into the fields below):</p>
                  <textarea
                    readOnly
                    value={ocrText}
                    rows={4}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-600 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
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
          <p className="text-xs text-slate-400 mb-2">
            On the source page: right-click a photo → "Copy image address" → paste it below → Add. Each one is downloaded and re-hosted on our own storage automatically, so it won't break if the source site blocks embedding.
          </p>
          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                  <img
                    src={img.hostedUrl ?? img.sourceUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${img.status === 'importing' ? 'opacity-40' : ''}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                  />
                  {img.status === 'importing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {img.status === 'failed' && (
                    <div className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[10px] leading-tight px-1 py-0.5 flex items-center gap-1" title={img.error}>
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Import failed, using original link
                    </div>
                  )}
                  <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          disabled={submitting || images.some((img) => img.status === 'importing')}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {submitting ? 'Creating...' : images.some((img) => img.status === 'importing') ? 'Importing images...' : 'Create Pending Listing'}
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
