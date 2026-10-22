/**
 * form.tsx — @melite/card-base: THE CONSTRUCTOR (the godfile
 * split, hour 15: the seams live in their own files now —
 * use-form-spec.ts, square-provider.tsx, atoms.tsx, rows.tsx,
 * spec-panel.tsx, axes.tsx — this file is the CardForm
 * composition + the stable re-export surface).
 *
 * THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
 * construct the card ui should see that the card package emits an
 * image input, then constructs the input component automatically"):
 * the base reads the card package's EMISSION — the served form-spec
 * (the schema envelope, declared input/output edges, mod kinds) —
 * and constructs the surface. The resolved value derives per render
 * (resolveValue — the engine's compose cascade mirrored); every
 * image/file/mesh field gets THE ONE square (square.tsx) with the
 * three source verbs; no card ever hand-rolls an input component.
 *
 * THE SEAM (slots.ts): each field renders through the field-atom seam
 * keyed by its emitted wire type — the caller may pass claimed atoms
 * (the composition consults the slot machinery and hands them in);
 * the base's built-in atom is the default (the ui-tool built-ins
 * pattern). A whole-form takeover replaces CardForm itself.
 *
 * DSH NATIVE: Menu/Input/Switch/SegmentedTabs from the installed
 * ui-primitives; the atoms the primitives set lacks (select, slider,
 * textarea) are layout-only module CSS over native elements, every
 * color an inherited --dsw-alias-* token (the package's documented
 * pattern).
 */
import { createElement as h } from 'react';
import { type BboxFaceComponent, type PaintFaceComponent } from './mods.tsx';
import { type FormSpecDoc, type FormVariantRow, type SpecField, type SpecValues } from './spec.js';
import { type FieldAtomClaim, type SquareHost, type SquareWire } from './square-provider.tsx';
export { useFormSpec } from './use-form-spec.js';
export { useSquareProvider, type SquareHost, type SquareWire, type FieldAtomClaim, type SourceRowProps } from './square-provider.tsx';
export { SourceRow, TriStateAtom, SpecSliderAtom, SpecAtom } from './atoms.tsx';
export { SeedDice, SpecFieldRow, OverlayKnob } from './rows.tsx';
export { SpecPanel, panelSectionsOf, type SpecPanelRow, type SpecPanelSection } from './spec-panel.tsx';
export { PackPrompt, ModelAxes, RecipePills } from './axes.tsx';
/** THE CARD FORM (the constructor's surface half) — the emission's
 *  fields walked off the schema envelope, grouped, visible-when
 *  honored; the RESOLVED value derives per render (resolveValue —
 *  the engine's compose cascade mirrored), edits are set/unset ops
 *  over the USER layer (the settings law: presence IS the override
 *  mark, the reset chip removes it). The constructor OWNS the square
 *  provider (no call site wires it, no call site can forget it). */
