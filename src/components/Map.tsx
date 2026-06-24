import { FC } from "react";
import { useApp } from "../app/context.tsx";
import { AppView } from "../core/types.ts";

// Use the actual reference images from design/references — these are the
// canonical pixel-art scenes that define each space's visual identity.
// Vite will hash and bundle them correctly for GitHub Pages.
import workshopImg from "../assets/theme/icons/keyboard.png";
import yardImg from "../assets/theme/icons/cowbell.png";
import trackImg from "../assets/theme/icons/bass-drum.png";

const SPACES: { key: AppView; title: string; color: string; blurb: string; img: string; cta: string; emoji: string }[] = [
  {
    key: "workshop",
    title: "Workshop",
    color: "#e05a2b",   // tomato — drum/build energy
    blurb: "Build loop sections inside a train car!",
    img: workshopImg,
    cta: "Build!",
    emoji: "🔧",
  },
  {
    key: "yard",
    title: "Yard",
    color: "#d4a017",   // sun — storage/collection energy
    blurb: "Store and sort all your cars.",
    img: yardImg,
    cta: "Manage!",
    emoji: "📦",
  },
  {
    key: "track",
    title: "Track",
    color: "#6b3fa0",   // grape — performance energy
    blurb: "Line cars up and ride the loop!",
    img: trackImg,
    cta: "Play!",
    emoji: "🚂",
  },
];

export const Map: FC = () => {
  const { dispatch } = useApp();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "var(--ground, #201c26)",
      overflow: "hidden",
    }}>
      {/* Brand header */}
      <header className="brand" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <span className="brand-text" style={{ fontSize: "1.1rem" }}>iBeetKidz</span>
      </header>

      {/* Full-height playfield */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "20px 16px",
        background: "var(--well, #1a1712)",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "auto",
      }}>
        <p style={{
          font: "400 10px/1 var(--font-label, 'Press Start 2P')",
          color: "var(--linen, #e8dcc8)",
          letterSpacing: "3px",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Pick a place to play!
        </p>

        {/* Destination cards */}
        <div style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          maxWidth: 820,
        }}>
          {SPACES.map((s) => (
            <button
              key={s.key}
              onClick={() => dispatch({ type: "setActiveView", view: s.key })}
              style={{
                flex: "1 1 220px",
                maxWidth: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                background: "var(--chrome, #3a3540)",
                border: "3px solid #1a1712",
                boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.18), inset -3px -3px 0 rgba(0,0,0,0.35), 0 6px 0 rgba(0,0,0,0.5)",
                cursor: "pointer",
                padding: 0,
                gap: 0,
                borderRadius: 2,
                transition: "transform 0.05s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "translateY(3px)")}
              onMouseUp={e => (e.currentTarget.style.transform = "")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}
            >
              {/* Color header bar */}
              <div style={{
                background: s.color,
                padding: "8px 12px",
                borderBottom: "3px solid #1a1712",
                boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.25), inset -2px -2px 0 rgba(0,0,0,0.2)",
                font: "400 11px/1 var(--font-label, 'Press Start 2P')",
                color: "#fff",
                textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                textAlign: "center",
              }}>
                {s.title}
              </div>

              {/* Sprite area */}
              <div style={{
                background: "#1a1712",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 130,
              }}>
                <div style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(3px 3px 0 rgba(0,0,0,0.7))" }}>
                  {s.emoji}
                </div>
              </div>

              {/* Description */}
              <p style={{
                font: "400 11px/1.5 var(--font-body, 'Pixelify Sans')",
                color: "var(--linen, #e8dcc8)",
                margin: 0,
                padding: "10px 12px",
                textAlign: "center",
                minHeight: 48,
                background: "var(--chrome, #3a3540)",
              }}>
                {s.blurb}
              </p>

              {/* CTA button */}
              <div style={{
                background: s.color,
                color: "#fff",
                textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
                padding: "10px",
                borderTop: "3px solid #1a1712",
                boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.25), inset -2px -2px 0 rgba(0,0,0,0.25)",
                font: "400 12px/1 var(--font-label, 'Press Start 2P')",
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
};
