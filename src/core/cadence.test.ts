import { CADENCE_NAMES, CADENCES, cadenceForGap } from "./cadence";

describe("cadence windows", () => {
  it("match requirement 3.2", () => {
    expect(cadenceForGap(7)).toBe("weekly");
    expect(cadenceForGap(31)).toBe("monthly");
    expect(cadenceForGap(91)).toBe("quarterly");
    expect(cadenceForGap(365)).toBe("yearly");
    expect(cadenceForGap(14)).toBeUndefined();
  });

  it("don't overlap", () => {
    const windows = CADENCE_NAMES.map((c) => CADENCES[c].window);
    windows.slice(1).forEach((w, i) => expect(w[0]).toBeGreaterThan(windows[i]![1]));
  });
});
