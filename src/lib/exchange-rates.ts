import { ASSET_CURRENCIES, type AssetCurrency } from "./types";

export type ExchangeRates = Record<AssetCurrency, number>;

// open.er-api.com reference rates for 2026-07-25, used only as a fallback.
export const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  CNY: 1,
  USD: 0.147452,
  HKD: 1.156363,
  EUR: 0.129687,
  GBP: 0.110762,
  JPY: 24.162212,
  RUB: 11.560694,
  CHF: 0.120661,
  INR: 14.248668,
  VND: 3875.968992,
  THB: 4.97107,
  CAD: 0.207712,
};

const CACHE_KEY = "komari-glass.exchange-rates.v2";
const REQUEST_TIMEOUT_MS = 5_000;

interface CachedExchangeRates {
  checkedOn: string;
  rates: ExchangeRates;
}

interface ExchangeRateApi {
  url: string;
  allowPartial: boolean;
  parseRates: (value: unknown) => unknown | null;
}

const EXCHANGE_RATE_APIS: readonly ExchangeRateApi[] = [
  {
    url: "https://open.er-api.com/v6/latest/CNY",
    allowPartial: false,
    parseRates: (value) => {
      if (
        !isRecord(value) ||
        value.result !== "success" ||
        value.base_code !== "CNY" ||
        !isUnixDate(value.time_last_update_unix)
      ) {
        return null;
      }
      return value.rates;
    },
  },
  {
    url: "https://api.frankfurter.dev/v1/latest?from=CNY",
    allowPartial: true,
    parseRates: (value) => {
      if (
        !isRecord(value) ||
        value.base !== "CNY" ||
        value.amount !== 1 ||
        !isDateKey(value.date)
      ) {
        return null;
      }
      return value.rates;
    },
  },
];

let refreshPromise: Promise<ExchangeRates> | null = null;
let memoryCache: CachedExchangeRates | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isUnixDate(value: unknown): boolean {
  if (!isPositiveNumber(value)) return false;
  const date = new Date(value * 1_000);
  return Number.isFinite(date.getTime());
}

function parseRates(
  value: unknown,
  missingRates?: ExchangeRates
): ExchangeRates | null {
  if (!isRecord(value)) return null;
  const result = { CNY: 1 } as ExchangeRates;
  let freshRateCount = 0;

  for (const currency of ASSET_CURRENCIES) {
    if (currency === "CNY") continue;
    const rate = value[currency];
    if (isPositiveNumber(rate)) {
      result[currency] = rate;
      freshRateCount += 1;
    } else if (missingRates) {
      result[currency] = missingRates[currency];
    } else {
      return null;
    }
  }
  return freshRateCount > 0 ? result : null;
}

function readCache(): CachedExchangeRates | null {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    const rates = parseRates(value.rates);
    if (!rates || !isDateKey(value.checkedOn)) {
      return null;
    }
    memoryCache = {
      checkedOn: value.checkedOn,
      rates,
    };
    return memoryCache;
  } catch {
    return null;
  }
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchJsonWithTimeout(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchLatestRates(
  missingRates: ExchangeRates,
  checkedOn: string
): Promise<CachedExchangeRates> {
  for (const api of EXCHANGE_RATE_APIS) {
    const value = await fetchJsonWithTimeout(api.url);
    if (value === null) continue;
    const rawRates = api.parseRates(value);
    if (rawRates === null) continue;
    const rates = parseRates(
      rawRates,
      api.allowPartial ? missingRates : undefined
    );
    if (!rates) continue;

    return {
      checkedOn,
      rates,
    };
  }
  throw new Error("No exchange rate provider is available");
}

function writeCache(value: CachedExchangeRates): void {
  memoryCache = value;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Storage is optional; the fetched rates still apply to this session.
  }
}

export function exchangeRatesEqual(
  left: ExchangeRates,
  right: ExchangeRates
): boolean {
  return ASSET_CURRENCIES.every((currency) => left[currency] === right[currency]);
}

export function getCachedExchangeRates(): ExchangeRates | null {
  return readCache()?.rates ?? null;
}

export function refreshExchangeRatesIfNeeded(): Promise<ExchangeRates> {
  const checkedOn = localDateKey(new Date());
  const cached = readCache();
  if (cached?.checkedOn === checkedOn) {
    return Promise.resolve(cached.rates);
  }
  if (refreshPromise) return refreshPromise;

  const previous: CachedExchangeRates = {
    checkedOn,
    rates: cached?.rates ?? FALLBACK_EXCHANGE_RATES,
  };

  refreshPromise = fetchLatestRates(previous.rates, checkedOn)
    .catch(() => previous)
    .then((value) => {
      writeCache(value);
      return value.rates;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
