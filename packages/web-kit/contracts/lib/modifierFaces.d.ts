/** THE PAINT FACE (paint-leaf-canvas.md, stroke 76; embedded
 *  stroke 95): the host's brush canvas. The payload PNG is the
 *  contract either way — the canvas writes the same field the
 *  three-source square (upload/drop/pick) writes. */
export interface PaintCanvasFaceProps {
    /** the reference image URL (the card's input field value, when
     *  the host can name one — else the empty string rides; the
     *  brush paints OVER it) */
    referenceUrl: string;
    /** the payload field's current value (a PNG data URL — the
     *  canvas seeds its stroke layer from it, the paint-over law) */
    value: string;
    /** a COMMITTED change (a pointer-up after strokes, or Clear):
     *  the payload PNG data URL (alpha = strokes); '' = cleared */
    onChange: (dataUrl: string) => void;
}
/** THE BBOX FACE (stroke 78 — the bbox-canvas leaf; embedded
 *  stroke 95): the host's selection canvas — the reference image
 *  with a rectangle the user drags. Same delivery law as the
 *  paint face: a component from the client plane, never an
 *  import; absent host = the four number inputs hold (the
 *  degrade is graceful). */
export interface BboxCanvasFaceProps {
    /** the image the rectangle selects ON (the card's input field) */
    referenceUrl: string;
    /** the entry's current rectangle in image pixels (null = unset) */
    value: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    /** a COMMITTED change (a pointer-up on a live rectangle, or
     *  Clear): the rectangle in image pixels, rounded; null = the
     *  box removed */
    onChange: (bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null) => void;
}
/** THE ORBIT FACE (the reshoot orb, 2026-11-15 — the operator: "it
 *  already existed as the output, build it for the input"): the
 *  host's camera-pose orb — a 1:1 port of upstream's
 *  crossview_orbit.js static-pose gizmo (sphere + trained-band
 *  zones + the blue camera handle). The orb writes the SAME seats
 *  the number dials write (orbit/tilt/dolly on the reshoot entry —
 *  ONE TRUTH, two views of one draft): a drag commits
 *  azimuth/elevation, the wheel commits distance. Absent host =
 *  the three number inputs hold (the degrade is graceful). */
export interface OrbitCanvasFaceProps {
    /** the entry's current camera pose (degrees, distance ratio);
     *  absent seats ride the kind's declared defaults */
    value: {
        orbit: number;
        tilt: number;
        dolly: number;
    };
    /** a COMMITTED change (pointer-up after a drag, wheel step,
     *  double-click reset): the pose the entry carries */
    onChange: (pose: {
        orbit: number;
        tilt: number;
        dolly: number;
    }) => void;
}
//# sourceMappingURL=modifierFaces.d.ts.map
