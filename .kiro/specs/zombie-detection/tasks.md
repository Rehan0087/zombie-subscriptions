# Implementation Plan: Zombie Detection Engine

- [x] 1. Project setup
  - Create the Vite + React + TypeScript project in strict mode; add Vitest, fast-check, Papa Parse, ESLint.
  - Add `npm test`, `npm run lint`, `npm run build` scripts and a GitHub Actions workflow that runs them.
  - _Requirements: all_

- [x] 2. Core types and helpers
  - [x] 2.1 Write `types.ts` with the data model from the design.
  - [x] 2.2 Write `dates.ts` (ISO ↔ day number, add days) and `money.ts` (`assertMinor`, `yearlyCost`, `perYear`), with cadence rules in `cadence.ts`.
  - [x] 2.3 Write `test-arbitraries.ts`: transaction, noisy merchant name, recurring series and statement generators.
  - _Requirements: 4.2_

- [x] 3. CSV import
  - [x] 3.1 Header synonym table and automatic column mapping.
  - [x] 3.2 Date format detection, including the day/month ambiguity flag.
  - [x] 3.3 Amount parsing (symbols, separators, parentheses, debit/credit columns).
  - [x] 3.4 Skipped-row reporting, BOM and blank-line handling.
  - [x] 3.5 Property test P10 (CSV round-trip) and unit tests for three sample bank layouts.
  - _Requirements: 1.1–1.8_

- [x] 4. Merchant normalization
  - [x] 4.1 Ordered regex rule list and `normalize()`.
  - [x] 4.2 Display-name selection (most frequent original, title-cased).
  - [x] 4.3 Property tests P2 (idempotent) and P3 (noise-invariant).
  - _Requirements: 2.1–2.3_

- [x] 5. Recurrence detection
  - [x] 5.1 Group by merchant key with stable sort.
  - [x] 5.2 Split interleaved plans by amount clustering.
  - [x] 5.3 Cadence classification with the 75% gap rule and minimum counts.
  - [x] 5.4 Amount stability with single price-change detection.
  - [x] 5.5 Confidence score and the "Maybe zombies" threshold.
  - [x] 5.6 Property tests P1, P4, P5, P6, P11.
  - _Requirements: 3.1–3.8_

- [x] 6. Zombie description
  - [x] 6.1 `describe()` building each `Zombie` with totals, price change and dormant flag.
  - [x] 6.2 "How we computed this" explanation strings.
  - [x] 6.3 Property test P7.
  - _Requirements: 4.1–4.5_

- [x] 7. Verdicts and savings
  - [x] 7.1 Verdict store with kill, spare, undo and schema-versioned localStorage persistence.
  - [x] 7.2 `applyVerdicts()` including resurrection.
  - [x] 7.3 Property tests P8 and P9.
  - _Requirements: 5.1–5.6_

- [x] 8. Merge/split overrides
  - Store user merge/split choices and apply them before detection.
  - _Requirements: 2.4_

- [x] 9. Public API
  - Export `analyzeStatement(csvText, options) -> { zombies, maybeZombies, skipped, mapping }` from `src/core/index.ts`.
  - _Requirements: all_
