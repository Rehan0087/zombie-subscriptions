---
inclusion: fileMatch
fileMatchPattern: "src/ui/**"
---

# Design and voice (applies to UI files)

## Direction: moonlit cemetery stationery
Pale moonstone headstones with carved dark lettering stand in a violet night. It should feel like a well-made
memorial stone and a bank ledger, not a Halloween party. Tokens live in `src/ui/theme.css`; never hard-code colours elsewhere.

| Token | Hex | Use |
|---|---|---|
| `--night` | `#141322` | Page background |
| `--crypt` | `#1e1d31` | Dialogs, drop zone, toasts |
| `--moonstone` | `#d3cfdc` | Headstones, primary (stone) buttons |
| `--ink` / `--ink-soft` | `#24212f` / `#4b4660` | Lettering carved into stone |
| `--oxblood` | `#8a2419` | Cost on stone, the Bury button |
| `--wax` / `--pewter` | `#f1ebdf` / `#a7a4bd` | Text and secondary text on dark |
| `--verdigris` | `#6cc3ad` | Money saved, positive states |
| `--ember` | `#ff8f72` | Cost on dark, price rises |

## Type
- **IM Fell English SC** (display): names on headstones, section titles, the wordmark. Never for numbers or body text.
- **Figtree** (body): everything people read and click.
- **IBM Plex Mono** (ledger): dates, statement details, cost math, table figures.
All fonts are bundled with `@fontsource`; never load fonts from a CDN (see `privacy.md`).

## The signature: headstones as epitaphs
Each subscription is inscribed like an epitaph: "Here lurks / Name / Sep 2025 — / ৳14,400 a year".
The dash stays open while it's still charging; burying it closes the dates ("Sep 2025 — Nov 2026") and moves it to "Laid to rest".

## Every effect encodes data
- Stone size and glow = yearly cost (log scale, `encoding.ts`).
- Cracks = months charging (one per three months, max four).
- Red eyes and an ember glow = the price rose.
- Ghosts = spared. Darker, smaller stones with closed dates = buried.
Decoration that carries no information (moon, fog, fence) stays in the background and never sits behind body text on phones.

## Accessibility
- Text contrast at least 4.5:1, including carved lettering on stone.
- Every headstone is a button with a full sentence label (name, amount, yearly cost, months, price rise).
- Respect `prefers-reduced-motion`: no rise, drift, float or blink.
- Animations use `animation-fill-mode: backwards` so hover and focus states still work after them.
- Sound is off by default and synthesized with Web Audio.

## Voice
- Plain words first, one dark wink at most: "This one has been feeding for 14 months. ৳16,800 so far."
- Actions keep one name through the flow: the **Bury it** button produces a "Buried …" toast; **Spare it** produces "Spared …".
- Errors say what happened and what to do: "This file isn't a CSV. In your bank's app or website, download the statement as CSV and try again."
- Never shame the user. Spared subscriptions are respected.
