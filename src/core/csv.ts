import Papa from "papaparse";
import { isIsoDate } from "./dates";
import type { IsoDate, Minor, Transaction } from "./types";

export type ColumnRole = "date" | "description" | "amount" | "debit" | "credit" | "type";
export type ColumnMapping = Partial<Record<ColumnRole, string>>;
export type DateFormat = "ymd" | "dmy" | "mdy" | "dmony";
export type ImportNeed = "date" | "description" | "amount" | "dayMonthOrder";

export interface ImportOptions {
  /** Overrides the automatic mapping, role by role. */
  mapping?: ColumnMapping;
  /** Overrides date format detection (used to settle day/month order). */
  dateFormat?: DateFormat;
}

export interface SkippedRow {
  /** 1-based row number in the file. */
  row: number;
  reason: string;
}

export interface ImportResult {
  headers: string[];
  /** Up to three non-empty example values per header, for the mapping dialog. */
  samples: Record<string, string[]>;
  mapping: ColumnMapping;
  dateFormat?: DateFormat;
  /** What the user must settle before transactions can be trusted. Empty when ready. */
  needs: ImportNeed[];
  /** Empty while `needs` is not. */
  transactions: Transaction[];
  skipped: SkippedRow[];
}

/** Header synonyms in priority order (requirement 1.2). Compared after `normalizeHeader`. */
const SYNONYMS: Record<ColumnRole, string[]> = {
  date: ["date", "transaction date", "txn date", "trans date", "posting date", "post date", "booking date", "value date"],
  description: [
    "description", "narration", "details", "particulars", "transaction details", "transaction description",
    "memo", "payee", "merchant", "remarks", "reference",
  ],
  type: ["type", "dr cr", "cr dr", "transaction type", "debit credit", "credit debit"],
  amount: ["amount", "transaction amount", "amt", "value"],
  debit: ["debit", "debit amount", "withdrawal", "withdrawals", "withdrawal amt", "withdrawal amount", "money out", "paid out", "dr"],
  credit: ["credit", "credit amount", "deposit", "deposits", "deposit amt", "deposit amount", "money in", "paid in", "cr"],
};

const FALLBACKS: Record<ColumnRole, (h: string) => boolean> = {
  date: (h) => h.includes("date"),
  description: (h) => /desc|narrat|detail|particular/.test(h),
  type: () => false,
  amount: (h) => /amount|amt/.test(h) && !/debit|credit|withdraw|deposit/.test(h),
  debit: (h) => /debit|withdraw/.test(h),
  credit: (h) => /credit|deposit/.test(h),
};

