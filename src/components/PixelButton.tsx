import { CSSProperties, FC, ReactNode } from "react";

export type PixelVariant = "default" | "primary" | "nav";

/** A visible, labelled pixel-art button with a real press-down animation
 *  (the bevel inverts + nudges on :active). The single in-canvas control look
 *  for every v2 scene. `emoji` renders before the label; `active` highlights a
 *  toggled state. */
export const PixelButton: FC<{
  label: string;
  onClick: () => void;
  emoji?: string;
  variant?: PixelVariant;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ label, onClick, emoji, variant = "default", active, disabled, title, style }) => {
  const cls =
    "pixel-btn" +
    (variant === "primary" ? " pixel-btn--primary" : "") +
    (variant === "nav" ? " pixel-btn--nav" : "") +
    (active ? " pixel-btn--active" : "");
  return (
    <button
      type="button"
      className={cls}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {emoji && <span className="pb-emoji" aria-hidden>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
};
