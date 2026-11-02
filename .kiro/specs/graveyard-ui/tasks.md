# Implementation Plan: Graveyard UI

Depends on `zombie-detection` tasks 1–9.

- [x] 1. Theme and atmosphere
  - [x] 1.1 `theme.css` tokens, bundled display font, contrast check of every text pair.
  - [x] 1.2 `<Atmosphere/>` fog and moon layers with a reduced-motion fallback.
  - _Requirements: 5.1, 5.3_

- [x] 2. Sample statement
  - Generate `haunted-statement.csv` with invented merchants that covers every case in the design.
  - _Requirements: 1.3_

- [x] 3. Landing and import
  - [x] 3.1 `<Landing/>` with drop zone, file picker, sample button and privacy line.
  - [x] 3.2 `<MappingDialog/>` driven by the engine's mapping result; remember mappings by header signature.
  - _Requirements: 1.1–1.4, 2.1–2.3_

- [x] 4. Graveyard
  - [x] 4.1 `<Tally/>` with count-up animation.
  - [x] 4.2 `<ZombieCard/>` with weight, cracks and eyes encodings.
  - [x] 4.3 `<ZombieField/>`, `<SparedRow/>` and the collapsible dormant / maybe sections.
  - [x] 4.4 Currency selector.
  - _Requirements: 3.1–3.7_

- [x] 5. Zombie detail and verdicts
  - [x] 5.1 `<ZombieSheet/>` with charge timeline and "how we computed this".
  - [x] 5.2 Kill (burial animation, cancellation tips, undo toast) and Spare (ghost).
  - [x] 5.3 Merge and split controls wired to the engine overrides.
  - _Requirements: 4.1–4.5_

- [x] 6. Sound
  - Synthesized shovel, wind and groan effects behind an off-by-default toggle.
  - _Requirements: 5.2_

- [x] 7. Data control
  - Remember toggle, "Forget everything" with confirmation, export verdicts as CSV.
  - _Requirements: 6.1–6.3_

- [x] 8. Responsive and accessibility pass
  - Check 360 px layout, keyboard-only walkthrough and screen reader labels on cards.
  - _Requirements: 5.3, 5.4_

- [x] 9. Deploy
  - GitHub Pages workflow; add the live URL to the README.
