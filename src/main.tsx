// React entry. The hexagonal core (state, ports, Tone adapter, quantizer) is
// unchanged; this just mounts the React presentation layer over it.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { AppProvider } from "./app/context.tsx";
import { App } from "./App.tsx";
import { prepareBrowserPwaUpdate } from "./pwa-update.ts";

const PWA_BOOT_TIMEOUT_MS = 5_000;

function renderApp(): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("missing #root");
  createRoot(root).render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  );
}

void prepareBrowserPwaUpdate(import.meta.env.BASE_URL, PWA_BOOT_TIMEOUT_MS).then(
  (disposition) => {
    if (disposition === "boot-current") renderApp();
  },
  // Registration is an optional delivery enhancement. A browser or offline
  // failure must never prevent the already-loaded release from starting.
  () => renderApp(),
);
