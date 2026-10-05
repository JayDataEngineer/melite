/** axes.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, useEffect, useState } from 'react';
import { activeRecipeId, activeRowId, axisGroups, axisKey, axisPickPatch, composingRows, modelChoices, modelSwitchPatch, rowsFor, titleCaseId } from "./spec.js";
import css from './card.module.css';
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
    return h('div', { className: css.specHint, 'data-missing-pack': id }, id + ' is required by this card but not installed on the engine.', ' ', h('button', {
        type: 'button',
        className: css.specLinkBtn,
        disabled: st !== 'idle',
        onClick: () => {
            setSt('busy');
            void onInstallPack(id)
                .then((ok) => setSt(ok ? 'queued' : 'failed'))
                .catch(() => setSt('failed'));
        },
    }, st === 'idle' ? 'Install ' + id
        : st === 'busy' ? 'Requesting…'
            : st === 'queued' ? 'Install queued ✓ (restart the engine when it lands)'
                : 'Install request failed — retry from the assets tab'));
}
export function ModelAxes({ spec, value, onSet, onPick, onDownloadModel }) {
    const groups = axisGroups(spec);
    if (groups.length === 0)
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
        onPick(axisPickPatch(spec, row));
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
    const knobStamp = (r) => axisPickPatch(spec, r);
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
    // THE MODEL FIELD (no key span — the double-Model catch: the
    // section head already names the zone, a second visible "Model"
    // above the picker is the same word twice; the select keeps
    // aria-label="Model"). The aria-hidden spacer seats the picker's
    // geometry on the pair row (Variant's key line is 20px — a
    // span-less Model would top-hang 26px above its sibling's
    // select; geometry, never a second visible word).
    const modelField = h('label', { className: css.specField }, h('span', { className: css.specFieldKey, 'aria-hidden': 'true' }), h('select', {
        className: css.specSelect,
        'aria-label': 'Model',
        ...(refusedModel !== undefined ? { 'data-refused': 'model' } : {}),
        value: shownModel,
        // THE STALE-VARIANT CURE (operator 2026-09-14): a model
        // switch re-seeds EVERY axis (variant/quant/…) to the new
        // family's rows — keeping turbo while pointing at anima is
        // a compose refusal, never a carried-over default.
        onChange: (e) => {
            const m = e.target.value;
            const patch = modelSwitchPatch(spec, m);
            // THE ATOMIC PICK (same marriage law as the variant pick,
            // 2026-10-12): a model switch re-seeds EVERY axis — sending
            // the re-point per key lets the door judge the half-state
            // (model 2.1 against the still-held variant lightning) and
            // refuse, stranding unlanded keys. ONE write, whole patch.
            onPick(patch);
        },
    }, 
    // the refused model renders AS ITSELF — the run will shoot
    // it and the engine will refuse; the visual says the same
    // (neutral mark — the error, not a scream)
    refusedModel !== undefined
        ? h('option', { key: refusedModel, value: refusedModel }, titleCaseId(refusedModel) + ' — not an offered model of this card')
        : null, 
    // boarded families: pickable — offered is offered (stroke
    // 18); absent ones carry the machine truth in the label and
    // the download prompt below (never dropped, never blocked).
    // IDs ONLY (stroke 19): the DECL label is prose describing a
    // variant+quant config — never a model option's face.
    familyRows.map((f) => f.inMatrix ? null : h('option', {
        key: 'fam-' + f.id, value: f.id,
        // THE FAMILY FACE (operator, 2026-09-16): the DECL label
        // carries the version ("MOSS-SFX v2") — an id-only face is
        // ambiguous between versions; titleCaseId stays the
        // label-less fallback.
    }, (f.label ?? titleCaseId(f.id)) + (f.present ? '' : ' — not downloaded on this machine'))), models.map((m) => h('option', { key: m, value: m }, familyFace.get(m) ?? titleCaseId(m)))));
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
        return h('label', { key: g, className: css.specField }, h('span', { className: css.specFieldKey }, label), h('select', {
            className: css.specSelect,
            'aria-label': label,
            'data-axis': g,
            ...(refusedId !== undefined ? { 'data-refused': g } : {}),
            // NO ?? '' (the assigned-every-path proof): the loop above
            // writes active[g] on ALL three arms (grounded / refused /
            // seeded) for every group before this map runs — the right
            // side could never fire.
            value: active[g],
            onChange: (e) => {
                const id = e.target.value;
                const row = rows.find((v) => v.id === id);
                if (row !== undefined)
                    pick(row);
            },
        }, 
        // the refused coord renders AS ITSELF (never another
        // family's row face) — the run refuses it, so does the
        // visual; the grounded rows stay one pick away as repair
        refusedId !== undefined
            ? h('option', { key: refusedId, value: refusedId }, titleCaseId(refusedId) + ' — invalid ' + label.toLowerCase() + ' for ' + titleCaseId(heldModel ?? shownModel))
            : null, rows.map((v) => h('option', { key: v.id, value: v.id }, titleCaseId(v.label) + (typeof v.hint === 'string' && v.hint !== '' ? ` — ${v.hint}` : '')))));
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
    return h('section', { className: `${css.specGroup} ${css.modelAxes}`, 'data-model-axes': '1' }, h('h4', { className: css.specGroupTitle }, 'Model'), variantField !== null
        ? h('div', { className: css.axesPair, 'data-axes-pair': 'Model+Variant' }, modelField, variantField)
        : modelField, 
    // THE DOWNLOAD PROMPT (stroke 18): the held model is boarded
    // but its weights are not on the machine — ask the user, never
    // block the pick. The button is the gesture; the manage door
    // queues the provision.
    heldFam !== undefined && onDownloadModel !== undefined
        ? h('div', { className: css.specHint, 'data-download-prompt': heldFam.id }, titleCaseId(heldFam.id) + ' is offered by this card but not downloaded on this machine.', ' ', h('button', {
            type: 'button',
            className: css.specLinkBtn,
            disabled: dlState !== 'idle',
            onClick: () => {
                setDlState('busy');
                void onDownloadModel(heldFam.id)
                    .then((ok) => setDlState(ok ? 'queued' : 'failed'))
                    .catch(() => setDlState('failed'));
            },
        }, dlState === 'idle' ? 'Download ' + (heldFam.label ?? titleCaseId(heldFam.id))
            : dlState === 'busy' ? 'Requesting…'
                : dlState === 'queued' ? 'Download queued ✓ (run when it lands)'
                    : 'Download request failed — retry from the assets tab'))
        : null, 
    // the axes below the pair (Quant, …) keep the grid's flow.
    restGroups.map((g) => axisField(g)), h(RecipePills, { spec, onPick, values: value }));
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
export function RecipePills({ spec, onPick, values }) {
    const pillRows = rowsFor(spec, 'Recipe').filter((r) => Object.keys(axisPickPatch(spec, r)).length > 0);
    if (pillRows.length === 0)
        return null;
    const active = values !== undefined ? activeRecipeId(spec, values) : undefined;
    const pick = (id) => {
        const row = pillRows.find((r) => r.id === id);
        if (row === undefined)
            return;
        onPick(axisPickPatch(spec, row));
    };
    return h('label', { className: css.specField }, h('span', { className: css.specFieldKey }, 'Recipe'), h('select', {
        className: css.specSelect,
        'data-recipe-select': '1',
        'aria-label': 'Recipe',
        value: active ?? '',
        onChange: (e) => {
            const id = e.currentTarget.value;
            if (id !== '')
                pick(id);
        },
    }, h('option', { key: '__none__', value: '', disabled: active !== undefined }, active === undefined ? '-- recipe --' : '-- custom --'), pillRows.map((r) => h('option', {
        key: r.id,
        value: r.id,
        title: typeof r.hint === 'string' && r.hint !== '' ? r.hint : undefined,
    }, titleCaseId(r.label) + (typeof r.hint === 'string' && r.hint !== '' ? ` \u2014 ${r.hint}` : '')))));
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
