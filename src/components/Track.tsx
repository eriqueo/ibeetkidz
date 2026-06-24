import { FC, useEffect, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT } from "../core/types.ts";

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const [t, setT] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (engine.isPlaying && engine.playMode === "ride") {
        const step = sound.getTransportStep(STEP_COUNT);
        const frac = step >= 0 ? step / STEP_COUNT : 0;
        const totalBars = project.arrangement.reduce((sum, a) => sum + a.repeats, 0);
        if (totalBars > 0) {
          // getTransportBar returns the current bar index
          const bar = (engine as any).getTransportBar?.() ?? 0;
          const songBar = ((bar % totalBars) + totalBars) % totalBars;
          setT(((songBar + frac) / totalBars) % 1);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine, sound, project.arrangement]);

  // Flatten arrangement into car list
  const cars: { id: string; color: string; name: string }[] = [];
  project.arrangement.forEach((a) => {
    const part = project.parts.find((p) => p.id === a.partId);
    if (part) {
      for (let i = 0; i < a.repeats; i++) {
        cars.push({ id: `${part.id}-${i}`, color: part.color, name: part.name });
      }
    }
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#201c26",
      overflow: "hidden",
    }}>
      {/* Brand header */}
      <header className="brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Springvale Loop</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
          >
            📦 Yard
          </button>
        </div>
      </header>

      {/* Dark trackbed playfield */}
      <div style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        background: "#1a1712",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}>
        <OvalTrack t={t} cars={cars} />
      </div>

      {/* Transport bar */}
      <footer className="playbar" style={{ flexShrink: 0 }}>
        <div className="pb-group">
          <button className="pb-btn pb-play" onClick={() => engine.playRide(project)}>
            <span className="pb-icon">▶</span>
            <span className="pb-label">Ride Train</span>
          </button>
          <button className="pb-btn" onClick={() => engine.stop()}>
            <span className="pb-icon">■</span>
            <span className="pb-label">Stop</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

// ── Oval Track ────────────────────────────────────────────────────────────────

const TIE_COUNT = 40;

interface CarInfo { id: string; color: string; name: string }

