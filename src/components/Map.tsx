import { FC } from "react";
import { useApp } from "../app/context.tsx";
import { AppView } from "../core/types.ts";

const SPACES: { key: AppView; title: string; color: string; blurb: string; emoji: string; cta: string }[] = [
  { key: "workshop", title: "Workshop", color: "var(--leaf)",
    blurb: "Build loop sections inside a train car!", emoji: "🔧", cta: "Build" },
  { key: "yard", title: "Yard", color: "var(--sun)",
    blurb: "Store and sort all your cars.", emoji: "📦", cta: "Manage" },
  { key: "track", title: "Track", color: "var(--grape)",
    blurb: "Line cars up and ride the loop!", emoji: "🚂", cta: "Play" },
];

export const Map: FC = () => {
  const { dispatch } = useApp();

  return (
    <div className="view-container">
      <header className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="brand-text">iBeetKidz Map</span>
      </header>

      <div className="view-playfield" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <p style={{ font: "400 14px/1 var(--font-label)", color: "var(--linen)", letterSpacing: "2px", textTransform: "uppercase" }}>
          Pick a place to play!
        </p>

        {/* Destination cards */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {SPACES.map((s) => (
          <button key={s.key} className="map-card" onClick={() => dispatch({ type: "setActiveView", view: s.key })}>
            <div style={{ 
              background: s.color, color: "var(--text-on-accent)", 
              padding: "4px 12px", border: "2px solid var(--chrome-edge)",
              boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.3)",
              font: "400 12px/1 var(--font-label)", textTransform: "uppercase", letterSpacing: "1px"
            }}>
              {s.title}
            </div>
            
            <div style={{ background: "var(--well)", boxShadow: "var(--shadow-inset)", padding: 12, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", height: 84 }}>
              <span style={{ fontSize: 48 }}>{s.emoji}</span>
            </div>
            
            <p style={{ font: "400 14px/1.4 var(--font-body)", color: "var(--text-on-chrome)", margin: 0,
              textAlign: "center", minHeight: 40 }}>{s.blurb}</p>
              
            <div style={{ 
              background: s.color, color: "var(--text-on-accent)", 
              padding: "8px", width: "100%", border: "2px solid var(--chrome-edge)",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3)",
              font: "400 14px/1 var(--font-lcd)"
            }}>
              {s.cta}!
            </div>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
