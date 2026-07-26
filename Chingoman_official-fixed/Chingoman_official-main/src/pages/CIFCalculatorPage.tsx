import { useState } from 'react';
import { Calculator, Ship, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CHINESE_PORTS, DESTINATION_PORTS, VEHICLE_TYPE_LABELS } from '@/lib/constants';
import { calculateCIF, formatUSD } from '@/lib/cif';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function CIFCalculatorPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [carValue, setCarValue] = useState('25000');
  const [portChina, setPortChina] = useState('Guangzhou');
  const [portDest, setPortDest] = useState('Tema, Ghana');
  const [vehicleType, setVehicleType] = useState('EV');
  const [result, setResult] = useState<ReturnType<typeof calculateCIF> | null>(null);
  const [saved, setSaved] = useState(false);

  function handleCalculate() {
    const r = calculateCIF({
      carValue: Number(carValue) || 0,
      portChina,
      portDestination: portDest,
      vehicleType,
    });
    setResult(r);
    setSaved(false);
  }

  async function handleSave() {
    if (!result) return;
    await supabase.from('shipping_quotes').insert({
      vehicle_price_usd: result.carValue,
      port_china: portChina,
      port_destination: portDest,
      estimated_freight_usd: result.freight,
      estimated_insurance_usd: result.insurance,
      estimated_cif_usd: result.totalCIF,
      notes: `Vehicle type: ${vehicleType}, Landed cost estimate: ${result.landedCost}`,
      status: 'estimate',
      name: user?.email || 'Guest',
      email: user?.email || '',
      phone: '',
    });
    setSaved(true);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Calculator className="w-4 h-4" /> CIF Calculator
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Estimate Your Landed Cost</h1>
        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
          Calculate the Cost, Insurance, and Freight (CIF) value plus estimated duties for importing a vehicle
          from China to ports in Ghana and West Africa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 text-lg mb-5">Vehicle & Shipping Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Price (FOB, USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={carValue}
                  onChange={(e) => setCarValue(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">The price of the car at the Chinese port (Free On Board)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Powertrain Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
              >
                {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Duty rates vary by powertrain — EVs enjoy lower import duty in Ghana</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Chinese Departure Port</label>
              <select
                value={portChina}
                onChange={(e) => setPortChina(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
              >
                {CHINESE_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Port</label>
              <select
                value={portDest}
                onChange={(e) => setPortDest(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
              >
                {DESTINATION_PORTS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" /> Calculate CIF
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 text-lg mb-5">Cost Breakdown</h2>
                <div className="space-y-3">
                  <CostRow label="Vehicle Price (FOB)" value={result.carValue} />
                  <CostRow label="Freight (China → Destination)" value={result.freight} icon={Ship} />
                  <CostRow label="Marine Insurance (2.5%)" value={result.insurance} />
                  <div className="pt-3 border-t border-slate-200">
                    <CostRow label="CIF Total" value={result.totalCIF} bold />
                  </div>
                  <CostRow label="Est. Import Duty + Levies" value={result.dutyEstimate} muted />
                  <div className="pt-3 border-t-2 border-green-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Estimated Landed Cost</span>
                      <span className="text-2xl font-bold text-green-600">{formatUSD(result.landedCost)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="mt-5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saved ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Quote Saved</>
                  ) : (
                    'Save This Quote'
                  )}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">How is this calculated?</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      CIF = Car Price + Freight + Insurance. Freight varies by destination port and powertrain
                      (EVs cost ~15% more to ship due to battery regulations). Insurance is 2.5% of (Car + Freight).
                      Import duty in Ghana: 5% for EVs, 10% for hybrids, 20% for ICE, plus a 6% levy. Actual costs
                      may vary — request a formal quote for exact figures.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate({ name: 'browse' })}
                className="w-full flex items-center justify-center gap-2 text-green-600 font-semibold py-3 hover:underline"
              >
                Browse Vehicles to Import <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">Enter your vehicle details and click Calculate</p>
              <p className="text-sm text-slate-400 mt-1">Your cost breakdown will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CostRow({
  label, value, bold, muted, icon: Icon,
}: { label: string; value: number; bold?: boolean; muted?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-2 ${muted ? 'text-slate-400 text-sm' : 'text-slate-600'} ${bold ? 'font-bold text-slate-900' : ''}`}>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
      </span>
      <span className={`${bold ? 'text-lg font-bold text-slate-900' : muted ? 'text-sm text-slate-500' : 'font-semibold text-slate-800'}`}>
        {formatUSD(value)}
      </span>
    </div>
  );
}
