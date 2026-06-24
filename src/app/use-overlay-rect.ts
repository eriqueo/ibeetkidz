// Registers React overlays to painted regions of a Phaser scene background.
//
// The scenes that need this (Workshop, Map) contain-fit a 16:9 image inside the
// canvas. Given the canvas container's measured size and that fixed aspect, the
// displayed image rectangle is fully determined — no need for Phaser to report
// anything back. `useContainedRect` watches the container and returns that
// rectangle; `regionStyle` maps a normalized sub-region (fractions of the image)
// into an absolutely-positioned inline style on top of it.
import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A sub-region of the image, each value a 0..1 fraction of image w/h. */
export interface NormRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The on-screen rectangle a `contain`-fit image of `aspect` occupies in `ref`. */
export function useContainedRect(
  ref: RefObject<HTMLElement | null>,
  aspect: number,
): Rect {
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      // contain: fit whole image, letterbox the shorter axis.
      const fitW = cw / ch > aspect ? ch * aspect : cw;
      const fitH = cw / ch > aspect ? ch : cw / aspect;
      setRect({ x: (cw - fitW) / 2, y: (ch - fitH) / 2, width: fitW, height: fitH });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, aspect]);

  return rect;
}

/** Absolute inline style placing `region` over the contained image `rect`. */
export function regionStyle(rect: Rect, region: NormRegion): CSSProperties {
  return {
    position: "absolute",
    left: rect.x + region.x * rect.width,
    top: rect.y + region.y * rect.height,
    width: region.w * rect.width,
    height: region.h * rect.height,
  };
}
