# Build Runbook — ibeetkidz

This scaffold was written without a shell, so **nothing here has been installed,
type-checked, or test-run yet.** Run these steps first; they're mechanical.

## 0. Verify + initialize (do this first)

```bash
cd ~/600_apps/ibeetkidz
npm install
npm run typecheck      # FIRST signal — fix any type errors before proceeding
npm run test           # unit tests (project-state, rng) should pass
git init && git add -A && git commit -m "chore: scaffold ibeetkidz (TS+Vite+Tone)"
gh repo create eriqueo/ibeetkidz --public --source=. --push   # if gh authed
```

Expected risk areas to check during `typecheck` (hand-written, unverified):

- **Tone.js v15 API surface** in `src/adapters/tone-sound-port.ts` — verify
  `Tone.start`, `Tone.getContext`, `Tone.getDestination`, `Tone.getTransport`,
  `Tone.UserMedia`, `Tone.Recorder`, and `decodeAudioData` match the installed
  version. This is the single most likely place to need edits.
- `tsconfig` strictness (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
  is aggressive — a few `?? `/guards may be needed.
- `actions/setup-node` Node 24 + `npm ci` requires a committed `package-lock.json`
  (created by the first `npm install`).

## 1. Enable GitHub Pages

Repo → Settings → Pages → Source: **GitHub Actions**. Push to `main` triggers
`build-and-deploy.yml`. Live at `https://eriqueo.github.io/ibeetkidz/`.

## 2. Build-out order (the TODO(build) markers)

Priority follows the hero loop first:

1. **Built-in sample pack** — drop sounds in `public/sounds/`, load in
   `ToneSoundPort.loadBuiltins()`, key by `assetId`.
2. **Effect rendering** — implement `renderEffects()` with `Tone.Offline`:
   reverse (buffer reversal), pitchUp/Down (`PitchShift`), robot (stacked),
   echo (`FeedbackDelay`), reverb (`Reverb`), bitcrush (`BitCrusher`),
   crazy (seeded random stack via `RngPort`).
3. **Clip playback** — `play()` and `scheduleStep()` resolve `ClipSource` →
   buffer → `Tone.Player` / transport schedule.
4. **Theremin voice** — `setThereminXY` maps x→pitch (quantized scale),
   y→filter cutoff on a live oscillator.
5. **Flesh the stub machines** — `sound-pads`, `beat-grid`, `looper-stage`.
6. **IndexedDB blobs** — `LocalStoragePort.putBlob/getBlob` for recordings.
7. **Surprise-me** — seeded generative beat.

## 3. Verification per step

- Unit-test every reducer/pure function (pattern in `tests/unit/`).
- Add a Playwright step to `tests/e2e/smoke.spec.ts` for the full hero journey:
  record → reverse → hear → save → reload → still there.
- Manual: test mic-denied path (must stay usable), iPad Safari, silent switch.
