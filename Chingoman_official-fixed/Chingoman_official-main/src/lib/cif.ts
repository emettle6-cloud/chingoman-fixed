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
  dutyEstimate: number;
  totalCIF: number;
  landedCost: number;
  destinationPort: string;
}

const FREIGHT_MULTIPLIER: Record<string, number> = {
  EV: 1.15,
  Hybrid: 1.05,
  PHEV: 1.05,
  EREV: 1.05,
  ICE: 1.0,
};

const DUTY_RATES: Record<string, number> = {
  EV: 0.05,
  Hybrid: 0.10,
  PHEV: 0.10,
  EREV: 0.10,
  ICE: 0.20,
};

const GHANA_LEVY = 0.06;

export function calculateCIF(input: CIFInput): CIFResult {
  const dest = DESTINATION_PORTS.find((p) => p.name === input.portDestination);
  const baseFreight = dest?.freightBase ?? 3200;
  const multiplier = FREIGHT_MULTIPLIER[input.vehicleType] ?? 1.0;
  const freight = Math.round(baseFreight * multiplier);

  const insurance = Math.round((input.carValue + freight) * 0.025);

  const totalCIF = input.carValue + freight + insurance;

  const dutyRate = DUTY_RATES[input.vehicleType] ?? 0.20;
  const dutyEstimate = Math.round(totalCIF * (dutyRate + GHANA_LEVY));

  const landedCost = totalCIF + dutyEstimate;

  return {
    carValue: input.carValue,
    freight,
    insurance,
    dutyEstimate,
    totalCIF,
    landedCost,
    destinationPort: input.portDestination,
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
