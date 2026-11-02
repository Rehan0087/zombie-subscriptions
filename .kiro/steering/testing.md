---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Testing strategy

- Every correctness property in `.kiro/specs/zombie-detection/design.md` gets one fast-check test in a `*.property.test.ts` file. Name the test after the property, e.g. `P1: detection is independent of input order`.
- Generators live in `src/core/test-arbitraries.ts` and build realistic data: merchant names with noise (store numbers, "POS", card suffixes), dates with ±3 day jitter, amounts in minor units with occasional price hikes.
- Use `fc.assert(..., { numRuns: 200 })` by default. When a property fails, add the shrunk counterexample as a plain unit test so it never regresses.
- Unit tests cover the specific bank CSV layouts in `src/sample/` and edge cases the generators don't reach (empty file, header only, BOM, comma decimal separators).
- Never use the real clock in tests; pass a fixed reference date.
