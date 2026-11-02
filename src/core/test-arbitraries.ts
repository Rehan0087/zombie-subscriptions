/**
 * fast-check generators for realistic statements (see .kiro/steering/testing.md).
 * Test-only: never import this from app code.
 */
import fc from "fast-check";
import { addDays, addMonths, fromDayNumber, toDayNumber } from "./dates";
import type { Cadence, IsoDate, Minor, Transaction } from "./types";

/** Invented subscription names, so no real brand appears in tests or demos. */
export const INVENTED_MERCHANTS = [
  "Grimflix", "Coffin Cloud", "Bat Beats", "Wraith Gym", "Hex Daily", "Crypt Drive",
  "Phantom Shield", "Ghoul Arcade", "Moonlit Mobile", "Raven Reads", "Skull Fit", "Banshee Box",
] as const;

/** Invented one-off shops; kept separate from subscriptions so they can't collide. */
export const ONE_OFF_SHOPS = [
  "Corner Grocer", "Lantern Cafe", "Night Bus", "Pumpkin Bakery", "Cobweb Books", "Owl Pharmacy",
  "Misty Market", "Candle Hardware", "Fogbank Fuel", "Howl Hair Studio", "Gravel Garden Centre",
  "Midnight Noodles", "Tallow Tailors", "Crooked Shoes", "Rattle Toys", "Shroud Laundry",
] as const;

export const CREDIT_DESCRIPTIONS = ["Salary", "Refund", "Transfer In", "Interest", "Cashback"] as const;

const PREFIXES = ["", "POS ", "DEBIT CARD PURCHASE ", "ACH ", "UPI/"] as const;
const SUFFIXES = ["", " 8573", " CARD-1234", " XX4421", " 03/14", " #00291", " 2026-03-14"] as const;
const CASINGS = ["upper", "lower", "as-is"] as const;

/** Statements in tests start between these dates. */
const FIRST_DAY = toDayNumber("2024-01-01");
const LAST_START_DAY = toDayNumber("2025-06-30");

export const arbIsoDate = (min: IsoDate = "2020-01-01", max: IsoDate = "2027-12-31") =>
  fc.integer({ min: toDayNumber(min), max: toDayNumber(max) }).map(fromDayNumber);

/** A charge amount in minor units: ৳10.00 to ৳5,000.00. */
export const arbChargeAmount = fc.integer({ min: 1_000, max: 500_000 });

interface DescriptionNoise {
  prefix: string;
  suffix: string;
  casing: (typeof CASINGS)[number];
}

const arbNoise: fc.Arbitrary<DescriptionNoise> = fc.record({
  prefix: fc.constantFrom(...PREFIXES),
  suffix: fc.constantFrom(...SUFFIXES),
  casing: fc.constantFrom(...CASINGS),
});

function applyNoise(base: string, noise: DescriptionNoise): string {
  const raw = `${noise.prefix}${base}${noise.suffix}`;
  if (noise.casing === "upper") return raw.toUpperCase();
  if (noise.casing === "lower") return raw.toLowerCase();
  return raw;
}

/** A merchant name with bank-style noise: payment prefixes, card suffixes, store numbers. */
export const arbNoisyDescription = (base: string) => arbNoise.map((n) => applyNoise(base, n));

/** How a billing system schedules charge k, and how late the bank may post it. */
const SCHEDULE: Record<Cadence, { dateOf: (start: IsoDate, k: number) => IsoDate; maxDelay: number; count: [number, number] }> = {
  weekly: { dateOf: (s, k) => addDays(s, 7 * k), maxDelay: 1, count: [3, 20] },
  monthly: { dateOf: (s, k) => addMonths(s, k), maxDelay: 2, count: [3, 14] },
  quarterly: { dateOf: (s, k) => addMonths(s, 3 * k), maxDelay: 2, count: [3, 6] },
  yearly: { dateOf: (s, k) => addMonths(s, 12 * k), maxDelay: 3, count: [2, 3] },
};

export interface PlantedSeries {
  merchant: string;
  cadence: Cadence;
  /** Debits, oldest first, without ids (the statement assigns them). */
  charges: Omit<Transaction, "id">[];
  /** Index of the first charge at the new price, when the generator planted a price hike. */
  priceHikeAt?: number;
}

export interface SeriesOptions {
  merchant?: string;
  cadence?: Cadence;
  /** Max amount noise per charge, in per-mille (100 = ±10%). Default 100. */
  noisePerMille?: number;
  /** Allow a single price hike of 10–50% partway through. Default true. */
  allowPriceHike?: boolean;
}

