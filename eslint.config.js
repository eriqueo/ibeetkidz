// Flat ESLint config — ticket S2, decision A2 ("install typescript-eslint +
// react-hooks, wire `npm run lint` into CI").
//
// Two scoping decisions are recorded here rather than in a commit message,
// because a lint config that silently narrows itself is how lint dies:
//
// A. react-hooks v7 ships the **React Compiler** ruleset inside BOTH of its
//    presets (`recommended` and `recommended-latest` are the same 16 rules).
//    A2 asked for the hooks rules — `rules-of-hooks` + `exhaustive-deps` — so
//    those two are enabled explicitly. The compiler rules are NOT adopted
//    today: they flag 16 sites of a deliberate, commented idiom (the
//    "latest ref" pattern, `const ref = useRef(x); ref.current = x;` feeding
//    EventBus listeners registered once — see `Workshop.tsx`, `Yard.tsx`,
//    `Track.tsx`, `Map.tsx`). Adopting them means rewriting live Phaser↔React
//    wiring, which is a ticket, not a config line. The findings are written
//    down in S2's report; nothing is being hidden.
// B. The `^_` prefix is this repo's existing "deliberately unused" dialect —
//    tsconfig's `noUnusedLocals`/`noUnusedParameters` pass today because tsc
//    honours it. no-unused-vars is configured to honour the same convention
//    rather than declaring 7 intentional discards to be bugs.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dist-gh/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "src/assets/**",
      // Git worktrees live here (`git worktree add .claude/worktrees/<name>`).
      // Each one is a FULL second checkout, so without this ESLint lints every
      // worktree's `src/` — and its built `dist/` bundles, which the `dist/**`
      // rule above cannot catch because that pattern is anchored to THIS root,
      // not `.claude/worktrees/*/dist/`. CI never sees this (a clean checkout
      // has no worktrees), so `npm run lint` would pass in Actions and fail on
      // a developer machine — the worst shape for a check to have.
      ".claude/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- app + test sources -------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Decision A above.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Decision B above.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },

  // --- config files run in Node, not the browser --------------------------
  {
    files: ["*.config.{ts,js}"],
    languageOptions: { globals: { ...globals.node } },
  },

  // --- Playwright specs ---------------------------------------------------
  // `page.evaluate` crosses into the untyped browser realm (`window.__eb`,
  // AudioContext internals, Phaser scene guts). `any` is the honest type at
  // that boundary — this is the one place in the repo where it is load-bearing
  // rather than lazy, and it is confined to the e2e tree.
  {
    files: ["tests/e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },

  // === TECH-DEBT BASELINE (2026-07-31, ticket S2) =========================
  // Real findings in files S2 does not own. Each entry names the ticket that
  // deletes it. These are file-scoped and rule-scoped on purpose: the rule
  // stays at "error" everywhere else, so no NEW instance can land.
  // Adding an entry here requires naming an owner. Delete entries, don't grow
  // them.
  {
    // 4 × `let` that is never reassigned (lines ~195/199/312/322). Trivial,
    // real, and in a file **S5 owns** (`S5 · Version and parse the save
    // format` lists this exact path). REMOVE THIS ENTRY WITH S5.
    files: ["tests/unit/project-state.test.ts"],
    rules: { "prefer-const": "off" },
  },
);
