import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  useExchangeRates,
  formatConverted,
  convertFromUSD,
  type CurrencyCode,
} from '@/lib/exchangeRate';
import { detectCurrencyFromIP } from '@/lib/geoCurrency';

const STORAGE_KEY = 'chingoman_display_currency';
// Set once a visitor manually picks a currency, so we never override their choice with geo-detection again.
const EXPLICIT_KEY = 'chingoman_display_currency_explicit';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** True while live rates are still being fetched for the first time. */
  loading: boolean;
  /** True while we're still checking the visitor's country to auto-pick a currency. */
  detectingLocation: boolean;
  /** Formats a USD amount in the currently selected currency, or null if rates aren't ready yet. */
  format: (amountUSD: number) => string | null;
  /** Converts a USD amount into the currently selected currency, or null if rates aren't ready yet. */
  convert: (amountUSD: number) => number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): CurrencyCode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'GHS' || stored === 'NGN' || stored === 'XOF' || stored === 'USD') return stored;
  } catch {
    // ignore
  }
  return null;
}

function readExplicit(): boolean {
  try {
    return localStorage.getItem(EXPLICIT_KEY) === '1';
  } catch {
    return false;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStoredCurrency() ?? 'USD');
  const [detectingLocation, setDetectingLocation] = useState(() => !readExplicit());
  const { rates, loading } = useExchangeRates();

  // On first load, if the visitor hasn't explicitly chosen a currency before,
  // detect their country by IP and switch to the matching West African
  // currency automatically (NGN for Nigeria, XOF for the francophone CFA
  // zone, GHS for Ghana). A manual pick always wins over this.
  useEffect(() => {
    if (readExplicit()) {
      setDetectingLocation(false);
      return;
    }
    let cancelled = false;
    detectCurrencyFromIP().then(({ currency: detected }) => {
      if (cancelled) return;
      if (detected && !readExplicit()) {
        setCurrencyState(detected);
      }
      setDetectingLocation(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // ignore
    }
  }, [currency]);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    try {
      localStorage.setItem(EXPLICIT_KEY, '1');
    } catch {
      // ignore
    }
  }

  function format(amountUSD: number): string | null {
    return formatConverted(amountUSD, currency, rates);
  }

  function convert(amountUSD: number): number | null {
    return convertFromUSD(amountUSD, currency, rates);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, loading, detectingLocation, format, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
