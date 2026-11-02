import { addDays, addMonths } from "./dates";
import { costBreakdown, detect } from "./detect";
import type { Transaction } from "./types";

let n = 0;
const tx = (date: string, description: string, amount: number): Transaction => ({ id: `t${n++}`, date, description, amount });
const monthly = (start: string, count: number, description: string, amount: number | ((k: number) => number)) =>
  Array.from({ length: count }, (_, k) => tx(addMonths(start, k), description, typeof amount === "number" ? amount : amount(k)));

describe("detect", () => {
  it("finds a plain monthly subscription and costs it", () => {
    const { zombies } = detect(monthly("2026-01-05", 6, "GRIMFLIX.COM 8573", -120_000));
    expect(zombies).toHaveLength(1);
    const z = zombies[0]!;
    expect(z).toMatchObject({
      merchantKey: "grimflix",
      displayName: "Grimflix",
      cadence: "monthly",
      currentAmount: 120_000,
      totalPaid: 720_000,
      yearlyCost: 1_440_000,
      firstCharge: "2026-01-05",
      lastCharge: "2026-06-05",
      dormant: false,
    });
    expect(costBreakdown(z)).toEqual({ amount: 120_000, perYear: 12, yearly: 1_440_000, dormant: false });
  });

  it("flags a price hike with the month it changed", () => {
    const { zombies } = detect(monthly("2026-01-10", 6, "Hex Daily", (k) => (k < 3 ? -39_900 : -49_900)));
    expect(zombies[0]?.priceChange).toEqual({ from: 39_900, to: 49_900, on: "2026-04-10" });
  });

  it("flags a hike in the latest charge", () => {
    const { zombies } = detect(monthly("2026-01-10", 5, "Hex Daily", (k) => (k < 4 ? -39_900 : -49_900)));
    expect(zombies[0]?.priceChange?.on).toBe("2026-05-10");
  });

  it("does not report a price change for small noise", () => {
    const amounts = [-10_000, -10_300, -9_800, -10_100, -9_900, -10_200];
    const { zombies } = detect(monthly("2026-01-01", 6, "Bat Beats", (k) => amounts[k]!));
    expect(zombies[0]?.priceChange).toBeUndefined();
  });

  it("tolerates one skipped payment", () => {
    const dates = ["2026-01-05", "2026-02-05", "2026-03-05", "2026-05-05", "2026-06-05", "2026-07-05"];
    const { zombies, maybeZombies } = detect(dates.map((d) => tx(d, "Wraith Gym", -250_000)));
    expect([...zombies, ...maybeZombies].map((z) => z.cadence)).toEqual(["monthly"]);
  });

  it("tolerates one late payment", () => {
    const dates = ["2026-01-05", "2026-02-05", "2026-03-05", "2026-04-19", "2026-05-05", "2026-06-05"];
    const { zombies, maybeZombies } = detect(dates.map((d) => tx(d, "Wraith Gym", -250_000)));
    expect([...zombies, ...maybeZombies].map((z) => z.cadence)).toEqual(["monthly"]);
  });

  it("finds weekly, quarterly and yearly cadences", () => {
    const weekly = Array.from({ length: 8 }, (_, k) => tx(addDays("2026-01-05", 7 * k), "Moonlit Mobile", -14_900));
    const quarterly = Array.from({ length: 4 }, (_, k) => tx(addMonths("2025-01-15", 3 * k), "Raven Reads", -90_000));
    const yearly = [tx("2025-03-01", "Crypt Drive", -180_000), tx("2026-03-02", "Crypt Drive", -180_000)];
    const { zombies, maybeZombies } = detect([...weekly, ...quarterly, ...yearly], { referenceDate: "2026-03-10" });
    const found = Object.fromEntries([...zombies, ...maybeZombies].map((z) => [z.merchantKey, z.cadence]));
    expect(found).toEqual({ "moonlit mobile": "weekly", "raven reads": "quarterly", "crypt drive": "yearly" });
  });

  it("marks a stopped subscription dormant and doesn't count its cost", () => {
    const { zombies } = detect(monthly("2025-09-03", 6, "Ghoul Arcade", -19_900), { referenceDate: "2026-10-28" });
    expect(zombies[0]).toMatchObject({ dormant: true, yearlyCost: 0 });
  });

  it("splits two plans billed by one merchant", () => {
    const basic = monthly("2026-01-08", 6, "Phantom Shield VPN", -35_000);
    const family = monthly("2026-01-22", 6, "Phantom Shield VPN", -110_000);
    const { zombies } = detect([...basic, ...family]);
    expect(zombies.map((z) => [z.id, z.currentAmount])).toEqual([
      ["phantom shield vpn|monthly|1", 110_000],
      ["phantom shield vpn|monthly|0", 35_000],
    ]);
  });

  it("ignores credits, one-offs and irregular shopping", () => {
    const salary = monthly("2026-01-25", 6, "Salary", 6_500_000);
    const shop = ["2026-01-02", "2026-01-04", "2026-01-09", "2026-01-10", "2026-01-15", "2026-01-21"].map((d) => tx(d, "Corner Grocer", -45_000));
    const { zombies, maybeZombies } = detect([...salary, ...shop, tx("2026-02-14", "Pumpkin Bakery", -80_000)]);
    expect([...zombies, ...maybeZombies]).toEqual([]);
  });

  it("applies the user's merge and split overrides", () => {
    const a = monthly("2026-01-05", 3, "Grim Flix", -120_000);
    const b = monthly("2026-04-05", 3, "Grimflix", -120_000);
    expect(detect([...a, ...b]).zombies.map((z) => z.merchantKey).sort()).toEqual(["grim flix", "grimflix"]);
    const merged = detect([...a, ...b], { overrides: { merges: { "grim flix": "grimflix" }, splitByAmount: [] } });
    expect(merged.zombies.map((z) => [z.merchantKey, z.charges.length])).toEqual([["grimflix", 6]]);

    const hike = monthly("2026-01-10", 6, "Hex Daily", (k) => (k < 3 ? -20_000 : -50_000));
    expect(detect(hike).zombies).toHaveLength(1);
    const split = detect(hike, { overrides: { merges: {}, splitByAmount: ["hex daily"] } });
    expect([...split.zombies, ...split.maybeZombies]).toHaveLength(2);
  });

  it("handles an empty statement", () => {
    expect(detect([])).toEqual({ zombies: [], maybeZombies: [], referenceDate: "1970-01-01" });
  });
});
