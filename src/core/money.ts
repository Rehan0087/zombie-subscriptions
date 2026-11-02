import { CADENCES } from "./cadence";
import type { Cadence, Minor } from "./types";

/** Throws unless `n` is a safe integer. Money must never be a float. */
export function assertMinor(n: number): Minor {
  if (!Number.isSafeInteger(n)) throw new Error(`Money must be integer minor units, got ${n}`);
  return n;
}

/** Charges per year for each cadence (requirement 4.2). */
export function perYear(cadence: Cadence): number {
  return CADENCES[cadence].perYear;
}

/**
 * Estimated yearly cost, positive, in minor units: |currentAmount| × charges per year,
 * or 0 for a dormant series (requirements 4.2 and 4.4).
 */
export function yearlyCost(currentAmount: Minor, cadence: Cadence, dormant: boolean): Minor {
  assertMinor(currentAmount);
  if (dormant) return 0;
  return assertMinor(Math.abs(currentAmount) * perYear(cadence));
}

/** Sum of minor-unit amounts, checked for overflow. */
export function sumMinor(amounts: readonly Minor[]): Minor {
  return assertMinor(amounts.reduce((total, a) => total + assertMinor(a), 0));
}
