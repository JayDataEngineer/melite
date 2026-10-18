/** axes.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, Fragment, useEffect, useState } from 'react';
import { activeRecipeId, activeRowId, axisGroups, axisKey, axisPickPatch, composingRows, modelChoices, modelSwitchPatch, rowsFor, titleCaseId } from "./spec.js";
import { chromeCopy } from "./locales/chromeCopy.js";
import css from './card.module.css';
import { SpecMenuSelect } from "./atoms.js";
/** THE DSH MENU SELECT for one spec axis (the zoom.tsx idiom):
 *  owner-held open bit, trigger Button rendered in place (aria-
 *  label = the field label), compact portaled rows, check
 *  selection. The rows carry their full faces (refused rows,
 *  not-downloaded suffixes) as Menu items. */
function AxisMenuSelect(props) {
    // S7h: the idiom's ONE seam — atoms' SpecMenuSelect (same DOM,
    // the S7e receipt stays true).
    return h(SpecMenuSelect, props);
}
/** THE PACK PROMPT (the no-silent-drop law's extension half,
 *  stroke 18): the card's DECLARED extension packs that the engine
 *  cannot see render AS THEMSELVES — marked missing, with the
 *  install verb one click away (the manage door's install_extension;
 *  the host owns the wire). Present and unknown packs render nothing
 *  (nothing to act on; the spec carries their truth for anyone who
 *  reads it). Never a silently absent pack: the run's refusal text
 *  and this prompt name the same id. */
