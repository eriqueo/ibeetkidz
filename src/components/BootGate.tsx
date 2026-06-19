// Gesture gate: Web Audio can't start without a user gesture. Tapping START
// resumes the AudioContext, loads builtins, restores the last jam, and sets the
// default on-beat snap — then reveals the app.

import { useState, type FC } from "react";
import { useApp, loadLast } from "../app/context.tsx";

export const BootGate: FC<{ onStarted: () => void }> = ({ onStarted }) => {
  const { engine } = useApp();
  const [busy, setBusy] = useState(false);

  const start = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    await engine.start(); // resume context + load builtins
    engine.setQuantize("beat"); // everything lands on the beat by default
    await loadLast(); // bring back the last saved jam, if any
    onStarted();
  };

  return (
    <div id="boot-gate">
      <button id="boot-button" type="button" disabled={busy} onClick={start}>
        ▶ TAP TO START
      </button>
    </div>
  );
};
