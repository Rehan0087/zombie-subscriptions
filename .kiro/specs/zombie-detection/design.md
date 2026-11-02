# Design: Zombie Detection Engine

## Overview
A pipeline of pure functions:

```
CSV text
  └─ parseStatement()      csv.ts        -> { transactions, skipped, mapping }
       └─ normalizeAll()   normalize.ts  -> Transaction & { merchantKey }
            └─ groupBy(merchantKey)
                 └─ splitByAmount()      detect.ts  (interleaved plans)
                      └─ classifyCadence()
                           └─ describe()            -> Zombie[]
                                └─ applyVerdicts()  state/ -> view model + totals
```

Each stage takes plain data and returns plain data. No stage reads the clock or storage.

## Data model (`src/core/types.ts`)

```ts
type IsoDate = string;              // "2026-11-02"
type Minor = number;                // integer minor units, negative = debit

interface Transaction {
  id: string;                       // stable hash of row content + row index
  date: IsoDate;
  description: string;
  amount: Minor;
}

type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

interface PriceChange { from: Minor; to: Minor; on: IsoDate }

interface Zombie {
  id: string;                       // `${merchantKey}|${cadence}|${seriesIndex}`
  merchantKey: string;
  displayName: string;
  cadence: Cadence;
  charges: Transaction[];           // sorted by date ascending
  currentAmount: Minor;             // positive, latest charge
  totalPaid: Minor;                 // positive
  yearlyCost: Minor;                // 0 when dormant
  firstCharge: IsoDate;
  lastCharge: IsoDate;
  priceChange?: PriceChange;
  dormant: boolean;
  confidence: number;               // 0..1
}

type Verdict = { kind: "kill" | "spare"; at: IsoDate };
```

## Column mapping (`csv.ts`)
- Papa Parse with `header: true`, `skipEmptyLines: "greedy"`.
- A synonym table maps header names to roles: `date`, `description`, `amount`, `debit`, `credit`.
- Date format detection: try each supported format on all non-empty date cells; choose the one that parses every row. If both `DD/MM` and `MM/DD` parse every row, return `needsConfirmation: "dayMonthOrder"`.
- Amount parsing: strip currency symbols and spaces; detect decimal separator per column by looking at the last separator in values with exactly 2 trailing digits; parentheses → negative.

## Normalization (`normalize.ts`)
Ordered list of regex rules applied to a lowercased string, then whitespace collapse and trim. Order matters; rules are data so they can be tested one by one. Idempotence is a property test (P2).

## Detection (`detect.ts`)
1. Keep debits only (`amount < 0`).
2. Group by merchant key; sort each group by date, then by id for a stable tiebreak (needed for P1).
3. **Split interleaved plans:** cluster amounts with a simple 1-D gap rule (sort distinct absolute amounts; start a new cluster when the next is > 40% above the previous). Clusters with fewer than 2 charges are dropped.
4. **Cadence:** compute day gaps; take the median; pick the cadence window containing it. Check the 75% rule and the minimum count.
5. **Amount stability:** pass if all within ±25% of the median, otherwise find the single best split point where both sides are stable → that's a price change.
6. **Confidence:** `0.4 * countScore + 0.4 * regularityScore + 0.2 * stabilityScore`, each 0..1:
   - `countScore = min(1, charges / 6)` (yearly: `min(1, charges / 3)`)
   - `regularityScore = fraction of gaps inside the window`
   - `stabilityScore = 1 - (MAD of amounts / median amount)`, clamped
7. **Dormant:** `referenceDate - lastCharge > 1.5 × nominal cadence days` (7, 30.44, 91.31, 365.25).

## Money (`money.ts`)
- `yearlyCost = abs(currentAmount) * perYear[cadence]` — integer multiplication, no floats.
- Formatting happens in the UI only.

## Verdicts (`src/state/verdicts.ts`)
- `Map<string /* merchantKey|cadence */, Verdict>` persisted to localStorage as JSON with a schema version.
- `applyVerdicts(zombies, verdicts)` returns `{ feeding, killed, spared, resurrected, soulsSaved, stillFeeding }`.
- Resurrected = verdict is `kill` and the zombie has a charge dated after `verdict.at`.

## Correctness properties (for property-based tests)
| ID | Property | Requirement |
|----|----------|-------------|
| P1 | Shuffling the input rows produces exactly the same zombies (same ids, same fields). | 3.7 |
| P2 | `normalize(normalize(s)) === normalize(s)` for any string. | 2.2 |
| P3 | Adding card suffixes, store numbers or payment prefixes to a description does not change its merchant key. | 2.1 |
| P4 | A generated series with a known cadence is detected with that cadence. Series model real billing: fixed schedule (monthly on the same day of month, clamped to month length), posted 0–2 days late (0–1 weekly, 0–3 yearly), ±10% amount noise, optional single 10–50% price hike. | 3.2–3.5 |
| P5 | Credits never appear in any zombie's charges. | 3.1 |
| P6 | A merchant with fewer than the minimum number of charges is never a zombie. | 3.3 |
| P7 | `yearlyCost === abs(currentAmount) × perYear[cadence]` for active zombies and `0` for dormant ones; always an integer. | 4.2, 4.4 |
| P8 | For any sequence of kill/spare/undo actions, `soulsSaved` equals the sum of yearly costs of killed, non-resurrected zombies. | 5.1–5.6 |
| P9 | Undoing the last verdict restores the previous view model exactly. | 5.3 |
| P10 | Serializing transactions to CSV in any supported layout and parsing it back yields the same transactions. | 1.2–1.6 |
| P11 | Two interleaved series whose amounts differ by more than 2× are reported as two zombies. | 3.6 |

## Design notes
- Symmetric ±3 day jitter (the first draft of P4) produces weekly gaps of 1–13 days, which no real weekly subscription has and which the 6–8 day window rejects. Banks post late, never early, so generators use a one-sided posting delay instead.
- Cadence numbers (windows, minimum charges, charges per year, nominal days) live only in `src/core/cadence.ts`.

## Error handling
- Parsing never throws for bad data; it returns `skipped` rows with reasons.
- Programming errors (e.g. non-integer money) throw in development via an `assertMinor()` helper.

## Testing
See `.kiro/steering/testing.md`. Target: every property above passes 200 runs, and every shrunk counterexample found during development is kept as a unit test.
