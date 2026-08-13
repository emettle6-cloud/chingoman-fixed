import type { CurrencyCode } from './exchangeRate';

/**
 * Maps a visitor's country to the currency they'd expect to see prices in.
 * NGN for Nigeria, XOF for the CFA franc (BCEAO) zone in francophone West
 * Africa, GHS for Ghana. Everywhere else falls back to USD.
 */
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  NG: 'NGN',
  GH: 'GHS',
  // XOF — West African CFA franc (BCEAO) countries
  CI: 'XOF', // Côte d'Ivoire
  TG: 'XOF', // Togo
  SN: 'XOF', // Senegal
  BJ: 'XOF', // Benin
  BF: 'XOF', // Burkina Faso
  ML: 'XOF', // Mali
  NE: 'XOF', // Niger
  GW: 'XOF', // Guinea-Bissau
};

const SESSION_CACHE_KEY = 'chingoman_geo_country';

interface GeoResult {
  countryCode: string | null;
  currency: CurrencyCode | null;
}

async function fetchGeoCountry(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) return cached === 'unknown' ? null : cached;
  } catch {
    // ignore
  }

  try {
    // No API key required, CORS-enabled, IP-based (no permission prompt needed).
    const res = await fetch('https://ipwho.is/');
    if (!res.ok) throw new Error('geo lookup failed');
    const data = await res.json();
    const code: string | null = data?.success !== false && typeof data?.country_code === 'string'
      ? data.country_code
      : null;
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, code ?? 'unknown');
    } catch {
      // ignore
    }
    return code;
  } catch {
    return null;
  }
}

/** Detects the visitor's country via IP lookup and maps it to a display currency, if we support one for that country. */
export async function detectCurrencyFromIP(): Promise<GeoResult> {
  const countryCode = await fetchGeoCountry();
  if (!countryCode) return { countryCode: null, currency: null };
  return { countryCode, currency: COUNTRY_TO_CURRENCY[countryCode] ?? null };
}