export function PackPrompt({ spec, onInstallPack }) {
    const missing = (spec.packs ?? []).filter((p) => p.present === false);
    if (missing.length === 0 || onInstallPack === undefined)
        return null;
    return h('section', { className: `${css.specGroup} ${css.modelAxes}`, 'data-pack-prompt': '1' }, h('h4', { className: css.specGroupTitle }, 'Extensions'), missing.map((p) => h(PackPromptRow, { key: p.id, id: p.id, onInstallPack })));
}
function PackPromptRow({ id, onInstallPack }) {
    const [st, setSt] = useState('idle');
    // ARGUED RAW SEAT (S6e/S7j, the inline prose-verb class): the
    // install verb rides mid-sentence — DSH's own settings-form types
    // its .reset/.helpButton verbs as raw <button> + module css
    // (ui-primitives settings-form fields.tsx:71-76, 83-90).
    return h('div', { className: css.specHint, 'data-missing-pack': id }, chromeCopy.requiredPackNote({ id }), ' ', h('button', {
        type: 'button',
        className: css.specLinkBtn,
        disabled: st !== 'idle',
        onClick: () => {
            setSt('busy');
            void onInstallPack(id)
                .then((ok) => setSt(ok ? 'queued' : 'failed'))
                .catch(() => setSt('failed'));
        },
    }, st === 'idle' ? chromeCopy.installPackVerb({ id })
        : st === 'busy' ? chromeCopy.requestingWord
            : st === 'queued' ? chromeCopy.installQueuedNote
                : chromeCopy.installFailedNote));
}
export function ModelAxes({ spec, value, user, pickHeld = user, onSet, onPick, onDownloadModel, omitRecipeRow }) {
    const groups = axisGroups(spec);
    // THE RENDER CONTRACT (the schema-contract cure, 2026-10-18): the
    // Model axis exists when the spec declares EITHER a variant matrix
    // OR a family menu. A families-only card (img-to-mesh: three
    // families, no matrix) previously fell through the groups-only
    // guard — the contract held on the wire and died at every face.
    if (groups.length === 0 && (spec.families ?? []).length === 0)
        return null;
    const models = modelChoices(spec);
    // THE FAMILIES BLOCK (no-silent-drop law): the card's boarded
    // families render in the Model rail even when the machine has not
    // downloaded them — visible, marked, PICKABLE (stroke 18: offered
    // is offered; absence prompts, never blocks). Present families
    // not in the matrix (sibling boards) ride as options too.
    const matrixSet = new Set(models);
    const familyRows = (spec.families ?? []).map((f) => ({
        ...f,
        inMatrix: matrixSet.has(f.id),
    }));
    // THE FAMILY FACE MAP: a matrix route that IS a family route
    // (route-id-as-model, the family-routed cards — sfx, mask)
    // renders the family's DECL label, version included; variant and
    // quant routes keep their own faces (the axes carry those).
    const familyFace = new Map();
    for (const f of spec.families ?? []) {
        if (f.label !== undefined && f.label !== '')
            familyFace.set(f.id, f.label);
    }
    const contract = spec.features?.variant_groups ?? {};
    const pick = (row) => {
        onPick(axisPickPatch(spec, row, pickHeld));
    };
    // RULE A — THE RECIPE LAW (operator, 2026-09-18: "All Cards must
    // have Recipies… This *includes* LORAs being setup this way"):
    // a recipe pill stamps its FULL declared payload — mod-owned keys
    // INCLUDED. The lora bag IS the preset; a row whose payload is
    // entirely the bag stamps exactly that. (This AMENDS stroke 38's
    // drop rule, whose letter made lora-only recipes render no pill
    // at all — the exact gap the operator named. The Modifiers menu
    // stays the bag's EDITOR; the recipe is its PRESET. Stroke 38's
    // own law survives where it was actually pointed: the LORA is
    // still never standalone — it rides the mod system's bag, its
    // rows resolved by the mod plane, never a bespoke card field.)
    // the recipe stamp shares the pick-reconcile seam (operator
    // 2026-11-05: the auto-switch is a SHARED feature with recipes)
    const knobStamp = (r) => axisPickPatch(spec, r, pickHeld);
    const pillRows = rowsFor(spec, 'Recipe').filter((r) => Object.keys(knobStamp(r)).length > 0);
    // ── THE NO-FALLBACK LAW (operator, hour 26: "NO. MORE.
    //    FALLBACKS.") ───────────────────────────────────────────────
    // A HELD value that cannot be honored is an ERROR and renders AS
    // ITSELF, refused — NEVER substituted with a plausible neighbor.
    // The lane proof: a stage holding model=anima (not offered by its
    // card's matrix) rendered krea-2 (first <option> painted over the
    // unmatched value) and krea's turbo blurb (the held id matched
    // ANOTHER family's row in the ungated union) while the run shot
    // anima and the engine refused. Every one of those soft landings
    // was a 1:1 lie. Seeding stays legal for ABSENT keys only (the
    // initial-value law); a HELD key renders its own truth.
    const heldModelRaw = value['model'];
    const heldModel = typeof heldModelRaw === 'string' && heldModelRaw !== '' ? heldModelRaw : undefined;
    const knownModel = (m) => models.includes(m) || (spec.families ?? []).some((f) => f.id === m);
    const refusedModel = heldModel !== undefined && !knownModel(heldModel) ? heldModel : undefined;
    // absent alone seeds (spec.model, the declared initial model)
    const shownModel = heldModel ?? (typeof spec.model === 'string' && spec.model !== '' ? spec.model : models[0] ?? '');
    // the HELD family's presence (the download prompt's trigger —
    // stroke 18) + the prompt's own gesture state
    const heldFam = (spec.families ?? []).find((f) => f.id === shownModel && !f.present);
    const [dlState, setDlState] = useState('idle');
    useEffect(() => { setDlState('idle'); }, [shownModel]);
    // rows compose with the axes above (the owner chain — the
    // declared matrix law: the Variant axis is the family's OWN
    // cross-model map, so its offers stay the full served list; the
    // groups below chain by owner)
    const rowsOf = (g, active) => composingRows(spec, g, active);
    // resolve actives down the chain (Variant first, then chained
    // groups): a HELD id that composes renders grounded; a held id
    // that does NOT renders AS ITSELF, refused (never the first row
    // painted over it — that substitution was the 1:1 lie); an ABSENT
    // id alone seeds (activeRowId's model-aware lookup, else the
    // first-declared composing row — the initial-value law).
    const active = {};
    for (const g of groups) {
        const heldRaw = value[axisKey(g)];
        const heldId = typeof heldRaw === 'string' && heldRaw !== '' ? heldRaw : undefined;
        const rows = rowsOf(g, active);
        // THE VOCABULARY GROUND (2026-09-29): the user layer holds the
        // DOOR's stamp (quant 'int8'), the option list speaks catalog
        // ids ('raw__int8') — a held value grounds by EITHER face
        if (heldId !== undefined && rows.some((r) => r.id === heldId || (r.quant ?? '') === heldId)) {
            const grounded = rows.find((r) => r.quant === heldId && r.id !== heldId);
            active[g] = grounded !== undefined ? grounded.id : heldId;
        }
        else if (heldId !== undefined) {
            active[g] = heldId; // refused — rendered as itself below
        }
        else {
            const byRoute = activeRowId(spec, value, g, active);
            active[g] = byRoute ?? (rows.length > 0 ? rows[0].id : '');
        }
    }
    // THE MODEL FIELD (operator 2026-11-05: "MODEL IS OFF ON ITS OWN
    // PLANE — THE ODD THING OUT") — the key line rides the SAME
    // grammar as Variant/Quant/Recipe: every axis names itself, the
    // Model included. The old aria-hidden spacer (the double-Model
    // catch) died with that ruling — a named row, never a ghost.
    // (operator 2026-11-05: "THERE ARE TWO MODELS") — a family count
    // of ONE is a STATED face, not a picker: the static select carries
    // the row's own label (titled); the menu grammar returns the
    // moment a second family boards.
    // THE MODEL ROWS (one face per row, unchanged from the native
    // select — the refused model renders AS ITSELF, the run will
    // shoot it and the engine will refuse; boarded families carry
    // the machine truth in the label, IDs ONLY per stroke 19)
    const modelRows = [
        ...(refusedModel !== undefined
            ? [{ id: refusedModel, label: titleCaseId(refusedModel) + chromeCopy.refusedModelSuffix }]
            : []),
        ...familyRows.flatMap((f) => f.inMatrix ? [] : [{
                id: f.id,
                label: (f.label ?? titleCaseId(f.id)) + (f.present ? '' : chromeCopy.notDownloadedSuffix),
            }]),
        ...models.map((m) => ({ id: m, label: familyFace.get(m) ?? titleCaseId(m) })),
    ];
    const singleModel = modelRows.length === 1 && refusedModel === undefined;
    const modelField = h('label', { className: css.specField }, h('span', { className: css.specFieldKey }, chromeCopy.modelLabel), singleModel
        ? h('div', {
            className: css.specSelect + ' ' + css.specSelectStatic,
            'data-model-static': '1',
            'aria-label': chromeCopy.modelLabel,
            title: modelRows[0].label,
            // THE STATIC FACE RIDES THE SAME CLAMP SPAN (defect 2's last
            // belt-only seat): a long lone model id is the div's raw text
            // node otherwise — .specSelect's block+ellipsis holds only
            // while the cascade orders this sheet after the primitives',
            // the exact "sometimes" spill the span removes.
        }, h('span', { className: css.specSelectText }, modelRows[0].label))
        // THE STALE-VARIANT CURE (operator 2026-09-14): a model
        // switch re-seeds EVERY axis (variant/quant/…) to the new
        // family's rows — keeping turbo while pointing at anima is
        // a compose refusal, never a carried-over default.
        // THE ATOMIC PICK (same marriage law as the variant pick,
        // 2026-10-12): ONE write, whole patch — per-key re-points let
        // the door judge the half-state and strand unlanded keys.
        : h(AxisMenuSelect, {
            label: chromeCopy.modelLabel,
            value: shownModel,
            rows: modelRows,
            markers: refusedModel !== undefined ? { 'data-refused': 'model' } : undefined,
            // held rides (the override law's model face): the switch
            // lands the seeded variant's envelope keys on the new
            // choice's truth / nulls the departing vocabulary
            onPick: (m) => { onPick(modelSwitchPatch(spec, m, pickHeld)); },
        }));
    // ONE AXIS' FIELD (the groups.map body, extracted so the pair
    // row seats the Variant axis beside the Model — one function,
    // two seats, no second implementation).
    const axisField = (g) => {
        const rows = rowsOf(g, active);
        const heldRaw = value[axisKey(g)];
        const heldId = typeof heldRaw === 'string' && heldRaw !== '' ? heldRaw : undefined;
        const refusedId = heldId !== undefined && !rows.some((r) => r.id === heldId || (r.quant ?? '') === heldId) ? heldId : undefined;
        if (rows.length === 0 && refusedId === undefined)
            return null;
        const label = contract[g]?.label ?? titleCaseId(g);
        // NO ?? '' (the assigned-every-path proof): the loop above
        // writes active[g] on ALL three arms (grounded / refused /
        // seeded) for every group before this map runs — the right
        // side could never fire.
        // the refused coord renders AS ITSELF (never another family's
        // row face) — the run refuses it, so does the visual; the
        // grounded rows stay one pick away as repair
        const axisRows = [
            ...(refusedId !== undefined
                ? [{ id: refusedId, label: chromeCopy.invalidAxisNote({ id: titleCaseId(refusedId), axis: label.toLowerCase(), holder: titleCaseId(heldModel ?? shownModel) }) }]
                : []),
            ...rows.map((v) => ({
                id: v.id,
                label: titleCaseId(v.label) + (typeof v.hint === 'string' && v.hint !== '' ? ` — ${v.hint}` : ''),
            })),
        ];
        // THE REPAIR VERB (axis-unification P0#3, audit
        // dev_docs/audits/journey/axis-unification-2026-11-06.md item 3):
        // the refused coord rendered AS ITSELF with the grounded rows
        // "one pick away" — a manual fix for an automatic break (the
        // pre-wave-31 rename 376c13a4c left every saved doc carrying the
        // dead spelling — quant "int8" under anima — and nothing
        // re-stamps it). The one-pick repair becomes A VERB: the button
        // writes the NEAREST CURRENT CELL — the first composing row, the
        // same face the seed law lands on (the known-cells list the
        // door's voice computes, derived here at the seat) — through the
        // ATOMIC PICK (axisPickPatch: the row's stamp + the below-axis
        // reseed), so the composed doc passes the mirror judge.
        // ARGUED RAW SEAT (S6e/S7j, the inline prose-verb class): DSH's
        // own settings-form types its .reset/.helpButton verbs as raw
        // <button> + module css (ui-primitives settings-form
        // fields.tsx:71-76, 83-90).
        const nearest = rows[0];
        // the repair hint sits OUTSIDE the field label (a sibling, the
        // download-prompt's seat): a control inside a <label> takes the
        // label's whole text as its accessible name — the verb must
        // speak for itself.
        return h(Fragment, { key: g }, h('label', { className: css.specField }, h('span', { className: css.specFieldKey }, label), h(AxisMenuSelect, {
            label,
            value: active[g],
            rows: axisRows,
            markers: { 'data-axis': g, ...(refusedId !== undefined ? { 'data-refused': g } : {}) },
            onPick: (id) => {
                const row = rows.find((v) => v.id === id);
                if (row !== undefined)
                    pick(row);
            },
        })), refusedId !== undefined && nearest !== undefined
            ? h('div', { className: css.specHint, 'data-axis-repair': g }, chromeCopy.axisRepairNote, ' ', h('button', {
                type: 'button',
                className: css.specLinkBtn,
                'data-axis-repair-btn': g,
                onClick: () => { pick(nearest); },
            }, chromeCopy.axisRepairVerb({ face: titleCaseId(nearest.label) })))
            : null);
    };
    // THE MODEL+VARIANT PAIR (the pass-along law, enforced): Model
    // and Variant ride ONE row — a dedicated 1fr 1fr pair that never
    // wraps (the auto-fit grid below stacks them in narrow panels).
    // Remaining axes (Quant, …) keep the grid's flow underneath. No
    // Variant axis, or one rendering nothing → the Model rides alone,
    // exactly as before.
    const variantAxis = groups.includes('Variant') ? 'Variant' : undefined;
    const variantField = variantAxis !== undefined ? axisField(variantAxis) : null;
    const restGroups = variantAxis !== undefined ? groups.filter((g) => g !== variantAxis) : groups;
    return h('section', { className: `${css.specGroup} ${css.modelAxes}`, 'data-model-axes': '1' }, h('h4', { className: css.specGroupTitle }, chromeCopy.modelLabel), variantField !== null
        ? h('div', { className: css.axesPair, 'data-axes-pair': 'Model+Variant' }, modelField, variantField)
        : modelField, 
    // THE DOWNLOAD PROMPT (stroke 18): the held model is boarded
    // but its weights are not on the machine — ask the user, never
    // block the pick. The button is the gesture; the manage door
    // queues the provision. ARGUED RAW SEAT (S6e/S7j, the inline
    // prose-verb class): a verb inside a sentence — DSH's own
    // settings-form types the .reset/.helpButton verbs as raw
    // <button> + module css (ui-primitives settings-form
    // fields.tsx:71-76, 83-90), the reference idiom this seat holds.
    heldFam !== undefined && onDownloadModel !== undefined
        ? h('div', { className: css.specHint, 'data-download-prompt': heldFam.id }, chromeCopy.offeredNotDownloadedNote({ face: titleCaseId(heldFam.id) }), ' ', h('button', {
            type: 'button',
            className: css.specLinkBtn,
            disabled: dlState !== 'idle',
            onClick: () => {
                setDlState('busy');
                void onDownloadModel(heldFam.id)
                    .then((ok) => setDlState(ok ? 'queued' : 'failed'))
                    .catch(() => setDlState('failed'));
            },
        }, dlState === 'idle' ? chromeCopy.downloadVerb({ face: heldFam.label ?? titleCaseId(heldFam.id) })
            : dlState === 'busy' ? chromeCopy.requestingWord
                : dlState === 'queued' ? chromeCopy.downloadQueuedNote
                    : chromeCopy.downloadFailedNote))
        : null, 
    // the axes below the pair (Quant, …) keep the grid's flow.
    restGroups.map((g) => axisField(g)), h(RecipePills, { spec, onPick, values: value, omitRow: omitRecipeRow }));
}
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
export function RecipePills({ spec, onPick, values, omitRow }) {
    const pillRows = rowsFor(spec, 'Recipe')
        .filter((r) => Object.keys(axisPickPatch(spec, r)).length > 0)
        .filter((r) => omitRow === undefined || !omitRow(r));
    if (pillRows.length === 0)
        return null;
    const active = values !== undefined ? activeRecipeId(spec, values) : undefined;
    const pick = (id) => {
        const row = pillRows.find((r) => r.id === id);
        if (row === undefined)
            return;
        // the pick-reconcile seam (2026-11-05): the pill's pick clamps
        // held out-of-envelope knobs too — the filter above stays
        // stamp-only (reconciled keys never create a pill from nothing)
        onPick(axisPickPatch(spec, row, values));
    };
    const recipeRows = [
        { id: '', label: active === undefined ? chromeCopy.recipePlaceholder : chromeCopy.recipeCustomFace },
        ...pillRows.map((r) => ({
            id: r.id,
            label: titleCaseId(r.label) + (typeof r.hint === 'string' && r.hint !== '' ? ` — ${r.hint}` : ''),
        })),
    ];
    return h('label', { className: css.specField }, h('span', { className: css.specFieldKey }, chromeCopy.recipeLabel), h(AxisMenuSelect, {
        label: chromeCopy.recipeLabel,
        value: active ?? '',
        rows: recipeRows,
        markers: { 'data-recipe-select': '1' },
        onPick: (id) => { if (id !== '')
            pick(id); },
    }));
}
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
//# sourceMappingURL=axes.js.map