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
  ],
});
