# Agent Prompt: E2E Test Rewrite (V2 Phaser UI)

**Context:** The project has migrated the Workshop UI (and soon the rest of the scenes) from HTML DOM overlays to a data-driven Phaser canvas using the `TiledSceneAdapter`. As a result, the Playwright E2E tests in `tests/e2e/v2-flow.spec.ts` are failing because they are looking for HTML buttons (e.g., `button[title="Add Kick"]`) that no longer exist in the DOM. All interaction now flows out of the Phaser canvas via the `EventBus`.

**Goal:** Rewrite `tests/e2e/v2-flow.spec.ts` to correctly interact with the new Phaser canvas UI.

## Gates
Before committing, the following must be true:
1. `npm run typecheck` is clean.
2. `npm run test` (unit tests) passes.
3. `npm run test:e2e` passes (all 5 Playwright tests green).

## Tasks

1.  **Expose an E2E testing hook:** Since Playwright cannot easily query inside a `<canvas>`, you must expose a global testing hook in `src/game/main.ts` or `src/components/PhaserGame.tsx` that allows Playwright to trigger `EventBus` events directly, or query the active scene for hit-area coordinates to simulate clicks.
    *   *Alternative:* If the coordinates are known and stable (from `scene-layout.ts` and `workshop.json`), use Playwright's `page.mouse.click(x, y)` relative to the canvas bounding box.
    *   *Recommended:* The most robust method is to expose the `EventBus` to the `window` object in `src/game/EventBus.ts` during dev/test builds:
        ```typescript
        if (import.meta.env.DEV) {
          (window as any).__E2E_EVENT_BUS__ = EventBus;
        }
        ```
        Then, in Playwright, use `page.evaluate()` to emit the exact events the Phaser hit-areas would have emitted.

2.  **Rewrite `Workshop: tap a painted instrument...`:**
    *   *Current:* Clicks `button[title="Add Kick"]`.
    *   *New:* Simulate a tap on the drum kit sprite, or emit `"workshop-open-tool", "beat-grid"` (or the corresponding event for adding a kick lane) via the exposed EventBus. Wait for the `.loop-track` to appear in the DOM.

3.  **Rewrite `Workshop stations open the creative tools`:**
    *   *Current:* Clicks `button[title="Beat"]` and `button[title="Voice"]`.
    *   *New:* Emit `"workshop-open-tool", "beat-grid"` and `"workshop-open-tool", "record-voicefx"` via the EventBus. Verify the HTML `<section data-machine="...">` overlays appear.

4.  **Rewrite `Yard → Track: couple a car and ride it`:**
    *   *Current:* Clicks `To Yard`, `Add to Train`, `Send to Track`, `Ride`.
    *   *New:* Emit the corresponding navigation and action events (`workshop-nav`, `yard-add-to-train`, `yard-send-to-track`, `transport-play`) via the EventBus. Wait for the appropriate DOM changes or timeouts.

5.  **Rewrite `Map guards Track until a train exists`:**
    *   *Current:* Clicks `Yard`, `Train car 1`, `Remove`, `Map`, `Track`.
    *   *New:* Emit the corresponding events (`map-nav`, `yard-remove-from-train`, `yard-nav`, `map-nav`) via the EventBus to verify the toast notification appears.

## Do Not
- Do NOT attempt to use OCR or visual regression testing in Playwright.
- Do NOT hardcode absolute pixel coordinates for mouse clicks, as they will break on different viewport sizes. If using mouse clicks, calculate them as percentages of the canvas bounding box based on `scene-layout.ts`.
- Do NOT change the core logic of the application to accommodate the tests. Only expose testing hooks or use existing EventBus channels.

## Verification
Run `npm run test:e2e` locally to verify the tests pass before committing. If you are using `page.evaluate`, ensure you await the promises correctly.