const OvalTrack: FC<{ t: number; cars: CarInfo[] }> = ({ t, cars }) => {
  // Ellipse params as % of container
  const cx = 50, cy = 50;
  const rx = 38, ry = 30;

  // Tie positions
  const ties = Array.from({ length: TIE_COUNT }, (_, i) => {
    const angle = (i / TIE_COUNT) * Math.PI * 2 - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const deg = (angle * 180) / Math.PI + 90;
    return { x, y, deg };
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Ground dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* Ballast bed (dark oval fill between rails) */}
      <div style={{
        position: "absolute",
        left: `${cx - rx}%`, top: `${cy - ry}%`,
        width: `${rx * 2}%`, height: `${ry * 2}%`,
        borderRadius: "50%",
        background: "#241e18",
        border: "none",
      }} />

      {/* Outer rail */}
      <div style={{
        position: "absolute",
        left: `${cx - rx - 1.5}%`, top: `${cy - ry - 1.5}%`,
        width: `${(rx + 1.5) * 2}%`, height: `${(ry + 1.5) * 2}%`,
        border: "5px solid #a09060",
        borderRadius: "50%",
        boxShadow: "0 0 0 1px #3a2e1a, inset 0 0 0 1px #c8a870",
        pointerEvents: "none",
      }} />

      {/* Inner rail */}
      <div style={{
        position: "absolute",
        left: `${cx - rx + 1.5}%`, top: `${cy - ry + 1.5}%`,
        width: `${(rx - 1.5) * 2}%`, height: `${(ry - 1.5) * 2}%`,
        border: "5px solid #a09060",
        borderRadius: "50%",
        boxShadow: "0 0 0 1px #3a2e1a, inset 0 0 0 1px #c8a870",
        pointerEvents: "none",
      }} />

      {/* Wooden ties */}
      {ties.map((tie, i) => (
        <span key={i} style={{
          position: "absolute",
          left: `${tie.x}%`, top: `${tie.y}%`,
          width: 18, height: 8,
          background: "#7c5c2a",
          border: "1px solid #3a2e1a",
          boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.1)",
          borderRadius: 1,
          transform: `translate(-50%,-50%) rotate(${tie.deg}deg)`,
          pointerEvents: "none",
          zIndex: 1,
        }} />
      ))}

      {/* Crossing signal (top of oval) */}
      <div style={{
        position: "absolute",
        left: `${cx}%`, top: `${cy - ry - 8}%`,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        zIndex: 5,
      }}>
        <div style={{
          width: 6, height: 24,
          background: "#3a3530",
          border: "2px solid #1a1712",
          boxShadow: "inset 1px 0 0 rgba(255,255,255,0.1)",
        }} />
        <div style={{
          display: "flex", gap: 4,
          background: "#2a2520",
          border: "2px solid #1a1712",
          padding: "3px 5px",
          borderRadius: 2,
          boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.1), 0 2px 0 rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#ef476f",
            boxShadow: "0 0 4px #ef476f",
          }} />
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#ffd166",
            boxShadow: "0 0 4px #ffd166",
          }} />
        </div>
      </div>

      {/* Locomotive */}
      <CarToken
        color="#d4a017"
        label="🚂"
        angle={t}
        cx={cx} cy={cy} rx={rx} ry={ry}
        isLoco
      />

      {/* Trailing cars */}
      {cars.map((car, i) => {
        const spacing = 1.0 / Math.max(10, cars.length + 2);
        return (
          <CarToken
            key={car.id}
            color={car.color}
            label={String(i + 1)}
            angle={t - (i + 1) * spacing}
            cx={cx} cy={cy} rx={rx} ry={ry}
          />
        );
      })}
    </div>
  );
};

const CarToken: FC<{
  color: string;
  label: string;
  angle: number;
  cx: number; cy: number;
  rx: number; ry: number;
  isLoco?: boolean;
}> = ({ color, label, angle, cx, cy, rx, ry, isLoco }) => {
  // Ride the center line between inner and outer rails
  const a = (angle * Math.PI * 2 - Math.PI / 2);
  const x = cx + rx * Math.cos(a);
  const y = cy + ry * Math.sin(a);
  const w = isLoco ? 56 : 48;
  const h = isLoco ? 36 : 28;

  return (
    <div style={{
      position: "absolute",
      left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%, -50%)",
      width: w, height: h,
      zIndex: isLoco ? 6 : 4,
    }}>
      {/* Car body */}
      <div style={{
        width: "100%",
        height: "80%",
        background: color,
        border: "3px solid #1a1712",
        boxShadow: [
          "inset 3px 3px 0 rgba(255,255,255,0.3)",
          "inset -3px -3px 0 rgba(0,0,0,0.4)",
          "0 4px 0 rgba(0,0,0,0.6)",
        ].join(", "),
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: `400 ${isLoco ? 16 : 9}px/1 var(--font-label, 'Press Start 2P')`,
        color: isLoco ? "#111" : "rgba(0,0,0,0.55)",
        letterSpacing: isLoco ? 0 : "0.5px",
        position: "relative",
      }}>
        {isLoco ? label : label}
        {/* Rivets */}
        {!isLoco && <>
          <span style={{ position: "absolute", top: 2, left: 3, width: 4, height: 4, borderRadius: "50%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <span style={{ position: "absolute", top: 2, right: 3, width: 4, height: 4, borderRadius: "50%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </>}
      </div>
      {/* Wheels */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: 1 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #555, #222)",
          border: "2px solid #888",
          boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.15)",
        }} />
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #555, #222)",
          border: "2px solid #888",
          boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.15)",
        }} />
      </div>
    </div>
  );
};
