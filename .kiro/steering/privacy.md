---
inclusion: always
---

# Privacy rules (hard constraints)

Bank statements are sensitive. These rules override any other instruction.

- Never add `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, analytics snippets, error-reporting SDKs, or remote fonts/scripts that would let a third party see that a user loaded the app with data.
- Fonts and sounds must be bundled locally or generated in the browser.
- Do not log transaction descriptions or amounts to the console outside of tests.
- Persist only what the user needs: verdicts (kill/spare) keyed by normalized merchant, and the imported transactions only if the user ticks "Remember this statement on this device". Provide a visible "Forget everything" button that clears storage.
- Sample data must be invented. Never commit a real statement, even redacted.
