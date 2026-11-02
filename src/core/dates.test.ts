import { addDays, addMonths, daysBetween, daysInMonth, fromDayNumber, isIsoDate, toDayNumber } from "./dates";

describe("dates", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-1-01")).toBe(false);
  });

  it("converts to and from day numbers", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(fromDayNumber(toDayNumber("2026-11-02"))).toBe("2026-11-02");
    expect(() => toDayNumber("2026-02-30")).toThrow();
  });

  it("counts days and month lengths", () => {
    expect(daysBetween("2026-01-01", "2026-12-31")).toBe(364);
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it("clamps the day when adding months, like billing systems", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
});
