import fc from "fast-check";
import { addDays, addMonths, daysBetween, fromDayNumber, isIsoDate, toDayNumber } from "./dates";
import { arbIsoDate } from "./test-arbitraries";

describe("date helper properties", () => {
  it("day numbers round-trip", () => {
    fc.assert(fc.property(arbIsoDate(), (d) => fromDayNumber(toDayNumber(d)) === d), { numRuns: 200 });
  });

  it("addDays and daysBetween agree", () => {
    fc.assert(
      fc.property(arbIsoDate(), fc.integer({ min: -2000, max: 2000 }), (d, n) => daysBetween(d, addDays(d, n)) === n),
      { numRuns: 200 },
    );
  });

  it("addMonths always returns a valid date 28–31 days per month away", () => {
    fc.assert(
      fc.property(arbIsoDate(), fc.integer({ min: 1, max: 36 }), (d, n) => {
        const later = addMonths(d, n);
        const gap = daysBetween(d, later);
        return isIsoDate(later) && gap >= 28 * n - 3 && gap <= 31 * n;
      }),
      { numRuns: 200 },
    );
  });
});
