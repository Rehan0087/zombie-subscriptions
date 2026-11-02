import type { Cadence } from "./types";

export interface CadenceRule {
  /** Charges per year, used for yearly cost. */
  perYear: number;
  /** Average length of one period in days, used for the dormant check. */
  nominalDays: number;
  /** Inclusive range of day gaps accepted for this cadence (requirement 3.2). */
  window: readonly [min: number, max: number];
  /** Fewest charges needed to call a series recurring (requirement 3.3). */
  minCharges: number;
}

/** The single source of truth for cadence numbers in requirements 3.2, 3.3 and 4.2. */
export const CADENCES: Readonly<Record<Cadence, CadenceRule>> = {
  weekly: { perYear: 52, nominalDays: 7, window: [6, 8], minCharges: 3 },
  monthly: { perYear: 12, nominalDays: 30.44, window: [26, 35], minCharges: 3 },
  quarterly: { perYear: 4, nominalDays: 91.31, window: [85, 98], minCharges: 3 },
  yearly: { perYear: 1, nominalDays: 365.25, window: [350, 380], minCharges: 2 },
};

export const CADENCE_NAMES: readonly Cadence[] = ["weekly", "monthly", "quarterly", "yearly"];

/** Returns the cadence whose window contains `gapDays`, or undefined. Windows don't overlap. */
export function cadenceForGap(gapDays: number): Cadence | undefined {
  return CADENCE_NAMES.find((c) => {
    const [min, max] = CADENCES[c].window;
    return gapDays >= min && gapDays <= max;
  });
}