export declare function CardForm({ spec, user, base, onSet, onPick, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference, omitInputRail, omitFields, omitRecipeRow, mutedViolations }: {
    /** the WHOLE emission (the schema envelope + model/variants) —
     *  REQUIRED now: the fields, the axes, and the mod param rows all
     *  derive from THIS (useFormSpec fetches it). */
    spec: FormSpecDoc;
    /** THE USER LAYER (the settings model): the stage's explicit
     *  params. A key's PRESENCE is the override mark — the resolved
     *  value derives (resolveValue: schema defaults <- model defaults
     *  <- card recipe <- user), never a seeded values map. */
    user: SpecValues;
    /** THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): the stage
     *  row's `resolved` map — prepareCardParams' own stamps, served by
     *  the drafts doors. Layers under the user (presence still wins)
     *  and over the client's guesses — one resolver, served to the
     *  visual. Absent = the registry-less lane derive. */
    base?: SpecValues;
    onSet(name: string, v: unknown): void;
    /** THE ATOMIC PICK, REQUIRED (the marriage law — see
     *  ModelAxes.onPick): a pick lands as ONE multi-key write. No
     *  per-key fallback exists by construction. */
    onPick: (patch: Record<string, unknown>) => void;
    /** Remove an override (the reset path): the host patches the key
     *  out of the user layer; the row re-derives to its base. */
    onUnset?(name: string): void;
    /** the picker wire (the other stages' latest outputs) — data, never
     *  components. The constructor builds the provider from THIS. */
    wire?: SquareWire;
    /** THE INPUT-RAIL OMIT (operator 2026-11-05: "GET RID OF THIS —
     *  TOO COMPLEX FOR LAYER A, LEAVE IT TO LAYER B AND THE
     *  TIMELINE"): a studio whose media inputs ride the timeline's
     *  own surfaces (the keyframe lane, the D-M-E audio lanes, the
     *  clips row) suppresses the Inputs rail — the global panel
     *  carries knobs and axes only. The rail stays DEFAULT: plain
     *  cards whose form IS the input surface render it untouched. */
    omitInputRail?: boolean;
    /** the host's per-field admission filter (2026-11-06, the
     *  family-reseat cure): true REMOVES the field from every render
     *  — the family rail's answer for knobs the doc's derived shape
     *  cannot honor (h3's t4r lane owns no post chain). Family-
     *  agnostic by design: card-base never derives a family; the
     *  host's predicate IS the law. */
    omitFields?: (name: string) => boolean;
    /** the host's recipe-row admission filter (2026-10-16, the Final
     *  Cut brick — audit 0be61df8 F1): true REMOVES the recipe row
     *  from the pills. The field gate's row-level sibling — a recipe
     *  whose stamp the derived lane cannot compose is never offered,
     *  so a pick can never brick the card. Family-agnostic: the
     *  host's predicate IS the law. */
    omitRecipeRow?: (row: FormVariantRow) => boolean;
    /** THE ONE-VOICE LAW (E2-12, operator 2026-11-09: "I SEE IT 3
     *  TIMES"): compose-violation messages the host already voices on
     *  an actionable face (the drill's error strip with its unstamp —
     *  the drill parses its own gate template and passes the message).
     *  The banner skips muted messages; a fully-muted banner hides —
     *  one refusal paints once, on the seat that can act. Absent =
     *  the banner voices everything (the bench face's only voice). */
    mutedViolations?: readonly string[];
    /** the host's square override (the claim seam). Rare. */
    square?: (f: SpecField) => SquareHost | undefined;
    /** the field-atom seam's claims, keyed by emitted wire type —
     *  a card's takeover of its own atoms (undefined = built-ins). */
    atoms?: Record<string, FieldAtomClaim>;
    /** immediate persistence for mod commits (the onSaveParams law).
     *  Absent (the add drill): commits ride the user map. */
    onPatch?: (patch: Record<string, unknown>) => void;
    /** THE PAINT FACE (paint-leaf-canvas.md): the host's brush modal
     *  for leaf_face kinds. Absent host = no verb (the square holds).
     *  Threaded verbatim into the mod section. */
    paintFace?: PaintFaceComponent;
    /** THE BBOX FACE (stroke 78): the host's selection modal for
     *  bbox-canvas kinds. Absent host = the four inputs hold. */
    bboxFace?: BboxFaceComponent;
    /** the card-level image field feeding the brush reference
     *  (mask: 'input_image'). Absent = no verb. */
    paintReference?: string;
    /** THE DOWNLOAD PROMPT's arm (stroke 18): a boarded-but-absent
     *  model prompts download; the host supplies the manage wire. See
     *  ModelAxes. */
    onDownloadModel?: (id: string) => Promise<boolean>;
    /** THE EXTENSION INSTALL ARM (stroke 18): a missing declared pack
     *  prompts install; the host supplies the manage wire. See
     *  PackPrompt. */
    onInstallPack?: (id: string) => Promise<boolean>;
}): ReturnType<typeof h>;
//# sourceMappingURL=form.d.ts.map