const ROLE_ORDER: ColumnRole[] = ["date", "description", "type", "amount", "debit", "credit"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Guesses a column for each role from the header row. Never maps a balance column. */
export function autoMap(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  const candidates = headers.filter((h) => !normalizeHeader(h).includes("balance"));
  const claim = (role: ColumnRole, match: (n: string) => boolean) => {
    if (mapping[role]) return;
    const header = candidates.find((h) => !used.has(h) && match(normalizeHeader(h)));
    if (header) {
      mapping[role] = header;
      used.add(header);
    }
  };
  for (const role of ROLE_ORDER) for (const syn of SYNONYMS[role]) claim(role, (n) => n === syn);
  for (const role of ROLE_ORDER) claim(role, FALLBACKS[role]);
  // A single signed amount column wins over guessed debit/credit columns only when no debit/credit pair exists.
  if (mapping.amount && (mapping.debit || mapping.credit)) delete mapping.amount;
  return mapping;
}

// ---------- dates ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const TIME_SUFFIX = /(?:T|\s+)\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:[ap]m)?\s*(?:z|[+-]\d{2}:?\d{2})?$/i;

function iso(y: number, m: number, d: number): IsoDate | undefined {
  const year = y < 100 ? 2000 + y : y;
  const s = `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isIsoDate(s) ? s : undefined;
}

/** Parses one date cell in the given format (requirement 1.5). Times after the date are ignored. */
export function parseDate(raw: string, format: DateFormat): IsoDate | undefined {
  const v = raw.trim().replace(TIME_SUFFIX, "");
  let m: RegExpExecArray | null;
  switch (format) {
    case "ymd":
      m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(v);
      return m ? iso(+m[1]!, +m[2]!, +m[3]!) : undefined;
    case "dmy":
    case "mdy":
      m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(v);
      if (!m) return undefined;
      return format === "dmy" ? iso(+m[3]!, +m[2]!, +m[1]!) : iso(+m[3]!, +m[1]!, +m[2]!);
    case "dmony": {
      m = /^(\d{1,2})[-\s/]([a-z]{3,9})\.?[-\s/,]+(\d{4}|\d{2})$/i.exec(v);
      if (!m) return undefined;
      const month = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase());
      return month < 0 ? undefined : iso(+m[3]!, month + 1, +m[1]!);
    }
  }
}

const DATE_FORMATS: DateFormat[] = ["ymd", "dmy", "mdy", "dmony"];

function detectDateFormat(cells: readonly string[]): { format?: DateFormat; ambiguous: boolean } {
  const filled = cells.filter((c) => c.trim() !== "");
  if (filled.length === 0) return { ambiguous: false };
  const counts = DATE_FORMATS.map((f) => filled.filter((c) => parseDate(c, f) !== undefined).length);
  const full = DATE_FORMATS.filter((_, i) => counts[i] === filled.length);
  if (full.includes("dmy") && full.includes("mdy")) return { ambiguous: true };
  if (full.length > 0) return { format: full[0], ambiguous: false };
  const best = Math.max(...counts);
  return best === 0 ? { ambiguous: false } : { format: DATE_FORMATS[counts.indexOf(best)], ambiguous: false };
}

// ---------- amounts ----------

/** Guesses the decimal separator from values with 1–2 digits after the last separator. */
export function detectDecimal(values: readonly string[]): "." | "," {
  const votes = { ".": 0, ",": 0 };
  for (const v of values) {
    const m = /([.,])(\d+)\D*$/.exec(v.trim());
    if (!m) continue;
    const sep = m[1] as "." | ",";
    if (m[2]!.length <= 2) votes[sep] += 1;
    else if (m[2]!.length === 3) votes[sep === "." ? "," : "."] += 0.5;
  }
  return votes[","] > votes["."] ? "," : ".";
}

/**
 * Parses an amount cell to signed minor units (requirement 1.6): currency symbols, thousands
 * separators, parentheses or a trailing "-" / "DR" for negatives. Returns undefined when empty or unreadable.
 */
export function parseAmount(raw: string, decimal: "." | ","): Minor | undefined {
  let s = raw.trim();
  if (s === "") return undefined;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\bdr\.?$/i.test(s)) {
    negative = !negative;
    s = s.replace(/\bdr\.?$/i, "");
  } else {
    s = s.replace(/\bcr\.?$/i, "");
  }
  s = s.replace(/[^\d.,+-]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  s = s.split(decimal === "." ? "," : ".").join("");
  const parts = s.split(decimal);
  if (parts.length > 2) return undefined;
  const int = parts[0] === "" && parts[1] ? "0" : (parts[0] ?? "");
  const frac = parts[1] ?? "";
  if (!/^\d+$/.test(int) || !/^\d{0,2}$/.test(frac)) return undefined;
  const minor = Number(int) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return undefined;
  if (minor === 0) return 0;
  return negative ? -minor : minor;
}

function typeSign(raw: string): 1 | -1 | undefined {
  const v = raw.trim().toLowerCase();
  if (/^(d|dr|debit|withdrawal)\b/.test(v)) return -1;
  if (/^(c|cr|credit|deposit)\b/.test(v)) return 1;
  return undefined;
}

// ---------- rows ----------

/** FNV-1a, enough for stable row ids. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Finds the header row: the first of the top 20 rows that names at least two roles. */
function findHeaderRow(rows: readonly string[][]): number {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const roles = Object.keys(autoMap(rows[i]!)).length;
    if (roles >= 2) return i;
  }
  return 0;
}

/**
 * Turns CSV text into transactions in the browser (requirement 1). Never throws on bad data:
 * unreadable rows are reported in `skipped`, and missing decisions are reported in `needs`.
 */
export function parseStatement(text: string, options: ImportOptions = {}): ImportResult {
  const clean = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy" });
  const rows = parsed.data.filter((r) => r.some((c) => c.trim() !== ""));
  const headerIndex = findHeaderRow(rows);
  const headers = (rows[headerIndex] ?? []).map((h) => h.trim());
  const body = rows.slice(headerIndex + 1);

  const col = (header: string | undefined) => (header === undefined ? -1 : headers.indexOf(header));
  const cell = (row: string[], header: string | undefined) => {
    const i = col(header);
    return i < 0 ? "" : (row[i] ?? "").trim();
  };

  const samples: Record<string, string[]> = {};
  headers.forEach((h, i) => {
    samples[h] = body.map((r) => (r[i] ?? "").trim()).filter((v) => v !== "").slice(0, 3);
  });

  const mapping: ColumnMapping = { ...autoMap(headers), ...options.mapping };
  for (const role of ROLE_ORDER) if (mapping[role] !== undefined && col(mapping[role]) < 0) delete mapping[role];
  if (options.mapping?.amount) {
    delete mapping.debit;
    delete mapping.credit;
  } else if (options.mapping?.debit || options.mapping?.credit) {
    delete mapping.amount;
  }

  const needs: ImportNeed[] = [];
  if (!mapping.date) needs.push("date");
  if (!mapping.description) needs.push("description");
  if (!mapping.amount && !mapping.debit && !mapping.credit) needs.push("amount");

  let dateFormat = options.dateFormat;
  if (mapping.date && !dateFormat) {
    const detected = detectDateFormat(body.map((r) => cell(r, mapping.date)));
    if (detected.ambiguous) needs.push("dayMonthOrder");
    else if (detected.format) dateFormat = detected.format;
    else needs.push("date");
  }

  const result: ImportResult = { headers, samples, mapping, dateFormat, needs, transactions: [], skipped: [] };
  if (needs.length > 0 || !dateFormat) return result;

  const amountCells = [mapping.amount, mapping.debit, mapping.credit].flatMap((h) => (h ? body.map((r) => cell(r, h)) : []));
  const decimal = detectDecimal(amountCells);

  body.forEach((row, i) => {
    const rowNumber = headerIndex + i + 2;
    const skip = (reason: string) => result.skipped.push({ row: rowNumber, reason });

    const date = parseDate(cell(row, mapping.date), dateFormat);
    if (!date) return skip("unreadable date");
    const description = cell(row, mapping.description).replace(/\s+/g, " ");
    if (!description) return skip("no description");

    let amount: Minor | undefined;
    if (mapping.amount) {
      const raw = cell(row, mapping.amount);
      amount = parseAmount(raw, decimal);
      if (amount === undefined) return skip(raw ? "unreadable amount" : "no amount");
      const sign = mapping.type ? typeSign(cell(row, mapping.type)) : undefined;
      if (sign) amount = Math.abs(amount) * sign;
    } else {
      const debitRaw = cell(row, mapping.debit);
      const creditRaw = cell(row, mapping.credit);
      const debit = parseAmount(debitRaw, decimal);
      const credit = parseAmount(creditRaw, decimal);
      if (debit === undefined && credit === undefined) {
        return skip(/\d/.test(debitRaw + creditRaw) ? "unreadable amount" : "no amount");
      }
      amount = Math.abs(credit ?? 0) - Math.abs(debit ?? 0);
    }
    if (amount === 0) return skip("zero amount");

    result.transactions.push({ id: `${hash(`${i}|${date}|${description}|${amount}`)}-${i}`, date, description, amount });
  });

  return result;
}
