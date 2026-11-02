/** ISO calendar date, e.g. "2026-11-02". */
export type IsoDate = string;

/** Integer minor units (paisa, cents). Negative = money leaving the account. */
export type Minor = number;

export interface Transaction {
  /** Stable id: hash of row content + row index. */
  id: string;
  date: IsoDate;
  description: string;
  amount: Minor;
}

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

export interface PriceChange {
  from: Minor;
  to: Minor;
  on: IsoDate;
}

export interface Zombie {
  /** `${merchantKey}|${cadence}|${seriesIndex}` */
  id: string;
  merchantKey: string;
  displayName: string;
  cadence: Cadence;
  /** Sorted by date ascending. */
  charges: Transaction[];
  /** Latest charge, positive. */
  currentAmount: Minor;
  /** Positive. */
  totalPaid: Minor;
  /** 0 when dormant. */
  yearlyCost: Minor;
  firstCharge: IsoDate;
  lastCharge: IsoDate;
  priceChange?: PriceChange;
  dormant: boolean;
  /** 0..1 */
  confidence: number;
}

export interface Verdict {
  kind: "kill" | "spare";
  at: IsoDate;
  /** Yearly cost when the verdict was given, so savings survive the series going quiet. */
  yearlyCost: Minor;
}
