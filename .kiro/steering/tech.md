---
inclusion: always
---

# Tech stack and conventions

## Stack
- **Build:** Vite + TypeScript (strict mode).
- **UI:** React 18 function components with hooks. No UI kit; hand-written CSS with custom properties.
- **CSV parsing:** Papa Parse.
- **Tests:** Vitest for unit tests, fast-check for property-based tests.
- **Persistence:** `localStorage` only, behind a small `storage` module that tolerates it being unavailable.
- **Deploy:** static build to GitHub Pages via GitHub Actions.

## Rules
- The detection engine in `src/core/` is pure TypeScript: no React, no DOM, no `Date.now()` inside functions (pass the reference date in). This keeps it deterministic and testable.
- Money is stored as **integer minor units** (paisa/cents). Never use floats for amounts. Format only at the UI edge with `Intl.NumberFormat`.
- Dates are ISO `YYYY-MM-DD` strings in the core; convert to day numbers for arithmetic with a single helper.
- No network requests anywhere in the app (see `privacy.md`).
- Prefer small named functions over clever one-liners. Each exported core function gets a JSDoc line explaining what it guarantees.
- Commands: `npm run dev`, `npm test`, `npm run build`, `npm run lint`.
