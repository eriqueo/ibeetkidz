import { FC } from "react";
import { useApp } from "../app/context.tsx";
import { AppView } from "../core/types.ts";

import workshopImg from "../assets/theme/icons/bass-drum.png";
import yardImg from "../assets/theme/icons/keyboard.png";
import trackImg from "../assets/theme/icons/cowbell.png";

const SPACES: { key: AppView; title: string; color: string; blurb: string; img: string; cta: string }[] = [
  { key: "workshop", title: "Workshop", color: "var(--leaf)",
    blurb: "Build loop sections inside a train car!", img: workshopImg, cta: "Build!" },
  { key: "yard", title: "Yard", color: "var(--sun)",
    blurb: "Store and sort all your cars.", img: yardImg, cta: "Manage!" },
  { key: "track", title: "Track", color: "var(--grape)",
    blurb: "Line cars up and ride the loop!", img: trackImg, cta: "Play!" },
];

export const Map: FC = () => {
  const { dispatch } = useApp();

  return (
    <div className="view-container">
      <header className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="brand-text">iBeetKidz Map</span>
      </header>

      <div className="view-playfield" style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 24, padding: 24,
      }}>
        <p style={{
          font: "400 11px/1 var(--font-label)",
          color: "var(--linen)",
          letterSpacing: "3px",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Pick a place to play!
        </p>

        {/* Destination cards */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 760 }}>
        {SPACES.map((s) => (
          <button
            key={s.key}
            onClick={() => dispatch({ type: "setActiveView", view: s.key })}
            style={{
              flex: "1 1 200px", maxWidth: 220,
              display: "flex", flexDirection: "column", alignItems: "stretch",
              background: "var(--chrome)",
              border: "3px solid var(--chrome-edge)",
              boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.18), inset -3px -3px 0 rgba(0,0,0,0.35), 0 6px 0 rgba(0,0,0,0.5)",
              cursor: "pointer", padding: 0, gap: 0,
            }}
          >
            {/* Color header bar */}
            <div style={{
              background: s.color,
              padding: "6px 12px",
              borderBottom: "3px solid var(--chrome-edge)",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.25)",
              font: "400 11px/1 var(--font-label)",
              color: "#111",
              textTransform: "uppercase",
              letterSpacing: "2px",
              textAlign: "center",
            }}>
              {s.title}
            </div>

            {/* Sprite area */}
            <div style={{
              background: "var(--well)",
              boxShadow: "var(--shadow-inset)",
              padding: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 120,
            }}>
              <img
                src={s.img}
                alt={s.title}
                style={{ height: 80, imageRendering: "pixelated", filter: "drop-shadow(3px 3px 0 rgba(0,0,0,0.6))" }}
              />
            </div>

            {/* Description */}
            <p style={{
              font: "400 11px/1.5 var(--font-body)",
              color: "var(--text-on-chrome)",
              margin: 0,
              padding: "10px 12px",
              textAlign: "center",
              minHeight: 44,
            }}>{s.blurb}</p>

            {/* CTA button */}
            <div style={{
              background: s.color,
              color: "#111",
              padding: "10px",
              borderTop: "3px solid var(--chrome-edge)",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.25), inset -2px -2px 0 rgba(0,0,0,0.25)",
              font: "400 12px/1 var(--font-lcd)",
              textAlign: "center",
            }}>
              {s.cta}
            </div>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
