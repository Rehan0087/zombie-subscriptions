---
inclusion: fileMatch
fileMatchPattern: "src/ui/**"
---

# Design and voice (applies to UI files)

## Visual language
- Night graveyard: deep blue-black background, moonlit fog, tombstones in cool grey, accents in sickly green (`--ichor`) and candle amber (`--candle`).
- **Every effect encodes data:**
  - Zombie card size / glow strength scales with yearly cost (log scale, clamped).
  - Grave crack depth = how many months it has been charging.
  - Red glowing eyes = price increased since the first charge.
  - Buried graves show the kill date; ghosts (spared) are translucent and drift.
- Typography: one display face for headings (bundled locally), system UI font for numbers and body text. Numbers use tabular figures.

## Accessibility
- Text contrast at least 4.5:1 on the dark background.
- All actions reachable by keyboard; zombie cards are buttons/list items with clear labels, e.g. "Netflix-like subscription, ৳1,200 per month, ৳14,400 per year. Kill or spare."
- Respect `prefers-reduced-motion`: no fog drift, no rising animation, no shake.
- Sound is off by default; a toggle turns on synthesized Web Audio effects. No sampled or copyrighted audio.

## Voice
- Playful but never at the cost of clarity. The spooky line comes first, the plain fact right after it:
  - "This one's been feeding for 14 months. ৳6,986 so far."
  - "It grew stronger: ৳399 → ৳499 in March."
- Never shame the user. Spared subscriptions are respected.
- Error messages are plain English first: "We couldn't find a date column. Pick it below."
