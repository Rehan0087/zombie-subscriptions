# Implementation Plan: Zombie Detection Engine

- [x] 1. Project setup
  - Create the Vite + React + TypeScript project in strict mode; add Vitest, fast-check, Papa Parse, ESLint.
  - Add `npm test`, `npm run lint`, `npm run build` scripts and a GitHub Actions workflow that runs them.
  - _Requirements: all_

- [ ] 2. Core types and helpers
  - [ ] 2.1 Write `types.ts` with the data model from the design.
  - [ ] 2.2 Write `dates.ts` (ISO ↔ day number, add days) and `money.ts` (`assertMinor`, `yearlyCost`, `perYear`).
  - [ ] 2.3 Write `test-arbitraries.ts`: transaction, noisy merchant name, recurring series and statement generators.
  - _Requirements: 4.2_

- [ ] 3. CSV import
  - [ ] 3.1 Header synonym table and automatic column mapping.
  - [ ] 3.2 Date format detection, including the day/month ambiguity flag.
  - [ ] 3.3 Amount parsing (symbols, separators, parentheses, debit/credit columns).
  - [ ] 3.4 Skipped-row reporting, BOM and blank-line handling.
  - [ ] 3.5 Property test P10 (CSV round-trip) and unit tests for three sample bank layouts.
  - _Requirements: 1.1–1.8_

- [ ] 4. Merchant normalization
  - [ ] 4.1 Ordered regex rule list and `normalize()`.
  - [ ] 4.2 Display-name selection (most frequent original, title-cased).
  - [ ] 4.3 Property tests P2 (idempotent) and P3 (noise-invariant).
  - _Requirements: 2.1–2.3_

- [ ] 5. Recurrence detection
  - [ ] 5.1 Group by merchant key with stable sort.
  - [ ] 5.2 Split interleaved plans by amount clustering.
  - [ ] 5.3 Cadence classification with the 75% gap rule and minimum counts.
  - [ ] 5.4 Amount stability with single price-change detection.
  - [ ] 5.5 Confidence score and the "Maybe zombies" threshold.
  - [ ] 5.6 Property tests P1, P4, P5, P6, P11.
  - _Requirements: 3.1–3.8_

- [ ] 6. Zombie description
  - [ ] 6.1 `describe()` building each `Zombie` with totals, price change and dormant flag.
  - [ ] 6.2 "How we computed this" explanation strings.
  - [ ] 6.3 Property test P7.
  - _Requirements: 4.1–4.5_

- [ ] 7. Verdicts and savings
  - [ ] 7.1 Verdict store with kill, spare, undo and schema-versioned localStorage persistence.
  - [ ] 7.2 `applyVerdicts()` including resurrection.
  - [ ] 7.3 Property tests P8 and P9.
  - _Requirements: 5.1–5.6_

- [ ] 8. Merge/split overrides
  - Store user merge/split choices and apply them before detection.
  - _Requirements: 2.4_

- [ ] 9. Public API
  - Export `analyzeStatement(csvText, options) -> { zombies, maybeZombies, skipped, mapping }` from `src/core/index.ts`.
  - _Requirements: all_
