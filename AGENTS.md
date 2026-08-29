# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. Keep domain logic in `src/core/` and dependency contracts in `src/ports/`; `src/adapters/` implements those ports. React presentation belongs in `src/components/` and `src/app/`, while Phaser code lives in `src/game/`. Scene data and bundled art are under `src/assets/`; served spritesheets are in `public/assets/`. Tests are split between `tests/unit/` and `tests/e2e/`, with data in `tests/fixtures/`. Design material lives in `design/`.

## Build, Test, and Development Commands

- `npm ci`: install the exact dependency versions from `package-lock.json`.
- `npm run dev`: start Vite, normally on port 5173.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run lint`: check source and config files with ESLint.
- `npm test`: run the Vitest unit suite once; `npm run test:unit` enables watch mode.
- `npm run test:coverage`: generate V8 coverage reports.
- `PW_PORT=5174 npm run test:e2e`: build and run Chromium Playwright tests on a pinned port.
- `npm run build`: produce root-hosted `dist/` and GitHub Pages `dist-gh/` bundles.

Before submitting, run `npm run typecheck && npm test && npm run lint`; run relevant E2E specs for user-flow changes.

## Coding Style & Architecture

Use TypeScript with two-space indentation, semicolons, and double quotes, matching nearby files. Use `PascalCase` for React components and scene classes, `camelCase` for functions and variables, and kebab-case filenames for non-component modules. Prefix intentionally unused values with `_`.

Preserve the hexagonal boundary: core and ports must not import adapters, React, Phaser, or Tone. Represent mutations as pure commands/reducers, inject randomness through `RngPort`, and keep scenes data-driven through Tiled JSON. Parse untrusted persisted data at the boundary with precise domain types. Extend existing registries and shared vocabularies instead of duplicating facts.

## Testing Guidelines

Name unit tests `*.test.ts` or `*.spec.ts` and E2E tests `*.spec.ts`. Add unit coverage for reducers and pure functions, contract tests for ports, and Playwright coverage for changed journeys. Pin the production decision point, not only a helper. Architecture constraints are enforced by `tests/unit/architecture.test.ts`.

## Commits & Pull Requests

Follow Conventional Commits used in history, such as `feat(track): ...`, `fix(yard): ...`, or `docs(art): ...`; use `!` for breaking changes. Keep commits to one logical intent. PRs should explain behavior and architectural impact, link the issue or ticket, list verification commands, and include screenshots or recordings for visual changes. Merge only with typecheck, lint, unit, and relevant E2E checks green.
