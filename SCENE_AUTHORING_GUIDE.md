# Scene Authoring Guide

The Map, Workshop, Yard, and oval Track layouts are authored as Tiled JSON in
`src/assets/maps/`. `TrackV3Scene` is a separate scrolling scene and does not
use this object-layout adapter.

## Source of truth

Each Tiled map uses pixel dimensions derived from `width * tilewidth` and
`height * tileheight`. Runtime code parses the JSON through Zod in
`src/game/TiledParser.ts`; do not cast imported JSON directly or duplicate its
coordinates in TypeScript.

Interactive objects belong in an object layer. The parser consumes:

- `name`: texture or logical object key
- Tiled class/type: semantic category such as `transport` or `instrument`
- rectangle `x`, `y`, `width`, and `height`
- `sprite`: base ID from `src/game/ui-sprites.ts`
- `action`: EventBus event emitted on release
- `arg`: optional single string or numeric event payload
- `anchor`: `bg`, `ui-top-right`, or `ui-bottom-center`
- optional `label`, `labelColor`, `fill`, and `fillAlpha`

Polygon and polyline geometry is supported through `parseTiledPath`; the oval
Track ride path is the current example.

## Editing workflow

1. Open the relevant file under `src/assets/maps/` in Tiled 1.10-compatible
   mode.
2. Move or resize existing objects instead of copying coordinates into scene
   code.
3. Reuse an existing EventBus action and sprite ID where possible. Add a new
   action to the typed `EventMap` before using it in map data.
4. Export JSON over the same file and review the diff for unintended metadata
   churn.
5. Run `npm test -- --run tests/unit/tiled-parser.test.ts` and
   `npm run typecheck`. Run the relevant Playwright journey for visible or
   interactive changes.

Use `?edit` only with the Vite development server for visual tuning. Editor
code is intentionally excluded from production; `npm run build` verifies that
boundary.
