import { analyzeStatement } from "../core";
import sample from "./haunted-statement.csv?raw";

// What the "Load sample graveyard" button must show judges (see the sample-data-refresh hook).
describe("sample graveyard", () => {
  const { import: imported, detection } = analyzeStatement(sample);
  const all = [...detection.zombies, ...detection.maybeZombies];
  const byKey = (key: string) => all.filter((z) => z.merchantKey === key);

  it("imports cleanly without asking anything", () => {
    expect(imported.needs).toEqual([]);
    expect(imported.skipped).toEqual([]);
    expect(imported.transactions.length).toBeGreaterThan(300);
  });

  it("shows every feature", () => {
    const active = detection.zombies.filter((z) => !z.dormant);
    expect(active.length).toBeGreaterThanOrEqual(8);
    expect(all.some((z) => z.priceChange && z.priceChange.to > z.priceChange.from)).toBe(true);
    expect(all.some((z) => z.cadence === "yearly" && !z.dormant)).toBe(true);
    expect(all.some((z) => z.cadence === "weekly")).toBe(true);
    expect(all.some((z) => z.cadence === "quarterly")).toBe(true);
    expect(byKey("phantom shield vpn")).toHaveLength(2);
    expect(all.some((z) => z.dormant)).toBe(true);
    expect(detection.maybeZombies.length).toBeGreaterThanOrEqual(1);
    expect(all.every((z) => z.charges.every((c) => c.amount < 0))).toBe(true);
  });

  it("finds exactly the planted subscriptions", () => {
    expect([...new Set(all.map((z) => z.merchantKey))].sort()).toEqual([
      "bat beats", "coffin cloud storage", "crypt drive annual plan", "ghoul arcade pass", "grimflix", "hex daily news",
      "moonlit mobile data pack", "phantom shield vpn", "raven reads quarterly", "skull fit class", "wraith gym membership",
    ]);
  });
});
