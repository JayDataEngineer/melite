/** axes.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import type { ReactElement } from 'react';
import { type FormSpecDoc, type SpecValues, type FormVariantRow } from './spec.js';
/** THE PACK PROMPT (the no-silent-drop law's extension half,
 *  stroke 18): the card's DECLARED extension packs that the engine
 *  cannot see render AS THEMSELVES — marked missing, with the
 *  install verb one click away (the manage door's install_extension;
 *  the host owns the wire). Present and unknown packs render nothing
 *  (nothing to act on; the spec carries their truth for anyone who
 *  reads it). Never a silently absent pack: the run's refusal text
 *  and this prompt name the same id. */
export declare function PackPrompt({ spec, onInstallPack }: {
    spec: FormSpecDoc;
    onInstallPack?: (id: string) => Promise<boolean>;
}): ReturnType<typeof h> | null;
export declare function ModelAxes({ spec, value, user, pickHeld, onSet, onPick, onDownloadModel, omitRecipeRow }: {
    spec: FormSpecDoc;
    value: SpecValues;
    /** The USER layer (the pick-reconcile law, 2026-11-05): the pick
     *  clamps HELD out-of-envelope knobs into the picked row's
     *  envelope — the resolved layer is never stamped. */
    user?: SpecValues;
    /** The SHOWN doc the door composes (base under user — the
     *  composability cure, 2026-11-06: the pick's departed-key unstate
     *  and envelope reconcile judge the truth the RUN merges, never
     *  the user layer alone. A base-held departed key (the stage row's
     *  saved params) resurrects through resolveValueLayered when the
     *  user's null-write lands — the patch must derive its unstated
     *  keys against base+user or the swap bricks behind the gate. */
    pickHeld?: SpecValues;
    onSet(name: string, v: unknown): void;
    /** THE ATOMIC PICK, REQUIRED BY CONSTRUCTION (2026-10-12, the
     *  operator's live break: switch krea-2 turbo→raw refused 'stated
     *  cfg 3.5 is OUTSIDE the route envelope for variant "turbo"').
     *  A pick is a MARRIAGE — the variant key, its defaults, and the
     *  below-axis re-seeds are ONE contract landing as ONE write.
     *  Per-key writes judge the defaults against the STILL-HELD old
     *  variant and the door refuses the half-state. There is NO
     *  per-key fallback: a host that cannot write a whole patch
     *  cannot offer picks at all — the compiler refuses it here,
     *  not the run door later. */
    onPick: (patch: SpecValues) => void;
    /** THE ROW GATE (2026-10-16, the Final Cut brick — audit
     *  0be61df8 F1): forwarded to RecipePills; a derived lane that
     *  cannot honor a recipe row's stamp stops offering it. The
     *  D8 field gate alone left the pills live. */
    omitRecipeRow?: (row: FormVariantRow) => boolean;
    /** THE RECIPE'S SEAT (stroke 20, the operator's placement law):
     *  when the card owns a recipe field AND the matrix serves, the
     *  field renders HERE — under Model/Variant/Quant — never at the
     *  bottom of the params list. One key, one seat; the options stay
     *  the card's own (the recipe-yield law above). */
    /** THE DOWNLOAD PROMPT's arm (stroke 18, the operator's law: a
     *  boarded model is OFFERED — absence prompts the user to
     *  download, never blocks the pick): when the HELD model is a
     *  boarded family whose weights are not on the machine, the rail
     *  renders the prompt; the click fires this (the host owns the
     *  manage wire — postManageAction provision_model). Without the
     *  arm the mark still renders (hosts without the manage door
     *  never show a dead button). Returns whether the provision
     *  request queued. */
    onDownloadModel?: (id: string) => Promise<boolean>;
}): ReturnType<typeof h> | null;
/** THE FAMILY RECIPE DROPDOWN (Rule A -- the recipe law; the
 * operator's order, 2026-09-18: "RECIPES AREN'T EVEN A DROPDOWN"):
 * the family's preset macros as ONE SELECT beside the axes -- the
 * same shape every axis rides, never a list of link-buttons. The
 * pick writes the row's FULL stamp (axisPickPatch -- mod-owned keys
 * included, the Rule A amendment); the SELECTION derives from the
 * ONE truth (activeRecipeId -- the row whose stamp the user layer
 * holds; no recipe key persists, nothing goes stale when the rail
 * moves). Stamp-less rows (the family `default`) render nothing: a
 * row that writes nothing is a dead option. A hand-edited layer
 * (no stamp-for-stamp match) shows the placeholder -- the form
 * never lies that a recipe is active.
 *
 * THE REUSE LAW: extracted so EVERY model surface seats the same
 * dropdown -- CardForm under the axes, a studio beside its model
 * route. Never a second implementation. */
export declare function RecipePills({ spec, onPick, values, omitRow }: {
    spec: FormSpecDoc;
    /** THE ATOMIC PICK LAW (2026-09-29, the fourth seat): the row's
     * FULL stamp lands as ONE write — the per-key onSet loop was the
     * recipe half-switch (width here, height a beat later), the same
     * crime the drill's law killed at the bench wire. REQUIRED: a
     * host that cannot write whole patches does not mount. */
    onPick: (patch: Record<string, unknown>) => void;
    /** the USER layer (the selection derives from it -- the one
     * truth; absent = always the placeholder). */
    values?: SpecValues;
    /** THE ROW GATE (2026-10-16, journey audit 0be61df8 F1 — the
     * Final Cut brick): a host whose derived lane cannot honor a
     * row's stamp stops OFFERING that row. The D8 cure gated FIELDS
     * only — the pills stayed ungated, so a pick could land keys the
     * compose refuses ('h3_window(t4r): unsanctioned inject keys:
     * sr_switch') and every later run bricks. Judged on the row's
     * own stamp, never a hand id list: a future row carrying the
     * family-dead keys gates itself. */
    omitRow?: (row: FormVariantRow) => boolean;
}): ReactElement | null;
/** THE CARD FORM (the constructor's surface half) — the emission's
 *  fields walked off the schema envelope, grouped, visible-when
 *  honored; the RESOLVED value derives per render (resolveValue —
 *  the engine's compose cascade mirrored), edits are set/unset ops
 *  over the USER layer (the settings law: presence IS the override
 *  mark, the reset chip removes it). Each field renders through the
 *  claimed atom for its emitted type when the caller passes one;
 *  the base's built-in atom is the default.
 *
 *  THE CONSTRUCTION LAW IS NOT OPTIONAL (operator, 2026-09-12: "the
 *  img-to-mesh input component — you are not using it around — you
 *  are hardcoding"): an emitted image/file/mesh input constructs THE ONE
 *  SQUARE AUTOMATICALLY, in EVERY surface. The constructor OWNS the
 *  square provider — no call site wires it, no call site can forget
 *  it. The caller hands only the WIRE (picker candidates), never the
 *  component; a caller that passes its own `square` fn overrides (the
 *  host-claim seam), but the default is the constructor's own. */
/** ONE SPEC FIELD ROW (hour 15, stroke C): the label chrome (key,
 *  required star, hint) around the atom — CardForm's own row, opened
 *  to rail sections that render served fields outside a whole form
 *  (mask's TuneSection). The claim seam stays CardForm's; this row
 *  takes the resolved atom inputs. */
//# sourceMappingURL=axes.d.ts.map
