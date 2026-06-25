# Refactor Phase 1: Event Bridge & TrackScene

## Context
We are migrating iBeetKidz from a React-overlay architecture to a fully Phaser-native architecture. React will only handle state and audio; Phaser will handle 100% of the UI and interaction.

This is Phase 1: Upgrading the EventBus and migrating the simplest scene (`TrackScene`).

## Tasks

### 1. Expand `src/game/EventBus.ts`
Add the following events to `EventMap`:
```typescript
  "transport-play": [mode: "loop" | "ride"];
  "transport-stop": [];
  "tempo-changed": [delta: number]; // e.g., +10 or -10
```

### 2. Update `src/components/Track.tsx`
Currently, `Track.tsx` renders `<PixelButton>` components for Ride Train, Stop, and speed controls.
- Remove ALL of these React overlays. The component should only return the `<PhaserGame>` and the Map/Yard navigation buttons (keep the nav buttons in React for now).
- Add `EventBus.on` listeners inside a `useEffect` to handle the new transport events:
  - `"transport-play"` -> `engine.playRide(project)`
  - `"transport-stop"` -> `engine.stop()`
  - `"tempo-changed"` -> `dispatch({ type: "setTempo", bpm: project.tempoBpm + delta })`

### 3. Update `src/game/scenes/TrackScene.ts`
Build the transport controls inside Phaser.
- In `preload()`, you may need to generate or load simple button sprites if they don't exist in the atlas, or just use `this.add.rectangle` and `this.add.text` styled to look like pixel art for now.
- In `create()`, render the Play, Stop, and Speed (+/-) buttons over the painted control panel at the bottom of the screen.
- Make them interactive:
  ```typescript
  playBtn.setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
             playBtn.setAlpha(0.8); // visual down state
             EventBus.emit("transport-play", "ride");
         })
         .on('pointerup', () => playBtn.setAlpha(1));
  ```
- Implement similar logic for Stop and the Speed buttons.

## Definition of Done
- `npm run typecheck` passes.
- The Track view has no HTML transport buttons.
- Clicking the Phaser-rendered transport buttons correctly starts/stops the train and changes the tempo via the EventBus.
