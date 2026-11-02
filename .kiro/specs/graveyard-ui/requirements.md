# Requirements: Graveyard UI

## Introduction
The graveyard is the whole user experience on top of the detection engine. It is entered in the **Costume Contest** category, so the interface has to be haunting and polished, and every spooky element must carry meaning (see `.kiro/steering/design-voice.md`).

## Requirement 1: First screen
**User story:** As a first-time visitor (or a judge), I want to understand the app and see it working immediately.

### Acceptance criteria
1. THE SYSTEM SHALL show a landing screen with a one-sentence explanation, a file drop zone, and a "Load sample graveyard" button.
2. THE SYSTEM SHALL state "Your statement never leaves this device" next to the drop zone.
3. WHEN the user clicks "Load sample graveyard" THE SYSTEM SHALL load the bundled invented statement and go straight to the graveyard.
4. WHEN a file is dropped or chosen THE SYSTEM SHALL show the import result in under 1 second for a 2,000-row statement on a mid-range laptop.

## Requirement 2: Column mapping dialog
**User story:** As a user with an unusual bank format, I want to fix the column mapping myself.

### Acceptance criteria
1. WHEN the engine needs a column or date order confirmed THE SYSTEM SHALL show a dialog listing each header with three sample values.
2. THE SYSTEM SHALL let the user complete the dialog with the keyboard only.
3. THE SYSTEM SHALL remember the chosen mapping for the same header row on this device.

## Requirement 3: The graveyard
**User story:** As a user, I want to see all my subscriptions at a glance and feel how much they cost.

### Acceptance criteria
1. THE SYSTEM SHALL show a header tally: "Still feeding: ৳X/yr" and "Souls saved: ৳Y/yr".
2. THE SYSTEM SHALL render each active zombie as a card rising from a grave, sorted by yearly cost, highest first.
3. THE SYSTEM SHALL scale card prominence with yearly cost on a log scale, clamped so the smallest card is still readable.
4. THE SYSTEM SHALL show glowing red eyes on zombies with a price hike, and the hike details on the card.
5. THE SYSTEM SHALL show grave cracks that deepen with the number of months the zombie has been charging.
6. THE SYSTEM SHALL list dormant series and "Maybe zombies" in separate collapsible sections.
7. THE SYSTEM SHALL let the user choose the display currency; the default is BDT (৳).

## Requirement 4: Judging a zombie
**User story:** As a user, I want to decide quickly and see the result.

### Acceptance criteria
1. WHEN the user opens a zombie THE SYSTEM SHALL show its charge history as a small timeline, every figure from detection Requirement 4, and how each was computed.
2. WHEN the user chooses Kill THE SYSTEM SHALL play a burial animation, move the yearly cost into "Souls saved" with a counting-up effect, and offer "Undo" for 10 seconds.
3. WHEN the user chooses Kill THE SYSTEM SHALL show generic cancellation tips (check the app store subscriptions page, the service's account settings, the bank's recurring payment controls).
4. WHEN the user chooses Spare THE SYSTEM SHALL turn the zombie into a translucent ghost in a "Spared" row.
5. THE SYSTEM SHALL let the user merge two zombies or split one, and re-run detection.

## Requirement 5: Atmosphere and accessibility
### Acceptance criteria
1. THE SYSTEM SHALL draw layered fog and moonlight with CSS/canvas, and SHALL stop all motion WHEN `prefers-reduced-motion` is set.
2. THE SYSTEM SHALL keep sound off by default and use only sounds synthesized with Web Audio.
3. THE SYSTEM SHALL meet WCAG 2.2 AA contrast and keyboard requirements.
4. THE SYSTEM SHALL work at 360 px wide (phone) and up.

## Requirement 6: Data control
### Acceptance criteria
1. THE SYSTEM SHALL offer "Remember this statement on this device" (off by default).
2. THE SYSTEM SHALL offer a "Forget everything" button that clears all stored data after confirmation.
3. THE SYSTEM SHALL let the user export their verdicts as a CSV checklist ("cancel these").
