# Implementation Plan: Graveyard UI

Depends on `zombie-detection` tasks 1–9.

- [ ] 1. Theme and atmosphere
  - [ ] 1.1 `theme.css` tokens, bundled display font, contrast check of every text pair.
  - [ ] 1.2 `<Atmosphere/>` fog and moon layers with a reduced-motion fallback.
  - _Requirements: 5.1, 5.3_

- [ ] 2. Sample statement
  - Generate `haunted-statement.csv` with invented merchants that covers every case in the design.
  - _Requirements: 1.3_

- [ ] 3. Landing and import
  - [ ] 3.1 `<Landing/>` with drop zone, file picker, sample button and privacy line.
  - [ ] 3.2 `<MappingDialog/>` driven by the engine's mapping result; remember mappings by header signature.
  - _Requirements: 1.1–1.4, 2.1–2.3_

- [ ] 4. Graveyard
  - [ ] 4.1 `<Tally/>` with count-up animation.
  - [ ] 4.2 `<ZombieCard/>` with weight, cracks and eyes encodings.
  - [ ] 4.3 `<ZombieField/>`, `<SparedRow/>` and the collapsible dormant / maybe sections.
  - [ ] 4.4 Currency selector.
  - _Requirements: 3.1–3.7_

- [ ] 5. Zombie detail and verdicts
  - [ ] 5.1 `<ZombieSheet/>` with charge timeline and "how we computed this".
  - [ ] 5.2 Kill (burial animation, cancellation tips, undo toast) and Spare (ghost).
  - [ ] 5.3 Merge and split controls wired to the engine overrides.
  - _Requirements: 4.1–4.5_

- [ ] 6. Sound
  - Synthesized shovel, wind and groan effects behind an off-by-default toggle.
  - _Requirements: 5.2_

- [ ] 7. Data control
  - Remember toggle, "Forget everything" with confirmation, export verdicts as CSV.
  - _Requirements: 6.1–6.3_

- [ ] 8. Responsive and accessibility pass
  - Check 360 px layout, keyboard-only walkthrough and screen reader labels on cards.
  - _Requirements: 5.3, 5.4_

- [ ] 9. Deploy
  - GitHub Pages workflow; add the live URL to the README.
