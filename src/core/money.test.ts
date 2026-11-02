import { assertMinor, perYear, sumMinor, yearlyCost } from "./money";

describe("money", () => {
  it("rejects non-integer money", () => {
    expect(() => assertMinor(4.99)).toThrow();
    expect(() => assertMinor(Number.NaN)).toThrow();
    expect(assertMinor(-49_900)).toBe(-49_900);
  });

  it("knows charges per year", () => {
    expect([perYear("weekly"), perYear("monthly"), perYear("quarterly"), perYear("yearly")]).toEqual([52, 12, 4, 1]);
  });

  it("computes yearly cost as a positive integer, 0 when dormant", () => {
    expect(yearlyCost(-49_900, "monthly", false)).toBe(598_800);
    expect(yearlyCost(-49_900, "monthly", true)).toBe(0);
    expect(yearlyCost(-120_000, "yearly", false)).toBe(120_000);
  });

  it("sums amounts", () => {
    expect(sumMinor([-100, -250, 50])).toBe(-300);
    expect(sumMinor([])).toBe(0);
  });
});
