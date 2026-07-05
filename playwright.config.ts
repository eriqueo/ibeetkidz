import { defineConfig, devices } from "@playwright/test";

// Chromium-only by default (matches the kidpix CI posture). Audio + mic E2E
// needs flags that fake media so getUserMedia resolves without hardware.
// Late-bind the dev-server port so a stray Vite from another project on the
// default 5173 can't get reused out from under us (set PW_PORT to override).
const PORT = Number(process.env.PW_PORT ?? 5173);
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: ORIGIN,
    // Only reuse a server we can trust is ours — i.e. when a port was pinned.
    reuseExistingServer: !process.env.CI && !process.env.PW_PORT,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
    // Cross-engine gates for the SEND flow only (opt-in via PW_CROSS_ENGINE=1;
    // CI sets it): the master-output capture taps raw samples via AudioWorklet
    // with a MediaStream-bridge fallback, and engines differ in which path they
    // take — these prove capture + WAV encode + download on all three. WebKit
    // here is the closest CI proxy for iPhone/iPad Safari. No mic faking
    // needed: the send test builds its lane from a painted instrument.
    // (NixOS note: webkit needs the nix-patched browser — see the GST shim in
    // the AudioWorklet commit message — hence opt-in rather than default.)
    ...(process.env.PW_CROSS_ENGINE
      ? [
          {
            name: "webkit-send",
            grep: /couple a car and ride it/,
            use: { ...devices["Desktop Safari"] },
          },
          {
            name: "firefox-send",
            grep: /couple a car and ride it/,
            use: { ...devices["Desktop Firefox"] },
          },
        ]
      : []),
  ],
});
