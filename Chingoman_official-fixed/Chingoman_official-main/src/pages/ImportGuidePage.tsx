import {
  Ship, FileText, ShieldCheck, Lock, Calculator, BadgeCheck,
  BatteryCharging, ShipWheel, Phone, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';

export function ImportGuidePage() {
  const { navigate } = useRouter();

  const steps = [
    {
      icon: FileText,
      title: '1. Browse & Select',
      description: 'Browse verified vehicles on Chin-go-man. Use filters to find the right make, model, year, and powertrain. Check the inspection report and battery SOH before committing.',
    },
    {
      icon: Calculator,
      title: '2. Calculate Landed Cost',
      description: 'Use our CIF Calculator to estimate the total cost including freight, insurance, and import duties. This gives you the real cost of the vehicle delivered to Tema or Lagos.',
    },
    {
      icon: ShieldCheck,
      title: '3. Escrow Deposit',
      description: 'Place your payment in escrow. Funds are held safely by Chin-go-man and only released to the seller when the vehicle arrives and passes inspection at the destination port.',
    },
    {
      icon: Ship,
      title: '4. Shipping & Tracking',
      description: 'The vehicle is shipped from the Chinese port (Guangzhou, Shanghai, etc.) to your chosen destination port. Track the shipment and receive updates throughout the journey.',
    },
    {
      icon: BadgeCheck,
      title: '5. Customs & Inspection',
      description: 'Upon arrival at Tema (Ghana) or Lagos (Nigeria), the vehicle clears customs. A final inspection confirms the vehicle matches the listing before escrow is released.',
    },
    {
      icon: CheckCircle2,
      title: '6. Take Delivery',
      description: 'Collect your vehicle or arrange local delivery. For LHD vehicles, consider RHD conversion if you plan to use it commercially in Ghana.',
    },
  ];

  const faqs = [
    {
      q: 'Why are most Chinese cars LHD?',
      a: 'China drives on the right, so vehicles manufactured for the Chinese domestic market are Left-Hand Drive (LHD) — and so is Ghana! Ghana drives on the right and uses LHD vehicles, so cars imported from China are a perfect match with no conversion needed.',
    },
    {
      q: 'What is CIF and why does it matter?',
      a: 'CIF stands for Cost, Insurance, and Freight. It is the total price of the vehicle delivered to your destination port, including shipping and marine insurance. Import duties are calculated as a percentage of the CIF value, so knowing your CIF helps you budget accurately.',
    },
    {
      q: 'Are EVs viable in Ghana and West Africa?',
      a: 'EVs are increasingly viable, especially in Accra and Lagos where charging infrastructure is growing. Most Chinese EVs use CCS2 charging, which is the emerging standard in West Africa. However, check the charging compatibility on each listing and consider home charging installation. Battery SOH is reported on every EV listing.',
    },
    {
      q: 'How does escrow protect me?',
      a: 'Your payment is held by Chin-go-man in a secure escrow account. The seller cannot access the funds until the vehicle arrives at the destination port and passes a final inspection. If there is a dispute, our team mediates before any funds are released.',
    },
    {
      q: 'What is the difference between a Marketer and Direct Buyer?',
      a: 'A Marketer is based in Ghana and lists vehicles currently in China, facilitating the entire import process for a commission. A Direct Buyer purchases a vehicle directly from the seller without a middleman. Both paths are protected by escrow and verified inspections.',
    },
    {
      q: 'How long does the import process take?',
      a: 'From purchase to delivery, the process typically takes 4-8 weeks: 1-2 weeks for port processing in China, 3-5 weeks for ocean freight, and 1-2 weeks for customs clearance at the destination port.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Ship className="w-4 h-4" /> Import Guide
        </div>
        <h1 className="text-3xl font-bold text-slate-900">How to Import a Car from China</h1>
        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
          Everything you need to know about buying a vehicle through Chin-go-man — from browsing to delivery at your local port.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-16">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <step.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Key info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        <InfoCard icon={ShipWheel} title="LHD → RHD" text="China and Ghana drives on the right hand side of the road with their cars being LHD. No conversions are required after purchasing cars from China" color="text-amber-600 bg-amber-50" />
        <InfoCard icon={BatteryCharging} title="EV Charging" text="CCS2 is the West Africa standard. Check compatibility on each EV listing. Home chargers recommended." color="text-emerald-600 bg-emerald-50" />
        <InfoCard icon={Lock} title="Escrow Safety" text="Funds held until vehicle clears customs and passes inspection. Never pay sellers directly." color="text-blue-600 bg-blue-50" />
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group bg-white rounded-2xl border border-slate-200 p-5">
              <summary className="font-semibold text-slate-900 cursor-pointer flex items-center justify-between">
                {faq.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to Start Importing?</h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">Browse our verified inventory or calculate your landed cost today.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate({ name: 'browse' })} className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            Browse Vehicles <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate({ name: 'cif' })} className="border border-slate-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors">
            Calculate CIF Cost
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text, color }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}
