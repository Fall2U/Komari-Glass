/** Price / remaining-value helpers (aligned with Glass theme semantics) */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LONG_TERM_DAYS = 36500;

export type ExpireStatus =
  | "unknown"
  | "expired"
  | "critical"
  | "warning"
  | "normal"
  | "long_term";

export type BillingCycleType =
  | "once"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "biennial"
  | "triennial"
  | "quinquennial"
  | "custom";

const BILLING_CYCLE_RANGES: Array<{
  type: BillingCycleType;
  min: number;
  max: number;
}> = [
  { type: "monthly", min: 27, max: 32 },
  { type: "quarterly", min: 87, max: 95 },
  { type: "semi_annual", min: 175, max: 185 },
  { type: "annual", min: 360, max: 370 },
  { type: "biennial", min: 720, max: 750 },
  { type: "triennial", min: 1080, max: 1150 },
  { type: "quinquennial", min: 1800, max: 1850 },
];

const CYCLE_TEXT: Record<BillingCycleType, string> = {
  once: "一次",
  monthly: "月",
  quarterly: "季",
  semi_annual: "半年",
  annual: "年",
  biennial: "两年",
  triennial: "三年",
  quinquennial: "五年",
  custom: "周期",
};

function getExpiryDiffMs(expiredAt: string | number | null | undefined): number | null {
  if (expiredAt === null || expiredAt === undefined || expiredAt === "") return null;
  const t =
    typeof expiredAt === "number" ? expiredAt : new Date(expiredAt).getTime();
  if (!Number.isFinite(t)) return null;
  return t - Date.now();
}

export function getDaysUntilExpired(
  expiredAt: string | number | null | undefined
): number {
  const diffMs = getExpiryDiffMs(expiredAt);
  if (diffMs === null) return 0;
  if (diffMs <= 0) return Math.floor(diffMs / MS_PER_DAY);
  return Math.ceil(diffMs / MS_PER_DAY);
}

export function getExpireStatus(
  expiredAt: string | number | null | undefined
): ExpireStatus {
  const diffMs = getExpiryDiffMs(expiredAt);
  if (diffMs === null) return "unknown";
  if (diffMs <= 0) return "expired";
  const days = Math.ceil(diffMs / MS_PER_DAY);
  if (days <= 7) return "critical";
  if (days <= 15) return "warning";
  if (days > LONG_TERM_DAYS) return "long_term";
  return "normal";
}

export function parseBillingCycleType(billingCycle: number): BillingCycleType {
  if (billingCycle === -1) return "once";
  for (const range of BILLING_CYCLE_RANGES) {
    if (billingCycle >= range.min && billingCycle <= range.max) return range.type;
  }
  return "custom";
}

export function getBillingCycleText(billingCycle: number): string {
  return CYCLE_TEXT[parseBillingCycleType(billingCycle)];
}

/** price: -1 free, 0 unset, >0 paid */
export function isPaidPrice(price: number): boolean {
  return Number.isFinite(price) && price > 0;
}

export function formatPrice(price: number, currency = "¥"): string {
  if (price === 0 || price === -1) return "免费";
  return `${currency || "¥"}${price}`;
}

export function formatPriceWithCycle(
  price: number,
  billingCycle: number,
  currency = "¥"
): string {
  if (!isPaidPrice(price)) return formatPrice(price, currency);
  return `${formatPrice(price, currency)} / ${getBillingCycleText(billingCycle)}`;
}

/**
 * Remaining value proportional to remaining days in one billing cycle.
 * - unpaid / free → 0
 * - expired → 0
 * - long-term / one-time / unknown cycle → full price
 */
export function getRemainingValue(
  price: number,
  billingCycle: number,
  expiredAt: string | number | null | undefined
): number {
  if (!isPaidPrice(price)) return 0;
  const status = getExpireStatus(expiredAt);
  if (status === "unknown" || status === "expired") return 0;
  if (status === "long_term") return price;
  const days = getDaysUntilExpired(expiredAt);
  if (billingCycle <= 0) return price;
  return price * Math.min(days / billingCycle, 1);
}

export function formatCurrencyValue(value: number, currency = "¥"): string {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${currency || "¥"}${text || "0"}`;
}

export function formatExpireRemaining(
  expiredAt: string | number | null | undefined
): string {
  const status = getExpireStatus(expiredAt);
  if (status === "unknown") return "—";
  if (status === "expired") return "已过期";
  if (status === "long_term") return "长期";
  return `剩余 ${getDaysUntilExpired(expiredAt)} 天`;
}

export interface AssetTotals {
  totalValue: number;
  remainingValue: number;
  currency: string;
  paidCount: number;
}

/** Sum paid nodes in their native currency (dominant currency if mixed). */
export function calcAssetTotals(
  nodes: Array<{
    price: number;
    billing_cycle: number;
    currency: string;
    expired_at: string | null;
  }>
): AssetTotals {
  const byCurrency = new Map<string, { total: number; remaining: number; count: number }>();

  for (const node of nodes) {
    if (!isPaidPrice(node.price)) continue;
    const currency = (node.currency || "¥").trim() || "¥";
    const entry = byCurrency.get(currency) || { total: 0, remaining: 0, count: 0 };
    entry.total += node.price;
    entry.remaining += getRemainingValue(
      node.price,
      node.billing_cycle,
      node.expired_at
    );
    entry.count += 1;
    byCurrency.set(currency, entry);
  }

  if (byCurrency.size === 0) {
    return { totalValue: 0, remainingValue: 0, currency: "¥", paidCount: 0 };
  }

  // Prefer the currency with the most paid nodes
  let bestCurrency = "¥";
  let best = { total: 0, remaining: 0, count: 0 };
  for (const [currency, entry] of byCurrency) {
    if (entry.count > best.count) {
      bestCurrency = currency;
      best = entry;
    }
  }

  // If only one currency overall, use it even if count ties
  if (byCurrency.size === 1) {
    const [currency, entry] = [...byCurrency.entries()][0];
    return {
      totalValue: entry.total,
      remainingValue: entry.remaining,
      currency,
      paidCount: entry.count,
    };
  }

  return {
    totalValue: best.total,
    remainingValue: best.remaining,
    currency: bestCurrency,
    paidCount: best.count,
  };
}
