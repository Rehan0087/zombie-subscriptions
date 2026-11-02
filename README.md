# 🧟 Zombie Subscriptions

> Your forgotten subscriptions are still feeding. Find them. Bury them.

Upload a bank statement CSV and Zombie Subscriptions finds every recurring charge: the free trial that rolled over, the app you stopped opening, the plan whose price quietly went up. Each one rises from a grave in a moonlit graveyard. Kill it and its yearly cost goes into **Souls saved**; spare it and it becomes a friendly ghost.

**Everything runs in your browser. Your statement never leaves your device.**

- **Live app:** _TODO: GitHub Pages URL_
- **Demo video:** _TODO: YouTube URL_
- **Kiroween 2026 category:** Costume Contest

## Try it
Click **Load sample graveyard** on the first screen. It uses an invented 14-month statement, so you don't need a real bank file.

## Run locally
```bash
npm install
npm run dev
```

```bash
npm test
```

## Features
- CSV import that auto-detects date, description and amount columns (including separate debit/credit columns and many date formats), with a mapping dialog when it can't.
- Merchant normalization so `NETFLIX.COM 8573 CARD-1234` and `Netflix.com 9912` group together.
- Detection of weekly, monthly, quarterly and yearly charges that tolerates late payments, price changes and two plans on one service.
- Yearly cost, total paid, price hike alerts and dormant-series detection, each with "how we computed this".
- Kill / spare / undo, savings tally, and verdicts that carry over to next month's statement. Killed subscriptions that charge again come back with a warning.
- Spooky design that encodes data: card size = yearly cost, grave cracks = months charging, red eyes = price hike.
- Reduced-motion support, keyboard access, WCAG AA contrast, and sound that is off by default and synthesized in the browser.

## How Kiro was used
_Fill this in as you build. Judges score it, so be specific and honest._

All Kiro configuration lives in [`.kiro/`](.kiro):

| Kiro feature | What's in this repo |
|---|---|
| **Specs** | [`zombie-detection`](.kiro/specs/zombie-detection) (EARS requirements, design with 11 correctness properties, tasks) and [`graveyard-ui`](.kiro/specs/graveyard-ui) |
| **Steering** | `product`, `tech`, `structure`, `privacy` (always included); `design-voice` (UI files only); `testing` (test files only) |
| **Hooks** | Run core tests on save · Privacy guard · Keep spec and code in sync · Accessibility and meaning check · Sample graveyard check |
| **Property-based testing** | fast-check properties P1–P11 from the detection design |
| **MCP / powers / custom agents** | _TODO_ |

Questions to answer in the write-up:
- How did the spec-driven approach compare to vibe coding for the detection engine?
- Which property-based tests caught bugs that unit tests missed? Paste the shrunk counterexamples.
- Which hook saved the most time? Did the privacy guard ever catch something?
- Which steering doc changed Kiro's output the most?

## Pre-existing code disclosure
None. This project was started on 2 November 2026, during the Kiroween 2026 Submission Period. Third-party libraries are listed in `package.json`.

## License
[MIT](LICENSE)
