import type { VehicleType } from '@/types';

export const CHINESE_PORTS = [
  'Guangzhou',
  'Shanghai',
  'Tianjin',
  'Qingdao',
  'Ningbo-Zhoushan',
  'Shenzhen',
  'Dalian',
] as const;

export const DESTINATION_PORTS = [
  { name: 'Tema, Ghana', code: 'GHA', freightBase: 3200, currency: 'USD' },
  { name: 'Lagos (Apapa), Nigeria', code: 'NGA', freightBase: 3500, currency: 'USD' },
  { name: 'Lomé, Togo', code: 'TGO', freightBase: 3100, currency: 'USD' },
  { name: "Abidjan, Côte d'Ivoire", code: 'CIV', freightBase: 3400, currency: 'USD' },
  { name: 'Tema, Ghana (RoRo)', code: 'GHA-RORO', freightBase: 2700, currency: 'USD' },
] as const;

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  ICE: 'ICE (Petrol/Diesel)',
  Hybrid: 'Hybrid (HEV)',
  PHEV: 'Plug-in Hybrid (PHEV)',
  EREV: 'Range Extender (EREV)',
  EV: 'Pure Electric (EV)',
};

export const VEHICLE_TYPE_SHORT: Record<string, string> = {
  ICE: 'ICE',
  Hybrid: 'HEV',
  PHEV: 'PHEV',
  EREV: 'EREV',
  EV: 'EV',
};

export const VEHICLE_TYPE_COLORS: Record<string, string> = {
  ICE: 'bg-slate-100 text-slate-700 border-slate-300',
  Hybrid: 'bg-blue-50 text-blue-700 border-blue-300',
  PHEV: 'bg-cyan-50 text-cyan-700 border-cyan-300',
  EREV: 'bg-teal-50 text-teal-700 border-teal-300',
  EV: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

export const POWERTRAIN_GROUPS: { label: string; value: string; types: VehicleType[] }[] = [
  { label: 'ICE (Petrol/Diesel)', value: 'ICE', types: ['ICE'] },
  { label: 'Hybrid (HEV)', value: 'Hybrid', types: ['Hybrid'] },
  { label: 'Plug-in Hybrid (PHEV)', value: 'PHEV', types: ['PHEV'] },
  { label: 'Range Extender (EREV)', value: 'EREV', types: ['EREV'] },
  { label: 'Pure Electric (EV)', value: 'EV', types: ['EV'] },
];

export const YEAR_RANGE = { min: 2016, max: 2026 };

export const MAKES = [
  'BYD', 'Tesla', 'NIO', 'Li Auto', 'Xpeng', 'Aito', 'Toyota', 'Honda',
  'BMW', 'Mercedes-Benz', 'Audi', 'Chery', 'Geely', 'Haval', 'GAC',
  'SAIC (MG)', 'Peugeot', 'Volkswagen', 'Hyundai', 'Kia', 'Zeekr',
  'Changan', 'Great Wall', 'Mazda', 'Nissan',
];

export const CHARGING_ADVICE: Record<string, string> = {
  'CCS2': 'Compatible with standard DC fast chargers arriving in Ghana and Nigeria. CCS2 is the emerging standard in West Africa — you can charge at newly installed stations in Accra and Lagos.',
  'CCS2 / CHAdeMO': 'Dual-compatible. CCS2 is the West Africa standard; CHAdeMO adapters are available but increasingly rare. Prioritize CCS2 infrastructure.',
  'CCS2 / GB/T': 'Chinese GB/T standard. You will need a GB/T-to-CCS2 adapter for West African charging infrastructure. Budget ~$300-500 for the adapter.',
  'GB/T': 'Chinese-only standard. Requires a GB/T-to-CCS2 adapter for all West African charging. Home AC charging via standard outlet works with a portable charger.',
  'NIO Swap/CCS2': 'NIO battery swap not available in West Africa. Use CCS2 DC fast charging instead. 10-80% charge in ~30 minutes at 100kW+ stations.',
  'Tesla CCS2': 'Tesla Giga Shanghai models use standard CCS2 in China. Fully compatible with West African CCS2 infrastructure. Tesla Superchargers not available in region.',
  'AC Level 2': 'Home/workplace AC charging only. No DC fast charging. A 7kW home charger (Type 2) gives a full charge overnight — ideal for PHEVs and EREVs.',
  'AC Level 1': 'Standard wall outlet charging only. Very slow (~15-20 hours for full charge). Suitable only for plug-in hybrids with small batteries.',
};

export const SOH_RATING = (soh: number | null): { label: string; color: string; description: string } => {
  if (soh === null) return { label: 'N/A', color: 'text-slate-400', description: 'Not applicable — this vehicle does not have a traction battery.' };
  if (soh >= 90) return { label: 'Excellent', color: 'text-emerald-600', description: 'Battery is in near-new condition with minimal degradation.' };
  if (soh >= 80) return { label: 'Very Good', color: 'text-green-600', description: 'Battery health is strong. Expect 85-90% of original range.' };
  if (soh >= 70) return { label: 'Good', color: 'text-amber-600', description: 'Moderate degradation. Range reduced but fully usable for daily driving.' };
  if (soh >= 60) return { label: 'Fair', color: 'text-amber-600', description: 'Significant degradation. Consider battery replacement budget.' };
  return { label: 'Poor', color: 'text-red-600', description: 'Battery replacement recommended. Factor $3,000-8,000 into your budget.' };
};

export const RHD_WARNING = 'Ghana drives on the right and uses Left-Hand Drive (LHD) vehicles, so cars imported from China are a natural fit — no conversion needed.';

export const MONETIZATION_FEATURES = [
  {
    title: 'Listing Fees & Premium Placement',
    description: 'Marketers pay a flat fee per listing (e.g. $15-25). Premium placement puts their vehicle at the top of browse results and on the homepage featured carousel.',
    icon: 'TrendingUp',
  },
  {
    title: 'CIF & Import Service Commission',
    description: "Chin-go-man partners with licensed clearing agents. We charge 2-4% on shipping, customs clearance, and delivery to the buyer's location in Ghana or Nigeria.",
    icon: 'Ship',
  },
  {
    title: 'Verified Inspection & Escrow Fees',
    description: 'Buyers pay $50-100 for a verified port inspection report. Escrow service holds funds until the vehicle clears customs — we charge 1-1.5% of the transaction value.',
    icon: 'ShieldCheck',
  },
];

export const TRUST_FEATURES = [
  {
    title: 'Verified Port Inspections',
    description: 'Every vehicle is inspected by certified companies (SGS, TÜV, CMA) at the Chinese departure port before shipping. Full 50-point report with photos.',
    icon: 'ClipboardCheck',
  },
  {
    title: 'Escrow Payment Protection',
    description: 'You will make the last trunch of payment against verification that your car has been shipped.',
    icon: 'Lock',
  },
  {
    title: 'Battery SOH Transparency',
    description: 'For EVs and hybrids, we report the Battery State of Health (SOH) percentage so you know exactly how much capacity remains before you buy.',
    icon: 'BatteryCharging',
  },
  {
    title: 'Verified Marketer Profiles',
    description: 'Marketers are identity-verified with Ghana Card or NIN. Ratings and reviews from past buyers are visible on every profile.',
    icon: 'BadgeCheck',
  },
];

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  sold: 'Sold',
  out_of_stock: 'Out of Stock',
  rejected: 'Rejected',
  draft: 'Draft',
  pending: 'Pending Review',
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  sold: 'bg-slate-800 text-white border-slate-800',
  out_of_stock: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  draft: 'bg-slate-100 text-slate-600 border-slate-300',
  pending: 'bg-blue-100 text-blue-700 border-blue-300',
};

