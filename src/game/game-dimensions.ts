/** Authored layout and maximum raster detail. CSS fitting is independent. */
export const GAME_DESIGN_SIZE = { width: 2560, height: 1440 } as const;

/** Match physical display pixels without supersampling beyond the art's design
 * size. A large/high-density screen must not inherit a fixed 720p buffer. */
export function drawingBufferSize(cssWidth: number, cssHeight: number, pixelRatio: number): {
  width: number; height: number;
} {
  if (!(cssWidth > 0 && cssHeight > 0)) return { ...GAME_DESIGN_SIZE };
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.min(1,
    cssWidth * density / GAME_DESIGN_SIZE.width,
    cssHeight * density / GAME_DESIGN_SIZE.height);
  return {
    width: Math.max(1, Math.ceil(GAME_DESIGN_SIZE.width * scale)),
    height: Math.max(1, Math.ceil(GAME_DESIGN_SIZE.height * scale)),
  };
}
