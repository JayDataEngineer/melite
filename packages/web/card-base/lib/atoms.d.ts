/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { type SpecField } from './spec.ts';
import { type SourceRowProps, type SquareHost } from './square-provider.tsx';
export declare function SourceRow(props: SourceRowProps): ReturnType<typeof h>;
/** THE TRI-STATE ATOM (hour 15, stroke C): inherit / on / off —
 *  promoted from h3's studio-local TriControl (same semantics, same
 *  option order). Serves schema-bound fields of type 'tri' AND the
 *  standalone rail rows that hand-rolled the select before. */
export declare function TriStateAtom({ label, value, onEdit, name, disabled }: {
    label: string;
    value: boolean | undefined;
    onEdit(name: string, v: unknown): void;
    name: string;
    disabled?: boolean;
}): ReturnType<typeof h>;
/** THE SETTLE LAW for slider atoms (hour 15, stroke C — grown from
 *  mask-studio's draft absorber, 2026-08-10): a drag fires input
 *  60×/sec; if every step wrote to the card, updateStageParams →
 *  _recomputeKeys would hash multi-MB paint data 60×/sec and freeze
 *  the editor. The atom shows the drag locally and persists ONCE on
 *  settle (the change event = release / keyboard step). External
 *  writes (agent, revive) re-sync the display when the backing
 *  value actually moves.
 *
 *  THE VARIANT-ENVELOPE CLAMP (the dragbar law, 2026-10-13): the
 *  track clamps to the ACTIVE variant's declared envelope (min and
 *  max intersected with the field's own bounds) — an
 *  out-of-envelope value cannot be dragged or saved from the form
 *  while the wire gate stays loud for API authors. A HELD value
 *  outside the envelope renders AS ITSELF, refused (the
 *  no-fallback law): the track never paints a clamped neighbor over
 *  an impossible contract. @param f the knob's field row.
 *  @param value the resolved display value.
 *  @param onEdit the settle seam.
 *  @param envelope the active variant's [min,max] for THIS knob,
 *  null when the variant declares none. */
export declare function SpecSliderAtom({ f, value, onEdit, envelope }: {
    f: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    envelope?: readonly [number, number] | null;
}): ReturnType<typeof h>;
/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export declare function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope }: {
    f: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    square?: SquareHost;
    /** the wire's flow rows (the image_list slots source From flow too) */
    wireCandidates?: Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** the active variant's [min,max] for THIS knob — the slider
     *  track clamps to it (the dragbar law); absent when the caller
     *  has no variant envelope to offer. */
    envelope?: readonly [number, number] | null;
    /** the row's placeholder override (the seed dice's random face:
     *  the sentinel never paints, the placeholder explains the state) */
    placeholder?: string;
    /** THE SELECT'S INHERIT GHOST (2026-09-18, the operator's ruling:
     *  "atoms get ONE semantic addition — select inherit-ghost"): when
     *  defined, a leading <option value=''> renders with this label —
     *  the unset mark for undefined-able selects. '' is the bind target
     *  for undefined (never the browser's painted-first-option lie).
     *  The call site authors the label ('inherit', or the richer
     *  '← on' when the inherited value is known). */
    ghost?: string;
}): ReturnType<typeof h>;
/** THE MODEL AXES (the pass-along law, 2026-09-12): the Model select
 *  plus ONE SELECT PER SERVED AXIS GROUP — Variant, Quant, Recipe,
 *  Precision, … the declaration's whole vocabulary, NEVER a hardcoded
 *  list (the operator's lane proof caught the hardcoded Quant-only
 *  list dropping seedvr2's and qwen's other axes). Order: the door's
 *  variant_groups contract, else first-seen. Chain: an axis' options
 *  are the rows composing with the axes above (the row's `owner`).
 *  Each pick applies the row's defaults overlay through onEdit — the
 *  values (model + every axis key + overlay keys) ride the caller's
 *  map and pass along at Run. Renders nothing when the spec declares
 *  no matrix. */
//# sourceMappingURL=atoms.d.ts.map