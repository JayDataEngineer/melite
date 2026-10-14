/**
 * paintCopy.ts — THE PAINT LEAF COPY DICTIONARY. Client UI copy is locale-owned —
 * presentation code owns no copy literals; it consumes them here through the typed
 * seat. A second locale plugs into this dictionary without touching a single leaf
 * component.
 *
 * THE BOUND: static user-visible FACES of the paint + bbox leaf canvases live here
 * (labels, hints, aria names, clear actions, the bbox size readout). Canvas DATA —
 * the stroke ink (paintInk.ts), data-testid hooks, classNames, and numeric control
 * seats (min/max/step) — rides the components, never this dictionary.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const paintCopy = {
    /** The brush-size slider's visible label. */
    brushLabel: "Brush",
    /** The brush-size slider's accessible name. */
    brushSizeAria: "Brush size",
    /** The paint hint once strokes landed (alpha = the mask). */
    strokesHint: "strokes paint the mask (alpha = the mask)",
    /** The paint hint before the first stroke. */
    paintHint: "drag on the image to paint the mask",
    /** The paint toolbar's clear action. */
    clearAction: "Clear",
    /** The bbox size readout in view pixels. */
    bboxSize: (p) => `box ${Math.round(p.w)}×${Math.round(p.h)} (view px)`,
    /** The bbox hint before a box is drawn. */
    bboxHint: "drag on the image to scope the selection",
    /** The bbox toolbar's clear action. */
    clearBoxAction: "Clear box",
};
//# sourceMappingURL=paintCopy.js.map
