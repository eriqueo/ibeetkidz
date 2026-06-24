import { FC, useEffect, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT } from "../core/types.ts";

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const [t, setT] = useState(0);

  // Sync animation to live audio engine
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (engine.isPlaying && engine.playMode === "ride") {
        const bar = engine.getTransportBar();
        const step = sound.getTransportStep(STEP_COUNT);
        const frac = step >= 0 ? step / STEP_COUNT : 0;
        
        if (bar >= 0) {
          // Simple progress approximation for the track oval
          const totalBars = project.arrangement.reduce((sum, a) => sum + a.repeats, 0);
          if (totalBars > 0) {
            const songBar = ((bar % totalBars) + totalBars) % totalBars;
            const progress = (songBar + frac) / totalBars;
            setT(progress);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, sound, project.arrangement]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "var(--ground, #201c26)",
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

      {/* Dark trackbed playfield with oval loop */}
      <div style={{
        flex: 1,
        position: "relative",
        background: "var(--well, #1a1712)",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "hidden",
        minHeight: 0,
      }}>
        <Loop t={t} project={project} />
      </div>

      {/* Actions bar */}
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

// Number of tie dashes to render around the oval
const TIE_COUNT = 36;

const Loop: FC<{ t: number; project: any }> = ({ t, project }) => {
  // ellipse params (percent of container)
  const cx = 50, cy = 50, rx = 40, ry = 32;
  
  // Flatten arrangement into a list of car instances
  const cars: any[] = [];
  project.arrangement.forEach((a: any) => {
    const part = project.parts.find((p: any) => p.id === a.partId);
    if (part) {
      for (let i = 0; i < a.repeats; i++) {
        cars.push(part);
      }
    }
  });

  // Pre-compute tie positions
  const ties = Array.from({ length: TIE_COUNT }, (_, i) => {
    const angle = (i / TIE_COUNT) * Math.PI * 2 - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const deg = (angle * 180) / Math.PI + 90;
    return { x, y, deg };
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Outer rail */}
      <div style={{
        position: "absolute",
        left: `${cx - rx - 2}%`, top: `${cy - ry - 2}%`,
        width: `${(rx + 2) * 2}%`, height: `${(ry + 2) * 2}%`,
        border: "4px solid #c0a060",
        borderRadius: "50%",
        boxShadow: "0 0 0 1px #3a2e1a, 0 2px 0 0 #3a2e1a",
        pointerEvents: "none",
      }} />
      {/* Inner rail */}
      <div style={{
        position: "absolute",
        left: `${cx - rx + 2}%`, top: `${cy - ry + 2}%`,
        width: `${(rx - 2) * 2}%`, height: `${(ry - 2) * 2}%`,
        border: "4px solid #c0a060",
        borderRadius: "50%",
        boxShadow: "0 0 0 1px #3a2e1a, 0 2px 0 0 #3a2e1a",
        pointerEvents: "none",
      }} />
      {/* Ballast bed (dark fill between rails) */}
      <div style={{
        position: "absolute",
        left: `${cx - rx + 2}%`, top: `${cy - ry + 2}%`,
        width: `${(rx - 2) * 2}%`, height: `${(ry - 2) * 2}%`,
        borderRadius: "50%",
        background: "transparent",
        boxShadow: `0 0 0 ${Math.min(rx, ry) * 0.18}vmin #2a2016`,
        pointerEvents: "none",
      }} />
      {/* Wooden ties */}
      {ties.map((tie, i) => (
        <span key={i} style={{
          position: "absolute",
          left: `${tie.x}%`, top: `${tie.y}%`,
          width: 14, height: 6,
          background: "#7c5c2a",
          border: "1px solid #3a2e1a",
          borderRadius: 1,
          transform: `translate(-50%,-50%) rotate(${tie.deg}deg)`,
          pointerEvents: "none",
          zIndex: 1,
        }} />
      ))}
      
      {/* locomotive at the head */}
      <CarToken color="var(--sun)" label="🚂" angle={t} cx={cx} cy={cy} rx={rx} ry={ry} big />
      
      {/* trailing cars */}
      {cars.map((car, i) => {
        const spacing = 1.0 / Math.max(8, cars.length + 1);
        return (
          <CarToken 
            key={`${car.id}-${i}`} 
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

const CarToken: FC<{ color: string; label: string; angle: number; cx: number; cy: number; rx: number; ry: number; big?: boolean }> = ({ color, label, angle, cx, cy, rx, ry, big }) => {
  const irx = rx * 0.93, iry = ry * 0.9;
  const x = cx + irx * Math.cos(angle * Math.PI * 2 - Math.PI / 2);
  const y = cy + iry * Math.sin(angle * Math.PI * 2 - Math.PI / 2);
  const w = big ? 52 : 44;
  const h = big ? 32 : 26;
  return (
    <span style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%,-50%)",
      width: w, height: h,
      background: color,
      border: "3px solid var(--chrome-edge)",
      boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.35), inset -3px -3px 0 rgba(0,0,0,0.45), 0 3px 0 rgba(0,0,0,0.6)",
      borderRadius: 2,
      display: "flex", alignItems: "center", justifyContent: "center",
      font: `400 ${big ? 18 : 10}px/1 var(--font-lcd)`,
      color: big ? "#111" : "var(--text-on-accent)",
      textAlign: "center",
      imageRendering: "pixelated",
      zIndex: big ? 4 : 3,
    }}>
      {big ? label : (
        <>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{label}</span>
          {/* Wheel nubs */}
          <span style={{
            position: "absolute", bottom: -5, left: 5,
            width: 8, height: 8, borderRadius: "50%",
            background: "#222", border: "2px solid #888",
          }} />
          <span style={{
            position: "absolute", bottom: -5, right: 5,
            width: 8, height: 8, borderRadius: "50%",
            background: "#222", border: "2px solid #888",
          }} />
        </>
      )}
    </span>
  );
};
