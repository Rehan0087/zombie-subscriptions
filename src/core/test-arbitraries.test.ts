import fc from "fast-check";
import { CADENCES, cadenceForGap } from "./cadence";
import { daysBetween, isIsoDate } from "./dates";
import { arbRecurringSeries, arbStatement, CREDIT_DESCRIPTIONS } from "./test-arbitraries";

// The generators are only useful if they produce what the spec says real statements look like.
describe("test generators", () => {
  it("recurring series stay inside their cadence window", () => {
    fc.assert(
      fc.property(arbRecurringSeries(), (s) => {
        const dates = s.charges.map((c) => c.date);
        const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i]!, d));
        return (
          s.charges.length >= CADENCES[s.cadence].minCharges &&
          dates.every(isIsoDate) &&
          gaps.every((g) => cadenceForGap(g) === s.cadence)
        );
      }),
      { numRuns: 200 },
    );
  });

  it("recurring charges are integer debits", () => {
    fc.assert(
      fc.property(arbRecurringSeries(), (s) => s.charges.every((c) => Number.isSafeInteger(c.amount) && c.amount < 0)),
      { numRuns: 200 },
    );
  });

  it("statements are sorted, have unique ids and only positive credits", () => {
    fc.assert(
      fc.property(arbStatement(), ({ transactions }) => {
        const ids = new Set(transactions.map((t) => t.id));
        const sorted = transactions.every((t, i) => i === 0 || transactions[i - 1]!.date <= t.date);
        const credits = transactions.filter((t) => (CREDIT_DESCRIPTIONS as readonly string[]).includes(t.description));
        return ids.size === transactions.length && sorted && credits.every((c) => c.amount > 0);
      }),
      { numRuns: 200 },
    );
  });
});
