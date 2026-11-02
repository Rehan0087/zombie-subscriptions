# Design: Graveyard UI

## Screens
1. **Landing** – title, one-liner, drop zone, "Load sample graveyard", privacy line.
2. **Mapping dialog** – modal shown only when the engine asks for help.
3. **Graveyard** – tally header, zombie field, spared row, collapsible dormant / maybe sections, footer with settings (currency, sound, remember, forget).
4. **Zombie detail** – side sheet on desktop, full-screen sheet on phones.

## Component tree
```
<App>
  <Atmosphere/>                 fog + moon layers (ui/effects)
  <Landing/> | <Graveyard/>
    <Tally stillFeeding soulsSaved/>
    <ZombieField zombies/>      CSS grid, sorted by yearlyCost desc
      <ZombieCard zombie/>      button; size via --weight custom property
    <SparedRow ghosts/>
    <Collapsible title="Dormant"/>
    <Collapsible title="Maybe zombies"/>
    <ZombieSheet zombie onKill onSpare onMerge onSplit/>
    <UndoToast/>
  <MappingDialog/>
  <SettingsFooter/>
```

## Visual encoding
| Data | Encoding | Implementation |
|------|----------|----------------|
| Yearly cost | Card scale 0.85–1.25, glow radius | `--weight = clamp(0, log10(cost/minCost) / log10(maxCost/minCost), 1)` |
| Months charging | Grave crack SVG, 0–4 cracks | `min(4, floor(months / 3))` |
| Price hike | Red eye glow + "grew stronger" line | `zombie.priceChange && to > from` |
| Killed | Card sinks into grave, tombstone shows date | CSS transform + clip-path |
| Spared | Opacity 0.55, slow drift | CSS animation, disabled with reduced motion |

## Tokens (`ui/theme.css`)
`--night`, `--fog`, `--stone`, `--ichor` (green accent), `--candle` (amber), `--blood` (warnings), `--text`, `--text-dim`. All pairs used for text are checked at 4.5:1.

## State
- `useReducer` in `<App>` holding `{ statement, zombies, verdicts, history, settings }`.
- `history` is a stack of previous verdict maps for undo (detection Requirement 5.3).
- Persistence through `state/storage.ts`, which no-ops when localStorage throws.

## Sound
`ui/effects/sound.ts` synthesizes three short effects with Web Audio oscillators and noise: shovel (kill), wind (spare), groan (open a zombie with a price hike). Off by default.

## Build notes
- The mapping dialog re-checks the chosen columns as the user picks them, so the day/month question appears in the same step instead of a second dialog.
- The production build adds a Content-Security-Policy with `connect-src 'none'`, so the page cannot send data anywhere even if a dependency tried to.
- "Still feeding" excludes Maybe zombies (detection requirement 5.7).

## Sample data
`src/sample/haunted-statement.csv` – an invented 14-month statement with ~12 recurring charges (streaming, music, cloud storage, gym, mobile data pack, a news app with a price hike, a yearly domain renewal, two plans on one service, one cancelled-and-dormant app) plus ~300 one-off purchases and salary credits. Merchant names are invented so no real brand appears in the demo video.
