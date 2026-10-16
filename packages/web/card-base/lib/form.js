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
import { createElement as h, useId, useState } from 'react';
import { SegmentedTabs } from '@deepseek-ai/dsh-client-ui-primitives';
import { ModifiersSection } from "./mods.js";
import { coerceFieldEdit, composeCandidateDoc, entryFieldsOfEnvelope, fieldOnLane, fieldVisible, fieldsOf, fieldsOfEnvelope, groupFields, kindScalarFieldsOfEnvelope, composeValidate, laneViolations, modOwnedFields, offeredVariantOf, resolveFamilyKey, resolveValue, titleCaseId } from "./spec.js";
import { isUnstatedRequiredVoice } from '@melite/contracts/laneRelations';
import css from './card.module.css';
import { useSquareProvider } from "./square-provider.js";
import { SpecAtom, SourceRow } from "./atoms.js";
import { SpecFieldRow } from "./rows.js";
import { infoGlyph } from "./rows.js";
import { ModelAxes, PackPrompt } from "./axes.js";
import { chromeCopy } from "./locales/chromeCopy.js";
// THE STABLE SURFACE: every extracted name re-exports from here so
// the package's public API (index.ts) never moved — importers are
// untouched by the split.
export { useFormSpec } from "./use-form-spec.js";
export { useSquareProvider } from "./square-provider.js";
export { SourceRow, TriStateAtom, SpecSliderAtom, SpecAtom } from "./atoms.js";
export { SeedDice, SpecFieldRow, OverlayKnob } from "./rows.js";
export { SpecPanel } from "./spec-panel.js";
export { PackPrompt, ModelAxes, RecipePills } from "./axes.js";
/** THE CARD FORM (the constructor's surface half) — the emission's
 *  fields walked off the schema envelope, grouped, visible-when
 *  honored; the RESOLVED value derives per render (resolveValue —
 *  the engine's compose cascade mirrored), edits are set/unset ops
 *  over the USER layer (the settings law: presence IS the override
 *  mark, the reset chip removes it). The constructor OWNS the square
 *  provider (no call site wires it, no call site can forget it). */
