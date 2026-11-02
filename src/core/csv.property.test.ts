import fc from "fast-check";
import Papa from "papaparse";
import { parseStatement, type DateFormat } from "./csv";
import { arbIsoDate } from "./test-arbitraries";
import type { Transaction } from "./types";

type Mode = "signed" | "parens" | "debitCredit" | "typeColumn";
interface Layout {
  dateFormat: DateFormat;
  decimal: "." | ",";
  grouping: boolean;
  mode: Mode;
  symbol: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string, f: DateFormat): string {
  const [y, m, d] = iso.split("-");
  if (f === "ymd") return iso;
  if (f === "dmy") return `${d}/${m}/${y}`;
  if (f === "mdy") return `${m}/${d}/${y}`;
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}

function formatMoney(minor: number, l: Layout): string {
  const abs = Math.abs(minor);
  let int = String(Math.floor(abs / 100));
  if (l.grouping) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, l.decimal === "." ? "," : ".");
  return `${l.symbol}${int}${l.decimal}${String(abs % 100).padStart(2, "0")}`;
}

function toCsv(txs: Omit<Transaction, "id">[], l: Layout): string {
  const rows = txs.map((t) => {
    const date = formatDate(t.date, l.dateFormat);
    const money = formatMoney(t.amount, l);
    switch (l.mode) {
      case "signed":
        return [date, t.description, (t.amount < 0 ? "-" : "") + money];
      case "parens":
        return [date, t.description, t.amount < 0 ? `(${money})` : money];
      case "debitCredit":
        return [date, t.description, t.amount < 0 ? money : "", t.amount > 0 ? money : ""];
      case "typeColumn":
        return [date, t.description, money, t.amount < 0 ? "DR" : "CR"];
    }
  });
  const header =
    l.mode === "debitCredit"
      ? ["Txn Date", "Narration", "Withdrawal Amt", "Deposit Amt"]
      : l.mode === "typeColumn"
        ? ["Posting Date", "Details", "Amount", "Dr/Cr"]
        : ["Date", "Description", "Amount"];
  return Papa.unparse([header, ...rows]);
}

const arbDescription = fc
  .array(fc.constantFrom("Grim", "flix", '"quoted"', "a,b", "café", "৳tk", "x", "UPI/Raven", "#12"), { minLength: 1, maxLength: 4 })
  .map((w) => w.join(" "));

const arbTx = fc.record({
  date: arbIsoDate("2000-01-01", "2030-12-31"),
  description: arbDescription,
  amount: fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }).filter((n) => n !== 0),
});

const arbLayout: fc.Arbitrary<Layout> = fc.record({
  dateFormat: fc.constantFrom<DateFormat>("ymd", "dmy", "mdy", "dmony"),
  decimal: fc.constantFrom<"." | ",">(".", ","),
  grouping: fc.boolean(),
  mode: fc.constantFrom<Mode>("signed", "parens", "debitCredit", "typeColumn"),
  symbol: fc.constantFrom("", "৳", "Tk ", "$"),
});

describe("CSV import properties", () => {
  it("P10: writing transactions in any supported layout and reading them back is lossless", () => {
    fc.assert(
      fc.property(fc.array(arbTx, { minLength: 1, maxLength: 30 }), arbLayout, (txs, layout) => {
        const csv = toCsv(txs, layout);
        const ambiguousOrder = layout.dateFormat === "dmy" || layout.dateFormat === "mdy";
        const result = parseStatement(csv, ambiguousOrder ? { dateFormat: layout.dateFormat } : {});
        expect(result.skipped).toEqual([]);
        expect(result.transactions.map(({ date, description, amount }) => ({ date, description, amount }))).toEqual(txs);
      }),
      { numRuns: 200 },
    );
  });
});
