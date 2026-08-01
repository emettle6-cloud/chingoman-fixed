import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, SparePart } from '@/types';
import { CHINESE_PORTS, MAKES, VEHICLE_TYPE_LABELS, YEAR_RANGE, PART_CATEGORIES, PART_CONDITIONS } from '@/lib/constants';

const inputClass = 'w-full px-3.5 py-2 rounded-lg border border-slate-300 outline-none transition-all text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100';
const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

interface EditVehicleModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSaved: () => void;
}

export function EditVehicleModal({ vehicle, onClose, onSaved }: EditVehicleModalProps) {
  const [form, setForm] = useState({
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    vehicle_type: vehicle.vehicle_type,
    steering_side: vehicle.steering_side,
    price_usd: String(vehicle.price_usd ?? ''),
    mileage_km: vehicle.mileage_km != null ? String(vehicle.mileage_km) : '',
    color: vehicle.color ?? '',
    condition: vehicle.condition,
    port_china: vehicle.port_china,
    description: vehicle.description ?? '',
    battery_capacity_kwh: vehicle.battery_capacity_kwh != null ? String(vehicle.battery_capacity_kwh) : '',
    battery_soh: vehicle.battery_soh != null ? String(vehicle.battery_soh) : '',
    range_km: vehicle.range_km != null ? String(vehicle.range_km) : '',
    charging_type: vehicle.charging_type ?? '',
    shipping_available: vehicle.shipping_available,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isElectrified = form.vehicle_type !== 'ICE';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.make.trim() || !form.model.trim()) {
      setError('Make and model are required.');
      return;
    }
    if (!form.price_usd || Number(form.price_usd) <= 0) {
      setError('Please enter a valid price.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        vehicle_type: form.vehicle_type,
        steering_side: form.steering_side,
        price_usd: Number(form.price_usd),
        mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        color: form.color.trim() || null,
        condition: form.condition,
        port_china: form.port_china,
        description: form.description.trim() || null,
        battery_capacity_kwh: isElectrified && form.battery_capacity_kwh ? Number(form.battery_capacity_kwh) : null,
        battery_soh: isElectrified && form.battery_soh ? Number(form.battery_soh) : null,
        range_km: isElectrified && form.range_km ? Number(form.range_km) : null,
        charging_type: isElectrified ? (form.charging_type || null) : null,
        shipping_available: form.shipping_available,
      })
      .eq('id', vehicle.id);
    setSaving(false);

    if (updateError) {
      setError(`Could not save changes: ${updateError.message}`);
      return;
    }
    onSaved();
  }

  return (
    <ModalShell title={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Make">
            <select value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className={inputClass}>
              {!MAKES.includes(form.make) && <option value={form.make}>{form.make}</option>}
              {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Model">
            <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Year">
            <input type="number" min={YEAR_RANGE.min} max={YEAR_RANGE.max} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Powertrain">
            <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as Vehicle['vehicle_type'] })} className={inputClass}>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Steering">
            <select value={form.steering_side} onChange={(e) => setForm({ ...form, steering_side: e.target.value as Vehicle['steering_side'] })} className={inputClass}>
              <option value="LHD">LHD</option>
              <option value="RHD">RHD</option>
            </select>
          </Field>
          <Field label="Condition">
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={inputClass}>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </Field>
          <Field label="Price (USD)">
            <input type="number" min={0} value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Mileage (km)">
            <input type="number" min={0} value={form.mileage_km} onChange={(e) => setForm({ ...form, mileage_km: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Color">
            <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputClass} />
          </Field>
          <Field label="China Port">
            <select value={form.port_china} onChange={(e) => setForm({ ...form, port_china: e.target.value })} className={inputClass}>
              {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        {isElectrified && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <Field label="Battery (kWh)">
              <input type="number" step="0.1" value={form.battery_capacity_kwh} onChange={(e) => setForm({ ...form, battery_capacity_kwh: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Battery SOH (%)">
              <input type="number" min={0} max={100} value={form.battery_soh} onChange={(e) => setForm({ ...form, battery_soh: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Range (km)">
              <input type="number" value={form.range_km} onChange={(e) => setForm({ ...form, range_km: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Charging Type">
              <input type="text" value={form.charging_type} onChange={(e) => setForm({ ...form, charging_type: e.target.value })} className={inputClass} />
            </Field>
          </div>
        )}

        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} resize-none`} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.shipping_available} onChange={(e) => setForm({ ...form, shipping_available: e.target.checked })} />
          Shipping available
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose} className="text-slate-600 font-medium px-5 py-2.5 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface EditPartModalProps {
  part: SparePart;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPartModal({ part, onClose, onSaved }: EditPartModalProps) {
  const [form, setForm] = useState({
    name: part.name,
    category: part.category,
    condition: part.condition,
    price_usd: String(part.price_usd ?? ''),
    port_china: part.port_china,
    description: part.description ?? '',
    compatible_make: part.compatible_make ?? '',
    compatible_model: part.compatible_model ?? '',
    compatible_year_from: part.compatible_year_from != null ? String(part.compatible_year_from) : '',
    compatible_year_to: part.compatible_year_to != null ? String(part.compatible_year_to) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Please give the part a name.');
      return;
    }
    if (!form.price_usd || Number(form.price_usd) <= 0) {
      setError('Please enter a valid price.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('spare_parts')
      .update({
        name: form.name.trim(),
        category: form.category,
        condition: form.condition,
        price_usd: Number(form.price_usd),
        port_china: form.port_china,
        description: form.description.trim() || null,
        compatible_make: form.compatible_make.trim() || null,
        compatible_model: form.compatible_model.trim() || null,
        compatible_year_from: form.compatible_year_from ? Number(form.compatible_year_from) : null,
        compatible_year_to: form.compatible_year_to ? Number(form.compatible_year_to) : null,
      })
      .eq('id', part.id);
    setSaving(false);

    if (updateError) {
      setError(`Could not save changes: ${updateError.message}`);
      return;
    }
    onSaved();
  }

  return (
    <ModalShell title={`Edit ${part.name}`} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Part Name">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {!PART_CATEGORIES.includes(form.category as (typeof PART_CATEGORIES)[number]) && <option value={form.category}>{form.category}</option>}
              {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Condition">
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={inputClass}>
              {!PART_CONDITIONS.includes(form.condition as (typeof PART_CONDITIONS)[number]) && <option value={form.condition}>{form.condition}</option>}
              {PART_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (USD)">
            <input type="number" min={0} value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} className={inputClass} />
          </Field>
          <Field label="China Port">
            <select value={form.port_china} onChange={(e) => setForm({ ...form, port_china: e.target.value })} className={inputClass}>
              {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Compatible Make">
            <input type="text" value={form.compatible_make} onChange={(e) => setForm({ ...form, compatible_make: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Compatible Model">
            <input type="text" value={form.compatible_model} onChange={(e) => setForm({ ...form, compatible_model: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Compatible Year From">
            <input type="number" value={form.compatible_year_from} onChange={(e) => setForm({ ...form, compatible_year_from: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Compatible Year To">
            <input type="number" value={form.compatible_year_to} onChange={(e) => setForm({ ...form, compatible_year_to: e.target.value })} className={inputClass} />
          </Field>
        </div>

        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} resize-none`} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose} className="text-slate-600 font-medium px-5 py-2.5 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
