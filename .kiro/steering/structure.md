---
inclusion: always
---

# Project structure

```
src/
  core/            Pure detection engine (no React, no DOM)
    types.ts         Transaction, Zombie, Cadence, Verdict
    csv.ts           CSV -> Transaction[] (column detection + mapping)
    normalize.ts     Merchant name normalization
    detect.ts        Recurring-charge detection
    money.ts         Minor-unit helpers, yearly cost
    cadence.ts       Cadence windows, minimum charges, charges per year
    dates.ts         ISO date <-> day number helpers
    *.test.ts        Unit tests next to the code
    *.property.test.ts  fast-check property tests
  state/           App state (verdicts, savings) + localStorage persistence
  ui/              React components
    graveyard/       Zombie cards, graves, tally
    import/          File drop, column mapping dialog
    effects/         Fog, sound (Web Audio, synthesized), reduced-motion handling
  sample/          Sample statement used by "Load sample graveyard"
public/
docs/              Submission material, screenshots
```

- Tests live beside the file they test.
- UI components never import Papa Parse or detection internals directly; they call the public functions exported from `src/core/index.ts`.
