import { CADENCES, cadenceForGap } from "./cadence";
import { fromDayNumber, toDayNumber } from "./dates";
import { perYear, sumMinor, yearlyCost } from "./money";
import { displayName, normalize } from "./normalize";
import type { Cadence, IsoDate, Minor, PriceChange, Transaction, Zombie } from "./types";

/** User corrections to grouping (requirement 2.4). */
export interface Overrides {
  /** merchantKey -> merchantKey it should be merged into. */
  merges: Record<string, string>;
  /** Merchant keys whose charges must be split into separate plans by amount. */
  splitByAmount: string[];
}

export const NO_OVERRIDES: Overrides = { merges: {}, splitByAmount: [] };

/** Zombies below this confidence go behind the "Maybe zombies" toggle (requirement 3.8). */
export const MAYBE_THRESHOLD = 0.5;

/** Share of gaps that must fall inside the cadence window (requirement 3.4). */
const MIN_REGULARITY = 0.75;
/** Allowed spread around the median amount (requirement 3.5). */
const AMOUNT_TOLERANCE = 0.25;
/** A new price cluster starts when the next distinct amount is this much higher (requirement 3.6). */
const PLAN_GAP_RATIO = 1.4;

export interface DetectOptions {
  /** "Today" for the dormant check. Defaults to the latest transaction date. */
  referenceDate?: IsoDate;
  overrides?: Overrides;
}

