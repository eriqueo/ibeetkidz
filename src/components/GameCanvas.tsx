// The one, permanent Phaser host.
//
// It is rendered by `Shell` ABOVE the view swap, so the element — and with it
// the game, its WebGL context and its single TextureManager — outlives every
// navigation. The views no longer own a canvas; they render only the HTML that
// sits on top of this one (see `PhaserScene`).
//
// Layering: this div is `.shell-root`'s first child, so every view paints above
// it. It is also the only thing here that takes pointer events — all four
// spaces put their whole UI inside Phaser, and the surviving React overlays are
// `pointer-events: none` toasts. Views must therefore keep their own wrapper
// transparent and non-interactive, or they mask the canvas underneath.
import { useLayoutEffect, useRef, type FC } from "react";
import { ensureGame, refreshScale } from "../game/game-host.ts";

export const GameCanvas: FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // useLayoutEffect, not useEffect: the ScaleManager measures this element at
    // boot and a 0x0 measurement makes Scale.FIT oscillate forever. By layout
    // time it is in the document with its real size.
    ensureGame(host);
    // Phaser caches the canvas bounds and only re-reads them on a window
    // resize. Mobile browser chrome collapsing changes `100dvh` without one,
    // and stale bounds mis-map every pointer (first taps land at world 0,0;
    // buttons feel dead). Re-measure right before the pointer arrives.
    //
    // No cleanup teardown of the game itself: it is page-scoped by design.
    host.addEventListener("pointerenter", refreshScale);
    host.addEventListener("pointerdown", refreshScale, true); // touch: no hover
    return () => {
      host.removeEventListener("pointerenter", refreshScale);
      host.removeEventListener("pointerdown", refreshScale, true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="game-canvas"
      style={{
        position: "absolute",
        inset: 0,
        // The game runs `transparent: true`, so this is what fills the FIT
        // letterbox. It used to live on each view's wrapper, which now has to
        // stay see-through.
        background: "#000",
        pointerEvents: "auto",
      }}
    />
  );
};
