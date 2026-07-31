// Gesture gate: Web Audio can't start without a user gesture. Tapping START
// resumes the AudioContext, loads builtins, restores the last jam, and sets the
// default on-beat snap — then reveals the app.
//
// Boot is allowed to FAIL. Before this, a rejected `engine.start()` left `busy`
// stuck true and the button dead under "TAP TO START" forever — the one screen
// a kid can't get past. Now every audio failure lands in a legible retry state.
// Storage failures are deliberately NOT fatal: a full or private-mode device
// should still get to play, it just can't keep the song (the notice for that
// lives on `AppProvider`, since autosave can break at any moment).

import { useState, type FC } from "react";
import {
  useApp,
  loadLast,
  probeEnvironment,
  reportStorageTrouble,
} from "../app/context.tsx";

type Phase = "idle" | "busy" | "failed";

export const BootGate: FC<{ onStarted: () => void }> = ({ onStarted }) => {
  const { engine } = useApp();
  const [phase, setPhase] = useState<Phase>("idle");

  const start = async (): Promise<void> => {
    if (phase === "busy") return;
    setPhase("busy");
    try {
      const probe = probeEnvironment();
      if (!probe.storage) reportStorageTrouble("blocked");
      if (!probe.audio) throw new Error("no AudioContext in this browser");
      await engine.start(); // resume context + load builtins
      engine.setQuantize("beat"); // everything lands on the beat by default
    } catch {
      setPhase("failed");
      return;
    }
    // A save we can't read back must not cost the kid the whole app.
    try {
      await loadLast(); // bring back the last saved jam, if any
    } catch {
      reportStorageTrouble("blocked");
    }
    onStarted();
  };

  return (
    <div id="boot-gate">
      {phase === "failed" && (
        <div id="boot-oops" role="alert">
          <p className="boot-oops-title">😅 Oops! The sound didn't wake up.</p>
          <p className="boot-oops-body">Let's give it another try!</p>
        </div>
      )}
      <button
        id="boot-button"
        type="button"
        disabled={phase === "busy"}
        onClick={start}
      >
        {phase === "failed" ? "▶ TRY AGAIN" : "▶ TAP TO START"}
      </button>
    </div>
  );
};
