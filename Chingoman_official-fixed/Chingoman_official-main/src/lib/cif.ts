import { DESTINATION_PORTS } from './constants';

export interface CIFInput {
  carValue: number;
  portChina: string;
  portDestination: string;
  vehicleType: string;
}

export interface CIFResult {
  carValue: number;
  freight: number;
  insurance: number;
  totalCIF: number;
  dutyEstimate: number;
  landedCost: number;
  destinationPort: string;
  country: 'Ghana' | 'Nigeria' | 'Togo' | 'Côte d\'Ivoire' | 'Other';
  breakdown: { label: string; amount: number }[];
}

const FREIGHT_MULTIPLIER: Record<string, number> = {
  EV: 1.15,
  Hybrid: 1.05,
  PHEV: 1.05,
  EREV: 1.05,
  ICE: 1.0,
};

// Rough proxy for engine-size-based duty banding, keyed by powertrain.
const DUTY_RATE_GENERIC: Record<string, number> = {
  EV: 0.05,
  Hybrid: 0.10,
  PHEV: 0.10,
  EREV: 0.10,
  ICE: 0.20,
};

function round(n: number) {
  return Math.round(n);
}

function countryForPort(portDestination: string): 'Ghana' | 'Nigeria' | 'Togo' | 'Côte d\'Ivoire' | 'Other' {
  const dest = DESTINATION_PORTS.find((p) => p.name === portDestination);
  if (!dest) return 'Other';
  if (dest.code.startsWith('GHA')) return 'Ghana';
  if (dest.code === 'NGA') return 'Nigeria';
  if (dest.code === 'TGO') return 'Togo';
  if (dest.code === 'CIV') return 'Côte d\'Ivoire';
  return 'Other';
}

function freightAndInsurance(input: CIFInput) {
  const dest = DESTINATION_PORTS.find((p) => p.name === input.portDestination);
  const baseFreight = dest?.freightBase ?? 3200;
  const multiplier = FREIGHT_MULTIPLIER[input.vehicleType] ?? 1.0;
  const freight = round(baseFreight * multiplier);
  const insurance = round((input.carValue + freight) * 0.025);
  return { freight, insurance };
}

/**
 * Ghana: Customs Duty + Processing Fee + ECOWAS Levy + AU Levy stacked on CIF,
 * then NHIL + GETFund on the duty-inclusive value, then VAT (15%) on top of that.
 * NOTE: Ghana Customs (GRA) assesses duty using its own VIN-based reference
 * price system, not the buyer's invoice price — so this is an estimate only.
 */
function calculateGhana(input: CIFInput, freight: number, insurance: number): CIFResult {
  const cif = input.carValue + freight + insurance;

  const dutyRate = DUTY_RATE_GENERIC[input.vehicleType] ?? 0.20;
  const duty = round(cif * dutyRate);
  const processingFee = round(cif * 0.01);
  const ecowasLevy = round(cif * 0.005);
  const auLevy = round(cif * 0.002);

  const dutyInclusive = cif + duty + processingFee + ecowasLevy + auLevy;

  const nhil = round(dutyInclusive * 0.025);
  const getfund = round(dutyInclusive * 0.025);
  const vat = round((dutyInclusive + nhil + getfund) * 0.15);

  const totalTaxes = duty + processingFee + ecowasLevy + auLevy + nhil + getfund + vat;
  const landedCost = cif + totalTaxes;

  return {
    carValue: input.carValue,
    freight,
    insurance,
    totalCIF: cif,
    dutyEstimate: totalTaxes,
    landedCost,
    destinationPort: input.portDestination,
    country: 'Ghana',
    breakdown: [
      { label: 'Vehicle Price (FOB)', amount: input.carValue },
      { label: 'Freight', amount: freight },
      { label: 'Marine Insurance', amount: insurance },
      { label: 'CIF Value', amount: cif },
      { label: 'Import Duty', amount: duty },
      { label: 'Processing Fee (1%)', amount: processingFee },
      { label: 'ECOWAS Levy (0.5%)', amount: ecowasLevy },
      { label: 'AU Levy (0.2%)', amount: auLevy },
      { label: 'NHIL (2.5%)', amount: nhil },
      { label: 'GETFund Levy (2.5%)', amount: getfund },
      { label: 'VAT (15%)', amount: vat },
      { label: 'Estimated Landed Cost', amount: landedCost },
    ],
  };
}

/**
 * Nigeria: Import Duty (20% used vehicles) + 7% Surcharge on duty + NAC Levy (5%,
 * cut from 15% on 1 Jul 2026) + ETLS (0.5%) stacked on CIF, then VAT (7.5%) on the
 * stacked total. NOTE: Nigeria Customs Service assesses duty using its own
 * VIN-based "Fair Market Value", not the buyer's invoice price — estimate only.
 */
