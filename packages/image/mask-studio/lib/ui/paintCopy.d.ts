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
export declare const paintCopy: {
    /** The brush-size slider's visible label. */
    readonly brushLabel: "Brush";
    /** The brush-size slider's accessible name. */
    readonly brushSizeAria: "Brush size";
    /** The paint hint once strokes landed (alpha = the mask). */
    readonly strokesHint: "strokes paint the mask (alpha = the mask)";
    /** The paint hint before the first stroke. */
    readonly paintHint: "drag on the image to paint the mask";
    /** The paint toolbar's clear action. */
    readonly clearAction: "Clear";
    /** The bbox size readout in view pixels. */
    readonly bboxSize: (p: {
        w: number;
        h: number;
    }) => string;
    /** The bbox hint before a box is drawn. */
    readonly bboxHint: "drag on the image to scope the selection";
    /** The bbox toolbar's clear action. */
    readonly clearBoxAction: "Clear box";
};
//# sourceMappingURL=paintCopy.d.ts.map
