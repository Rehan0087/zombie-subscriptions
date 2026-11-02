import type { Cadence, IsoDate, Minor } from "../core";

const moneyFormats = new Map<string, Intl.NumberFormat>();

/** Formats minor units for display, e.g. 49_900 BDT -> "৳499". Decimals only when needed. */
export function formatMoney(minor: Minor, currency: string): string {
  const whole = minor % 100 === 0;
  const key = `${currency}|${whole}`;
  let f = moneyFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    moneyFormats.set(key, f);
  }
  return f.format(minor / 100);
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export const formatDate = (d: IsoDate) => dayFormat.format(new Date(`${d}T00:00:00Z`));
export const formatMonth = (d: IsoDate) => monthFormat.format(new Date(`${d}T00:00:00Z`));

export const CADENCE_WORDS: Record<Cadence, { adjective: string; per: string }> = {
  weekly: { adjective: "Weekly", per: "week" },
  monthly: { adjective: "Monthly", per: "month" },
  quarterly: { adjective: "Quarterly", per: "quarter" },
  yearly: { adjective: "Yearly", per: "year" },
};

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Today's date on the user's device as an ISO date. */
export function todayIso(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const CURRENCIES = ["BDT", "INR", "PKR", "NPR", "LKR", "USD", "EUR", "GBP"] as const;