export const LISTING_FEES: Record<'standard' | 'premium', { label: string; amountUsd: number; description: string }> = {
  standard: {
    label: 'Standard Listing',
    amountUsd: 15,
    description: 'Your vehicle appears in Browse and search results once approved.',
  },
  premium: {
    label: 'Premium Placement',
    amountUsd: 25,
    description: 'Everything in Standard, plus top-of-Browse placement and a spot on the homepage featured carousel.',
  },
};

export const SELLER_VERIFICATION_STATUS_LABELS: Record<string, string> = {
  none: 'Not submitted',
  pending: 'Under review',
  approved: 'Verified',
  rejected: 'Not approved',
};

export const ID_TYPES = [
  'Ghana Card', 'National ID (NIN)', 'Passport', "Driver's License", 'Business Registration Certificate', 'Other',
] as const;

export const PART_CATEGORIES = [
  'Engine & Drivetrain',
  'Body & Exterior',
  'Electrical & Electronics',
  'Battery & EV Components',
  'Interior',
  'Suspension & Brakes',
  'Wheels & Tyres',
  'Lighting',
  'Other',
] as const;

export const PART_CONDITIONS = ['New', 'Used - Excellent', 'Used - Good', 'Refurbished'] as const;

export const ITEM_REQUEST_TYPE_LABELS: Record<string, string> = {
  vehicle: 'A Vehicle',
  spare_part: 'A Spare Part',
  other: 'Something Else',
};

// The official Ghana Revenue Authority (via the UNIPASS/ICUMS single window
// portal) used-vehicle duty calculator. Kept as a named constant so both the
// CIF Calculator and Import Guide pages link to the exact same official URL.
export const GRA_DUTY_CALCULATOR_URL =
  'https://external.unipassghana.com/cl/tm/tax/selectUsedVehicleTaxCalculate.do?decorator=popup&MENU_ID=IIM01S03V02';

export const GRA_DUTY_CHECK_STEPS: string[] = [
  'Open the official GRA/UNIPASS Used Vehicle Duty Calculator using the link below — it opens in a new tab.',
  "Enter the vehicle's Chassis Number (VIN) if you have it, or its make, model, and year of manufacture.",
  'Select the engine capacity (cc) and fuel/powertrain type (petrol, diesel, hybrid, or electric).',
  'Enter the vehicle value (CIF) — you can use the estimate from our CIF Calculator above as a starting point.',
  'Submit the form to see the official breakdown: import duty, VAT, NHIL, GETFund levy, and any EV/hybrid concessions.',
  'Treat this as the authoritative figure for customs purposes — our CIF Calculator gives a quick estimate, but GRA/UNIPASS is the official source.',
];
