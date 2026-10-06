/** rows.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { type SpecField } from './spec.js';
import { type SquareHost } from './square-provider.js';
/** THE INFO GLYPH (hour 21): the field's declared help prose (the
 *  schema's extra.tooltip) rides a hover (i) beside the label — one
 *  definition for every card; absent prose, no glyph. The text is
 *  aria-carried (the DSH Tooltip is hover-only). */
export declare function infoGlyph(f: SpecField): ReturnType<typeof h> | null;
/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
 *  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
 *  seed in the lane, EVERY run). The dice sits at the key line's
 *  right end, across from the field's name: FILLED pips = random
 *  (a new seed every run), HOLLOW pips = fixed (this exact seed
 *  re-runs). The state DERIVES from the resolved value alone — no
 *  hidden mode to drift; the click writes the value: fixed → -1
 *  (random), random → a minted concrete int (the kit's own mint
 *  law, Math.floor(random * 2147483647)). Typing a number while
 *  random fixes it — the dice unfills by derivation, one source
 *  of truth. The input never paints the sentinel: random shows
 *  the placeholder, never "-1". */
export declare function SeedDice({ random, onToggle }: {
    random: boolean;
    onToggle(): void;
}): ReturnType<typeof h>;
export declare function SpecFieldRow({ f, value, onEdit, square, wireCandidates, envelope }: {
    f: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    square?: SquareHost;
    wireCandidates?: Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** the active variant's [min,max] for THIS knob — forwarded to
     *  the slider atom's track clamp (the dragbar law); absent when
     *  the caller has no variant envelope to offer. */
    envelope?: readonly [number, number] | null;
}): ReturnType<typeof h>;
/** ── THE OVERRIDE PARAMETER LAYER (hour 22 — the operator's law) ──
 *
 * OverlayKnob: ONE generic primitive for every LAYERED parameter
 * face — a sparse overlay over a base over the schema floor (h3's
 * call knobs over run stamps; any card's stages over a flow, its
 * variants over a base). It renders ONE field's control with THE
 * UNSET-FACE LAW (composeUnset, the generic surface): an unset
 * value shows EXACTLY what composes — the base layer's explicit
 * stamp, else the schema's own declared default (the admission gate
 * fills it), else 'inherit' (honest only when no schema truth
 * exists). REPLACE semantics at the write: unset edits serialize
 * ABSENT (undefined, never a sentinel).
 *
 * The field rides the SERVED envelope's walk (SpecField — the same
 * schemastery serialization every other face consumes): type, label,
 * options, default, min/max/step, tooltip — all the schema's truth,
 * never a per-card projection. Cards own only WHAT layers exist and
 * which keys ride them; this row owns the semantics, once. */
export declare function OverlayKnob({ name, field, value, base, ariaLabel, onEdit, }: {
    /** the wire key (the overlay's own spelling) */
    name: string;
    /** the envelope's SpecField under the same key (absent = the honest
     *  fallback face: a labeled free-text row, 'inherit' when nothing
     *  composes — never a crash, never invented facts) */
    field?: SpecField;
    /** the overlay's explicit value (undefined = unset — REPLACE) */
    value: unknown;
    /** the base layer's explicit value under the same key (undefined =
     *  no stamp) */
    base?: unknown;
    /** the control's aria association (defaults to the row label) */
    ariaLabel?: string;
    /** receives the TYPED value or undefined (the unset mark) */
    onEdit(v: number | string | boolean | undefined): void;
}): ReturnType<typeof h>;
//# sourceMappingURL=rows.d.ts.map