export function CardForm({ spec, user, base, onSet, onPick, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference, omitInputRail, omitFields, omitRecipeRow }) {
    // DERIVED, ALWAYS FRESH (the layered law): fields walk the schema
    // envelope (families-scoped); the resolved value layers defaults
    // <- model defaults <- recipe <- user — exactly what a run
    // composes. No seeding, no mirrors, no stamp ledger: one source,
    // re-derived every render.
    // omitFields (2026-11-06, the family-reseat cure): the HOST'S
    // predicate for fields this doc's derived shape cannot honor —
    // card-base stays family-agnostic (it cannot derive any family's
    // law); the family's own rail supplies the truth (h3: the t4r
    // lane has no post chain, so its studio filters the twelve
    // T4_ONLY knobs the walk would refuse). A filtered field renders
    // NOWHERE — not the knob grid, not the per-field map below.
    const fields = omitFields !== undefined ? fieldsOf(spec).filter((f) => !omitFields(f.name)) : fieldsOf(spec);
    const value = resolveValue(spec, user, base);
    const fieldByName = new Map(fields.map((f) => [f.name, f]));
    // THE EDIT COERCION (the one specPatch duty that survives, moved
    // to the edit boundary where it always belonged): atoms emit raw
    // strings while typing; a numeric field's edit rides the user
    // layer as a NUMBER. An unparseable/empty numeric string rides
    // VERBATIM (the run's schema parse refuses loud, naming the field
    // — never a silent 0). The tri-state's `undefined` (inherit) is an
    // UNSET, not a value: the settings' unset path op, natively.
    const edit = (name, v) => {
        if (v === undefined) {
            onUnset?.(name);
            return;
        }
        onSet(name, coerceFieldEdit(fieldByName.get(name), v));
    };
    // THE MOD SYSTEM IS CORE (operator, 2026-09-12: "MOD SYSTEM IS
    // CORE. NEVER HARDCODED"): mod-owned names NEVER render as flat
    // card fields — the section owns them. The exclusion is derived
    // from the served kinds alone, in EVERY surface, automatically.
    // The FIELD kinds' param rows derive off the mod contracts' own
    // envelopes (mod_schemas — the same walker as the card fields).
    // HYBRID kinds (the served entry mode — never the kind name):
    // the catalog select binds the option_key field while the bag
    // element's REMAINING fields render as entry rows, plus the
    // pack-level scalars as the section's own rows (the floor).
    const family = resolveFamilyKey(spec);
    const modKinds = (spec.features?.modifiers ?? []).map((k) => {
        const env = spec.mod_schemas?.[k.schema_key ?? k.param_key];
        const hybrid = k.entry === 'hybrid';
        // CONTRACT A (stroke 76 wall — the paint leaf proved it): a
        // card-declared kind IS the catalog — its served fields/
        // kindFields ride VERBATIM, never re-derived from a mod_schemas
        // envelope it doesn't have (derivation would wipe the leaf).
        // Pack kinds (no declared rows) still derive from the envelope.
        // The declared rows normalize through the walker's own rule
        // (presentation type: the wtype hint wins — a declared
        // {type:'path',wtype:'image'} constructs the square like the
        // envelope's extra.wtype does).
        const declared = (rows) => rows?.map((f) => (typeof f.wtype === 'string' && f.wtype !== '' ? { ...f, type: f.wtype } : f));
        return {
            ...k,
            fields: hybrid ? entryFieldsOfEnvelope(env, k.param_key, family) : (declared(k.fields) ?? fieldsOfEnvelope(env, family)),
            kindFields: hybrid ? kindScalarFieldsOfEnvelope(env, k.param_key, family) : (declared(k.kindFields) ?? []),
        };
    });
    const owned = modOwnedFields(spec);
    const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields;
    // THE INPUT RAIL (the operator's law, 2026-09-13: "CARDS EMIT INPUT
    // SIGNATURES, SO IT'S CLEAN DATA THE UI PACKAGE RECEIVES"): when the
    // spec carries the declared input signature, the slot-shaped inputs
    // render in ONE rail IN DECLARED ORDER — image1, image2, image3 side
    // by side, the image_list row in the same zone — and the param groups
    // EXCLUDE them (the flat fields' incidental grouping — card-owned vs
    // absorbed flavor, group ids, emission order — never shapes the
    // input surface again). Text-kind edges stay params; fields whose
    // wtype has no slot atom yet stay in the groups.
    const signature = Array.isArray(spec.inputs) ? spec.inputs : [];
    // THE MOD-OWNED SLOT LAW (stroke 32 — the operator's missing-seat
    // report: image-edit's required image1 never rendered): the
    // signature names SLOTS, not schema fields — a mod-owned slot
    // (image1, the lanpaint brick's anchor) seats in the rail like any
    // other, so the rail falls back to the mod kinds' fields. The mod
    // leaf skips rail-seated fields (no double face) — the signature
    // is the seat, the brick keeps its knobs.
    const modFieldByName = new Map();
    // NO ?? [] (the always-assigned proof): the modKinds map above
    // overwrites fields on EVERY arm (hybrid → entryFieldsOfEnvelope,
    // else declared ?? fieldsOfEnvelope — all arrays), so k.fields is
    // never undefined here.
    for (const k of modKinds)
        for (const f of k.fields) {
            if (!modFieldByName.has(f.name))
                modFieldByName.set(f.name, f);
        }
    const railOf = (inp) => {
        // THE MOD-MODAL LAW (operator, 2026-10-10, final: "Region Mask
        // goes inside the mask mod — the reference input image goes
        // inside the mask mod, not on the base card, just like Img
        // Create"): the rail seats CARD-OWNED fields only. A mod-owned
        // field named by the signature (a flow-seat carrier) NEVER
        // seats — the mod's leaf renders it inside the mod modal, the
        // same one-face law the stacks already carry below. The
        // stroke-32 kind fallback seated mod inputs on the base card —
        // that was the deviation, erased.
        const f = flatFields.find((x) => x.name === inp.name);
        if (f === undefined)
            return undefined;
        // THE SLOT-SHAPED SET (primitive ③ boards mesh): the input rail
        // seats image, file, and mesh fields — a declared mesh edge claims
        // its square the same way.
        if (f.type === 'image' || f.type === 'file' || f.type === 'mesh')
            return f;
        return undefined;
    };
    const railFields = signature
        .map((inp) => (typeof inp?.name === 'string' ? railOf(inp) : undefined))
        .filter((f) => f !== undefined)
        // THE VISIBILITY LAW (the image-edit two-rows incident): the rail
        // seats ONLY visible fields — a lane-bespoke slot (visible_when:
        // "model=<family>") hides on every other family, exactly like the
        // param groups do below. Without this the 2.1-only Reference
        // Images stack rode 2511 too — two input rows at all times.
        .filter((f) => fieldVisible(f, { ...value, model: family ?? '' }))
        // THE LANE CONTRACT (2026-10-10, fix shape 2): a declaring
        // family's surface owns visibility — the rail never seats a
        // field the resolved lane does not declare.
        .filter((f) => fieldOnLane(spec, f.name, { ...value, model: family ?? '' }));
    const railNames = new Set(railFields.map((f) => f.name));
    // THE PROGRESSIVE STACKS (the operator's law, 2026-09-20: "a
    // generic 'input row for input squares'… adding one causes it to
    // add another available slot one at a time", sharing the mods
    // UI's own row mechanic): declared image_list fields claim rail
    // seats — one square per entry (array order IS apply order) plus
    // the add-cell until the declared cap. This REPLACES the old
    // unclaimed-slot law (image_list rendered NOWHERE with a
    // signature present): a declared stack always has a face.
    // Mod-owned stacks stay off (the leaf owns them — one face).
    // THE VISIBILITY LAW rides here too (same incident): a hidden
    // stack vanishes — it never relocates to the param groups (the
    // visible() gate below excludes every image_list either way).
    const stackFields = flatFields
        .filter((f) => f.type === 'image_list' && !modFieldByName.has(f.name))
        .filter((f) => fieldVisible(f, { ...value, model: family ?? '' }))
        .filter((f) => fieldOnLane(spec, f.name, { ...value, model: family ?? '' }));
    const visible = (f) => f.type !== 'image_list' && !railNames.has(f.name)
        && fieldOnLane(spec, f.name, { ...value, model: family ?? '' });
    const groupFieldsAll = flatFields.filter(visible);
    // THE INLINE GATE (fix shape 4): the lane's violations over the
    // current state — the same judgment the bench-write refusal
    // rides, rendered while the user types (the strip also names
    // STATED fields the lane hides: a value carried over a variant
    // switch the form no longer renders but the run would refuse).
    // THE CARRIED LAYERS (2026-10-10): the gate judges what the state
    // CARRIES (user over base, non-null only) — not the resolved map,
    // whose materialized defaults read as stated and produced a
    // perpetual uncurable strip on every lane that excludes a
    // defaulted field. `model` rides the user layer for the variant
    // read exactly as it rides `value` for display.
    //
    // THE INCOMPLETE CLASS NEVER WARNS (2026-10-18, the fresh-open
    // law): an UNSTATED required word is the blank canvas, not a
    // complaint — the run door owns its voice (the local claim at the
    // Run press). Stated-wrong violations stay: they are actionable at
    // open. The class test is the contracts judge's own stem, the one
    // spelling every seat shares.
    const laneWarns = laneViolations(spec, flatFields, { ...user, model: family ?? '' }, base).filter((v) => !isUnstatedRequiredVoice(v.message));
    // THE INTAKE GATE (2026-09-29, the render law — the operator's
    // words: THE CARD DOES NOT RENDER IMPOSSIBLE CONTRACTS). The pick
    // gates judge every WRITE the composer makes; this seat judges
    // every doc that ARRIVES — a reopened stage, a foreign writer, a
    // tab running older bytes, a hand-edit. The judged doc is the
    // EXPLICIT user layer (the door's own law: envelopeRefusal fires
    // on the raw body, before overlay stamps and schema defaults —
    // unfinished cards still render, only CONSTRUCTED impossibilities
    // refuse). A violation renders the door's voice ABOVE the form:
    // the impossible value never presents as live, selectable truth.
    const gateViolations = composeValidate(spec, user);
    // THE DRAGBAR CLAMP SOURCE (the form-must-not-author row,
    // 2026-10-13): the ACTIVE variant's sampler envelope — resolved
    // by the door's own law (offeredVariantOf: stated id-or-route,
    // else pool[0]) — narrows every bounded knob's dragbar track so
    // the hand cannot drag what the compose gate would refuse; the
    // wire stays loud for API authors. Null when the variant declares
    // no envelope (the family's own domain rides).
    const variantEnvelope = (offeredVariantOf(spec.variants ?? [], value)?.sampler_envelope) ?? null;
    // knob-level bound: only steps/cfg carry envelopes; a malformed
    // served pair (not length 2) clamps nothing — the wire gate still
    // refuses, so the display stays permissive rather than wrong.
    const knobEnvelope = (f) => {
        if (f.name !== 'steps' && f.name !== 'cfg')
            return {};
        const bound = variantEnvelope?.[f.name];
        return { envelope: bound !== undefined && bound.length === 2 ? [bound[0], bound[1]] : null };
    };
    // THE MODEL GUARD (the grammar's own key — the base owns the
    // mechanism, the card owns the leaves): the serving family rides
    // the visibility values as `model`, so a field may declare
    // visible_when: "model=<family>" — a lane-bespoke knob hides on
    // every other family of the card. Seeded HERE (visibility only),
    // never into the form state: `model` is the rail's pick, not a
    // field — no card declares one (the naming law), so no collision.
    // The key is the RESOLVED family (the FAMILIES-DRY law's
    // resolveFamilyKey — a composed variant/quant row walks as its
    // base, the same key the leaves declare), never the raw row.
    const groups = groupFields(groupFieldsAll, { ...value, model: family ?? '' });
    // THE PARAMETER SUBMENU (stroke 89, operator order 2026-09-17:
    // "instead of making a form card, and abstracting the form card
    // to allow for switchable submenus of parameters, you handroll" —
    // the base form owns it now): an emission declaring MORE THAN ONE
    // parameter group renders the groups as a switchable submenu — a
    // tab rail, one visible panel at a time. Zero/one group keeps the
    // stacked sections: no existing card sees a behavior change, and
    // a card NEVER owns this UI (the constructor reads the declared
    // `group` extras — the emission contract, nothing bespoke).
    const submenu = groups.length > 1;
    const [openGroup, setOpenGroup] = useState(undefined);
    // THE MOD SEAT'S CLOSED-UPLOAD REFUSAL (the OWED 2026-11-05 bench
    // note, S4's R6 class): a mod-media stack's file gesture used to
    // ride the provider's DEFAULT upload door (the seat left onFile
    // unwired) — the door mirrored a junk data-URL, then wire.ts's own
    // media gate threw a generic "don't accept" AFTER arming. The seat
    // now answers the gesture ITSELF (the refusal IS the closed door —
    // packs are engine files, never run artifacts), the same words
    // class the h3 mods square refuses with. The face is per-field
    // state like the provider's own refusal face — never a value.
    // the tab/panel DOM-id base (SegmentedTabs' id contract — the DSH
    // receipt seeds these from useId the same way, PresetGuideDialog:123).
    const domId = useId();
    const activeGroup = submenu ? (groups.find((g) => g.group === openGroup) ?? groups[0]) : undefined;
    const shownGroups = submenu && activeGroup !== undefined ? [activeGroup] : groups;
    const atomOf = (f) => atoms?.[f.type];
    // THE CONSTRUCTOR'S OWN PROVIDER — always built (hook law), used
    // unless the host claimed the square seam itself.
    const own = useSquareProvider(edit, wire ?? { candidates: [] });
    const squareFor = square ?? own.square;
    // THE STACK ROW (one per declared image_list field — the ADDITIVE
    // BAG grammar, #37: the operator's law "laid out like the additive
    // mod thing"). The mods' own face, verbatim: the list's name rides
    // ABOVE the row (uppercase title + the count hint — modHead/
    // modTitle/modHint, one skin), never as an inline caption crammed
    // beside the first square; the cells flow in ONE wrap row with the
    // add-cell inline after the last (dashed, the mods' plus-square
    // face); cell captions carry the INDEX only (the head already
    // named the list — the full seat name rides aria + the verbs).
    // A pick commits the append, a clear SPLICES the entry (never a
    // phantom '' in the bag); the add-cell vanishes at the declared
    // cap (the mods' max_stack law, the rail's face).
    const stackRow = (f) => {
        const v = value[f.name];
        const entries = Array.isArray(v)
            ? v.filter((x) => typeof x === 'string' && x !== '')
            : [];
        // THE CAP IS DECLARED, NEVER INVENTED (2026-10-11, the
        // operator's wall: "composing cards isn't actually schema
        // based — you just hardcode it"): the served max_stack is
        // the boarded lane's own (the serve narrows the roomiest card
        // cap to the family's lane_inputs.max_images); an UNDECLARED cap
        // is a card bug the face renders honestly (no add-cell limit,
        // counter without a denominator) — never a silent hardcoded 8.
        const cap = typeof f.max_stack === 'number' && f.max_stack > 0 ? f.max_stack : undefined;
        const over = cap !== undefined && entries.length > cap;
        // MOD MEDIA (the ANY-MEDIA law, operator 2026-11-06): the mod
        // seat takes ANY media kind — stills, videos, audio — and the
        // system bakes the pack (compose wires the Create H3 RefMod
        // node). The OS picker's accept hint lists every media family
        // (the square's default is the image triad alone); the door
        // itself boards any media kind.
        const kind = f.media === 'video' || f.media === 'audio' || f.media === 'mod' ? 'file' : 'image';
        const accept = f.media === 'video' ? 'video/*'
            : f.media === 'audio' ? 'audio/*'
                : f.media === 'mod' ? 'image/png,image/jpeg,image/webp,video/*,audio/*'
                    : undefined;
        return h('div', { key: 'stack-' + f.name, className: css.specStack, 'data-input-stack': f.name, 'data-stack-count': String(entries.length), ...(over ? { 'data-stack-over': String(cap) } : {}) }, h('div', { className: css.modHead, 'data-stack-head': f.name, title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined }, h('span', { className: css.modTitle }, f.label), h('span', { className: css.modHint, ...(over ? { style: { color: 'var(--dsh-danger, #f44)' } } : {}) }, `${String(entries.length)}${cap !== undefined ? ' / ' + String(cap) : ''}${f.media !== undefined && f.media !== '' ? ' · ' + f.media : ''}`)), 
        // THE OVER-CAP REFUSAL, INLINE (the schema-contract law: the
        // form states what the compose door would refuse — a draft
        // that ARRIVES past the lane's cap renders the law under the
        // head, in the door's own voice, while the entries stay
        // visible for the operator to cut)
        over ? h('p', { className: css.laneWarn, style: { margin: 0 } }, `'${f.name}': ${String(entries.length)} stated, this lane admits ${String(cap)} — remove ${String(entries.length - cap)} before the write (the capacity follows the boarded model)`) : null, h('div', { className: css.specSlotRow }, entries.map((entry, i) => h('div', {
            key: f.name + ':' + String(i),
            className: css.specSlotCell,
            title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
        }, h(SourceRow, {
            label: String(i + 1),
            ariaLabel: `${f.label} ${String(i + 1)}`,
            kind, value: entry,
            // THE LIST-SEAT LAW (2026-09-26, the operator's
            // rework: "reference images and input images are the
            // same thing"): the cell's From-flow rows narrow by
            // the OWNING field's declared edge
            // (reference_images: image_list accepts image
            // producers) — an input is an input, single or stack.
            name: f.name,
            ...(accept !== undefined ? { accept } : {}),
            onEdit: (next) => {
                const arr = [...entries];
                if (next === '')
                    arr.splice(i, 1);
                else
                    arr[i] = next;
                edit(f.name, arr);
            },
            ...(wire?.loadMedia !== undefined ? { loadMedia: wire.loadMedia } : {}),
            ...(wire?.candidates !== undefined ? { candidates: wire.candidates } : {}),
            ...(wire?.candidatesFor !== undefined ? { candidatesFor: wire.candidatesFor } : {}),
        }))), (cap === undefined || entries.length < cap)
            ? h('div', { className: css.specSlotCell, 'data-stack-add': f.name, title: f.tooltip }, h(SourceRow, {
                label: '',
                ariaLabel: chromeCopy.stackAddCell({ label: String(f.label) }),
                kind, value: null,
                name: f.name,
                ...(accept !== undefined ? { accept } : {}),
                onEdit: (next) => {
                    // the add drill commits ONLY real picks — an empty
                    // verb (clear on the empty cell) adds nothing
                    /* v8 ignore else -- the empty cell carries no clear verb (the square renders no Detach without an attached value, and the provider wires onClear for attached values only) — '' is unconstructible through the seam, so the else is the type fence, never a UI path */
                    if (next !== '')
                        edit(f.name, [...entries, next]);
                },
                ...(wire?.loadMedia !== undefined ? { loadMedia: wire.loadMedia } : {}),
                ...(wire?.candidates !== undefined ? { candidates: wire.candidates } : {}),
                ...(wire?.candidatesFor !== undefined ? { candidatesFor: wire.candidatesFor } : {}),
            }))
            : null));
    };
    return h('div', { className: css.specForm }, gateViolations.length > 0
        ? h('div', { className: css.laneWarn, 'data-compose-gate': String(gateViolations.length), role: 'alert' }, h('p', { style: { fontWeight: 700 } }, 'THE COMPOSE GATE REFUSED THIS DOC — the card will not render an impossible contract. Fix the stated value, or reset the row.'), gateViolations.map((v, i) => h('p', { key: 'gate-' + String(i) }, v.message)))
        : null, 
    // LANE REFUSALS SEAT WITH THE FORM'S REFUSAL SURFACE (the admission
    // voice never renders inside the parameter flow — a bare sibling
    // after the axes grid reads as the Recipe row's value).
    laneWarns.length > 0
        ? h('div', { className: css.laneWarn, 'data-lane-warn': String(laneWarns.length), role: 'alert' }, laneWarns.map((v, i) => h('p', { key: 'lane-' + String(i) }, v.message)))
        : null, 
    // THE AXES ride the user layer through the same edit seam (their
    // picks are ordinary sets; the resolved value passes along).
    h(PackPrompt, { spec, onInstallPack }), 
    // THE COMPOSABILITY CURE (2026-11-06, the model/quant/variant/
    // recipe swap failure): the pick patches judge the SHOWN doc —
    // base under user, the exact shape composeCandidateDoc gives the
    // door — so a base-held departed key derives its null-write from
    // the truth the run merges (held=user alone never saw it).
    h(ModelAxes, { spec, value, user, pickHeld: composeCandidateDoc(base ?? {}, user, {}), onSet: edit, onPick, onDownloadModel, omitRecipeRow }), (railFields.length > 0 || stackFields.length > 0) && omitInputRail !== true
        ? h('section', { className: css.specGroup + ' ' + css.inputRail, 'data-input-rail': '1' }, 
        // THE SECTION HEAD (#37, the Modifiers symmetry): the input
        // zone names itself like the mod zone does — one grammar,
        // head-above then the flowing rows.
        h('h4', { className: css.specGroupTitle }, 'Inputs'), railFields.length > 0
            ? h('div', { className: css.specSlotRow }, railFields.map((f) => {
                // NO image_list ARM (the rail-gate proof): railOf returns
                // a field ONLY for type image|file, so railFields can
                // never carry an image_list row.
                return h('div', {
                    key: f.name,
                    className: css.specSlotCell,
                    title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
                }, h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: squareFor(f), ...(wire?.candidates !== undefined ? { wireCandidates: wire.candidates } : {}) }));
            }))
            : null, stackFields.map((f) => stackRow(f)))
        : null, submenu && activeGroup !== undefined
        ? // THE DSH TABLIST (S7j, the chrome canon): the group rail rides
            // SegmentedTabs — the catalog's controlled tablist (role=tablist/
            // tab grammar, arrow walk, sliding indicator; ui-primitives
            // SegmentedTabs.tsx:24-80). The panel stays EXCLUSIVE (stroke
            // 89: one visible panel — the stacked render is retired); the
            // selected tab is the only tab stop and its panel is the mounted
            // one, so the tab→panel link holds on the active seat. The DSH
            // panel-mount receipt: PresetGuideDialog.tsx:123-141.
            h('div', { 'data-form-submenu': '1' }, h(SegmentedTabs, {
                label: chromeCopy.paramGroupsLabel,
                value: activeGroup.group ?? 'general',
                // the tablist's items are non-empty by construction —
                // submenu IS groups.length > 1 (the tuple type's own proof)
                items: groups.map((g) => ({
                    value: g.group ?? 'general',
                    label: titleCaseId(g.group ?? 'General'),
                    id: `${domId}-tab-${g.group ?? 'general'}`,
                    panelId: `${domId}-panel-${g.group ?? 'general'}`,
                })),
                onChange: (v) => {
                    const target = groups.find((g) => (g.group ?? 'general') === v);
                    setOpenGroup(target !== undefined ? target.group : null);
                },
            }))
        : null, shownGroups.map((g) => {
        // THE GRID IS THE LAW (2026-09-21, the operator's catch: "WHY
        // WHY IS WIDTH AND HEIGHT ON DIFFERENT VERTICAL ROWS?"):
        // the form-card grammar — pairs on a row — is the SYSTEM
        // default at the CARD level, never per-card decoration a card
        // can forget (h3's General face stacked because the grid was
        // opt-in). Every params group grids 2 columns; a card may
        // declare another count (columns: 3) or an explicit stack
        // (columns: 1). Declared first-seen wins.
        const declared = g.fields.find((f) => typeof f.columns === 'number' && f.columns >= 1)?.columns;
        const gridCols = Math.max(1, Math.floor(declared ?? 2));
        const cellStyle = (f) => {
            // THE TEXTAREA LAW: prompts never sit side by side — a
            // textarea spans the full row however the group grids
            // THE OVERFLOW LAW (stroke 24): minWidth 0 lets the ITEM
            // shrink inside its track — an input's ~185px intrinsic min
            // must never grow the card a horizontal scrollbar.
            if (f.type === 'textarea')
                return { gridColumn: '1 / -1', minWidth: '0' };
            return { gridColumn: `span ${Math.max(1, Math.floor(f.width ?? 1))}`, minWidth: '0' };
        };
        // THE SLOT ROW partition: image/image_list fields of one group
        // share a horizontal row (their labels live under their squares);
        // every other field keeps its stacked key row.
        const children = [];
        let row = [];
        const flush = () => {
            if (row.length === 0)
                return;
            children.push(h('div', {
                key: 'slotrow-' + String(children.length), className: css.specSlotRow,
                style: { gridColumn: '1 / -1', minWidth: '0' },
            }, row));
            row = [];
        };
        for (const f of g.fields) {
            // NO railNames SKIP (the visible-filter proof): groups derive
            // from groupFieldsAll, which visible() already stripped of
            // rail-seated names — a rail field can never arrive here.
            const claim = atomOf(f);
            const sq = squareFor(f);
            const wireCandidates = wire?.candidates;
            if (claim !== undefined) {
                flush();
                const cell = h('div', { key: f.name, className: css.specField }, h('span', { className: css.specFieldKey }, f.label, f.required === true ? h('span', { className: css.specRequired }, ' *') : null, infoGlyph(f)), claim({ f, value: value[f.name], onEdit: edit, square: sq }));
                children.push(h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell));
                continue;
            }
            if (f.type === 'image' || f.type === 'file' || f.type === 'mesh') {
                row.push(h('div', {
                    key: f.name,
                    className: css.specSlotCell,
                    title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
                }, h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) })));
                continue;
            }
            flush();
            const cell = h(SpecFieldRow, {
                key: f.name, f, value: value[f.name], values: value, onEdit: edit,
                ...knobEnvelope(f),
                ...(sq !== undefined ? { square: sq } : {}),
                ...(wireCandidates !== undefined ? { wireCandidates } : {}),
            });
            children.push(h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell));
        }
        flush();
        return h('section', { key: g.group ?? '', className: css.specGroup, 'data-form-group-panel': g.group ?? 'general',
            // THE TABLIST'S PANEL (the SegmentedTabs contract: the tab
            // links its label to a caller-owned panel) — id + labelledby
            // ride the same domId the tabs seed, submenu seats only.
            ...(submenu ? { role: 'tabpanel', id: `${domId}-panel-${g.group ?? 'general'}`, 'aria-labelledby': `${domId}-tab-${g.group ?? 'general'}` } : {}) }, 
        // THE SUBMENU NAMES THE PANEL: when the tab rail carries the
        // group's title, the panel repeats nothing (the DRY law).
        g.group !== null && !submenu ? h('h4', { className: css.specGroupTitle }, titleCaseId(g.group)) : null, h('div', { className: css.specGrid, style: { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` } }, children));
    }), 
    // THE MOD SYSTEM — rendered by the constructor itself: every
    // surface (stage drill, add drill, studios) obeys, none wires it.
    modKinds.length > 0
        ? h(ModifiersSection, {
            kinds: modKinds, values: value, onEdit: edit, railSeated: railNames,
            ...(onPatch !== undefined ? { onPatch } : {}),
            ...(paintFace !== undefined ? { paintFace } : {}),
            ...(bboxFace !== undefined ? { bboxFace } : {}),
            ...(paintReference !== undefined ? { paintReference } : {}),
            ...(wire?.loadMedia !== undefined ? { loadMedia: wire.loadMedia } : {}),
        })
        : null, own.wireMenu);
}
//# sourceMappingURL=form.js.map
