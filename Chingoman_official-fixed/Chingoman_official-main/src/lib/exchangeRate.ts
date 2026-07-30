import { useEffect, useState } from 'react';

const CACHE_KEY = 'chingoman_usd_ghs_rate';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — matches the API's own update frequency

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

async function fetchLiveRate(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate.fun/latest?base=USD');
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.GHS;
    return typeof rate === 'number' ? rate : null;
  } catch {
    return null;
  }
}

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() } as CachedRate));
  } catch {
    // ignore — caching is a nice-to-have, not required for the rate to work
  }
}

/**
 * Live USD → GHS exchange rate, cached for an hour at a time (matching the
 * underlying API's own update frequency — this is a genuinely current rate,
 * not a fixed/hardcoded one, but it is not tick-by-tick real time).
 */
export function useUSDtoGHSRate() {
  const [rate, setRate] = useState<number | null>(() => readCache()?.rate ?? null);
  const [loading, setLoading] = useState(rate === null);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setRate(cached.rate);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchLiveRate().then((liveRate) => {
      if (liveRate !== null) {
        setRate(liveRate);
        writeCache(liveRate);
      }
      setLoading(false);
    });
  }, []);

  return { rate, loading };
}

export function formatGHS(amountUSD: number, rate: number): string {
  const ghs = amountUSD * rate;
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(ghs);
}
