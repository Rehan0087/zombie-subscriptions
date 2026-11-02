import { autoMap, detectDecimal, parseAmount, parseDate, parseStatement } from "./csv";

const strip = (txs: { date: string; description: string; amount: number }[]) =>
  txs.map(({ date, description, amount }) => ({ date, description, amount }));

describe("autoMap", () => {
  it("maps common synonyms and ignores balance", () => {
    expect(autoMap(["Txn Date", "Narration", "Withdrawal Amt", "Deposit Amt", "Closing Balance"])).toEqual({
      date: "Txn Date",
      description: "Narration",
      debit: "Withdrawal Amt",
      credit: "Deposit Amt",
    });
    expect(autoMap(["Posting Date", "Details", "Amount (BDT)", "Dr/Cr"])).toEqual({
      date: "Posting Date",
      description: "Details",
      amount: "Amount (BDT)",
      type: "Dr/Cr",
    });
  });
});

describe("parseDate", () => {
  it("reads every supported format", () => {
    expect(parseDate("2026-03-14", "ymd")).toBe("2026-03-14");
    expect(parseDate("14/03/2026", "dmy")).toBe("2026-03-14");
    expect(parseDate("03/14/2026", "mdy")).toBe("2026-03-14");
    expect(parseDate("14-Mar-2026", "dmony")).toBe("2026-03-14");
    expect(parseDate("14 March 2026", "dmony")).toBe("2026-03-14");
    expect(parseDate("2026-03-14T10:22:00Z", "ymd")).toBe("2026-03-14");
    expect(parseDate("14/03/26 10:22 PM", "dmy")).toBe("2026-03-14");
    expect(parseDate("31/02/2026", "dmy")).toBeUndefined();
  });
});

describe("parseAmount", () => {
  it("handles symbols, separators and negatives", () => {
    expect(parseAmount("৳1,200.50", ".")).toBe(120_050);
    expect(parseAmount("-499", ".")).toBe(-49_900);
    expect(parseAmount("(1,000.00)", ".")).toBe(-100_000);
    expect(parseAmount("1.234,56 €", ",")).toBe(123_456);
    expect(parseAmount("Tk 350.00 Dr", ".")).toBe(-35_000);
    expect(parseAmount("65,000.00 Cr", ".")).toBe(6_500_000);
    expect(parseAmount("12.5", ".")).toBe(1_250);
    expect(parseAmount("", ".")).toBeUndefined();
    expect(parseAmount("abc", ".")).toBeUndefined();
    expect(parseAmount("1.2.3", ",")).toBe(12_300);
  });

  it("guesses the decimal separator", () => {
    expect(detectDecimal(["1,200.50", "499.00"])).toBe(".");
    expect(detectDecimal(["1.200,50", "499,00"])).toBe(",");
    expect(detectDecimal(["1.000", "2.500"])).toBe(",");
    expect(detectDecimal([])).toBe(".");
  });
});

describe("parseStatement", () => {
  it("reads a signed-amount statement", () => {
    const csv = "Date,Description,Amount\n2026-01-05,GRIMFLIX.COM 8573,-1200.00\n2026-01-25,Salary,65000.00\n";
    const r = parseStatement(csv);
    expect(r.needs).toEqual([]);
    expect(strip(r.transactions)).toEqual([
      { date: "2026-01-05", description: "GRIMFLIX.COM 8573", amount: -120_000 },
      { date: "2026-01-25", description: "Salary", amount: 6_500_000 },
    ]);
  });

  it("combines debit and credit columns and skips the preamble", () => {
    const csv = [
      "Haunted Bank Ltd,,,,",
      "Statement for: A. Ghost,,,,",
      "",
      "Txn Date,Narration,Withdrawal Amt,Deposit Amt,Balance",
      '14/01/2026,"POS BAT BEATS, DHAKA",299.00,,10000.00',
      "25/01/2026,SALARY,,\"65,000.00\",75000.00",
    ].join("\n");
    const r = parseStatement(csv);
    expect(r.dateFormat).toBe("dmy");
    expect(strip(r.transactions)).toEqual([
      { date: "2026-01-14", description: "POS BAT BEATS, DHAKA", amount: -29_900 },
      { date: "2026-01-25", description: "SALARY", amount: 6_500_000 },
    ]);
  });

  it("uses a Dr/Cr type column", () => {
    const csv = "Posting Date,Details,Amount,Dr/Cr\n05-Jan-2026,Wraith Gym,2500.00,DR\n25-Jan-2026,Salary,65000.00,CR\n";
    expect(strip(parseStatement(csv).transactions).map((t) => t.amount)).toEqual([-250_000, 6_500_000]);
  });

  it("asks for day/month order only when every date is ambiguous", () => {
    const csv = "Date,Description,Amount\n01/02/2026,A,-1\n03/04/2026,B,-2\n";
    const r = parseStatement(csv);
    expect(r.needs).toEqual(["dayMonthOrder"]);
    expect(r.transactions).toEqual([]);
    expect(parseStatement(csv, { dateFormat: "mdy" }).transactions[0]?.date).toBe("2026-01-02");
    expect(parseStatement(csv, { dateFormat: "dmy" }).transactions[0]?.date).toBe("2026-02-01");
  });

  it("asks for columns it cannot find, and accepts a manual mapping", () => {
    const csv = "When,What,How much\n2026-01-05,Grimflix,-1200\n";
    const r = parseStatement(csv);
    expect(r.needs).toEqual(["date", "description", "amount"]);
    expect(r.samples["What"]).toEqual(["Grimflix"]);
    const mapped = parseStatement(csv, { mapping: { date: "When", description: "What", amount: "How much" } });
    expect(mapped.needs).toEqual([]);
    expect(mapped.transactions).toHaveLength(1);
  });

  it("skips bad rows, strips the BOM and ignores blank lines", () => {
    const csv = "\uFEFFDate,Description,Amount\n2026-01-05,Grimflix,-1200\n\nnot a date,Oops,-1\n2026-01-06,,-5\n2026-01-07,Owl Pharmacy,lots\n";
    const r = parseStatement(csv);
    expect(r.headers[0]).toBe("Date");
    expect(r.transactions).toHaveLength(1);
    expect(r.skipped).toEqual([
      { row: 3, reason: "unreadable date" },
      { row: 4, reason: "no description" },
      { row: 5, reason: "unreadable amount" },
    ]);
  });

  it("handles empty input", () => {
    expect(parseStatement("").transactions).toEqual([]);
    expect(parseStatement("Date,Description,Amount\n").transactions).toEqual([]);
  });

  it("gives every row a distinct, stable id", () => {
    const csv = "Date,Description,Amount\n2026-01-05,Grimflix,-1200\n2026-01-05,Grimflix,-1200\n";
    const a = parseStatement(csv).transactions.map((t) => t.id);
    expect(new Set(a).size).toBe(2);
    expect(parseStatement(csv).transactions.map((t) => t.id)).toEqual(a);
  });
});
