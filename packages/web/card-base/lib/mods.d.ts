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
import { type ModifierKind, type SpecField, type SpecValues } from './spec.js';
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
    /** THE FLOW CANDIDATES (E2-11a — the region-mask picker law): the
     *  host bench's other stages' latest artifacts, threaded from the
     *  constructor's wire. The leaf's From-flow picker serves THESE —
     *  a structurally empty list ("nothing to pick yet" beside a run
     *  mask node) is the shipped burn this seam closes. */
    candidates?: Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** the per-field narrowing (the edge law at the host's seat — the
     *  drill's own candidatesFor); absent = the raw rows. */
    candidatesFor?: (f: SpecField) => Array<{
        id: string;
        label: string;
        url: string;
    }>;
}
/** THE LEAF SEAT — the opened entry's identity, frozen at open
 *  time. `index` anchors the nearest-of-duplicates tier only; the
 *  commit re-derives the entry from the LIVE bag (the next frame
 *  re-serves the whole bag as fresh objects — streamBenchFrames
 *  JSON round-trips it — so an index alone orphans every
 *  concurrent hand into a ghost). */
export interface LeafSeat {
    mode: 'create' | 'edit';
    kind: ModifierKind;
    index: number;
    /** tier 1: the opened object itself (the intra-frame fast path). */
    ref?: Record<string, unknown>;
    /** tier 2: the catalog key (optionKeyOf — the lora name, the
     *  row id) with its field name; survives other hands' scalar
     *  edits and seats above/below the opened row. */
    key?: {
        field: string;
        value: string;
    };
    /** tier 3: the entry's serialized content (field kinds, whose
     *  every field is a dial — a fresh parse re-serves equal
     *  content in new objects). Also the tier-2 confirm's
     *  ride-through snapshot. */
    content?: string;
    /** tier 2 confirm: the keys the leaf itself displays (its
     *  dials). Owned keys may diverge freely (last-writer-wins —
     *  the modal owns them); every OTHER key is a ride-through and
     *  must still match the open-time snapshot or the candidate is
     *  a stranger (F1/F2/G1). */
    owned?: ReadonlySet<string>;
}
/** THE SEAT RESOLVER — the opened entry in the LIVE bag, by
 *  identity, never by a stale index. Tier 1: the reference itself.
 *  Tier 2: the catalog key, confirmed on ride-through fields (the
 *  seat NEAREST the opened index — two same-key rows both
 *  confirming, the nearer seat wins, never the first walk match,
 *  and a farther later duplicate never regresses the best). Tier
 *  3: full content (a fresh parse re-serves equal content in new
 *  objects — the field-kind shape; also the keyless repair path).
 *  null = the entry is GONE — the call site refuses loud (save) or
 *  closes satisfied (delete) and the drafts survive. */
export declare function resolveSeatEntry(entries: ReadonlyArray<Record<string, unknown>>, seat: LeafSeat): {
    entry: Record<string, unknown>;
    index: number;
} | null;
export declare function ModifiersSection(props: ModifiersSectionProps): ReturnType<typeof h> | null;
//# sourceMappingURL=mods.d.ts.map
