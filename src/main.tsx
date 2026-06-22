// React entry. The hexagonal core (state, ports, Tone adapter, quantizer) is
// unchanged; this just mounts the React presentation layer over it.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import "./theme.css";
import { AppProvider } from "./app/context.tsx";
import { App } from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
