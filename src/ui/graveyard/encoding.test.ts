import type { Zombie } from "../../core";
import { cracks, hasHike, monthsFeeding, weights } from "./encoding";

const z = (id: string, yearlyCost: number, extra: Partial<Zombie> = {}) => ({ id, yearlyCost, firstCharge: "2026-01-01", ...extra }) as Zombie;

describe("visual encoding", () => {
  it("weights yearly cost on a log scale", () => {
    const w = weights([z("a", 10_000), z("b", 100_000), z("c", 1_000_000), z("d", 0)]);
    expect(w.get("a")).toBe(0);
    expect(w.get("b")).toBeCloseTo(0.5);
    expect(w.get("c")).toBe(1);
    expect(w.get("d")).toBe(0);
    expect(weights([z("only", 5_000)]).get("only")).toBe(0.5);
  });

  it("adds a crack every three months, up to four", () => {
    expect([1, 3, 6, 11, 14, 40].map(cracks)).toEqual([0, 1, 2, 3, 4, 4]);
    expect(monthsFeeding(z("a", 1), "2026-12-31")).toBe(12);
    expect(monthsFeeding(z("a", 1), "2026-01-02")).toBe(1);
  });

  it("only shows red eyes for a price increase", () => {
    expect(hasHike(z("a", 1, { priceChange: { from: 399, to: 499, on: "2026-03-01" } }))).toBe(true);
    expect(hasHike(z("a", 1, { priceChange: { from: 499, to: 399, on: "2026-03-01" } }))).toBe(false);
    expect(hasHike(z("a", 1))).toBe(false);
  });
});
