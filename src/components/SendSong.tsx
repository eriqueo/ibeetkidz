// SendSong: the "share my song" flow on the Track view. Tap 📮 SEND → the
// train rides the song once while the master output records (renderSong), then
// a modal offers "Send it" (the OS share sheet — parent-mediated, the app
// itself never touches the network) and "Save it" (a plain WAV download).
import { FC, useCallback, useMemo, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { liveTrain } from "../core/project-state.ts";
import { PixelButton } from "./PixelButton.tsx";

const FILE_NAME = "my-train-song.wav";

type Phase =
  | { kind: "idle" }
  | { kind: "rendering" }
  | { kind: "ready"; blob: Blob; file: File }
  | { kind: "error" };

export const SendSong: FC = () => {
  const { engine } = useApp();
  const project = useProject();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const hasSong = liveTrain(project).length > 0;

  const begin = useCallback(async () => {
    setPhase({ kind: "rendering" });
    try {
      const blob = await engine.renderSong(project);
      const file = new File([blob], FILE_NAME, { type: "audio/wav" });
      setPhase({ kind: "ready", blob, file });
    } catch (err) {
      console.error("send-song render failed", err);
      setPhase({ kind: "error" });
    }
  }, [engine, project]);

  // The OS share sheet needs file support (iOS/Android/some desktops have it;
  // the button hides where it doesn't — Save always works).
  const canShare = useMemo(
    () =>
      phase.kind === "ready" &&
      typeof navigator.share === "function" &&
      navigator.canShare?.({ files: [phase.file] }) === true,
    [phase],
  );

  const share = useCallback(async () => {
    if (phase.kind !== "ready") return;
    try {
      await navigator.share({ files: [phase.file], title: "My train song" });
    } catch {
      // The kid closed the share sheet — not an error, stay on the modal.
    }
  }, [phase]);

  const save = useCallback(() => {
    if (phase.kind !== "ready") return;
    const url = URL.createObjectURL(phase.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [phase]);

  const close = useCallback(() => setPhase({ kind: "idle" }), []);

  return (
    <>
      <PixelButton
        label="Send"
        emoji="📮"
        variant="nav"
        onClick={() => void begin()}
        disabled={!hasSong}
        title="Send your song"
        style={{ position: "absolute", right: 12, top: "40%", pointerEvents: "auto", zIndex: 20 }}
      />

      {phase.kind !== "idle" && (
        <div className="send-song-veil" data-testid="send-song-modal">
          <div className="send-song-card">
            {phase.kind === "rendering" && (
              <>
                <div className="ss-title">🚂 Recording your song…</div>
                <div className="ss-body">The train is riding it once. Listen!</div>
                <div className="ss-spinner" aria-hidden>
                  🎵
                </div>
              </>
            )}
            {phase.kind === "ready" && (
              <>
                <div className="ss-title">🎉 Your song is ready!</div>
                <div className="ss-actions">
                  {canShare && (
                    <PixelButton label="Send it" emoji="📤" variant="primary" onClick={() => void share()} />
                  )}
                  <PixelButton label="Save it" emoji="💾" variant="primary" onClick={save} />
                  <PixelButton label="Done" emoji="✖" onClick={close} />
                </div>
              </>
            )}
            {phase.kind === "error" && (
              <>
                <div className="ss-title">😅 Oops, that didn’t work.</div>
                <div className="ss-actions">
                  <PixelButton label="Try again" emoji="🔁" variant="primary" onClick={() => void begin()} />
                  <PixelButton label="Done" emoji="✖" onClick={close} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