/**
 * A recurring debit series as a real billing system produces it: charges on a fixed
 * schedule (monthly ones on the same day of month, clamped), posted 0–maxDelay days late,
 * with small amount noise and an optional single price hike.
 */
export const arbRecurringSeries = (opts: SeriesOptions = {}): fc.Arbitrary<PlantedSeries> => {
  const noise = opts.noisePerMille ?? 100;
  return fc
    .record({
      merchant: opts.merchant ? fc.constant(opts.merchant) : fc.constantFrom(...INVENTED_MERCHANTS),
      cadence: opts.cadence ? fc.constant(opts.cadence) : fc.constantFrom<Cadence>("weekly", "monthly", "quarterly", "yearly"),
      startDay: fc.integer({ min: FIRST_DAY, max: LAST_START_DAY }),
      base: arbChargeAmount,
    })
    .chain(({ merchant, cadence, startDay, base }) => {
      const [minCount, maxCount] = SCHEDULE[cadence].count;
      return fc.integer({ min: minCount, max: maxCount }).chain((count) =>
        fc.record({
          merchant: fc.constant(merchant),
          cadence: fc.constant(cadence),
          start: fc.constant(fromDayNumber(startDay)),
          base: fc.constant(base),
          delays: fc.array(fc.integer({ min: 0, max: SCHEDULE[cadence].maxDelay }), { minLength: count, maxLength: count }),
          jitter: fc.array(fc.integer({ min: -noise, max: noise }), { minLength: count, maxLength: count }),
          descriptions: fc.array(arbNoise, { minLength: count, maxLength: count }),
          hike:
            opts.allowPriceHike === false || count < 4
              ? fc.constant(undefined)
              : fc.option(fc.record({ at: fc.integer({ min: 2, max: count - 2 }), perMille: fc.integer({ min: 100, max: 500 }) }), { nil: undefined }),
        }),
      );
    })
    .map(({ merchant, cadence, start, base, delays, jitter, descriptions, hike }) => {
      const charges = delays.map((delay, k) => {
        const price = hike && k >= hike.at ? Math.round((base * (1000 + hike.perMille)) / 1000) : base;
        const amount: Minor = -Math.max(1, Math.round((price * (1000 + (jitter[k] ?? 0))) / 1000));
        return {
          date: addDays(SCHEDULE[cadence].dateOf(start, k), delay),
          description: applyNoise(merchant, descriptions[k]!),
          amount,
        };
      });
      return { merchant, cadence, charges, priceHikeAt: hike?.at };
    });
};

export interface GeneratedStatement {
  transactions: Transaction[];
  /** The recurring series hidden in the statement, one per distinct merchant. */
  planted: PlantedSeries[];
}

/**
 * A full statement: 0–6 recurring series with distinct merchants, single one-off purchases
 * at distinct shops, and credits (some regular, like salary). Sorted by date like a bank export.
 */
export const arbStatement = (opts: { minSeries?: number; maxSeries?: number } = {}): fc.Arbitrary<GeneratedStatement> =>
  fc
    .record({
      merchants: fc.uniqueArray(fc.constantFrom(...INVENTED_MERCHANTS), {
        minLength: opts.minSeries ?? 0,
        maxLength: opts.maxSeries ?? 6,
      }),
      oneOffs: fc.uniqueArray(
        fc.record({ shop: fc.constantFrom(...ONE_OFF_SHOPS), date: arbIsoDate("2024-01-01", "2026-06-30"), amount: arbChargeAmount }),
        { selector: (o) => o.shop, maxLength: ONE_OFF_SHOPS.length },
      ),
      credits: fc.array(
        fc.record({ description: fc.constantFrom(...CREDIT_DESCRIPTIONS), date: arbIsoDate("2024-01-01", "2026-06-30"), amount: arbChargeAmount }),
        { maxLength: 24 },
      ),
    })
    .chain(({ merchants, oneOffs, credits }) =>
      fc.tuple(...merchants.map((m) => arbRecurringSeries({ merchant: m }))).map((planted) => {
        const rows: Omit<Transaction, "id">[] = [
          ...planted.flatMap((p) => p.charges),
          ...oneOffs.map((o) => ({ date: o.date, description: o.shop, amount: -o.amount })),
          ...credits.map((c) => ({ date: c.date, description: c.description, amount: c.amount })),
        ];
        rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        return { planted, transactions: rows.map((r, i) => ({ id: `tx-${i}`, ...r })) };
      }),
    );
