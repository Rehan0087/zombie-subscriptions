import { parseStatement, type DateFormat, type ColumnMapping, type ImportResult } from "./csv";
import { detect, type Detection, type Overrides } from "./detect";

export * from "./types";
export { CADENCES } from "./cadence";
export { addDays, daysBetween, toDayNumber } from "./dates";
export { perYear } from "./money";
export { costBreakdown, MAYBE_THRESHOLD, NO_OVERRIDES } from "./detect";
export type { ColumnMapping, ColumnRole, DateFormat, ImportNeed, ImportResult, SkippedRow } from "./csv";
export type { Detection, Overrides } from "./detect";

export interface AnalyzeOptions {
  mapping?: ColumnMapping;
  dateFormat?: DateFormat;
  overrides?: Overrides;
  referenceDate?: string;
}

export interface Analysis {
  import: ImportResult;
  /** Empty until `import.needs` is empty. */
  detection: Detection;
}

/** The one entry point the UI uses: CSV text in, zombies out. */
export function analyzeStatement(csvText: string, options: AnalyzeOptions = {}): Analysis {
  const imported = parseStatement(csvText, { mapping: options.mapping, dateFormat: options.dateFormat });
  const detection = detect(imported.transactions, { overrides: options.overrides, referenceDate: options.referenceDate });
  return { import: imported, detection };
}
