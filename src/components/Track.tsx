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
    <div className="view-container">
      {/* Toolbar */}
      <header className="options-bar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button 
          className="t-btn" 
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text">Springvale Loop</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="t-btn" onClick={() => dispatch({ type: "setActiveView", view: "yard" })}>
            📦 Yard
          </button>
        </div>
      </header>

      {/* Grass playfield with oval loop */}
      <div className="view-playfield pattern-diag">
        <Loop t={t} project={project} />
      </div>

      {/* Actions bar */}
      <footer className="playbar" style={{ marginTop: "auto" }}>
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

const Loop: FC<{ t: number; project: any }> = ({ t, project }) => {
  // ellipse params (percent of container)
  const cx = 50, cy = 50, rx = 38, ry = 30;
  
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

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* track ring */}
      <div style={{
        position: "absolute", left: `${cx - rx}%`, top: `${cy - ry}%`,
        width: `${rx * 2}%`, height: `${ry * 2}%`,
        border: "26px solid #1a1712",
        boxShadow: "inset 0 0 0 3px var(--chrome-edge), 0 0 0 3px var(--chrome-edge)",
        borderRadius: "50%",
        backgroundClip: "padding-box",
      }} />
      <div style={{
        position: "absolute", left: `${cx - rx}%`, top: `${cy - ry}%`,
        width: `${rx * 2}%`, height: `${ry * 2}%`,
        border: "2px dashed #7c6f64", opacity: 0.5,
        borderRadius: "50%",
        margin: 12,
      }} />
      
      {/* locomotive at the head */}
      <CarToken color="var(--sun)" label="🚂" angle={t} cx={cx} cy={cy} rx={rx} ry={ry} big />
      
      {/* trailing cars */}
      {cars.map((car, i) => {
        // Space cars evenly around the track relative to the locomotive
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
  // ride the centerline of the track band
  const irx = rx * 0.93, iry = ry * 0.9;
  const x = cx + irx * Math.cos(angle * Math.PI * 2 - Math.PI / 2);
  const y = cy + iry * Math.sin(angle * Math.PI * 2 - Math.PI / 2);
  const s = big ? 34 : 26;
  return (
    <span style={{
      position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
      width: s, height: s, background: color, border: "2px solid var(--chrome-edge)",
      boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.4)",
      font: `400 ${big ? 16 : 11}px/${s - 4}px var(--font-lcd)`, color: big ? "#111" : "var(--text-on-accent)",
      textAlign: "center", imageRendering: "pixelated", zIndex: big ? 4 : 3,
    }}>{label}</span>
  );
};