export interface Detection {
  zombies: Zombie[];
  maybeZombies: Zombie[];
  referenceDate: IsoDate;
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function deviation(xs: readonly number[]): number {
  const m = median(xs);
  return xs.reduce((sum, x) => sum + Math.abs(x - m), 0);
}

function withinTolerance(xs: readonly number[]): boolean {
  const m = median(xs);
  return xs.every((x) => Math.abs(x - m) <= AMOUNT_TOLERANCE * m);
}

/** Merchant key after normalization and the user's merges. */
export function merchantKeyOf(description: string, overrides: Overrides = NO_OVERRIDES): string {
  let key = normalize(description);
  const seen = new Set<string>();
  while (overrides.merges[key] !== undefined && !seen.has(key)) {
    seen.add(key);
    key = overrides.merges[key]!;
  }
  return key;
}

interface AmountShape {
  /** 0..1, 1 = identical amounts (after accounting for a price change). */
  stability: number;
  change?: { index: number };
}

/**
 * Amounts are stable when all sit within ±25% of the median, or when one split point leaves
 * both sides stable (a price change). A split is reported as a change only when it clearly
 * explains the data: prices differ by ≥5% and the split removes at least half the spread.
 */
function amountShape(amounts: readonly number[]): AmountShape | undefined {
  const whole = deviation(amounts);
  let best: { index: number; dev: number } | undefined;
  for (let k = 2; k < amounts.length; k++) {
    const left = amounts.slice(0, k);
    const right = amounts.slice(k);
    if (!withinTolerance(left) || !withinTolerance(right)) continue;
    const dev = deviation(left) + deviation(right);
    if (!best || dev < best.dev) best = { index: k, dev };
  }
  const stable = withinTolerance(amounts);
  let change: AmountShape["change"];
  if (best) {
    const from = median(amounts.slice(0, best.index));
    const to = median(amounts.slice(best.index));
    const clear = Math.abs(to - from) / from >= 0.05 && best.dev <= 0.5 * whole;
    if (!stable || clear) change = { index: best.index };
  }
  if (!stable && !change) return undefined;
  const spread = change ? best!.dev : whole;
  const stability = Math.min(1, Math.max(0, 1 - spread / amounts.length / median(amounts)));
  return { stability, change };
}

interface Series {
  cadence: Cadence;
  charges: Transaction[];
  regularity: number;
  shape: AmountShape;
}

/** Decides whether date-sorted charges form one recurring series (requirements 3.2–3.5). */
function classify(charges: Transaction[]): Series | undefined {
  if (charges.length < 2) return undefined;
  const days = charges.map((c) => toDayNumber(c.date));
  const gaps = days.slice(1).map((d, i) => d - days[i]!);
  const cadence = cadenceForGap(median(gaps));
  if (!cadence) return undefined;
  const rule = CADENCES[cadence];
  if (charges.length < rule.minCharges) return undefined;
  const [min, max] = rule.window;
  // A charge is on schedule when its gap is in the window, or when it is back in step with the
  // charge before a late one (gap over two periods in 2× the window). So one late payment costs
  // one gap, not two.
  const onSchedule = gaps.filter((g, i) => {
    if (g >= min && g <= max) return true;
    const twoBack = i >= 1 ? g + gaps[i - 1]! : -1;
    return twoBack >= 2 * min && twoBack <= 2 * max;
  }).length;
  const regularity = onSchedule / gaps.length;
  if (regularity < MIN_REGULARITY) return undefined;
  const shape = amountShape(charges.map((c) => Math.abs(c.amount)));
  if (!shape) return undefined;
  return { cadence, charges, regularity, shape };
}

/** Splits charges into price clusters, for two plans billed by one merchant (requirement 3.6). */
function clusterByAmount(charges: readonly Transaction[]): Transaction[][] {
  const distinct = [...new Set(charges.map((c) => Math.abs(c.amount)))].sort((a, b) => a - b);
  const clusterOf = new Map<number, number>();
  let cluster = 0;
  distinct.forEach((a, i) => {
    if (i > 0 && a > distinct[i - 1]! * PLAN_GAP_RATIO) cluster++;
    clusterOf.set(a, cluster);
  });
  const clusters: Transaction[][] = Array.from({ length: cluster + 1 }, () => []);
  for (const c of charges) clusters[clusterOf.get(Math.abs(c.amount))!]!.push(c);
  return clusters;
}

/** 0..1 from charge count, gap regularity and amount stability (requirement 3.8). */
function confidence(series: Series): number {
  const rule = CADENCES[series.cadence];
  const countScore = Math.min(1, (series.charges.length - rule.minCharges + 1) / 4);
  const regularityScore = (series.regularity - MIN_REGULARITY) / (1 - MIN_REGULARITY);
  return 0.4 * countScore + 0.4 * regularityScore + 0.2 * series.shape.stability;
}

function describe(key: string, index: number, series: Series, referenceDay: number): Zombie {
  const { cadence, charges } = series;
  const first = charges[0]!;
  const last = charges[charges.length - 1]!;
  const dormant = referenceDay - toDayNumber(last.date) > 1.5 * CADENCES[cadence].nominalDays;
  const currentAmount = Math.abs(last.amount);
  let priceChange: PriceChange | undefined;
  if (series.shape.change) {
    const at = series.shape.change.index;
    priceChange = { from: Math.abs(charges[at - 1]!.amount), to: Math.abs(charges[at]!.amount), on: charges[at]!.date };
  }
  return {
    id: `${key}|${cadence}|${index}`,
    merchantKey: key,
    displayName: displayName(key),
    cadence,
    charges,
    currentAmount,
    totalPaid: sumMinor(charges.map((c) => Math.abs(c.amount))),
    yearlyCost: yearlyCost(currentAmount, cadence, dormant),
    firstCharge: first.date,
    lastCharge: last.date,
    priceChange,
    dormant,
    confidence: confidence(series),
  };
}

const byDateThenId = (a: Transaction, b: Transaction) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * Finds recurring debits (requirement 3). Pure and deterministic: the same transactions in any
 * order give the same result (requirement 3.7).
 */
export function detect(transactions: readonly Transaction[], options: DetectOptions = {}): Detection {
  const overrides = options.overrides ?? NO_OVERRIDES;
  const lastDay = transactions.reduce((max, t) => Math.max(max, toDayNumber(t.date)), -Infinity);
  const referenceDate = options.referenceDate ?? (Number.isFinite(lastDay) ? fromDayNumber(lastDay) : "1970-01-01");
  const referenceDay = toDayNumber(referenceDate);

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const key = merchantKeyOf(t.description, overrides);
    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }

  const all: Zombie[] = [];
  for (const key of [...groups.keys()].sort()) {
    const charges = groups.get(key)!.sort(byDateThenId);
    const forceSplit = overrides.splitByAmount.includes(key);
    const whole = forceSplit ? undefined : classify(charges);
    const series = whole ? [whole] : clusterByAmount(charges).flatMap((c) => classify(c) ?? []);
    series.forEach((s, i) => all.push(describe(key, i, s, referenceDay)));
  }

  all.sort((a, b) => b.yearlyCost - a.yearlyCost || b.currentAmount - a.currentAmount || (a.id < b.id ? -1 : 1));
  return {
    zombies: all.filter((z) => z.confidence >= MAYBE_THRESHOLD),
    maybeZombies: all.filter((z) => z.confidence < MAYBE_THRESHOLD),
    referenceDate,
  };
}

/** The numbers behind a zombie's yearly cost, for "how we computed this" (requirement 4.5). */
export function costBreakdown(z: Zombie): { amount: Minor; perYear: number; yearly: Minor; dormant: boolean } {
  return { amount: z.currentAmount, perYear: perYear(z.cadence), yearly: z.yearlyCost, dormant: z.dormant };
}
