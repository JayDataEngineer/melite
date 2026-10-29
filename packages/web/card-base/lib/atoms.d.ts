/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import type { ReactElement } from 'react';
import { type SpecField } from './spec.ts';
import { type SourceRowProps, type SquareHost } from './square-provider.tsx';
export declare function SourceRow(props: SourceRowProps): ReturnType<typeof h>;
/** THE DSH MENU SELECT for one spec field (the axes idiom,
 *  promoted): owner-held open bit, trigger Button rendered in place
 *  (aria-label = the field label), compact portaled rows, check
 *  selection. axes' AxisMenuSelect delegates here — one seam. */
export declare function SpecMenuSelect(props: {
    label: string;
    value: string;
    rows: ReadonlyArray<{
        id: string;
        label: string;
    }>;
    markers?: Record<string, string>;
    disabled?: boolean;
    title?: string;
    /** THE TRIGGER'S FACE OVERRIDE (k, 2026-11-08): when the seat's
     *  resting face is its own voice (a placeholder / custom marker)
     *  distinct from the menu's selectable rows — the menu row and
     *  the trigger face are two faces, never forced to share one row
     *  label. Absent: the current row's own label (the default face). */
    face?: string;
    onPick(id: string): void;
}): ReactElement;
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
export declare function SpecSliderAtom({ f, value, onEdit, envelope }: {
    f: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    envelope?: readonly [number, number] | null;
}): ReturnType<typeof h>;
/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export declare function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope, hideSquareLabel }: {
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
    /** THE DUPLICATE-LABEL LAW (the 2026-09-15 burn, repeated on the
     *  mod leaf 2026-11-12): when the OWNING surface already renders
     *  the field's caption (the mod leaf's span), the square's own
     *  under-label hides — the SourceRow hideLabel idiom. The aria
     *  name stays (the seat is still named for readers); only the
     *  painted caption goes. Default shows it (the card face's rail
     *  and slot cells ride the square's label as their ONLY caption). */
    hideSquareLabel?: boolean;
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