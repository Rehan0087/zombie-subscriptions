import fc from "fast-check";
import { CADENCES } from "./cadence";
import { addMonths, fromDayNumber, toDayNumber } from "./dates";
import { detect } from "./detect";
import { perYear } from "./money";
import { normalize } from "./normalize";
import { arbRecurringSeries, arbStatement, INVENTED_MERCHANTS } from "./test-arbitraries";
import type { Transaction } from "./types";

const withIds = (rows: Omit<Transaction, "id">[]): Transaction[] => rows.map((r, i) => ({ id: `tx-${i}`, ...r }));
const everyZombie = (txs: Transaction[]) => {
  const d = detect(txs);
  return [...d.zombies, ...d.maybeZombies];
};

describe("detection properties", () => {
  it("P1: detection is independent of input order", () => {
    fc.assert(
      fc.property(
        arbStatement().chain((s) => fc.tuple(fc.constant(s.transactions), fc.shuffledSubarray(s.transactions, { minLength: s.transactions.length }))),
        ([original, shuffled]) => {
          expect(detect(shuffled)).toEqual(detect(original));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("P4: a planted series is found with its cadence", () => {
    fc.assert(
      fc.property(arbRecurringSeries(), (series) => {
        const found = everyZombie(withIds(series.charges));
        expect(found.map((z) => [z.merchantKey, z.cadence])).toEqual([[normalize(series.merchant), series.cadence]]);
      }),
      { numRuns: 300 },
    );
  });

  it("P4 in context: planted series survive one-offs, credits and other subscriptions", () => {
    fc.assert(
      fc.property(arbStatement({ minSeries: 1 }), ({ transactions, planted }) => {
        const found = new Set(everyZombie(transactions).map((z) => `${z.merchantKey}|${z.cadence}`));
        for (const p of planted) expect(found).toContain(`${normalize(p.merchant)}|${p.cadence}`);
      }),
      { numRuns: 200 },
    );
  });

  it("P5: credits never appear in a zombie", () => {
    fc.assert(
      fc.property(arbStatement(), ({ transactions }) => {
        for (const z of everyZombie(transactions)) for (const c of z.charges) expect(c.amount).toBeLessThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it("P6: fewer charges than the cadence minimum is never a zombie", () => {
    fc.assert(
      fc.property(arbRecurringSeries({ allowPriceHike: false }), (series) => {
        const tooFew = series.charges.slice(0, CADENCES[series.cadence].minCharges - 1);
        expect(everyZombie(withIds(tooFew))).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });

  it("P7: yearly cost is |current amount| × charges per year, 0 when dormant, always an integer", () => {
    fc.assert(
      fc.property(arbStatement(), fc.integer({ min: 0, max: 800 }), ({ transactions }, extraDays) => {
        const last = transactions.reduce((m, t) => Math.max(m, toDayNumber(t.date)), toDayNumber("2024-01-01"));
        const d = detect(transactions, { referenceDate: fromDayNumber(last + extraDays) });
        for (const z of [...d.zombies, ...d.maybeZombies]) {
          expect(Number.isSafeInteger(z.yearlyCost)).toBe(true);
          expect(z.yearlyCost).toBe(z.dormant ? 0 : z.currentAmount * perYear(z.cadence));
        }
      }),
      { numRuns: 200 },
    );
  });

  it("P11: two interleaved plans more than 2× apart are two zombies", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INVENTED_MERCHANTS),
        fc.integer({ min: toDayNumber("2024-01-01"), max: toDayNumber("2025-06-30") }),
        fc.integer({ min: 4, max: 14 }),
        fc.integer({ min: 3, max: 25 }),
        fc.integer({ min: 1_000, max: 200_000 }),
        fc.integer({ min: 2_100, max: 5_000 }),
        (merchant, startDay, count, offset, base, factorPerMille) => {
          const start = fromDayNumber(startDay);
          const plus = fromDayNumber(startDay + offset);
          const big = Math.round((base * factorPerMille) / 1000);
          const rows = Array.from({ length: count }, (_, k) => [
            { date: addMonths(start, k), description: merchant, amount: -base },
            { date: addMonths(plus, k), description: merchant, amount: -big },
          ]).flat();
          const found = everyZombie(withIds(rows));
          expect(found.map((z) => z.currentAmount).sort((a, b) => a - b)).toEqual([base, big]);
        },
      ),
      { numRuns: 200 },
    );
  });
});
