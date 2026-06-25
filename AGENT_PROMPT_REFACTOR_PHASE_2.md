# Refactor Phase 2: YardScene (The Assembly Line)

## Context
Phase 2 of the Phaser-native architecture migration. We are moving the Yard's car palette and assembly controls into Phaser.

## Tasks

### 1. Expand `src/game/EventBus.ts`
Add the following events to `EventMap`:
```typescript
  "yard-add-to-train": [partId: string];
  "yard-send-to-track": [];
```

### 2. Update `src/components/Yard.tsx`
Currently, `Yard.tsx` renders React hit-areas over the palette cars and React buttons for "Add to Train" and "Send to Track".
- Remove ALL React overlays related to car selection and assembly.
- Keep only the `<PhaserGame>` and the Map/Workshop navigation buttons.
- Add `EventBus.on` listeners:
  - `"yard-add-to-train"` -> `dispatch({ type: "addToTrain", instanceId: generateId(), partId })`
  - `"yard-send-to-track"` -> navigate to the Track view.

### 3. Update `src/game/scenes/YardScene.ts`
Move the interactions into Phaser.
- The palette cars (`this.paletteTokens`) are already rendered in Phaser. Make them interactive:
  ```typescript
  token.setInteractive({ useHandCursor: true })
       .on('pointerdown', () => {
           this.setSelectedPalette(car.id);
           EventBus.emit("car-selected", car.id);
       });
  ```
- Render the "Add to Train" and "Send to Track" buttons as Phaser objects (using `this.add.rectangle` + `this.add.text` styled as pixel art, or loaded sprites) over the painted crane control panel.
- Make them interactive:
  - Add button: triggers `this.animatePickup(...)`, and in the `onComplete` callback, emits `"yard-add-to-train"`.
  - Send button: emits `"yard-send-to-track"`.

## Definition of Done
- `npm run typecheck` passes.
- The Yard view has no HTML buttons for assembly.
- Clicking a car in the Phaser palette selects it.
- Clicking the Phaser "Add" button runs the crane animation and adds the car to the train data model.
