// The React<->Phaser bridge. Mounts a Phaser game into a container div, hands
// it the scene(s) the view wants, and exposes the live game + active scene via
// ref so the parent can push state. All cross-boundary traffic still goes
// through the EventBus; the ref is only an escape hatch for imperative wiring
// (e.g. tearing down listeners) — React never mutates Phaser display objects
// directly.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Phaser from "phaser";
import { startGame } from "../game/main.ts";
import { EventBus } from "../game/EventBus.ts";

export interface PhaserGameHandle {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface PhaserGameProps {
  // The scene class(es) to run. A stable reference is expected — pass a
  // module-level constant, not a freshly-built array each render.
  scenes: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[];
  // Fired once the first scene finishes `create()` and is safe to drive.
  onSceneReady?: (scene: Phaser.Scene) => void;
  className?: string;
  style?: CSSProperties;
}

export const PhaserGame = forwardRef<PhaserGameHandle, PhaserGameProps>(
  function PhaserGame({ scenes, onSceneReady, className, style }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [activeScene, setActiveScene] = useState<Phaser.Scene | null>(null);

    useImperativeHandle(
      ref,
      () => ({ game: gameRef.current, scene: activeScene }),
      [activeScene],
    );

    // Boot exactly once per mount. useLayoutEffect so the canvas exists before
    // paint; the container has its layout size by then.
    useLayoutEffect(() => {
      if (!containerRef.current || gameRef.current) return;
      gameRef.current = startGame(containerRef.current, scenes);
      return () => {
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
      // `scenes` is intentionally not a dep — a view never swaps scene classes
      // mid-mount; it unmounts the whole component instead.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Bridge the EventBus handshake into React state + the optional callback.
    useEffect(() => {
      const handleReady = (scene: Phaser.Scene) => {
        setActiveScene(scene);
        onSceneReady?.(scene);
      };
      EventBus.on("current-scene-ready", handleReady);
      return () => {
        EventBus.off("current-scene-ready", handleReady);
      };
    }, [onSceneReady]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "absolute", inset: 0, ...style }}
      />
    );
  },
);
