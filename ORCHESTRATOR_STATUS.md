# iBeetKidz Project Status Report & Next Steps

**Date:** June 29, 2026
**Role:** Project Orchestrator

This document synthesizes the current state of the iBeetKidz repository, focusing on the `main` branch, the `worktree-sprites` branch, and the overall Phase B implementation roadmap.

## 1. The Lay of the Land

The project is currently in the middle of **Phase B: Scene Data Migration** of the V2 architecture rebuild [1]. The goal of this phase is to transition from hand-coded layout coordinates over static backgrounds to a data-driven approach using Tiled maps (`.json`) and the `TiledSceneAdapter` [2].

### Branch Status

There are two primary lines of development right now:

*   **`main` branch:**
    *   Has received two recent bugfix commits (by Eric/Claude) *after* the worktree was cut.
    *   Commit `b92c47d`: Fixed a state-push race condition in `BackgroundScene` by adding a `ready` flag so the first React→Phaser state push isn't dropped.
    *   Commit `004959b`: Fixed Workshop UX issues—changed background fit to `contain` (so the toolbar isn't cropped), improved lane labels/icons (larger, scale-only press), and added a lane-color band behind each lane for clarity.
*   **`worktree-sprites` branch:**
    *   Contains the core Phase B work from the agent swarm.
    *   Commit `1bbe37c`: Migrated `WorkshopScene.ts` to use `TiledSceneAdapter` and `workshop.json` for static chrome (toolbar, shelf, transport). It also includes a `relayoutSpawns` mechanism to handle window resizing.
    *   Commit `f3aecbb`: Authored the Tiled maps (`yard.json`, `track.json`, `map.json`) for the remaining scenes, prepping them for their own wiring.

### The Conflict

Because `main` received UI/UX updates to `WorkshopScene.ts` and architectural fixes to `BackgroundScene.ts` *after* the `worktree-sprites` branch was created, the two branches have diverged.
*   The `ready` flag added to `BackgroundScene.ts` on `main` is missing from the worktree's version.
*   The `WorkshopScene.ts` on `main` has new lane bands (`r.band`), updated icon press logic (`setScale` instead of `pressPop`), and uses `"contain"` instead of `"cover"` for the background. The worktree version heavily refactored the same file to use the `TiledSceneAdapter`.
*   `scene-layout.ts` has overlapping changes (the worktree deleted the hand-coded regions, while `main` tweaked `labelFrac`).

## 2. Progress Against the Roadmap

According to the `IMPLEMENTATION_ROADMAP.md` [1]:

*   **Phase A (Asset Pipeline):** Mostly complete. Procedural base plates and some sliced sprites exist in `src/assets/`. However, `ASSET_AUDIT.md` notes that true animation requires "Path A: Asset Regeneration & Splitting" to remove baked-in elements from Yard/Track backgrounds. The agent report indicates we are waiting on "real base plates + transparent sprites" for Yard/Track/Map.
*   **Phase B (Scene Data Migration):**
    *   **Workshop:** The logic is built and validated on `worktree-sprites`, but needs to be merged with the recent UX fixes on `main`.
    *   **Yard / Track / Map:** The `.json` maps are authored (on `worktree-sprites`), but the actual scene wiring is blocked waiting for the final "clean" base plates and sliced sprites for those specific scenes.

## 3. Recommended Next Steps

To move forward safely and maintain the integrity of the V2 rebuild, we need to execute the following sequence:

### Step 1: Rebase and Merge the Workshop Wiring

The immediate priority is to integrate the successful `worktree-sprites` work into `main` without losing the recent UX fixes.

1.  **Rebase `worktree-sprites` onto `main`:** This is preferred over a merge commit to keep the history clean.
2.  **Resolve Conflicts in `WorkshopScene.ts`:**
    *   Keep the `TiledSceneAdapter` logic from the worktree.
    *   Keep the `this.addBackground("contain")` fix from `main`.
    *   Keep the new lane bands (`r.band`) and the `setScale` icon press logic from `main`.
3.  **Resolve Conflicts in `BackgroundScene.ts`:**
    *   Ensure the `ready` flag logic from `main` is preserved, as it fixes a critical state-sync bug.
4.  **Run the Gates:** After rebasing, run `npm run typecheck`, `npm run test` (all 167+ tests), and `npm run build` to ensure the integration is green.

### Step 2: Unblock Yard, Track, and Map (Art Dependency)

The `worktree-sprites` agent correctly noted that wiring the remaining scenes is blocked by art. The `.json` maps exist, but they rely on the old `-clean.png` backgrounds which may still have baked-in elements, or lack the corresponding standalone sprites (like the handcar, crane hook, or transport panels).

1.  **Art Director Action:** Review `ASSET_REQUIREMENTS.md` and `ART_BRIEF.md`. Generate the final clean base plates and standalone interactive sprites for Yard, Track, and Map.
2.  **Asset Integration:** Update `src/game/assets.ts` to load these new sprites.

### Step 3: Complete Phase B Wiring

Once the art is in place and the Workshop is merged:

1.  **Wire Yard:** Update `YardScene.ts` to use `TiledSceneAdapter` with `yard.json`. Remove any remaining HTML/CSS nav buttons.
2.  **Wire Track:** Update `TrackScene.ts` to use `TiledSceneAdapter` with `track.json`.
3.  **Wire Map:** Update `MapScene.ts` to use `TiledSceneAdapter` with `map.json`.

### Step 4: Fix E2E Tests

The agent noted that 4 out of 5 E2E tests in `v2-flow.spec.ts` failed on the worktree. This was diagnosed as a stale baseline—the tests are looking for HTML buttons (e.g., "Add Kick") that were moved into the Phaser canvas during the V2 rebuild.

1.  **Rewrite `v2-flow.spec.ts`:** Update the Playwright tests to interact with the new Phaser-based UI (e.g., simulating clicks on canvas coordinates or using exposed testing hooks) rather than looking for removed DOM nodes.

## Summary

The agent swarm did excellent work authoring the Tiled maps and wiring the Workshop. However, Eric/Claude made concurrent fixes on `main`. My primary directive as Orchestrator is to guide the manual resolution of these two streams. Once the Workshop is unified on `main`, we must pivot to the art pipeline to unblock the rest of Phase B.

---
### References
[1] `IMPLEMENTATION_ROADMAP.md` - Master implementation roadmap for the V2 rebuild.
[2] `AGENT_PROMPT_PHASE_B.md` - Engineering prompt for Phase B scene data migration.
