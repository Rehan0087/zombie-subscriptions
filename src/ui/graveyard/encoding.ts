import { daysBetween, type IsoDate, type Zombie } from "../../core";

/**
 * Visual encodings from the graveyard-ui design. Every spooky effect maps to a number here,
 * so the meaning is testable and nothing is decoration only.
 */

/** 0..1 prominence from yearly cost on a log scale across the visible zombies. */
export function weights(zombies: readonly Zombie[]): Map<string, number> {
  const costs = zombies.map((z) => z.yearlyCost).filter((c) => c > 0);
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  const result = new Map<string, number>();
  for (const z of zombies) {
    if (z.yearlyCost <= 0 || costs.length === 0) result.set(z.id, 0);
    else if (max === min) result.set(z.id, 0.5);
    else result.set(z.id, Math.min(1, Math.max(0, Math.log(z.yearlyCost / min) / Math.log(max / min))));
  }
  return result;
}

/** Whole months from the first charge to the reference date, at least 1. */
export function monthsFeeding(z: Zombie, referenceDate: IsoDate): number {
  return Math.max(1, Math.round(daysBetween(z.firstCharge, referenceDate) / 30.44));
}

/** Grave cracks: one per three months of feeding, at most four. */
export function cracks(months: number): number {
  return Math.min(4, Math.floor(months / 3));
}

/** Red eyes: the price went up since an earlier charge. */
export function hasHike(z: Zombie): boolean {
  return z.priceChange !== undefined && z.priceChange.to > z.priceChange.from;
}
