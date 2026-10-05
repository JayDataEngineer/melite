// paintInk.ts — the paint leaf-face's STROKE INK (canvas DATA, not
// chrome): strokes render onto the transparent overlay in this ink;
// the saved PNG's ALPHA channel is the payload the LoadImageMask
// lane reads (the RGB value never reaches the wire). Lives outside
// the color-law guarded set by the wall's own canvas-data exemption
// (same precedent as the retired studio's ts constants).
export const PAINT_STROKE_INK = "rgba(255, 255, 255, 1)";
//# sourceMappingURL=paintInk.js.map
