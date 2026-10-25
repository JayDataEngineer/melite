/**
 * spec.ts — @melite/card-base: THE EMISSION CONTRACT.
 *
 * A card package EMITS; the base CONSTRUCTS (operator order,
 * 2026-09-12: "The package to construct the card ui should see that
 * the card package emits an image input, then constructs the input
 * component automatically"). This module is the emission's client-side
 * shape — the served form-spec document as the base consumes it —
 * plus the PURE projections. No fetchers here (wire.ts), no
 * components (form.tsx): types and derivations only.
 *
 * THE LAYERED-PARAMS LAW (the parameter audit, 2026-09-14 — the
 * DSH settings model, subsystems/settings.md): the form-spec serves
 * the card's own SERIALIZED SCHEMA (schemastery toJSON — the SSOT,
 * one serializer server-side) and the bench's stage params ARE the
 * USER layer: a key's PRESENCE is the override mark, never its
 * value. resolveValue layers schema defaults <- model defaults <-
 * served stamps <- user — the engine's compose cascade verbatim,
 * resolved client-side so the form shows exactly what a run
 * composes. Edits are set/unset ops over the user layer; a family
 * Recipe macro pick is an ordinary multi-set of declared keys —
 * no stamp ledger, no value-compare heuristics, no heal walk
 * (seedUser's one validation clause aside).
 *
 * THE EDGE LAW (operator order, 2026-09-12: "whenever a card emits
 * via the package system, it needs to have 'input' 'required=True',
 * or 'output', so the edges are defined"): every card's emission
 * carries `inputs` — one row per declared input edge, the required
 * fact joined per the law (dsl.py Field.emit: `required: True
 * emits, False omits`) — and `outputs`, the declared output edges.
 * The base constructs input components and picker candidates from
 * THESE, never from result-URL sniffing.
 */
/** Build an envelope from raw dict nodes — the TEST-side and
 *  migration-side constructor; the served envelopes come from
 *  schemastery's own toJSON. Ids assign in insertion order; a node
 *  carrying `consts` (string labels or {value,label} rows) expands
 *  into minted const refs with the union's `list` wired to them —
 *  the shape schemastery's union-of-consts serializes to. */