function calculateNigeria(input: CIFInput, freight: number, insurance: number): CIFResult {
  const cif = input.carValue + freight + insurance;

  const duty = round(cif * 0.20);
  const surcharge = round(duty * 0.07);
  const nacLevy = round(cif * 0.05);
  const etls = round(cif * 0.005);

  const preVAT = cif + duty + surcharge + nacLevy + etls;
  const vat = round(preVAT * 0.075);

  const totalTaxes = duty + surcharge + nacLevy + etls + vat;
  const landedCost = cif + totalTaxes;

  return {
    carValue: input.carValue,
    freight,
    insurance,
    totalCIF: cif,
    dutyEstimate: totalTaxes,
    landedCost,
    destinationPort: input.portDestination,
    country: 'Nigeria',
    breakdown: [
      { label: 'Vehicle Price (FOB)', amount: input.carValue },
      { label: 'Freight', amount: freight },
      { label: 'Marine Insurance', amount: insurance },
      { label: 'CIF Value', amount: cif },
      { label: 'Import Duty (20%)', amount: duty },
      { label: 'Surcharge (7% of Duty)', amount: surcharge },
      { label: 'NAC Levy (5%)', amount: nacLevy },
      { label: 'ETLS Levy (0.5%)', amount: etls },
      { label: 'VAT (7.5%)', amount: vat },
      { label: 'Estimated Landed Cost', amount: landedCost },
    ],
  };
}

/**
 * Togo & Côte d'Ivoire: both members of WAEMU/UEMOA, sharing a Common External
 * Tariff — Customs Duty (top band, 35%, as used vehicles are treated as finished
 * consumer goods) + Statistical Fee (1%) + Community Solidarity Levy (1%) +
 * ECOWAS Community Levy (0.5%) + AU Levy (0.2%) stacked on CIF, then VAT (18%)
 * on the duty-inclusive value.
 * CONFIDENCE NOTE: this is the least-verified of the four structures here — no
 * EV/hybrid duty discount was found for either country (unlike Ghana/Nigeria),
 * and the exact used-vehicle duty band vs. the general 35% ceiling isn't confirmed
 * against an official government schedule. Verify with a customs broker in-country
 * before relying on this for real quotes.
 */
function calculateUEMOA(
  input: CIFInput,
  freight: number,
  insurance: number,
  country: 'Togo' | 'Côte d\'Ivoire',
): CIFResult {
  const cif = input.carValue + freight + insurance;

  const duty = round(cif * 0.35);
  const statisticalFee = round(cif * 0.01);
  const solidarityLevy = round(cif * 0.01);
  const ecowasLevy = round(cif * 0.005);
  const auLevy = round(cif * 0.002);

  const dutyInclusive = cif + duty + statisticalFee + solidarityLevy + ecowasLevy + auLevy;
  const vat = round(dutyInclusive * 0.18);

  const totalTaxes = duty + statisticalFee + solidarityLevy + ecowasLevy + auLevy + vat;
  const landedCost = cif + totalTaxes;

  return {
    carValue: input.carValue,
    freight,
    insurance,
    totalCIF: cif,
    dutyEstimate: totalTaxes,
    landedCost,
    destinationPort: input.portDestination,
    country,
    breakdown: [
      { label: 'Vehicle Price (FOB)', amount: input.carValue },
      { label: 'Freight', amount: freight },
      { label: 'Marine Insurance', amount: insurance },
      { label: 'CIF Value', amount: cif },
      { label: 'Customs Duty (35%)', amount: duty },
      { label: 'Statistical Fee (1%)', amount: statisticalFee },
      { label: 'Community Solidarity Levy (1%)', amount: solidarityLevy },
      { label: 'ECOWAS Levy (0.5%)', amount: ecowasLevy },
      { label: 'AU Levy (0.2%)', amount: auLevy },
      { label: 'VAT (18%)', amount: vat },
      { label: 'Estimated Landed Cost', amount: landedCost },
    ],
  };
}

/** Fallback for destinations without a verified country-specific tax structure yet. */
function calculateGeneric(input: CIFInput, freight: number, insurance: number): CIFResult {
  const cif = input.carValue + freight + insurance;
  const dutyRate = DUTY_RATE_GENERIC[input.vehicleType] ?? 0.20;
  const dutyEstimate = round(cif * (dutyRate + 0.06));
  const landedCost = cif + dutyEstimate;

  return {
    carValue: input.carValue,
    freight,
    insurance,
    totalCIF: cif,
    dutyEstimate,
    landedCost,
    destinationPort: input.portDestination,
    country: 'Other',
    breakdown: [
      { label: 'Vehicle Price (FOB)', amount: input.carValue },
      { label: 'Freight', amount: freight },
      { label: 'Marine Insurance', amount: insurance },
      { label: 'CIF Value', amount: cif },
      { label: 'Est. Duties & Levies', amount: dutyEstimate },
      { label: 'Estimated Landed Cost', amount: landedCost },
    ],
  };
}

export function calculateCIF(input: CIFInput): CIFResult {
  const { freight, insurance } = freightAndInsurance(input);
  const country = countryForPort(input.portDestination);

  if (country === 'Ghana') return calculateGhana(input, freight, insurance);
  if (country === 'Nigeria') return calculateNigeria(input, freight, insurance);
  if (country === 'Togo' || country === 'Côte d\'Ivoire') return calculateUEMOA(input, freight, insurance, country);
  return calculateGeneric(input, freight, insurance);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
