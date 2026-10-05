/**
 * mods.tsx — THE MOD SYSTEM, CORE (the old SubcardGrid, ported 1:1 —
 * and moved into the base package 2026-09-12 after the operator's
 * law: "MOD SYSTEM IS CORE. NEVER HARDCODED. The LORAS should not be
 * on cards, the MOD SYSTEM SHOULD").
 *
 * The laws this section enforces:
 *  - mods NEVER ride the card's param form. The estate serves the
 *    OPEN kind vocabulary (features.modifiers); the constructor
 *    (CardForm) renders THIS section itself and excludes every
 *    mod-owned name from the flat groups — no surface wires it, no
 *    surface can forget it (the construction law, same as the
 *    square).
 *  - THE WIRE IS THE STORAGE: params[param_key] holds the bag; the
 *    same bag runs and the agent reads/writes it.
 *  - commits persist immediately (the old onSaveParams law — never
 *    deferred to Run): onEdit rides the caller's values map AND
 *    onPatch (when present) persists to the domain on the spot.
 *  - apply order = array order; the drag rewrites the bag.
 *  - THREE kind shapes, all first-class (the leaf switches on the
 *    SERVED entry mode, never the kind name):
 *      OPTION kinds (lora): served catalog rows + strength; the
 *        entry is { id, strength } — the row's own defaults seed the
 *        strength.
 *      HYBRID kinds (controlnet): served catalog rows AND entry
 *        fields; the entry is the bag element keyed by its option_key
 *        (type) — the leaf stamps the row's resolved facts (model +
 *        preprocessor) onto new entries so the run record carries the
 *        retired wire shape; the lane re-validates them, never trusts
 *        them. Pack-level scalars (the strength floor) render as the
 *        section's own rows above the tiles.
 *      OPTION kinds (lora): served catalog rows + strength; the
 *        entry is { id, strength } — the row's own defaults seed the
 *        strength.
 *      FIELD kinds (mask): the kind's own spec fields (image squares,
 *        selects, sliders); the entry IS the params object. The leaf
 *        renders kind.fields through the same constructor atoms —
 *        the fields NEVER render flat on the card form.
 */
import { createElement as h } from 'react';
import type { ReactElement } from 'react';
import { type ModifierKind, type SpecValues } from './spec.js';
export type { PaintCanvasFaceProps, BboxCanvasFaceProps } from '@melite/contracts';
import type { BboxCanvasFaceProps, PaintCanvasFaceProps } from '@melite/contracts';
export type BboxFaceComponent = (props: BboxCanvasFaceProps) => ReactElement;
/** THE PAINT FACE (paint-leaf-canvas.md, embedded stroke 95): the
 *  host's brush canvas — a component, not an import (card-base
 *  stays atom-generic; the custom face is the CARD's UI, delivered
 *  by the client plane). Absent host = the canvas never renders
 *  (the square is the contract; the degrade is graceful by
 *  design). */
export type PaintFaceComponent = (props: PaintCanvasFaceProps) => ReactElement;
export interface ModifiersSectionProps {
    kinds: ModifierKind[];
    values: SpecValues;
    onEdit: (name: string, v: unknown) => void;
    /** rail-seated field names (the stroke-32 mod-owned slot law): a
     *  mod field seated in the input rail never renders in the leaf —
     *  the signature is the seat, the brick keeps its knobs. */
    railSeated?: ReadonlySet<string>;
    /** immediate persistence (the onSaveParams law) — optional: an
     *  add-drill without a stage commits through its values map. */
    onPatch?: (patch: Record<string, unknown>) => void;
    /** THE PAINT FACE (leaf_face kinds): the host's brush canvas —
     *  EMBEDDED at the top of the leaf popup. Together with
     *  paintReference — absent either = no canvas (the square
     *  holds). */
    paintFace?: PaintFaceComponent;
    /** THE BBOX FACE (stroke 78, embedded stroke 95): the host's
     *  selection canvas for bbox-canvas kinds — EMBEDDED at the top
     *  of the leaf popup; shares paintReference (the card's ONE
     *  image field is both faces' reference). */
    bboxFace?: BboxFaceComponent;
    /** the card-level image field whose value is the leaf faces'
     *  reference — the brush paints OVER it, the rectangle selects
     *  ON it (mask: 'input_image'). */
    paintReference?: string;
    /** The host's media source (threaded from the constructor's wire)
     *  — the leaf's image inputs pick from the library like a card's. */
    loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{
        url: string;
        name: string;
    }>>;
}
export declare function ModifiersSection(props: ModifiersSectionProps): ReturnType<typeof h> | null;
//# sourceMappingURL=mods.d.ts.map