export function schemaEnvelope(dict) {
    const refs = { 0: { type: 'object', dict: {} } };
    let uid = 0;
    for (const [name, raw] of Object.entries(dict)) {
        uid += 1;
        const nodeId = uid;
        const node = { ...raw };
        const consts = node['consts'];
        delete node['consts'];
        if (Array.isArray(consts)) {
            const list = [];
            for (const c of consts) {
                uid += 1;
                if (typeof c === 'string') {
                    refs[uid] = { type: 'const', value: c };
                }
                else if (typeof c === 'object' && c !== null) {
                    const row = c;
                    refs[uid] = {
                        type: 'const', value: row.value,
                        ...(row.label !== undefined ? { meta: { description: String(row.label) } } : {}),
                    };
                }
                list.push(uid);
            }
            node.list = list;
            if (node.type === undefined)
                node.type = 'union';
        }
        refs[nodeId] = node;
        refs[0].dict[name] = nodeId;
    }
    return { uid: 0, refs };
}
// THE ONE VOCABULARY (2026-10-10): the extra-bag contract lives at
// the floor (@melite/contracts/extraKeys — zero deps, one spelling
// shared by the web tier, the engine tier, and every card
// declaration; before it, the form spelled visible_when while the
// tool face spelled visibleWhen — a dead read for every card).
import { extraOf } from '@melite/contracts/extraKeys';
import { deepEqualJson } from '@deepseek-ai/dsh-util-values';
import { dropAuthoringIncomplete, judgeLaneBounds, judgeLaneRelations, judgeLaneSurface, laneBlank, laneBoundsOf, laneSurfaceOf, judgeSamplerEnvelope, marriedKnobValues, resolveCellRow, resolveVariantRow, samplerEnvelopeCure, unknownQuantVoice, unknownVariantVoice, variantMatrixFromFlatRows, } from '@melite/contracts/laneRelations';
/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
 *  served modifier kind owns — its fields' names plus its param_key
 *  (the bag storage). CardForm EXCLUDES these from the flat param
 *  groups: mod params render ONLY inside the mod system. PURE.
 *
 *  THE SSOT DISEMBIGUATION (the voice_name brick, 2026-10-21): a
 *  name the card's own schema declares as a root leaf is a MAIN-FACE
 *  field — a pack envelope naming the same knob never steals its
 *  seat. The tts burn: the qvoice_save pack restates voice_name, the
 *  exclusion hid the card's widget leaf from the whole main face,
 *  and the lane's required-together pair could never be stated —
 *  every half-pair write refused and the studio bricked. One knob,
 *  one owner: the owner is the card's own serialized schema.
 *
 *  THE HIDDEN CARRIER ARM (the input_mask regression, caught by
 *  real-contract + modifiers suites the same day): a main leaf
 *  declaring extra.hidden is VALIDATION-ONLY — it never renders on
 *  the main face (fieldsOfEnvelope's hidden arm skips it), so
 *  releasing its name to the main face would orphan the visible
 *  knob entirely. image-edit's input_mask: a hidden flow-gate
 *  carrier on the card, the VISIBLE Region Mask row on the mask
 *  pack (the operator's one-list merge, 2026-10-10). A hidden main
 *  leaf keeps its pack ownership; only a SERVED main leaf claims
 *  the name. */
export function modOwnedFields(spec) {
    const owned = new Set();
    for (const k of spec.features?.modifiers ?? [])
        owned.add(k.param_key);
    for (const env of Object.values(spec.mod_schemas ?? {})) {
        if (env == null)
            continue;
        const root = env.refs[env.uid];
        for (const name of Object.keys(root?.dict ?? {}))
            owned.add(name);
    }
    const main = spec.schema;
    if (main != null) {
        const mainRoot = main.refs[main.uid];
        const dict = mainRoot?.dict ?? {};
        for (const name of Object.keys(dict)) {
            const ref = main.refs[dict[name]];
            if (ref === undefined)
                continue;
            if (extraOf(ref).hidden === true)
                continue;
            owned.delete(name);
        }
    }
    return owned;
}
/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
 *  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
export function isOptionKind(k) {
    return (k.options ?? []).length > 0;
}
/** THE HYBRID TEST (the served entry mode — never the kind name):
 *  catalog rows AND bag-element entry fields. */
export function isHybridKind(k) {
    return k.entry === 'hybrid';
}
/** The catalog-bound field (the hybrid type / the option id) —
 *  'id' when the door serves no key (the lora backstop). */
export function optionKeyOf(k) {
    return typeof k.option_key === 'string' && k.option_key !== '' ? k.option_key : 'id';
}
/** The scalar dial of a bag element (the pack's own name —
 *  'strength' backstop when the door serves none). */
export function scalarKeyOf(k) {
    return typeof k.scalar_key === 'string' && k.scalar_key !== '' ? k.scalar_key : 'strength';
}
/** THE TITLE-CASE FACE (the operator's sweep law): machine ids
 *  (krea-2, z-image, euler, comfyui…) render titled — never raw.
 *  FACES ONLY: option values, param keys, and wire bodies keep the
 *  verbatim id (the 1:1 law — the eye gets prose, the door gets the
 *  id). First letter of each separator-bound word upper, the rest
 *  untouched (INT8 stays INT8); idempotent on titled prose. */
export function titleCaseId(id) {
    return id
        .split(/[-_\s]+/)
        .filter((w) => w !== '')
        .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
        .join(' ');
}
/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
 *  resolveValue's first layer; the base never invents one). */
export function specDefaults(fields) {
    const out = {};
    for (const f of fields) {
        if (f.default !== undefined && f.default !== null)
            out[f.name] = f.default;
    }
    return out;
}
export function composeUnset(inherited, schemaDefault) {
    if (inherited !== undefined && inherited !== null && inherited !== '') {
        return { composed: String(inherited), from: 'stamp' };
    }
    if (schemaDefault !== undefined && schemaDefault !== null) {
        return { composed: String(schemaDefault), from: 'schema' };
    }
    return { composed: undefined, from: 'none' };
}
/** The unset face's LABEL: a run stamp names its source ('← 28'); the
 *  schema default rides plain (it is not inheriting anything — it IS
 *  the engine's compose floor); the dict's honesty word only when
 *  nothing composes. */
import { chromeCopy } from "./locales/chromeCopy.js";
export function unsetFaceLabel(face) {
    if (face.composed === undefined)
        return chromeCopy.inheritPlaceholder;
    return face.from === 'stamp' ? `← ${face.composed}` : face.composed;
}
/** The unset face's PROSE (the tooltip): names in words what unset
 *  composes. `render` adapts the vocabulary (e.g. boolean on/off). */
export function unsetFaceTip(face, render) {
    const v = (render ?? ((x) => x))(face.composed ?? '');
    if (face.from === 'stamp')
        return `unset — inherits ${v} from the run`;
    if (face.from === 'schema')
        return `unset — the engine composes ${v} (the schema's default)`;
    return 'unset — the engine default applies';
}
/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
 *
 * One pure projection: serialized schemastery schema -> derived
 * SpecFields. Every presentation fact lives in the nodes' meta (the
 * declaration IS the UI contract — the Field.emit law); this
 * walk reads, never invents. THE ORDER: dict insertion order with
 * the declared `order` hint as tie-break (a stable sort — equal
 * keys keep insertion order).
 *
 * Families scoping: a node whose extra.families names families the
 * spec does NOT serve skips (the absorption is family-scoped —
 * the card serves only the boarded plane).
 *
 * Nullable pairs: a union of [X, const(null)] wires as X — the
 * OUTER meta wins (schemastery's nullable() shape, probed live on
 * image-gen 2026-09-14).
 *
 * Presentation types (the audit's client-side derivation — a view
 * choice over typed meta, never a server row): extra.wtype wins
 * (declared presentation); union-of-consts -> select; number ->
 * step 1 -> seed, any other step -> slider, no step -> slider;
 * string -> text; boolean -> boolean; array -> loras.
 *
 * Option labels: a union's const members carry their own
 * meta.description (the emitter's label law) — the declared
 * extra.options override when present. */
export function fieldsOfEnvelope(env, family) {
    if (env == null)
        return [];
    const root = env.refs[env.uid];
    return projectDict(env, root?.dict ?? {}, family);
}
/** THE HYBRID PROJECTION (the controlnet restoration): the envelope
 *  root's bag array (param_key) holds entry OBJECTS — project the
 *  ELEMENT's dict as the kind's entry fields (the catalog select
 *  joins them in the leaf). Empty when the bag is absent or its
 *  element is not an object (a pure OPTION kind like lora). */
export function entryFieldsOfEnvelope(env, paramKey, family) {
    if (env == null)
        return [];
    const root = env.refs[env.uid];
    const at = root?.dict?.[paramKey];
    const node = at === undefined ? undefined : env.refs[at];
    const innerId = node?.inner;
    const inner = typeof innerId === 'number' ? env.refs[innerId] : undefined;
    if (node?.type !== 'array' || inner?.type !== 'object')
        return [];
    return projectDict(env, inner.dict ?? {}, family);
}
/** THE PACK-LEVEL PROJECTION (the controlnet strength floor): the
 *  envelope root's fields OUTSIDE the bag array — the section's own
 *  rows above the tiles. Bag-external arrays are not section rows
 *  (no atom renders a bag) — scalars only. */
export function kindScalarFieldsOfEnvelope(env, paramKey, family) {
    if (env == null)
        return [];
    const root = env.refs[env.uid];
    const dict = { ...(root?.dict ?? {}) };
    delete dict[paramKey];
    for (const [name, id] of Object.entries(dict)) {
        if (env.refs[id]?.type === 'array')
            delete dict[name];
    }
    return projectDict(env, dict, family);
}
/** The dict projector (the walker's body — one meta path for the
 *  root, the hybrid element, and the pack-level rows). */
function projectDict(env, dict, family) {
    const out = [];
    for (const [name, id] of Object.entries(dict)) {
        let node = env.refs[id];
        // THE DANGLING-REF REFUSAL (G9-half, 2026-10-12): a dict id the
        // refs table does not carry is a corrupt envelope — the old walk
        // dropped the field and the form rendered with a hole and no
        // diagnostic. The producer mints a ref for every dict id, so this
        // arm is unreachable for a well-formed envelope; refusing here is
        // the earliest client-side point. The UNION members are exempt by
        // design (non-string consts mint no ref — the bare-union law,
        // pinned below), and the hybrid projection's own short-envelope
        // guard answers [] before this walk.
        if (node === undefined) {
            throw new Error('form-spec: field ' + JSON.stringify(name)
                + ' points at ref ' + JSON.stringify(id)
                + ' the envelope\'s refs table does not carry — the form is refused rather than rendered with a hole');
        }
        // nullable unwrap: union [inner, const(null)] -> inner, outer meta wins
        if (node.type === 'union' && Array.isArray(node.list) && node.list.length === 2) {
            const a = env.refs[node.list[0]];
            const b = env.refs[node.list[1]];
            const nullConst = (r) => r?.type === 'const' && r.value === null;
            if (a !== undefined && b !== undefined
                && ((nullConst(a) && b.type !== 'const') || (nullConst(b) && a.type !== 'const'))) {
                node = nullConst(a) ? b : a;
            }
        }
        const meta = node.meta ?? {};
        // ONE VOCABULARY (2026-10-10, the operator's law: "literally
        // impossible to speak two vocabularies"): the bag narrows
        // through the floor's typed read — every key below spells the
        // contract's own constant spelling, never a second string
        // literal (the visible_when/visibleWhen dead-read crime's
        // structural cure).
        const extra = extraOf(node);
        const families = Array.isArray(extra.families)
            ? extra.families : null;
        if (families !== null && family !== undefined
            && !families.includes(family))
            continue;
        // THE HIDDEN ARM (2026-09-21, the blank-rows catch): a field
        // declaring extra.hidden is VALIDATION-ONLY — the schema walk
        // still refuses garbage for it (the operator's vocabulary
        // law: "the schema enforces EVERY key the renderer reads"),
        // but it NEVER renders: renderer vocabulary (k, noise_seed),
        // legacy aliases (interp_switch), and renderer spellings
        // (image_name) are gate keys, not surface fields. A blank
        // default-less row on the form face is a lie.
        if (extra.hidden === true)
            continue;
        // union options: const members, labels from their meta.description
        let options;
        if (node.type === 'union' && Array.isArray(node.list)) {
            const opts = [];
            for (const mid of node.list) {
                const m = env.refs[mid];
                if (m?.type !== 'const')
                    continue;
                const v = m.value;
                if (v === null || v === undefined)
                    continue;
                const label = typeof m.meta?.['description'] === 'string'
                    ? m.meta['description'] : String(v);
                if (label === String(v))
                    opts.push(String(v));
                else
                    opts.push({ value: String(v), label });
            }
            if (opts.length > 0)
                options = opts;
        }
        if (Array.isArray(extra.options)) {
            options = extra.options.map((o) => typeof o === 'string' ? o
                : typeof o === 'object' && o !== null && 'value' in o && 'label' in o
                    ? { value: String(o['value']), label: String(o['label']) }
                    : String(o));
        }
        // presentation type: declared hint wins, else derive. The hint's
        // WTYPE_SET membership is enforced ONE STEP UP, inside extraOf
        // (strictness fix 5, 2026-10-01): every face narrows through the
        // floor's typed read, so the check lives there — never twice.
        const hint = extra.wtype;
        let type;
        if (hint !== undefined && hint !== '')
            type = hint;
        else if (options !== undefined && node.type === 'union')
            type = 'select';
        else if (node.type === 'number')
            type = String(meta['step'] ?? '') === '1' ? 'seed' : 'slider';
        else if (node.type === 'string')
            type = 'text';
        else if (node.type === 'boolean')
            type = 'boolean';
        else if (node.type === 'array')
            type = 'loras';
        else
            type = node.type ?? 'string';
        const num = (k) => typeof meta[k] === 'number' ? meta[k] : undefined;
        // the str() reads ride the TYPED bag first (the contract's own
        // spelling), the raw meta as the schemastery-native fallback
        // (description-class keys) — one vocabulary, two layers
        const str = (k, m) => {
            const b = extra[k];
            if (typeof b === 'string')
                return b;
            const mk = m ?? k;
            return typeof meta[mk] === 'string' ? meta[mk] : undefined;
        };
        out.push({
            name,
            label: typeof meta['description'] === 'string' && meta['description'] !== ''
                ? meta['description'] : name,
            order: typeof extra.order === 'number' ? extra.order : undefined,
            type,
            default: meta['default'] === undefined ? undefined : meta['default'],
            min: num('min'), max: num('max'),
            step: type === 'seed' ? undefined : num('step'),
            options,
            group: str('group') ?? '',
            zone: str('zone'),
            required: extra.required === true || meta['required'] === true,
            placeholder: str('placeholder'),
            tooltip: str('tooltip'),
            visible_when: str('visible_when'),
            required_when: str('required_when'),
            columns: typeof extra.columns === 'number' ? extra.columns : undefined,
            width: typeof extra.width === 'number' ? extra.width : undefined,
            max_stack: typeof extra.max_stack === 'number' ? extra.max_stack : undefined,
            media: str('media'),
        });
    }
    // declared order first, dict insertion order as tie-break (stable)
    return out.map((f, i) => [f, i]).sort((a, b) => (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0]);
}
/** THE EDIT COERCION (the one specPatch duty that survives, moved
 * to the edit boundary): atoms emit raw strings while typing; a
 * numeric field's edit rides the user layer as a NUMBER. An
 * unparseable/empty numeric string rides VERBATIM (display
 * continuity through clear-and-retype — the bench drill's law; a
 * blank that reaches the run's schema parse refuses loud, naming
 * the field — never a silent 0). `v === undefined` stays undefined
 * (the tri-state's inherit — the caller's unset signal). The
 * STUDIOS' blank-inherits law lives one door up, at their own edit
 * verb (useResolvedForm) — each face owns its blank semantics.
 * PURE. */
/** THE NUMERIC PARSE, shared by both blank laws (2026-10-13, the card-UI
 *  duplication audit): a finite parse is a number, anything else is
 *  NOT one. The blank SEMANTICS then differ by seat and stay there —
 *  this file rides an unparseable value VERBATIM (never a silent 0),
 *  while the drill modal keeps the prior value (a typed "x" must
 *  never reach a number param). One parse, two named laws; the two
 *  copies of the parse itself are gone. */
export function parseNumericInput(v) {
    if (v.trim() === "")
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
export function coerceFieldEdit(f, v) {
    if (v === undefined)
        return undefined;
    if (f !== undefined && (f.type === 'number' || f.type === 'seed' || f.type === 'slider')
        && typeof v === 'string') {
        const n = parseNumericInput(v);
        if (n !== undefined)
            return n;
    }
    return v;
}
/** THE FAMILY-KEY RESOLUTION (the families-DRY law, 2026-09-21):
 * a field's `families` declares BASE family ids — the card's
 * boarded ids — while the served model key may be a COMPOSED
 * catalog row (family-variant-quant, e.g. 'pixal3d-1536-int8').
 * Resolve the active key to its base against the spec's OWN
 * boarded-families rows: the longest id matching the key at a
 * '-' boundary wins (a 'pixal3d' + 'pixal3d-pro' board resolves
 * to the longer). An unresolved key passes through verbatim —
 * single-family cards and keys with no boarded base walk
 * unchanged; the resolution never drops a field, it only widens
 * what a declared base id covers. */
export function resolveFamilyKey(spec) {
    const key = typeof spec.model === 'string' ? spec.model : undefined;
    if (key === undefined || key === '')
        return undefined;
    const boarded = spec.families;
    if (boarded === undefined)
        return key;
    let best;
    for (const row of boarded) {
        const exact = key === row.id;
        const prefixed = key.startsWith(row.id + '-')
            && (best === undefined || row.id.length > best.length);
        if (exact || prefixed)
            best = row.id;
    }
    return best ?? key;
}
/** The card's own derived fields (the schema envelope walked,
 * families-scoped to the served family). Memoize at the caller for
 * hot loops — the walk is pure. */
export function fieldsOf(spec) {
    return fieldsOfEnvelope(spec.schema, resolveFamilyKey(spec));
}
/** THE MOD-BAG KEYS (the per-model law's truth seat, operator
 *  2026-10-16: "MODS (LIKE LORAS) ARE PER MODEL"): the envelope
 *  root's ARRAY-node names — mod currency, however the field's
 *  wtype presents. Presentation types lie (a bare lora bag projects
 *  'loras', a mod list projects 'image_list'); the NODE is the
 *  truth. Nulls ride modelSwitchPatch's cross-model arm: the bag
 *  dies with its model, never seeds the arrival. */
/** THE IMAGE-SUBJECT KEYS (operator, 2026-10-21: "When I switch
 *  image edit models in the Image Edit card, the input images drop,
 *  and I have to re put in the image edit model. I want it to not
 *  drop the image"): a schema-declared array whose wtype is
 *  image_list is the edit's SUBJECT (input_images, the reference
 *  anchors) — the photo being edited, model-agnostic. It is NOT mod
 *  currency: the mods (loras, ref_mods) ride features.modifiers and
 *  die with their model ("keeping the lora on makes zero sense");
 *  the subject survives every switch — the same edit, another model.
 *  Pure companion of bagKeysOf's walk, one ref shape, one law. */
function imageSubjectKeysOf(spec) {
    const env = spec.schema;
    if (env == null)
        return new Set();
    const root = env.refs[env.uid];
    const dict = root?.dict ?? {};
    const out = new Set();
    for (const [name, id] of Object.entries(dict)) {
        const ref = env.refs[id];
        if (ref?.type !== 'array')
            continue;
        // extraOf is the one typed read (the wtype floor's own law —
        // never a second hand-narrowing beside it)
        if (extraOf(ref).wtype === 'image_list')
            out.add(name);
    }
    return out;
}
function bagKeysOf(spec) {
    const env = spec.schema;
    if (env == null)
        return new Set();
    const root = env.refs[env.uid];
    const dict = root?.dict ?? {};
    const out = new Set();
    for (const [name, id] of Object.entries(dict)) {
        if (env.refs[id]?.type === 'array')
            out.add(name);
    }
    return out;
}
/** THE LAYERED RESOLUTION — the engine's compose cascade mirrored
 * client-side (stroke 34 — the card-recipe layer is dead): schema
 * defaults <- model defaults <- SERVED STAMPS <- user. The form
 * SHOWS exactly what a run composes; `user` rides verbatim by key
 * presence (a PRESENCE is the override mark, never its value — the
 * settings law). Arrays (lora bags) and nulls in model_defaults
 * skip, matching the engine's overlay filter.
 *
 * THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
 * stage row's `resolved` map — prepareCardParams' own stamped +
 * lifted body, served by the drafts doors. It layers UNDER the user
 * (presence still wins) and OVER model_defaults (the server's own
 * family/variant stamps replace the client's guesses — variant
 * resolver_defaults, family defaults, the surface filter). Absent
 * base = the registry-less lane derive. PURE. */
export function resolveValue(spec, user, base) {
    const out = specDefaults(fieldsOf(spec));
    for (const [k, v] of Object.entries(spec.model_defaults ?? {})) {
        if (v === null || Array.isArray(v))
            continue;
        out[k] = v;
    }
    if (base !== undefined) {
        for (const [k, v] of Object.entries(base)) {
            if (v === null || v === undefined || Array.isArray(v))
                continue;
            out[k] = v;
        }
    }
    // THE INHERIT LAW (the blank-rows cure's own header: "undefined is
    // the tri-state's inherit signal — the unset"): a materialized
    // undefined/null key on the user layer INHERITS the resolved
    // default — it never overwrites it. The raw Object.assign wrote
    // undefined over every declared default for any surface whose
    // state materializes its knobs (the h3 studio's LayerA does —
    // every optNum key is an own undefined when unset), blanking
    // Steps/Denoise/Shift on a fresh document while every wall ran
    // green (they pass sparse fixtures, never materialized ones).
    // Arrays RIDE (the mod bag is a user pick; only base/model layers
    // skip arrays — their owners are the DECL, not the user).
    for (const [k, v] of Object.entries(user)) {
        if (v === null || v === undefined)
            continue;
        out[k] = v;
    }
    // THE MARRIAGE MIRROR (#36, the recipes rework): when a served kind
    // declares a knob marriage and a counting bag rides, the knob is the
    // BAG's — stated on the row first, else the catalog row's default,
    // Math.max across the bag ("8 on a 4-step distill is fine, 4 on an
    // 8-step is undercooked"). The film runs this law server-side (the
    // service resolves bag ids against the family catalog); the face
    // shows what the film runs — Steps reads 8 with the plaguekind
    // turbo riding, 4 with dareties, NEVER the neutral 12 — THROUGH THE
    // SHARED MATH (D6 2026-10-17: marriedKnobValues in @melite/contracts
    // beside the lane voices; the display cascade keeps no private copy
    // of the judgment). A bag id the catalog does not serve contributes
    // nothing HERE (the mod plane and the compose door refuse unknown
    // ids loudly — the resolver never invents a refusal of its own).
    for (const kind of spec.features?.modifiers ?? []) {
        const bag = out[kind.param_key];
        if (!Array.isArray(bag) || bag.length === 0)
            continue;
        for (const [knob, v] of Object.entries(marriedKnobValues(kind, bag))) {
            out[knob] = v;
        }
    }
    return out;
}
/** evalVisibleWhen's serving shape: "key=value" guards, `&`-ANDed;
 * one guard's value may be a `|`-SET ("key=a|b" = key ∈ {a,b}).
 * (The ONE schema grammar — a field declares its own visibility;
 * the walker interprets, cards never hand-rolled predicates.) A
 * field with no visible_when always shows. Unknown guard keys:
 * show (never hide on a typo). Examples:
 *   "sharpen_enabled=true"
 *   "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass" */
export function fieldVisible(f, values) {
    const rule = f.visible_when;
    if (typeof rule !== 'string' || rule === '')
        return true;
    for (const guard of rule.split('&')) {
        const g = guard.trim();
        // THE GRAMMAR'S FULL LAW (deep pass 2026-10-10, pinned by the
        // estate law suite's LAW 7): guards are `key=want|want` or
        // `key!=want|want`; keys and wants TRIM; the literal `null` is
        // the UNSET face (undefined/empty). Before this pass the
        // interpreter honored `=` alone — every `!= null` guard on the
        // wire parsed as key `image1 ` (trailing space) wanting
        // `! null`, NEVER true: dead grammar the law suite caught.
        const ne = g.indexOf('!=');
        const eq = ne >= 0 ? -1 : g.indexOf('=');
        let key;
        let wants;
        let negate = false;
        if (ne >= 0) {
            key = g.slice(0, ne).trim();
            wants = g.slice(ne + 2).split('|').map((w) => w.trim());
            negate = true;
        }
        else if (eq >= 0) {
            key = g.slice(0, eq).trim();
            wants = g.slice(eq + 1).split('|').map((w) => w.trim());
        }
        else {
            continue;
        }
        if (key === '')
            continue;
        const val = String(values[key] ?? '');
        // `null` matches the unset face ('' | undefined | null)
        const hit = wants.some((w) => (w === 'null' ? val === '' : w === val));
        if (negate === hit)
            return false;
    }
    return true;
}
/** THE CONDITIONAL-REQUIRED (2026-10-12, the operator's catch: the
 *  mask card's sam3 prompt threw at compose while the form showed a
 *  lawful-looking optional blank): a field the compose demands only
 *  in some states declares WHICH through the SAME grammar
 *  fieldVisible interprets — the required star paints exactly when
 *  the guards hold. `required: true` stays the unconditional face;
 *  this is its scoped sibling, never a second interpreter. */
export function fieldRequired(f, values) {
    if (f.required === true)
        return true;
    if (typeof f.required_when !== 'string' || f.required_when === '')
        return false;
    return fieldVisible({ ...f, visible_when: f.required_when }, values);
}
// ── THE LANE CONTRACT (2026-10-10, the YOU_ARE_A_LIAR fix shape 2)
// ─────────────────────────────────────────────────────────────────
// "a variant's field set IS its declaration": when the spec serves
// `lanes`, the DECLARED surface owns field visibility for the
// resolved lane (family base ∪ variant additions — laneSurfaceOf,
// the same call the bench door resolves with) and the relation
// words gate INLINE (judgeLaneRelations — the same judgment the
// bench-write refusal rides). One declaration, two faces.
//
// THE visible_when TRUTH (li-aq.3, the design audit's F6): for a
// declaring family the lane surface and visible_when BOTH judge —
// they AND (a field hidden by either is hidden; a lane whose
// surface omits a field never shows it no matter what the table
// says). Nothing "retires": the table stays live for non-declaring
// families, and fails SAFE under the declaration.
//
// THE BASE-ABSENT SHAPE (F8, stated so nobody rediscovers it):
// `laneSurfaceOf` derives the family BASE from the declaration's
// params list — a family that declares variants but leaves the
// family base EMPTY surfaces ONLY the variant additions (the base
// is a statement, not a guess); the bench door resolves the same
// way (one call), so the two faces cannot diverge.
/** The resolved lane surface for the current variant, or null when
 *  the family declares none (the legacy truth — visibility falls
 *  back to visible_when). `variantId` is the RESOLVED variant
 *  value (values.variant); an unknown id inherits the family base
 *  verbatim (a Quant-only or unset axis). */
export function laneSurfaceFor(spec, variantId, quantId = null) {
    const lanes = spec.lanes;
    if (lanes === undefined)
        return null;
    const extra = variantId === null ? undefined : lanes.variants?.[variantId]?.params;
    // THE CELL AXIS (the size-at-quant reshape, operator 2026-10-26:
    // "THEN QUANT, THAT IS WHERE YOU CHOSE 1.7 OR .6"): a size cell
    // may take a member its sibling size does not — the same
    // family ∪ variant ∪ cell resolution the bench door refuses
    // with (one spelling, laneSurfaceOf). An unknown/absent quant
    // inherits the variant's own surface (selectCardVariant's
    // first-cell law), never a refusal here.
    const cell = variantId !== null && quantId !== null
        ? lanes.variants?.[variantId]?.cells?.[quantId]?.params
        : undefined;
    return laneSurfaceOf(lanes.base, extra, cell);
}
/** The relation words that judge the resolved lane: the family's
 *  own + the variant's own (both layers fire — the DECL cascade). */
export function laneRelationsFor(spec, variantId) {
    const lanes = spec.lanes;
    if (lanes === undefined)
        return [];
    const out = [];
    if (lanes.relations !== undefined)
        out.push(lanes.relations);
    const v = variantId === null ? undefined : lanes.variants?.[variantId]?.relations;
    if (v !== undefined)
        out.push(v);
    return out;
}
/** The numeric bounds that judge the resolved lane: family rows,
 *  per-field replaced by the variant's own (the DECL cascade's
 *  replace-law for numbers). */
export function laneBoundsFor(spec, variantId) {
    const lanes = spec.lanes;
    if (lanes === undefined)
        return null;
    return laneBoundsOf(lanes.bounds ?? null, variantId === null ? undefined : lanes.variants?.[variantId]?.bounds ?? null);
}
/** Field visibility UNDER the lane contract: a declared surface
 *  hides every field it does not name (the declaration is the
 *  author — the field set IS the variant); a family that declares
 *  no surface keeps the visible_when grammar. */
export function fieldOnLane(spec, paramName, values) {
    const variantId = typeof values['variant'] === 'string' && values['variant'] !== ''
        ? values['variant']
        : null;
    // The QUANT pick rides the lane resolution too (the cell axis —
    // a size cell's surface is the truth when a size is chosen).
    const quantId = typeof values['quant'] === 'string' && values['quant'] !== ''
        ? values['quant']
        : null;
    const surface = laneSurfaceFor(spec, variantId, quantId);
    if (surface === null)
        return true;
    return surface.includes(paramName);
}
/** THE INLINE GATE: the lane's relation + surface violations over
 *  what the state CARRIES — rendered under the named field while the
 *  user types, refused by the bench door when the state is saved.
 *  Empty = a state the run accepts.
 *
 *  THE CARRIED LAYERS, NOT THE RESOLVED MAP (2026-10-10, the
 *  form-plane audit's CRITICAL-1): the resolved `values` map
 *  materializes schema defaults and model_defaults as own
 *  properties, so a defaulted field reads as STATED whether the user
 *  ever touched it. On a lane that excludes a defaulted field that
 *  produced a perpetual, UNCURABLE warning: the row was hidden
 *  (fieldOnLane) so the cure ("drop it") was unclickable, and
 *  unsetting it re-materialized the default. The bench judges the
 *  PREPARED body — the operator's own params plus the stamps that
 *  survive the null-skip — so the form judges the same thing: the
 *  user layer over the base layer, non-null keys only. A schema
 *  default is a PREFILL the operator never sent, and a variant's
 *  `voice: null` stamp is exactly how the bench says "no persona on
 *  this lane". */
export function laneViolations(spec, fields, user, base) {
    // THE VARIANT, tri-state (2026-10-10, the audit's HIGH-3): the
    // axes write `variant: ''` when a family switch clears the pick,
    // and a pick can name a row this spec never served. Both are the
    // RUN door's voice (selectCardVariant refuses an unknown variant;
    // the run resolves the cleared one), so this gate stands down —
    // judging the family base there flagged states the bench admits.
    // An ABSENT variant key is different: the family default (the
    // head) is what composes, and the family base is its surface.
    const carried = (key) => Object.prototype.hasOwnProperty.call(user, key) ? user[key] : (base ?? {})[key];
    const rawVariant = carried('variant');
    if (rawVariant !== undefined && rawVariant !== null) {
        if (typeof rawVariant !== 'string' || rawVariant === '' || !laneVariantServed(spec, rawVariant))
            return [];
    }
    const variantId = typeof rawVariant === 'string' && rawVariant !== '' ? rawVariant : null;
    // THE QUANT, same tri-state law (the cell axis): an unknown or
    // cleared quant inherits the variant's own surface — the RUN
    // door resolves the cleared one to the first cell.
    const rawQuant = carried('quant');
    const quantId = typeof rawQuant === 'string' && rawQuant !== '' ? rawQuant : null;
    const surface = laneSurfaceFor(spec, variantId, quantId);
    // A FAMILY THAT DECLARES RELATIONS BUT NO SURFACE still gets its
    // words judged (2026-10-10, the DECL audit's HIGH-2): the bench
    // judges relations regardless of surface, so returning here would
    // leave the form silently building what the door refuses — the
    // exact failure this whole shape exists to kill. Latent today (no
    // such DECL), fatal the day one lands.
    const relations = laneRelationsFor(spec, variantId);
    if (surface === null && relations.length === 0)
        return [];
    const names = fields.map((f) => f.name);
    const stated = {};
    for (const src of [base ?? {}, user]) {
        for (const [k, v] of Object.entries(src)) {
            if (v === null || v === undefined)
                continue;
            stated[k] = v;
        }
    }
    // THE RANGE RULE'S FORM FACE (2026-10-10): the model's numeric
    // domains judge here too — the same declaration, the same voice,
    // the cure rendered under the field while the user types instead
    // of at the save. (The bounds see the STATED map, not the raw
    // user layer: a stated field over its ceiling is a refusal at
    // every seat; a defaulted field inside its row never fires.)
    const bounds = laneBoundsFor(spec, variantId);
    // THE FRICTIONLESS-AUTHORING RULING (operator 2026-11-11, attempt
    // 12: "The refusal is never one keystroke at a time … you are
    // submitting a form, not hacking the mainframe"): this gate is the
    // WRITE seat's inline face — it drops the authoring-incomplete
    // class through the SAME spelling the registry's write doors call
    // (dropAuthoringIncomplete, the contracts judge's own export;
    // never a second copy — the drift between this gate and the door
    // WAS attempt 12: the door filtered, this copy refused, and the
    // keystroke bounced while every wall was green). The strip still
    // voices everything strict — conflicts, off-surface keys, bounds
    // — and the RUN press judges the halves.
    return dropAuthoringIncomplete([
        ...judgeLaneSurface(surface, names, stated),
        ...judgeLaneRelations(relations, stated),
        ...judgeLaneBounds(bounds, stated),
    ]);
}
/** Does the served doc offer this variant id? The VARIANT rows are
 *  the served truth — a recipe row and a surface-less variant
 *  (voicedesign) legitimately carry no `lanes.variants` entry and
 *  still inherit the family base, so the check reads spec.variants
 *  ids, never the lanes map's keys. */
function laneVariantServed(spec, variantId) {
    const rows = Array.isArray(spec.variants) ? spec.variants : [];
    return rows.some((row) => {
        const rec = row;
        return rec?.id === variantId || rec?.key === variantId;
    });
}
/** Group the visible fields (the spec's own group key, first-appearance
 *  order — ungrouped first under no heading). */
export function groupFields(fields, values) {
    const out = [];
    for (const f of fields) {
        if (!fieldVisible(f, values))
            continue;
        const g = typeof f.group === 'string' && f.group !== '' ? f.group : null;
        const known = out.find((x) => x.group === g);
        if (known === undefined)
            out.push({ group: g, fields: [f] });
        else
            known.fields.push(f);
    }
    return out;
}
/** The declared input edge for a param, if the emission names one
 *  (THE EDGE LOOKUP — the constructor's one way to know a field is
 *  slot-shaped: the DECLARATION says so, the wtype never guesses). */
export function inputEdgeOf(spec, paramName) {
    return (spec.inputs ?? []).find((e) => e.name === paramName);
}
/** The axis groups in declaration order: features.variant_groups'
 *  key order when the door serves it, else the rows' distinct groups
 *  in first-seen order. Empty group names never ride. The Recipe
 *  group never rides (the recipe-axis yield above). */
export function axisGroups(spec) {
    const rows = spec.variants ?? [];
    const groups = [];
    const declared = variantGroupsContract(spec);
    if (declared.length > 0) {
        for (const g of declared)
            if (g !== '' && !groups.includes(g))
                groups.push(g);
    }
    for (const v of rows) {
        if (v.group !== '' && !groups.includes(v.group))
            groups.push(v.group);
    }
    // THE RECIPE-AXIS YIELD (strokes 33+34): the Recipe MATRIX group
    // NEVER rides as an axis — no card owns a `recipe` field anymore
    // (the card-recipe layer is dead), so the key has no legal seat
    // anywhere. Family Recipe rows serve as MACRO PILLS (the stamp
    // verb writes their payload onto declared keys); the stamp-less
    // `default` row is display metadata and renders nothing.
    return groups.filter((g) => g !== 'Recipe');
}
/** The variant_groups contract's keys, in served order (the door
 *  serves it under features when the family declares axis groups). */
export function variantGroupsContract(spec) {
    const feats = spec.features;
    const vg = feats?.['variant_groups'];
    if (vg === null || typeof vg !== 'object' || Array.isArray(vg))
        return [];
    return Object.keys(vg);
}
/** One axis' rows (served order). AN ALIAS IS AN ADDRESS, NEVER AN
 *  OFFER (the duped-variant cure, 2026-10-21): the synthesized
 *  family-address row (`<lane>__head`) rides spec.variants so drafts
 *  naming the family address resolve, but no pick, ground, or chain
 *  may seat it — the door refuses its id against the family matrix,
 *  so an offered alias is a trap row. Direct spec.variants reads
 *  (address resolution, walls) still see it. */
export function rowsFor(spec, group) {
    return (spec.variants ?? []).filter((v) => v.group === group && v.alias !== true);
}
/** THE CHAIN (one direction: an axis filters the axes BELOW it): a
 *  row composes with the current selection when its `owner` is empty
 *  (composes with everything — patch-only rows) or names the ACTIVE
 *  row of another axis. */
/** The row the doc's durable axis stamp names for the picked row's
 *  group — the DEPARTED preset (the departed-preset reseat's input,
 *  2026-11-06). The stamp's reverse: a non-Quant stamp IS the row
 *  id; a Quant stamp is the row's quant coordinate (axisStampOf's
 *  mirror, spelled WITHOUT its throw — a departed-row lookup never
 *  refuses a pick over an unrelated illegal sibling). undefined
 *  when the doc names no row, names the picked row itself (no
 *  departure), or names a stamp no row owns (a stale doc — nothing
 *  to reseat against). PURE. */
function departedRowOf(spec, incoming, held) {
    if (held === undefined)
        return undefined;
    const siblings = (spec.variants ?? []).filter((r) => r.group === incoming.group);
    // THE AXIS ARM: an axis group's identity IS its durable stamp
    // (variant/quant ride the doc). A stamp naming the incoming row is
    // no departure; a stamp naming no row is a stale doc — for an AXIS
    // group that is the whole answer (nothing to reseat against).
    const stamp = held[axisKey(incoming.group)];
    if (typeof stamp === 'string' && stamp !== '') {
        const named = siblings.find((r) => (r.group === 'Quant' ? r.quant === stamp : r.id === stamp));
        if (named !== undefined)
            return named.id === incoming.id ? undefined : named;
        if (axisGroups(spec).includes(incoming.group))
            return undefined;
    }
    // THE DERIVED ARM (the Recipe group — the yield refuses its durable
    // key, so a recipe has no stamp to read). THE BURN this cures
    // (2026-10-16, audit 0be61df8 F2): the D4 reseat read
    // `held['recipe']` — a key NO writer produces (the vocabulary guard
    // refuses it, seedUser deletes it) — so the reseat was DEAD CODE and
    // a departed preset's stamps rode forever (the operator's
    // four-times-reported "THEY ARE ALL LOSE RESOLUTION": Draft's
    // 768×448 under Standard and Final Cut).
    // The identity is DERIVED instead, from the roster the held layer
    // still carries: the sibling whose declared stamps the doc still
    // holds is the preset the face was showing before this pick. A held
    // value equal to a sibling's stamp IS the departure (the pick owns
    // its roster in both directions); a value the user edited AWAY from
    // every stamp matches nothing and stands. Ties resolve by served
    // order (first declared) — deterministic, never a coin flip. Keys
    // the incoming row also declares are the incoming's own and never
    // count as departure evidence.
    let best;
    let bestHits = 0;
    for (const r of siblings) {
        if (r.id === incoming.id)
            continue;
        let hits = 0;
        for (const [k, v] of Object.entries(r.defaults)) {
            if (k === 'model')
                continue;
            if (k in incoming.defaults)
                continue;
            if (deepEqualJson(held[k], v))
                hits++;
        }
        if (hits > bestHits) {
            bestHits = hits;
            best = r;
        }
    }
    return bestHits > 0 ? best : undefined;
}
export function composingRows(spec, group, active) {
    return rowsFor(spec, group).filter((v) => {
        if (v.owner === undefined || v.owner === '')
            return true;
        for (const g of axisGroups(spec)) {
            if (g === group)
                continue;
            const row = rowsFor(spec, g).find((x) => x.id === v.owner);
            if (row !== undefined)
                return active[g] === v.owner;
        }
        return true;
    });
}
/** The Variant axis' rows (group 'Variant', served order). */
export function variantRows(spec) {
    return rowsFor(spec, 'Variant');
}
/** The Quant cells composing with a variant (THE CHAIN). */
export function quantRowsFor(spec, variantId) {
    return composingRows(spec, 'Quant', { Variant: variantId ?? undefined });
}
/** The Model select's options (stroke 21, the operator's law:
 *  "WHY IS KREA-2 AND KREA-2-RAW MODELS! THAT IS A VARIANT") — THE
 *  FAMILY THE SPEC SERVES, full stop. A variant row's re-point
 *  (krea-2-raw) is the DECL's compose stamp, resolved server-side
 *  into the run's params — it is NOT a model and never renders as
 *  one. The rail's other options are the card's boarded families
 *  (spec.families, served from the card package). */
export function modelChoices(spec) {
    return typeof spec.model === 'string' && spec.model !== '' ? [spec.model] : [];
}
/** THE ACTIVE-ENTRY LAW (activeVariantId, generalized to the served
 *  shape): a row is active when its re-pointed model (defaults.model
 *  ?? route) matches the held `model` value AND its owner chain
 *  holds. Nothing matches → undefined (the caller falls to the first
 *  composing row — the catalog's first-declared law). */
export function activeVariantId(spec, values, group) {
    const held = typeof values['model'] === 'string' ? values['model'] : undefined;
    if (held === undefined)
        return undefined;
    const active = {};
    for (const g of axisGroups(spec)) {
        active[g] = activeRowId(spec, values, g, active);
    }
    return active[group] ?? undefined;
}
/** The ACTIVE RECIPE (the dropdown's selection state, derived from
 * the ONE truth -- never a persisted key): a recipe row is active
 * when EVERY key its pick stamps (axisPickPatch, minus the durable
 * axis keys -- the run door refuses an undeclared `recipe` param)
 * deep-equals the user layer's held value. Stamp-for-stamp matches
 * are naturally exclusive (a two-row bag matches only the row that
 * stamps two rows); first-declared wins on a tie. NOTHING matches ->
 * undefined (the dropdown shows its placeholder -- a hand-edited
 * layer is not a recipe, and the form never lies about it). */
export function activeRecipeId(spec, values) {
    for (const row of rowsFor(spec, 'Recipe')) {
        // held rides (the override law): the stamp the pill DERIVES must
        // be the stamp the pick WRITES — stamps clamp through the
        // resolved variant's envelope, so a derivation without the held
        // layer would light no pill after a reconciled pick
        const patch = axisPickPatch(spec, row, values);
        let holds = true;
        for (const [k, v] of Object.entries(patch)) {
            if (k === axisKey('Recipe'))
                continue;
            if (!deepEqualJson(values[k], v)) {
                holds = false;
                break;
            }
        }
        if (holds && Object.keys(patch).length > 0)
            return row.id;
    }
    return undefined;
}
/** One group's active row under the owner chain (inner recursion of
 *  activeVariantId — Variant resolves first, chained groups after). */
export function activeRowId(spec, values, group, active) {
    const held = typeof values['model'] === 'string' ? values['model'] : undefined;
    if (held === undefined)
        return undefined;
    for (const v of rowsFor(spec, group)) {
        const rePoint = typeof v.defaults['model'] === 'string' ? v.defaults['model'] : v.route;
        if (rePoint === '' || rePoint !== held)
            continue;
        if (v.owner !== undefined && v.owner !== '') {
            let chainHolds = false;
            for (const g of axisGroups(spec)) {
                if (g === group)
                    continue;
                if (rowsFor(spec, g).find((x) => x.id === v.owner) !== undefined) {
                    chainHolds = active[g] === v.owner;
                    break;
                }
            }
            if (!chainHolds)
                continue;
        }
        return v.id;
    }
    return undefined;
}
/** THE AXIS STAMP VOCABULARY (2026-09-29, caught LIVE by the
 *  compose gate in the CI seat: the client stamped the Quant row's
 *  composed catalog id — 'raw__int8' — where the door's contract
 *  speaks the CELL's quant field — 'int8'; the gate refused with the
 *  door's own voice and the write never left the studio, which is
 *  exactly the law working). The value an axis pick stamps on the
 *  durable key is the value the DOOR reads: the variant id for
 *  Variant, the cell quant for Quant. Never the flat-catalog id.
 * PURE. */
export function axisStampOf(row) {
    if (row.group !== 'Quant')
        return row.id;
    if (typeof row.quant === 'string' && row.quant !== '')
        return row.quant; // NO FALLBACK (2026-09-29, the second live break): the old
    // `?? row.id` arm was the second vocabulary's doorway — it
    // legalized stamping the catalog's composite address ('raw__int8')
    // where the door's contract speaks the cell coordinate ('int8').
    // A Quant row without its coordinate is an ILLEGAL ROW: discovery
    // refuses it at birth, and if a hole ever reopens the stamper
    // REFUSES LOUD here rather than construct a contract the door
    // would refuse a millisecond later.
    throw new Error('illegal Quant row ' + JSON.stringify(row.id)
        + ' (owner ' + JSON.stringify(row.owner ?? '') + '): no quant coordinate —'
        + ' the row is refused at the stamp; the spec server must refuse it at birth');
}
/** The durable param key an axis rides (the group's id, lowercased —
 *  'variant', 'quant', 'recipe', 'precision'). */
export function axisKey(group) {
    return group.toLowerCase();
}
/** THE ROW'S OWN STAMP (the pill-offer law, 2026-11-08 — the
 *  combinations-sweep live catch): what the row ITSELF writes — its
 *  defaults minus the model re-point (the transport's word, never the
 *  user layer's) minus the durable axis key when the group rides no
 *  axis (the vocabulary guard's mirror). The envelope reconcile is
 *  the NEW choice's truth, never the row's voice — judging the
 *  reconciled pick patch offers stamp-less rows under a served
 *  envelope (Default rendered live, picked, and no row could ever
 *  show active — the face stayed '-- recipe --'). The menu offers
 *  exactly the rows whose own stamp is non-empty. PURE. */
export function ownStampOf(spec, row) {
    const stamp = {};
    for (const [k, v] of Object.entries(row.defaults)) {
        if (k === 'model')
            continue;
        stamp[k] = v;
    }
    // THE VOCABULARY MIRROR (axisPickPatch's guard, same spelling): the
    // durable key stamps only when the group rides as an axis — a
    // Recipe stamp never gains the dead `recipe` key here either.
    if (axisGroups(spec).includes(row.group))
        stamp[axisKey(row.group)] = axisStampOf(row);
    return stamp;
}
/** A pick's full value patch — the old onPick law: the row's
 *  `defaults` overlay rides (model re-point + every resolver default),
 *  plus the durable axis keys themselves so a reopened stage restores
 *  its selects. Picking a row also re-seeds the axes BELOW it (their
 *  first composing row). */
export function axisPickPatch(spec, row, held) {
    // THE USER PLANE SPEAKS THE CARD'S VOCABULARY (stroke 21): the
    // row's re-point stamp (model: krea-2-raw) never lands in the user
    // layer — the server's compose resolves the route into the run's
    // params. The row's other defaults (steps, cfg) ride as the pick's
    // visible stamps.
    const patch = {};
    for (const [k, v] of Object.entries(row.defaults)) {
        if (k === 'model')
            continue;
        patch[k] = v;
    }
    const groups = axisGroups(spec);
    const at = groups.indexOf(row.group);
    const active = {};
    for (const g of groups) {
        if (g === row.group)
            active[g] = row.id;
        else if (typeof row.defaults['model'] === 'string')
            active[g] = undefined;
    }
    // THE VOCABULARY GUARD (stroke 33): the durable axis key stamps
    // only when the group rides as an axis — a Recipe-row pick on a
    // card without the field keeps its declared-knob defaults, never
    // the undeclareable `recipe` key (the compose-door refusal).
    if (groups.includes(row.group))
        patch[axisKey(row.group)] = axisStampOf(row);
    // ONLY the axes BELOW the picked one re-seed (the chain runs one
    // direction); the axes above stay exactly as the user set them. A
    // group outside the axes (Recipe since the yield) has nothing
    // below it — no reseed at all.
    if (at < 0) {
        // THE DEPARTED-PRESET RESEAT (D4, 2026-11-06 — operator: "switch
        // between recipes. THEY ARE ALL LOSE RESOLUTION", reported four
        // times): a preset OWNS its stamps while it is the named pick.
        // When the doc's held layer names a DIFFERENT row of the same
        // group (departedRowOf — the durable stamp for an axis group, the
        // DERIVED roster for the Recipe group since the yield), every key
        // the DEPARTED row stamped that the incoming row does not carry is
        // preset residue — Draft's 768×448 rode under Standard and Final
        // Cut forever (patch-only rows never unstate). A key whose held
        // value still EQUALS the departed stamp unstated (null deletes at
        // compose — modelSwitchPatch's spelling); a hand-edited value is
        // the USER's word and stands.
        // THE VALUE COMPARISON IS DEEP (2026-10-16, the same audit's F3):
        // the check was `===`, which is REFERENCE equality for arrays —
        // an array bag (loras, ref_mods) never compared equal, so a
        // departed recipe's bag ALWAYS rode and could never be unstated.
        // deepEqualJson is the comparison the rest of this file already
        // uses for held-vs-stamp judgments.
        // Scoped to NON-AXIS groups: the chain groups' values are the
        // envelope law's (reconcilePick) — this cures the one seam that
        // had no reconciler at all.
        const departed = departedRowOf(spec, row, held);
        if (departed !== undefined) {
            for (const [k, v] of Object.entries(departed.defaults)) {
                if (k === 'model')
                    continue;
                if (k in row.defaults)
                    continue;
                if (held !== undefined && deepEqualJson(held[k], v))
                    patch[k] = null;
            }
        }
        reconcilePick(patch, spec, row, held);
        dropStaleAxisCarry(patch, spec, row, held);
        return patch;
    }
    for (const g of groups.slice(at + 1)) {
        const composing = composingRows(spec, g, active);
        if (composing.length > 0)
            patch[axisKey(g)] = axisStampOf(composing[0]);
        else
            patch[axisKey(g)] = '';
    }
    // THE PICK RECONCILES (operator 2026-11-05: "when I switch
    // variant, it should switch the values so they make sense" — the
    // live break: switching to turbo with stated steps 52/cfg 3.5
    // bricked the card behind the compose gate instead of switching).
    // THE SAME DAY'S SECOND LAW (the multi-level cure): the reconcile
    // judges against the RESOLVED VARIANT's envelope, and the latest
    // selection OVERRIDES — the new choice's declared defaults land,
    // the departed choice's numbers never survive a judged key (the
    // overrideEnvelopeKeys priority chain).
    reconcilePick(patch, spec, row, held);
    dropStaleAxisCarry(patch, spec, row, held);
    return patch;
}
/** THE AXIS-PICK CARRY DROP (the tts lockout cure, 2026-11-10 — the
 *  QUANT-CELL switch class): a pick that re-keys the resolved
 *  (variant × quant) lane drops the STATED carry the departing lane
 *  declared and the arriving lane does not — the same prev ∩ ¬next
 *  law the estate's own laneMigrate judges at the write door
 *  (cardsRegistry's prevSurface/nextSurface sets), seated at the
 *  pick so the studio never leaves the ghost stated for the press
 *  gate to refuse. The burn: style_instruction stated on the 1.7B
 *  customvoice cell rode the 0.6B pick and every compose refused it
 *  field-named — the client refused before the estate's migration
 *  ever saw the write. The null is the UNSET LAW's null: it deletes
 *  the bench key at the flush, and mergeSwitchFrame's null verdicts
 *  beat incoming frames. NEVER A GUESS: both lanes must resolve to a
 *  DECLARED surface (the lanes contract served, both coordinates
 *  known); keys the DEPARTING lane did not declare are authored
 *  state and stand (the gate refuses them as authored — this verb
 *  never launders a hand-typed off-lane key); shared words never
 *  null; the axis keys, model, and the patch's own stamps are
 *  transport, never carry; unstated keys have nothing to drop. A
 *  pick that does not re-key the lane (a Recipe pick, a
 *  same-coordinate repair) is a no-op here. PURE — the caller owns
 *  the write. */
function dropStaleAxisCarry(patch, spec, row, held) {
    if (spec.lanes === undefined || held === undefined)
        return;
    const axisKeys = new Set(axisGroups(spec).map((g) => axisKey(g)));
    if (!axisKeys.has(axisKey(row.group)))
        return;
    const prev = resolvedLaneCoordinate(spec, held);
    const next = resolvedLaneCoordinate(spec, { ...held, ...patch });
    if (prev === null || next === null)
        return;
    if (prev.variantId === next.variantId && prev.quantId === next.quantId)
        return;
    const prevSurface = laneSurfaceFor(spec, prev.variantId, prev.quantId);
    const nextSurface = laneSurfaceFor(spec, next.variantId, next.quantId);
    if (prevSurface === null || nextSurface === null)
        return;
    for (const [k, v] of Object.entries(held)) {
        if (k === 'model' || axisKeys.has(k) || k in patch)
            continue;
        if (laneBlank(v))
            continue;
        if (nextSurface.includes(k))
            continue;
        if (!prevSurface.includes(k))
            continue;
        patch[k] = null;
    }
}
/** THE OVERRIDE RECONCILE (operator 2026-11-05: "THE LATEST
 *  SELECTION MUST OVERRIDE" — the multi-level live break: model,
 *  variant, recipe, and quant switches EACH bricked the card at the
 *  compose gate while the frozen-fixture suites stayed green). The
 *  judge reads the doc against the RESOLVED VARIANT's
 *  sampler_envelope — so the pick's ONE write must land every
 *  judged key on a truth the envelope admits, priority:
 *  1. the picked row's stamps: TRUSTED verbatim when the row IS the
 *     law-holder (a variant pick — a row whose declared default
 *     falls outside its own envelope is a lying DECL, the gate's to
 *     refuse); otherwise clamped through the variant's envelope (a
 *     recipe's 50 composes to 8 under a 4-step distill);
 *  2. the value the doc already carries: inside the envelope it
 *     STANDS unwritten (a pick overrides only what it speaks — a
 *     quant pick that declares no steps never tramples the recipe's
 *     50), outside it clamps to the nearest bound;
 *  3. nothing carried: the RESOLVED VARIANT's declared default for
 *     the key, else the family row's (spec.model_defaults) — the
 *     absent-key seed (flux's numbers on a fresh switch, never a
 *     departed family's 52 resurrected by the schema).
 *  A switch never leaves a judged key outside the envelope. Mutates
 *  the patch. */
function overrideEnvelopeKeys(patch, spec, offered, held, trustStamps = false) {
    const env = offered.sampler_envelope;
    if (env === undefined || env === null)
        return;
    const familyDefaults = (spec.model_defaults ?? {});
    for (const [k, range] of Object.entries(env)) {
        if (!Array.isArray(range) || range.length !== 2)
            continue;
        const [lo, hi] = range;
        if (typeof lo !== 'number' || typeof hi !== 'number')
            continue;
        const clamp = (v) => (v < lo ? lo : v > hi ? hi : v);
        const stamp = patch[k];
        if (typeof stamp === 'number' && Number.isFinite(stamp)) {
            if (!trustStamps)
                patch[k] = clamp(stamp);
            continue;
        }
        const doc = held?.[k];
        if (typeof doc === 'number' && Number.isFinite(doc)) {
            // inside-envelope carried values stand unwritten (the
            // minimal-write law + the speaks-only-what-it-declares law);
            // outside ones clamp in the same write
            const c = clamp(doc);
            if (c !== doc)
                patch[k] = c;
            continue;
        }
        const declared = offered.defaults[k] ?? familyDefaults[k];
        if (typeof declared === 'number' && Number.isFinite(declared))
            patch[k] = clamp(declared);
    }
}
/** A pick's full reconcile: resolve the variant the DOOR will judge
 *  (offeredVariantOf — the door's own resolution over the doc the
 *  pick produces), then land its envelope keys on a truth the
 *  envelope admits (overrideEnvelopeKeys). A VARIANT pick's own
 *  stamps are TRUSTED against its own envelope — a row whose
 *  declared default falls outside its own envelope is a lying DECL,
 *  the compose gate's to refuse live (stage-drill-gates' no-write
 *  law), never clamped here. Cross-row picks (recipe/quant stamps
 *  under the variant's law) reconcile. Shared by every
 *  axisPickPatch exit and the model switch. Mutates the patch. */
function reconcilePick(patch, spec, row, held) {
    const doc = { ...(held ?? {}), ...patch };
    const offered = offeredVariantOf(spec.variants ?? [], doc) ?? row;
    const trustStamps = offered.id === row.id && row.group === 'Variant';
    overrideEnvelopeKeys(patch, spec, offered, held, trustStamps);
}
/** A model switch's full value patch (the stale-variant cure,
 *  operator 2026-09-14: model anima + variant turbo refused at
 *  compose — a switch that keeps the old family's axes is a broken
 *  stage). Every axis re-seeds to its FIRST row re-pointing at the
 *  new model (else its first composing row), and the picked rows'
 *  defaults overlay rides (raw → {model, steps, cfg} — the pick
 *  law, same as axisPickPatch). THE OVERRIDE LAW (2026-11-05, the
 *  multi-level cure): with `held` the switch lands the SEEDED
 *  variant's envelope keys on the new choice's own truth
 *  (reconcilePick), and a CROSS-FAMILY switch nulls the departing
 *  vocabulary — every envelope key this spec's rows name that the
 *  patch does not own (the unset law: null deletes at compose; the
 *  new family's seed re-derives on spec-land, never the departed
 *  family's 52 riding under a 4-step distill). The caller writes
 *  every key through onEdit. PURE. */
export function modelSwitchPatch(spec, model, held, arrival) {
    const patch = { model };
    const groups = axisGroups(spec);
    const active = {};
    let seededVariant;
    // FAMILY SWITCH (stroke 21: a model pick is either the spec's own
    // family or a switch — routes are not models, so the re-point union
    // is gone). A switch CLEARS the axes (stroke 19's law): this
    // spec's rows belong to another family; seeding them under the new
    // model is poison. The drill refetches the family's spec and the
    // absent axis keys seed from ITS first-declared rows.
    const crossSpec = model !== '' && model !== spec.model;
    for (const g of groups) {
        // THE CHAIN (one direction, the activeRowId law): only composing
        // rows are pickable — when nothing composes (raw owns no quant
        // cells) the axis rests EMPTY, never a foreign row (int8 belongs
        // to turbo; seating it under raw is turbo-for-anima again).
        const composing = composingRows(spec, g, active);
        if (composing.length === 0 || crossSpec) {
            // cross-spec: EVERY axis clears (variant and quant filter to
            // the NEW family's rows once its spec lands — never this
            // spec's rows carried over)
            patch[axisKey(g)] = '';
            active[g] = '';
            continue;
        }
        const match = composing.find((r) => {
            const rePoint = typeof r.defaults['model'] === 'string' && r.defaults['model'] !== ''
                ? r.defaults['model'] : r.route;
            return rePoint === model;
        });
        const row = match ?? composing[0];
        if (g === 'Variant' && seededVariant === undefined)
            seededVariant = row;
        // THE USER PLANE SPEAKS THE CARD'S VOCABULARY (model = family;
        // the axis keys speak the DOOR's vocabulary — axisStampOf, the
        // STAMP PLANE law D2 2026-11-06, AMENDED 2026-11-08 by THE
        // SHARED QUANT VOCABULARY: the serializer no longer namespaces a
        // duplicate cell id — the served Quant row's id IS the raw
        // coordinate the door's clause 2 judges, so the address and the
        // value are one word): a row's re-point stamp (model:
        // krea-2-raw) is the DECL's compose business — the server
        // resolves it into the run's params. It NEVER lands in the user
        // layer, so the Model rail never shows routes and a reopened
        // stage never holds one. The row's OTHER defaults (steps, cfg)
        // still ride — they are the pick's visible stamps.
        for (const [k, v] of Object.entries(row.defaults)) {
            if (k === 'model')
                continue;
            patch[k] = v;
        }
        patch[axisKey(g)] = axisStampOf(row);
        active[g] = row.id;
    }
    if (crossSpec) {
        // THE DEPARTING VOCABULARY DIES (the override law's cross-family
        // face): this spec's envelope keys are the OLD family's words.
        // Null them unless the patch owns them — the compose doc drops
        // the key and the new family's spec-land seed re-derives it.
        const vocab = new Set();
        for (const r of spec.variants ?? []) {
            for (const k of Object.keys(r.sampler_envelope ?? {}))
                vocab.add(k);
        }
        for (const k of vocab) {
            if (!(k in patch))
                patch[k] = null;
        }
        // THE MOD BAG DIES WITH ITS MODEL (operator, 2026-10-16: "MODS
        // (LIKE LORAS) ARE PER MODEL. IF I SWITCH MODEL, KEEPING THE
        // LORA ON MAKES ZERO SENSE"): the departing spec's ARRAY-node
        // fields are mod currency (the bag law — user arrays are mod
        // picks: loras, ref_mods), picked FOR the departed model's
        // weights. A cross-model switch nulls them — the arrival model
        // starts clean, its own bag its own. Unconditional: even a
        // family that boards the same mod KIND never inherits another
        // model's picks. The NODE is the truth, never the presentation
        // type (an image_list mod and a bare lora bag are both bags).
        const subjects = imageSubjectKeysOf(spec);
        for (const k of bagKeysOf(spec)) {
            if (subjects.has(k))
                continue;
            if (!(k in patch))
                patch[k] = null;
        }
        // THE DEPARTED SURFACE DIES WITH ITS MODEL (the drill null-set
        // cure, 2026-11-08 — ERRORS item h / B8: 2511's double_reference
        // rode a 21 arrival until the run door refused it field-named):
        // a key the DEPARTED family declares that the ARRIVAL does not
        // declare is the departed family's own knob — it nulls in the
        // patch ("absent is not the unset law's null"), the seed consumes
        // the mark, and the write lands clean. BOTH surfaces must be
        // known (the served docs carry `params` — the DECL's own words):
        // with either surface unknown the verb refuses to guess (a wrong
        // null deletes a shared word's user intent; a missing null rides
        // the estate laneMigrate's own union-fallback drop). Shared words
        // (steps, prompt, the axes) never null — the pass-along law.
        if (Array.isArray(spec.params) && arrival !== undefined && Array.isArray(arrival.params)) {
            const arrivalWords = new Set(arrival.params);
            const axisWords = new Set(axisGroups(spec).map((g) => axisKey(g)));
            for (const k of spec.params) {
                if (k === 'model' || axisWords.has(k) || arrivalWords.has(k) || subjects.has(k))
                    continue;
                if (!(k in patch))
                    patch[k] = null;
            }
        }
    }
    else if (seededVariant !== undefined) {
        reconcilePick(patch, spec, seededVariant, held);
    }
    patch['model'] = model;
    return patch;
}
/** THE SWITCH-FRAME MERGE, ONE HOME (the drill null-set cure,
 *  2026-11-08 — the P4 merge-order half): a caller's frame merges
 *  UNDER a switch patch, but the patch's NULL verdicts — the
 *  departed-surface keys the verb deleted — BEAT the frame: an
 *  incoming frame that re-plants a departed stamp (a recipe re-point
 *  carrying the departed recipe key) dies here, and every other
 *  frame key keeps the caller-wins law. The single spelling both the
 *  drill's per-key seam and the walls ride; re-implementing the
 *  spread locally is how the caller-wins order silently grew.
 *  @param patch the switch verb's patch (its nulls are verdicts).
 *  @param frame the caller's own keys — they win except under a null
 *  verdict. */
export function mergeSwitchFrame(patch, frame) {
    const out = { ...patch, ...frame };
    for (const [k, v] of Object.entries(patch)) {
        if (v === null)
            out[k] = null;
    }
    return out;
}
/** THE EMPTY-SELECTION LAW's authoring decision (2026-10-10, the
 *  operator's live bench: a stage carrying quant:"" — born when a
 *  model switch CLEARED the axis to '' — which the RUN door refused:
 *  'unknown quant "" for model "z-image" variant "turbo" (known:
 *  int8)'). A stated EMPTY selection is UNSTATED: the authoring
 *  seat unsets the key instead of writing the empty string, so
 *  compose defaults the cell. ONE pure decision, shared by the seed
 *  (seedAxisValues omits) and the write (the drill's onSet unsets)
 *  — the form's rendering is untouched (a missing axis key reads
 *  as '' on screen). */
export function axisUnset(name, v, spec) {
    if (v !== "" || spec === null)
        return false;
    return axisGroups(spec).some((g) => axisKey(g) === name);
}
/** Seed the axis keys for a fresh stage (the catalog's first-declared
 *  law: each axis defaults to its FIRST composing row). Held values
 *  win (a reopened stage never re-seeds). The key a re-seed WRITES is
 *  the value the DOOR reads (axisStampOf) — never the flat row id. */
export function seedAxisValues(spec, held) {
    const out = {};
    const groups = axisGroups(spec);
    if (groups.length === 0)
        return out;
    const active = {};
    for (const g of groups) {
        const heldKey = typeof held[axisKey(g)] === 'string' ? held[axisKey(g)] : '';
        const rows = rowsFor(spec, g);
        const heldRow = rows.find((x) => x.id === heldKey);
        // THE STAMP PLANE (D2, 2026-11-06): the chain (`active`) walks ROW
        // IDS, but the key the seed writes is the value the DOOR reads
        // (axisStampOf — the cell quant for Quant, the row id for every
        // other group). A duplicate cell id's served row id is the
        // serializer's NAMESPACED catalog spelling ('turbo__int8_convrot'
        // — presentation, keeping the form's select options unique),
        // while composeValidate clause 2 and the estate door
        // (cardsVariant.ts selectCardVariant, c.quant === rawQuant) judge
        // the RAW coordinate — the old row-id stamp made a ghost-dropped
        // reopen whose held variant is a LATER variant refuse at the run
        // ('unknown quant "turbo__int8_convrot"'). Held keys echo
        // verbatim (the pass-along law; the ghost drop in seedUser is
        // the only deletion seat — it never rewrites either).
        let write;
        if (heldRow !== undefined) {
            active[g] = heldRow.id;
            write = heldRow.id;
        }
        else {
            // first COMPOSING row (the chain law); when nothing composes the
            // axis rests empty — never a non-composing row
            const composing = composingRows(spec, g, active);
            if (composing.length > 0) {
                active[g] = composing[0].id;
                write = axisStampOf(composing[0]);
            }
            else {
                active[g] = '';
                write = '';
            }
        }
        // THE EMPTY-SELECTION LAW's form half (2026-10-10, the
        // operator's live bench: a stage born with quant:"" that the
        // RUN door refused — "unknown quant \"\"" for a lane whose only
        // cell is int8). An axis with no composing row is UNSTATED, not
        // stated-empty: the key is omitted so compose defaults it. The
        // "" value was a form's unchosen control written as a value —
        // the form rendering never changes (an axisKey the values lack
        // reads as '' on the form side; the seed is params).
        if (write !== "")
            out[axisKey(g)] = write;
    }
    const heldModel = held['model'];
    if (typeof heldModel !== 'string' || heldModel === '') {
        // THE MODEL ARM IS THE FAMILY (stroke 21): the seeded row's
        // re-point (qwen-img-edit-2511-lightning4) is the server's
        // compose stamp — the user plane never holds a route
        const model = typeof spec.model === 'string' && spec.model !== '' ? spec.model : '';
        if (model !== '')
            out['model'] = model;
    }
    return out;
}
/** Seed a stage's USER layer from its held params (the bench's
 * stage.params — the only migration seam). Presence-based, per the
 * settings law: every HELD key rides verbatim (the override marks
 * survived the reopen), the absent axis keys seed per the axis law
 * (seedAxisValues above — first composing row, one direction).
 *
 * THE ONE VALIDATION CLAUSE (never value-compare): a held `recipe`
 * the card's schema does not declare is poison — the dead
 * card-recipe layer's stamp (strokes 33+34). Dropped on open, so
 * the run flush's null-domain half deletes the bench key and the
 * card composes again. Everything else rides untouched.
 *
 * PURE — the caller owns the write (onSet per fresh key). */
export function seedUser(spec, held) {
    const out = { ...held, ...seedAxisValues(spec, held) };
    if (!fieldsOf(spec).some((f) => f.name === 'recipe')) {
        // EVERY DROP IS NAMED (2026-10-16, audit 3f0b7c1a ui-truth-gap
        // #6, the allow-law): this clause deleted a dead card-recipe
        // stamp in silence — the audio-clip pattern's voice is the
        // estate's (name the key, name the why, name the consequence).
        if ('recipe' in out) {
            console.warn(`card-base: seedUser dropped held 'recipe' — this card's schema declares no recipe field (the dead card-recipe layer); the run flush deletes the bench key.`);
        }
        delete out['recipe'];
    }
    // THE GHOST DROP (2026-10-16, the model-switch lock): a held axis
    // value that names no row of THIS spec's composing chain is a
    // departed family's ghost — krea-2's quant int8 riding anima's
    // cell-less turbo through a refused write, refusing every later
    // edit at the compose gate ('the write never left the studio')
    // while the studio shows the new family. The pass-along law
    // protects USER WORDS; a departed family's row id is not one.
    // Axes walk in order and the chain reads the LIVE map, so a ghost
    // variant also unseats the quant that composed only under it.
    for (const g of axisGroups(spec)) {
        const k = axisKey(g);
        const v = out[k];
        if (typeof v !== 'string' || v === '')
            continue;
        const active = {};
        for (const g2 of axisGroups(spec)) {
            if (g2 === g)
                continue;
            const v2 = out[axisKey(g2)];
            if (typeof v2 === 'string' && v2 !== '')
                active[g2] = v2;
        }
        if (!composingRows(spec, g, active).some((r) => r.id === v || (r.quant ?? '') === v)) {
            console.warn(`card-base: seedUser dropped held '${k}' = "${v}" — it names no row of this spec's composing chain (a departed family's ghost); the write never left the studio.`);
            delete out[k];
        }
    }
    // THE MOD BAG DIES WITH ITS MODEL (operator, 2026-10-16: "MODS
    // (LIKE LORAS) ARE PER MODEL"): a held ARRAY is mod currency (the
    // bag law — user arrays are mod picks: loras, ref_mods), picked
    // for the model that held it. When the held doc's model is not
    // THIS spec's model — the ghost's own entry: a failed switch left
    // the departed family's state under the arrival's spec — the bag
    // drops at the seed instead of riding into a compose that either
    // refuses every later write or silently mis-feeds the new weights.
    // Same model: the bag is that model's own and stays.
    const heldModel = typeof held['model'] === 'string' ? held['model'] : '';
    if (heldModel !== '' && heldModel !== spec.model) {
        for (const k of Object.keys(out)) {
            if (Array.isArray(out[k])) {
                console.warn(`card-base: seedUser dropped held mod bag '${k}' — picked for model "${heldModel}", this stage's spec is "${spec.model}" (mods are per model).`);
                delete out[k];
            }
        }
    }
    // THE UNSET MARK IS CONSUMED AT THE SEED (2026-11-08, the drill
    // null-set cure): a NULL user value is the switch verbs' delete
    // marker (the departed-surface nulls ride the patch as nulls —
    // "absent is not the unset law's null"), and the seed is where the
    // mark fires: the holding the arrival spec seeds NEVER carries the
    // key, exactly like a key the verb deleted. A null that survived
    // the seed would ride compose as an unstated-but-present key — the
    // merge-patch null's work done twice, or worse, refused field-named
    // by a door that reads presence, not value.
    for (const k of Object.keys(out)) {
        if (out[k] === null) {
            console.warn(`card-base: seedUser consumed the unset mark on held '${k}' — a null user value is the switch verbs' delete marker; the holding drops the key.`);
            delete out[k];
        }
    }
    return out;
}
/** THE MODEL-REKEY RESEAT (order d, operator 2026-11-06: "model-switch
 *  leaves stale cfg 3.5 outside the new lane envelope [1,2] — re-seat
 *  envelope-bound params to new lane defaults on switch"). The
 *  cross-family null set in modelSwitchPatch reads only the
 *  DEPARTING spec's envelope keys — an envelope-less departure
 *  (anima/z-image/h3) nulls nothing, so a stated cfg 3.5 rides the
 *  seed VERBATIM into the arrival family's first lane (krea-2
 *  turbo, cfg [1,2]) and every door refuses it. This verb runs at
 *  the ARRIVAL re-spec seed's re-key arm only: the seeded user
 *  layer's envelope-bound numerics reconcile against the RESOLVED
 *  VARIANT's envelope (overrideEnvelopeKeys — outside clamps to the
 *  nearest bound, absent keys seed from the offered row's own
 *  truth), exactly what a pick at that seat would do. A fresh open
 *  NEVER rides it (the reopen rides verbatim — seedUser's law).
 *  PURE — the caller owns the write. */
export function reseatEnvelopeKeys(spec, seeded) {
    const offered = offeredVariantOf(spec.variants ?? [], seeded);
    if (offered === undefined || offered.sampler_envelope == null)
        return seeded;
    const patch = {};
    overrideEnvelopeKeys(patch, spec, offered, seeded, false);
    if (Object.keys(patch).length === 0)
        return seeded;
    return { ...seeded, ...patch };
}
/** THE RECIPE BIRTH-STAMP (D12, 2026-10-23, the operator's "Default
 *  needs to be a 4 step LORA"; k 2026-11-08 — the initial-recipe
 *  law): a fresh card is born stamped with the DECLARED default
 *  Recipe row's payload — `features.variant_groups.Recipe.default`
 *  (served from the DECL's variant_groups by groupContract), never
 *  the first row by declaration order (row order is presentation;
 *  the old first-composing law was row-order-emergent state). No
 *  declaration, or a declaration naming no composing row → BLANK:
 *  nothing stamps. The axis seed writes axis KEYS only
 *  (seedAxisValues — and the Recipe group YIELDS, never an axis),
 *  and compose never applies recipe wire_defaults server-side (the
 *  card carries recipe as a rider); without this, a payload-carrying
 *  default recipe would compose unstamped. The stamp mirrors the
 *  pick verb (axisPickPatch minus the re-point: the `model` route
 *  resolves server-side, never lands in the user layer) for keys
 *  the seed does not hold — seeded axes win, so a DECL-authored
 *  axis key inside a payload can never corrupt the chain. The bag
 *  rides the USER layer on purpose (resolveValue skips base/model
 *  arrays — a resolver-stamped bag would compose invisible). PURE —
 *  the caller owns the write (the add door). */
export function seedRecipeStamp(spec, seeds) {
    const active = {};
    for (const g of axisGroups(spec)) {
        const held = seeds[axisKey(g)];
        if (typeof held === 'string' && held !== '')
            active[g] = held;
    }
    const declared = spec.features?.['variant_groups']?.['Recipe']?.['default'];
    if (typeof declared !== 'string' || declared === '')
        return seeds;
    const row = composingRows(spec, 'Recipe', active).find((r) => r.id === declared);
    if (row === undefined)
        return seeds;
    const out = { ...seeds };
    for (const [k, v] of Object.entries(row.defaults)) {
        if (k === 'model')
            continue;
        if (k in out)
            continue;
        out[k] = v;
    }
    return out;
}
/** THE BLANK RECIPE WRITE (k, 2026-11-08): picking "no recipe" is a
 *  real write, not a face. Every key the ACTIVE row stamps that the
 *  held layer still carries at the stamp value unstated (null
 *  deletes at compose) — the D4 departed-preset law applied to a
 *  departure-to-nothing: a key the user hand-edited away from the
 *  stamp is the user's word and stands (deepEqualJson, the F3 fix —
 *  `===` never matched an array bag). NEVER a persisted `recipe`
 *  key (the dead card-recipe layer; the compose door refuses the
 *  undeclared param). PURE — the caller owns the write. */
export function recipeDeparturePatch(row, held) {
    const patch = {};
    for (const [k, v] of Object.entries(row.defaults)) {
        if (k === 'model')
            continue;
        if (held !== undefined && deepEqualJson(held[k], v))
            patch[k] = null;
    }
    return patch;
}
// ── THE CLIENT'S COMPOSE GATE (2026-09-29, the operator's law: "IF
//    THE CARD IS A CONTRACT/SCHEMA, HOW DOES THE SYSTEM
//    ALLOW CONSTRUCTING BAD CONTRACTS? IT CAN ALL BE VALIDATED
//    BEFOREHAND, IN THE CODE") ───────────────────────────────────
// The estate door has always held this law (cardsVariant.ts:
// selectVariant + envelopeRefusal) — but the door judges AFTER the
// wire, on the merged doc. The client was a DELTA-EMITTER: per-key
// patches over state held elsewhere, so no full doc existed at the
// composer and validation could only live at the state-holder. The
// composer now assembles the CANDIDATE doc and runs the door's OWN
// law over the SERVED spec BEFORE any frame exists.
//
// THE MIRROR DISCIPLINE: exactly the door's clauses, no stricter, no
// looser. A client gate stricter than the door refuses writes the
// estate would admit (a new lie); looser lets the door be the first
// line again (the old lie). Since the resolver consolidation (D6,
// 2026-10-17) the discipline is STRUCTURAL — the clauses ARE the
// door's: offeredVariantOf/composeValidate delegate the
// pool/variant/cell walk to the same @melite/contracts resolver the
// door calls, so a door-law change lands once and this gate rides
// it (the mirror wall still pins the behavior).
//   clause 1 (marriage): a stated variant must be an offered
//     Variant-row id of this spec (the door: selectVariant's
//     unknown-variant refusal);
//   clause 2 (quant cell): a stated quant must be a Quant row owned
//     by the stated variant (the door: selectVariant's cell refusal);
//   clause 3 (envelope): a numeric steps/cfg stated in the doc must
//     sit inside the STATED variant's sampler_envelope — the door:
//     envelopeRefusal, the exact break that fired the operator's
//     live incident ('stated cfg 3.5 is OUTSIDE the route envelope
//     for variant "turbo" — the declared envelope is [1, 2]').
//   The door's own skips mirror verbatim: an unstated variant
//   RESOLVES to the door's pool[0] (never skipped — the second live
//   break: the gate once skipped the quant clause on unstated
//   variants while the door judged against pool[0], and a poisoned
//   quant sailed through); a non-numeric stated knob is skipped
//   (the door's own typeof guard); a variant with no envelope
//   declares nothing; a doc whose model points at another family is
//   judged by THAT family's spec, not this one.
/** THE MIRROR'S COORDINATE SEAT (D6 2026-10-17 — the resolver
 *  consolidation): offeredVariantOf and composeValidate no longer
 *  hand-roll the pool/variant/cell walk; they fold the served flat
 *  rows (variantMatrixFromFlatRows) and delegate to the ONE resolver
 *  in @melite/contracts — the same calls the estate door
 *  (cardsVariant.ts selectCardVariant) makes over its nested facts
 *  matrix. The MIRROR DISCIPLINE above is no longer a hand
 *  discipline: the clauses cannot drift because there is one
 *  spelling. The seat keeps only what its surface owns: the
 *  model-mismatch skip, the 'card_compose:' frame, and clause 3's
 *  marriage clause decoration. */
/** THE AXES' UNCHOSEN MARK (the client doc plane, D6): the axes'
 *  resting doc carries '' for coordinates the user has not picked
 *  (the empty-selection law — seedUser drops them, the run flush
 *  deletes the key before the wire). The ONE resolver's stated law
 *  is the WIRE's ('' = stated garbage — the door's false-admit
 *  cure, `unknown quant ""`); the mirror translates its plane
 *  before the call: '' reads as unstated on the client doc, and the
 *  wire never sees it. */
const unchosenToUnstated = (v) => (v === '' ? null : v);
/** The door's variant resolution, ONE spelling (the dragbar clamp,
 *  2026-10-13): the stated variant matched by id OR route over the
 *  matrix, else pool[0] — the row whose sampler_envelope the
 *  judge and the form's dragbar clamps BOTH read. Undefined only
 *  when the pool itself is empty (an all-Recipe matrix) or the
 *  stated id misses the matrix (the miss voice is composeValidate's
 *  own). A hidden row cannot occur on a served matrix; if a caller
 *  hands one, the row resolves exactly as the pre-consolidation
 *  pool read it (hide flags were never the mirror's pool law).
 *  @param all the spec's full variants array, cells included.
 *  @param doc the resolved display doc (the held variant key). */
export function offeredVariantOf(all, doc) {
    const r = resolveVariantRow(variantMatrixFromFlatRows(all), unchosenToUnstated(doc['variant']), '', 'offered');
    return r.status === 'resolved' || r.status === 'hidden' ? r.variant : undefined;
}
/** THE FAMILY-CLAUSE PRESENCE GRAMMAR (spec.ts, the family clause):
 *  a stated key counts, null/undefined never does, strings when
 *  non-empty after trim, arrays when non-empty, any other value
 *  always. Mirrors the estate walk's explicit-key law and
 *  normalizeDeclaredRefs's wire-literal counting at the presence
 *  grain (a whitespace ref string is ZERO refs on both spellings). */
function familyKeyPresent(v) {
    if (v === null || v === undefined)
        return false;
    if (typeof v === 'string')
        return v.trim() !== '';
    if (Array.isArray(v))
        return v.length > 0;
    return true;
}
/** THE FAMILY-LANE DERIVATION, generic over the served familyLaw
 *  data (the DECL's own law, pinned to the family's derivation
 *  module by the contract wall): lanes in declared order, first
 *  match wins — minCalls against the calls length, guideKeys at the
 *  doc level, callGuideKeys inside each calls row; a lane with no
 *  qualifiers is the fallthrough (h3's t4_open). No match = the
 *  last declared lane. */
function deriveFamilyLane(law, doc) {
    const calls = Array.isArray(doc['calls']) ? doc['calls'] : [];
    for (const lane of law.lanes) {
        if (lane.minCalls === undefined && lane.guideKeys === undefined && lane.callGuideKeys === undefined) {
            return lane.lane;
        }
        if (lane.minCalls !== undefined && calls.length >= lane.minCalls)
            return lane.lane;
        if (lane.guideKeys?.some((k) => familyKeyPresent(doc[k])))
            return lane.lane;
        if (lane.callGuideKeys?.some((k) => calls.some((c) => familyKeyPresent(c?.[k]))))
            return lane.lane;
    }
    return law.lanes[law.lanes.length - 1]?.lane ?? '';
}
/** THE DOC'S RESOLVED LANE COORDINATE, ONE SPELLING (the tts lockout
 *  cure, 2026-11-10): the (variant × quant) the estate door resolves
 *  for this doc — the stated variant, else pool[0] (the shared
 *  resolver's own law); the stated quant, else the variant's FIRST
 *  cell (selectCardVariant's unstated law). Null when the coordinate
 *  does not resolve (a stated variant/quant the matrix does not
 *  know): the callers degrade, never guess. */
function resolvedLaneCoordinate(spec, values) {
    const matrix = variantMatrixFromFlatRows(spec.variants ?? []);
    const vres = resolveVariantRow(matrix, unchosenToUnstated(values['variant']), '', 'offered');
    if (vres.status === 'missing' || vres.status === 'pool-empty')
        return null;
    const offered = vres.variant;
    const statedQuant = typeof values['quant'] === 'string' && values['quant'] !== ''
        ? values['quant']
        : null;
    if (statedQuant !== null) {
        const qres = resolveCellRow(offered, statedQuant, '', 'offered');
        if (qres.status === 'missing')
            return null;
        return { variantId: offered.id, quantId: qres.quant !== '' ? qres.quant : null };
    }
    const firstQuant = (offered.cells ?? [])[0]?.quant;
    return { variantId: offered.id, quantId: typeof firstQuant === 'string' ? firstQuant : null };
}
/** THE MIRROR'S RESOLVED SURFACE (the tts lockout cure, 2026-11-10):
 *  the doc's lane surface — family base ∪ variant additions ∪ cell
 *  additions — the SAME merged surface the estate write door judges
 *  (cardsRegistry admitFamily's laneSurfaceOf call) and the form's
 *  own visibility read (fieldOnLane). The mirror judged the FAMILY
 *  BASE projection alone (the served `params`) and refused the
 *  variant's own persona picker ('voice') on the 0.6B customvoice
 *  cell — the operator's lockout: voice rides the VARIANT's params
 *  at both sizes, style_instruction is CELL-exclusive to 1.7B.
 *  Resolution rides the same shared resolvers clause 2/3 ride.
 *  Null = the family declares no resolved surface (no lanes block,
 *  or a lanes block with an absent base — the surface-less family's
 *  own truth): the caller keeps its legacy behavior, never a guess. */
function resolvedLaneSurface(spec, doc) {
    if (spec.lanes === undefined)
        return null;
    const coord = resolvedLaneCoordinate(spec, doc);
    if (coord === null)
        return spec.lanes.base ?? null;
    return laneSurfaceFor(spec, coord.variantId, coord.quantId);
}
/** THE REOPEN CARRY DROP (the stale-carry reopen cure, 2026-10-21 —
 *  the saved-doc heal). dropStaleAxisCarry seats the prev ∩ ¬next
 *  drop at the PICK only; a SAVED doc that arrives already resolved
 *  to a lane its stated keys do not serve (written by an older door,
 *  patched by the agent, restored from an older save) rides ghosts
 *  the press gate refuses forever — the user never typed the key on
 *  THIS lane, so no unstamp affordance exists for it. The reopen
 *  derives the drop from the RESOLVED surface alone: every STATED
 *  key the resolved lane cannot state — not on its surface, not a
 *  mod bag's param_key, not transport (model + axis keys) — is dead
 *  *  carry BY CONSTRUCTION: the form renders no widget for it and the
 *  estate door refuses off-lane writes, so a saved doc never carries
 *  fresh authoring there — EXCEPT the keys the DECL declares
 *  studio-owned (studio_writes): those the card's studio tenant
 *  authors through its own door (h3: the keyframes pin channel), and
 *  the heal sanctions them exactly as the compose mirror does. Blank
 *  carried keys have nothing to drop; a carrier with no lanes block
 *  (or a surface-less family) drops nothing — never a guess. PURE —
 *  the caller owns the write: the drill's open effect flushes the
 *  nulls through the ledger like a pick's drop (a null deletes the
 *  bench key).
 *  @param spec the doc's served form-spec.
 *  @param held the SAVED doc the drill opened.
 *  @returns the null-patch for the dead carried keys ({} when the
 *    doc is already stateable on its resolved lane). */
export function dropStaleReopenCarry(spec, held) {
    const out = {};
    if (held === undefined)
        return out;
    const surface = resolvedLaneSurface(spec, held);
    if (surface === null)
        return out;
    const axisKeys = new Set(axisGroups(spec).map((g) => axisKey(g)));
    const modKeys = modOwnedFields(spec);
    // THE STUDIO-OWNED SANCTION (the reopen-clobber cure, 2026-11-12):
    // the compose mirror already sanctions the DECL's studio.writes
    // (the h¹ mirror-truth cure — composeValidate's declared set) and
    // the estate write door sanctions the same names at admission.
    // This heal is the THIRD judge of that surface and it judged the
    // studio's document plane dead carry: the h3 reopen nulled a
    // persisted `keyframes` pin (studio-authored, off the form's lane
    // surface BY DESIGN — the pin channel is a studio tenant channel,
    // never a form knob) one silent null write at drill open, and the
    // studio's starter law then re-authored a fresh doc over the
    // hole. A key the DECL declares studio-owned is sanctioned exactly
    // as the mirror sanctions it — one truth, three seats.
    const studioKeys = new Set(spec.studio_writes ?? []);
    for (const [k, v] of Object.entries(held)) {
        if (k === 'model' || k === 'variant' || k === 'quant' || axisKeys.has(k))
            continue;
        if (modKeys.has(k))
            continue;
        if (studioKeys.has(k))
            continue;
        if (surface.includes(k))
            continue;
        if (laneBlank(v))
            continue;
        out[k] = null;
    }
    return out;
}
export function composeValidate(spec, doc) {
    if (spec === null)
        return [];
    const heldModel = doc['model'];
    if (typeof heldModel === 'string' && heldModel !== '' && spec.model !== undefined
        && spec.model !== '' && heldModel !== spec.model) {
        // THE SPEC'S OWN RE-POINTS ARE ITS LAW (the family-clause cure,
        // 2026-11-08): a checkpoint-axis variant re-points the MODEL key
        // at its route (h3's singularity row: model 'h3-singularity' on
        // the h3 spec) — the switch patch stamps it, and the door reads
        // the same family spec for every variant of the family. A held
        // model one of THIS spec's own rows stamps is this spec's law;
        // anything else is another family's doc (the drill refetches per
        // family) and the door will read its spec.
        const own = (spec.variants ?? []).some((r) => r.route === heldModel || r.id === heldModel || r.defaults?.['model'] === heldModel);
        if (!own)
            return [];
    }
    const out = [];
    // THE MIRROR CLAUSE (the drill null-set cure, 2026-11-08 — the
    // all-green fraud face): a doc key NO declared surface owns is the
    // departed family's own knob riding the arrival — the estate
    // admission gate refuses it FIELD-NAMED ("field 'double_reference'
    // fires nothing on this lane"), while this mirror greened the doc
    // and every suite stayed green. The mirror speaks the door's voice
    // BEFORE the wire. THE RESOLVED SURFACE (the tts lockout cure,
    // 2026-11-10): the judged surface is the doc's RESOLVED
    // (variant × quant) lane — family base ∪ variant additions ∪ cell
    // additions (resolvedLaneSurface, one spelling with the estate
    // write door) — never the family base projection alone: that
    // projection refused the variant's own persona picker ('voice') on
    // the 0.6B customvoice cell and locked the operator out of TTS
    // while the bench door admitted the same state. `model` and the
    // axis keys are the transport's own words, never doc surface. THE
    // ARRIVAL FLOOR ((h2) remainder, the stage-drill `arrival !== ''`
    // floor at the mirror): an arrival that has not named itself
    // (model '') must never clobber the doc's voice — the mirror
    // refuses to guess until the surface is named. A family that
    // declares NO resolved surface (no lanes block, or a lanes block
    // with an absent base) keeps its legacy truth: the served
    // `params` judged verbatim when present, else no mirror at all —
    // never a guess.
    if (spec.model !== '') {
        const resolved = resolvedLaneSurface(spec, doc);
        const legacy = resolved === null && spec.lanes === undefined && Array.isArray(spec.params)
            ? spec.params
            : null;
        const surface = resolved ?? legacy;
        if (surface !== null) {
            const declared = new Set(surface);
            for (const g of axisGroups(spec))
                declared.add(axisKey(g));
            declared.add('model');
            // THE STUDIO-OWNED SURFACE (h¹, the mirror-truth cure): the
            // estate's write door sanctions the DECL's studio.writes beside
            // params — the mirror sanctions the same set or it refuses the
            // studio's own document plane (calls + keyframes on every real
            // film doc), a lie that blocked every pick and every
            // flip-settlement recheck.
            for (const k of spec.studio_writes ?? [])
                declared.add(k);
            // THE MOD-SURFACE SANCTION (E2-11, the operator's burn — its
            // verbatim voice lives in the ERRORS_2 ledger): a key a card-declared mod kind owns — its
            // param_key bag plus its envelope's field names — is DECLARED
            // surface, exactly like a schema knob. The mirror refused the
            // mask mod's own bag as "field 'mask' … the served surface
            // does not declare it": a lie (the family boards the pack; the
            // estate's admission gate sanctions the same names via the
            // absorbed-mod interlock, cardsCompose.ts). Whether the plane
            // BUILDS the mod's lane is the compose door's firing voice,
            // never this clause's undeclared-surface voice.
            for (const k of modOwnedFields(spec))
                declared.add(k);
            for (const k of Object.keys(doc)) {
                if (k === 'model' || declared.has(k))
                    continue;
                out.push({
                    message: 'card_compose: field \'' + k + '\' fires nothing on this lane — the served surface (' + (spec.model ?? '') + ') does not declare it; the estate admission gate refuses the same key field-named at the write door.',
                    field: k,
                });
            }
        }
    }
    // THE FAMILY CLAUSE (the ERROR g/h cure, 2026-11-08): a family-
    // conditional card (familyLaw served off the DECL) derives the
    // doc's lane from the doc's OWN shape and refuses the keys that
    // lane refuses — the gesture gate speaks the walk's refusal BEFORE
    // the wire (the estate's admitFamily/walk judge the same explicit
    // presence at the write/run doors; where the mirror clause above
    // names keys NO surface owns, this one names keys the DERIVED
    // lane refuses). Presence grammar mirrors the walk: a stated key
    // counts, null/absent never does, strings when non-empty after
    // trim, arrays when non-empty (the ref surface's wire spelling).
    if (spec.familyLaw !== undefined) {
        const lane = deriveFamilyLane(spec.familyLaw, doc);
        const dead = spec.familyLaw.deadKeys[lane];
        if (dead !== undefined) {
            const deadSet = new Set(dead);
            for (const k of Object.keys(doc)) {
                if (k === 'model' || !familyKeyPresent(doc[k]) || !deadSet.has(k))
                    continue;
                out.push({
                    message: 'card_compose: field \'' + k + '\' fires nothing on the ' + lane + ' lane — the lane refuses it (unsanctioned inject keys); the estate walk refuses the same key at the door.',
                    field: k,
                });
            }
        }
    }
    const all = spec.variants ?? [];
    // THE DOOR'S POOL + STATED SEARCH, DELEGATED (the resolver
    // consolidation): the fold re-nests the served flat rows and the
    // shared resolver resolves the stated variant exactly as the door
    // resolves the body's — the stated search over the whole matrix,
    // the unstated one through pool[0], the miss speaking the matrix's
    // own ids.
    const matrix = variantMatrixFromFlatRows(all);
    const rawVariant = doc['variant'];
    const vres = resolveVariantRow(matrix, unchosenToUnstated(rawVariant), '', 'offered');
    if (vres.status === 'missing') {
        out.push({
            message: 'card_compose: ' + unknownVariantVoice(vres.stated, spec.model ?? '', vres.known),
        });
        return out;
    }
    if (vres.status === 'pool-empty') {
        // An all-Recipe matrix has no variant to judge against — the
        // pre-consolidation pool[0]-undefined skip, verbatim.
        return out;
    }
    // Only 'resolved' | 'hidden' remain — both carry the row. A served
    // matrix never carries hidden rows; a handed one judges exactly as
    // the pre-consolidation pool read it (hide flags were never the
    // mirror's pool law).
    const offered = vres.variant;
    // clause 2 — the stated quant must be a cell of THIS variant
    // (the resolver judges the quant VALUE against the folded cells —
    // the coordinate is the value and, since THE SHARED QUANT
    // VOCABULARY (2026-11-08), the served row id too; a handed legacy
    // spec may still carry composite ids, which are addresses the
    // mirror never judges).
    const rawQuant = doc['quant'];
    if (typeof rawQuant === 'string' && rawQuant !== '') {
        const qres = resolveCellRow(offered, rawQuant, '', 'offered');
        if (qres.status === 'missing') {
            out.push({
                message: 'card_compose: ' + unknownQuantVoice(qres.stated, spec.model ?? '', offered.id, qres.known),
            });
        }
    }
    // clause 3 — the envelope, against the RESOLVED variant (the
    // stated one, else the door's pool[0] — never the still-held
    // one: the half-switch's whole failure was the door judging
    // raw's cfg against turbo's envelope). The door judges the RAW
    // body BEFORE the overlay stamps (stampCardOverlay calls
    // envelopeRefusal first) — so only EXPLICIT numeric knobs count,
    // never composed defaults.
    // THE ONE JUDGE (the voice audit, 2026-10-11): the body
    // composes in @melite/contracts — the door's envelopeRefusal
    // asks the same judge, so the mirror and the door can no
    // longer spell two truths. The client's frame stays phase-less
    // (the press-side lint never knows the door's phase); the
    // door adds the marriage clause + lane-read tail it owns.
    const off = judgeSamplerEnvelope(doc, offered.sampler_envelope ?? null, {
        id: offered.id,
        route: offered.route,
    });
    if (off !== null) {
        out.push({
            message: 'card_compose: ' + off.voice
                + '. ' + samplerEnvelopeCure(),
        });
    }
    return out;
}
/** Compose the CANDIDATE doc the door would judge: the bench row's
 *  held params, the user layer's overrides, then the in-flight frame
 *  — later layers win, and a null value DELETES the key (the wire's
 *  own unset law). This is composition: the full doc, assembled
 *  where the edit happens, so the law can run BEFORE the write. */
export function composeCandidateDoc(held, user, frame) {
    const doc = { ...held, ...user };
    for (const [k, v] of Object.entries(frame)) {
        if (v === null)
            delete doc[k];
        else
            doc[k] = v;
    }
    return doc;
}
//# sourceMappingURL=spec.js.map