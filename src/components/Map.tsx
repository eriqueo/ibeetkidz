import { FC } from "react";
import { useApp } from "../app/context.tsx";
import { AppView } from "../core/types.ts";

import workshopImg from "../assets/references/workshop-thumb.png";
import yardImg from "../assets/references/yard-thumb.png";
import trackImg from "../assets/references/track-thumb.png";

const SPACES: {
  key: AppView;
  title: string;
  color: string;
  blurb: string;
  img: string;
  cta: string;
}[] = [
  {
    key: "workshop",
    title: "Workshop",
    color: "#e05a2b",
    blurb: "Build loop sections inside a train car!",
    img: workshopImg,
    cta: "Build!",
  },
  {
    key: "yard",
    title: "Yard",
    color: "#d4a017",
    blurb: "Store and sort all your cars.",
    img: yardImg,
    cta: "Manage!",
  },
  {
    key: "track",
    title: "Track",
    color: "#6b3fa0",
    blurb: "Line cars up and ride the loop!",
    img: trackImg,
    cta: "Play!",
  },
];

export const Map: FC = () => {
  const { dispatch } = useApp();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#201c26",
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
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "20px 16px",
        background: "#1a1712",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "auto",
      }}>
        <p style={{
          font: "400 10px/1 var(--font-label, 'Press Start 2P')",
          color: "#e8dcc8",
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
          maxWidth: 860,
        }}>
          {SPACES.map((s) => (
            <button
              key={s.key}
              onClick={() => dispatch({ type: "setActiveView", view: s.key })}
              style={{
                flex: "1 1 240px",
                maxWidth: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                background: "#3a3540",
                border: "4px solid #1a1712",
                boxShadow: [
                  "inset 4px 4px 0 rgba(255,255,255,0.18)",
                  "inset -4px -4px 0 rgba(0,0,0,0.35)",
                  "0 8px 0 rgba(0,0,0,0.5)",
                ].join(", "),
                cursor: "pointer",
                padding: 0,
                borderRadius: 2,
                transition: "transform 0.05s",
                overflow: "hidden",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "translateY(4px)")}
              onMouseUp={e => (e.currentTarget.style.transform = "")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}
            >
              {/* Color header bar */}
              <div style={{
                background: s.color,
                padding: "10px 12px",
                borderBottom: "4px solid #1a1712",
                boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.25), inset -3px -3px 0 rgba(0,0,0,0.2)",
                font: "400 12px/1 var(--font-label, 'Press Start 2P')",
                color: "#fff",
                textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                textAlign: "center",
              }}>
                {s.title}
              </div>

              {/* Reference scene image */}
              <div style={{
                background: "#1a1712",
                borderBottom: "3px solid #1a1712",
                overflow: "hidden",
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img
                  src={s.img}
                  alt={s.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    imageRendering: "pixelated",
                    display: "block",
                  }}
                />
              </div>

              {/* Description */}
              <p style={{
                font: "400 11px/1.5 var(--font-body, 'Pixelify Sans')",
                color: "#e8dcc8",
                margin: 0,
                padding: "10px 12px",
                textAlign: "center",
                minHeight: 44,
                background: "#3a3540",
              }}>
                {s.blurb}
              </p>

              {/* CTA */}
              <div style={{
                background: s.color,
                color: "#fff",
                textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
                padding: "12px",
                borderTop: "4px solid #1a1712",
                boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.25), inset -3px -3px 0 rgba(0,0,0,0.25)",
                font: "400 13px/1 var(--font-label, 'Press Start 2P')",
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
