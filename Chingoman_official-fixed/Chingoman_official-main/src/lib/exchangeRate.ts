import { useEffect, useState } from 'react';

export type CurrencyCode = 'USD' | 'GHS' | 'NGN' | 'XOF';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  flag: string;
  /** Countries/markets this currency serves, for hinting the default selection. */
  countries: string[];
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', countries: [] },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', countries: ['Ghana'] },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', countries: ['Nigeria'] },
  { code: 'XOF', name: 'CFA Franc (BCEAO)', flag: '🌍', countries: ["Côte d'Ivoire", 'Togo', 'Senegal', 'Benin'] },
];

const RATE_CODES: Exclude<CurrencyCode, 'USD'>[] = ['GHS', 'NGN', 'XOF'];

const CACHE_KEY = 'chingoman_usd_rates_v2';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — matches the API's own update frequency

type RateMap = Partial<Record<Exclude<CurrencyCode, 'USD'>, number>>;

interface CachedRates {
  rates: RateMap;
  fetchedAt: number;
}

async function fetchLiveRates(): Promise<RateMap | null> {
  try {
    const res = await fetch('https://api.exchangerate.fun/latest?base=USD');
    if (!res.ok) return null;
    const data = await res.json();
    const rates: RateMap = {};
    for (const code of RATE_CODES) {
      const r = data?.rates?.[code];
      if (typeof r === 'number') rates[code] = r;
    }
    return Object.keys(rates).length > 0 ? rates : null;
  } catch {
    return null;
  }
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: RateMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() } as CachedRates));
  } catch {
    // ignore — caching is a nice-to-have, not required for the rates to work
  }
}

/**
 * Live USD → (GHS, NGN, XOF) exchange rates, cached for an hour at a time
 * (matching the underlying API's own update frequency — genuinely current
 * rates, not fixed/hardcoded ones, though not tick-by-tick real time).
 */
export function useExchangeRates() {
  const [rates, setRates] = useState<RateMap>(() => readCache()?.rates ?? {});
  const [loading, setLoading] = useState(Object.keys(rates).length === 0);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setRates(cached.rates);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchLiveRates().then((liveRates) => {
      if (liveRates) {
        setRates(liveRates);
        writeCache(liveRates);
      }
      setLoading(false);
    });
  }, []);

  return { rates, loading };
}

const LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  GHS: 'en-GH',
  NGN: 'en-NG',
  XOF: 'fr-CI',
};

/** Convert a USD amount into the target currency using the given rate map. Returns null if the rate isn't available yet (or target is USD, which needs no rate). */
export function convertFromUSD(amountUSD: number, currency: CurrencyCode, rates: RateMap): number | null {
  if (currency === 'USD') return amountUSD;
  const rate = rates[currency];
  if (rate === undefined) return null;
  return amountUSD * rate;
}

/** Format a USD amount converted into the given currency, e.g. "₦12,450,000" or "CFA 8,900,000". Returns null if the rate isn't loaded (for non-USD currencies). */
export function formatConverted(amountUSD: number, currency: CurrencyCode, rates: RateMap): string | null {
  const converted = convertFromUSD(amountUSD, currency, rates);
  if (converted === null) return null;
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(converted);
}
