// models/service.ts — THE MODELS SYSTEM AS A CORDIS SERVICE
// (operator order, 2026-09-08: "the Models are not cordis" — the
// charge that named the PORT LAW violation this file fixes).
//
// THE PORT LAW (AGENTS.md, THE CORDIS STDLIB): a ported retired system
// is REGISTERED THROUGH SERVICES with boot-loud validation — never
// a module const + free functions over it. The frozen registry
// (the retired registry.generated module) is DATA (catalog rows may be frozen);
// the SYSTEM — registration, validation, resolution, the cascade —
// lives here, on a Service, reached through ctx.models.
//
// Mapping from the (melite_models grammar @ 034e1f97):
//   Model class construction (metaclass validation, loud at
//     import)  → registerModel (loud at registration — a broken
//     row never serves, the same refusal shapes)
//   resolve_model / variant_of / cell_of → service members
//   merged_defaults (the cascade) → rides ctx.intercept +
//     Service[symbols.resolveConfig] (the inherency primitive —
//     base=family, intercept=variant, head=cell; see cascade.ts)
//   the catalog scan (OFFERING LAW + engine gate) → servedModels()
//
// Boot: models.ts (the compatibility facade) loads this service
// once per process and registers every frozen row through it.
import { Context, Service, symbols } from "@deepseek-ai/cordis";
import { checkModelPathPresent, findModelPresent, loadCatalogModels, resolveArtifactRows, } from "../catalog.js";
import { loadEndpointConfig, packageRoot, resolveRepoRoot } from "../comfyui.js";
import { join } from "node:path";
import { ModelError, EngineFacts, ModelDecl as ModelDeclSchema, DeclVariantRow as VariantRowSchema, ParamRelationWords as ParamRelationWordsSchema, } from "./families/contract.js";
import { validateWriteRowsAgainstActions } from "./validate.js";
import Schema from "@deepseek-ai/schemastery";
import { buildCatalog } from "./catalogEmission.js";
import { loadFamilies } from "./families/index.js";
export const MODELS_SERVICE = "models";
/** One registration's validation — the declaration gates,
 *  refusal-for-refusal (grammar @ 034e1f97).
 *
 *  SCHEMA LEG (ledger row 16, 2026-09-10): the DECL resolves through
 *  the ModelDecl schema STRICTLY first. The strict resolve strips
 *  unknown keys — the `extra: forbid` rule made honest: a stripped
 *  key is DRIFT and refuses loud (the plain object resolver merges
 *  unknown keys by default; the old handroll checked four fields and
 *  let everything else ride). The semantic predicates below stay:
 *  lowercase ids, the genre wire value, quant presence — laws a
 *  shape schema cannot express. */
function validateDecl(decl) {
    if (typeof decl.id !== "string" || decl.id === "") {
        throw new ModelError(`model row needs an id (got '${String(decl.id)}')`);
    }
    if (decl.id !== decl.id.toLowerCase()) {
        throw new ModelError(`${decl.id}: ids are lowercase (the wire contract)`);
    }
    if (typeof decl.label !== "string" || decl.label === "") {
        throw new ModelError(`${decl.id}: a model needs a label`);
    }
    const genre = decl.genre ?? "";
    if (!/^[a-z0-9]*$/.test(genre) || genre === "") {
        throw new ModelError(`${decl.id}: genre '${genre}' is not a wire value (the enum-repr corruption refuses here, forever)`);
    }
    if (decl.lane_inputs !== undefined && (typeof decl.lane_inputs !== "object" || decl.lane_inputs === null || Array.isArray(decl.lane_inputs))) {
        throw new ModelError(`${decl.id}: lane_inputs must be a plain object (the compose splice table)`);
    }
    // THE LANE-HOME WALL (the lane-presence cure, 2026-10-23): a
    // lane_homes row names the store folder a declaration-only lane
    // file lives in, and the run gate probes it at press — a typo'd
    // row (`folder: "/audio"`, `..` traversal, a slot lane_inputs
    // never declared) would probe a folder no store copy occupies
    // and turn every press into a false missing-model refusal. The
    // same axes the provisions wall refuses above, registration
    // time, in the family's voice.
    if (decl.lane_homes !== undefined) {
        if (typeof decl.lane_homes !== "object" || decl.lane_homes === null || Array.isArray(decl.lane_homes)) {
            throw new ModelError(`${decl.id}: lane_homes must be a plain object (slot → store folder)`);
        }
        // the family's lane truth is base ∪ variants — a slot only a
        // variant declares (ace-step's per-variant model_path) still
        // carries its home at the family level
        const slots = new Set(Object.keys(decl.lane_inputs ?? {}));
        for (const v of decl.variants) {
            for (const key of Object.keys(v.lane_inputs ?? {}))
                slots.add(key);
        }
        for (const [slot, home] of Object.entries(decl.lane_homes)) {
            if (!slots.has(slot)) {
                throw new ModelError(`${decl.id}: lane_homes slot '${slot}' is not a lane_inputs key — a home declares where a declared file lives`);
            }
            if (typeof home !== "string" || home === "" || home.startsWith("/") || home.endsWith("/") || home.includes("\\") || home.split("/").some((part) => part === "" || part === "." || part === "..")) {
                throw new ModelError(`${decl.id}: lane_homes folder '${String(home)}' for '${slot}' must name one real folder under the models root (no empty segments, no traversal)`);
            }
        }
    }
    if (!Array.isArray(decl.variants)) {
        throw new ModelError(`${decl.id}: variants must be an array (got ${typeof decl.variants})`);
    }
    // THE PROVISIONS-REGISTRATION WALL (audit T-S2, 2026-10-22): the
    // z schema only proves name/url/folder are STRINGS — a typo'd row
    // (`name: "a/b"`, `folder: "../x"`, `url: "not-a-url"`) booted
    // green and detonated at the FIRST provision as a run-path
    // refusal. The three axes the schema cannot spell are refused
    // HERE, at boot, in the family's voice. This is the declared twin
    // of the fetch-time confinement in provisioning/src/service.ts
    // (relativeArtifactPath) — same axes, registration time.
    if (decl.provisions !== undefined) {
        for (const row of decl.provisions) {
            if (row.name === "" || row.name.includes("/") || row.name.includes("\\") || row.name === "." || row.name === "..") {
                throw new ModelError(`${decl.id}: provision name '${row.name}' must be one bare path segment (the fetch keys the file by it)`);
            }
            if (row.folder === "" || row.folder.startsWith("/") || row.folder.includes("\\") || row.folder.split("/").some((part) => part === "..")) {
                throw new ModelError(`${decl.id}: provision folder '${row.folder}' must name one real folder under the models root (no leading slash, no traversal)`);
            }
            if (!/^https?:\/\//.test(row.url)) {
                throw new ModelError(`${decl.id}: provision url '${row.url}' must be an absolute http(s) URL (the fetcher dials it verbatim)`);
            }
        }
    }
    for (const v of decl.variants) {
        if (typeof v.id !== "string" || v.id === "") {
            throw new ModelError(`${decl.id}: a variant needs an id`);
        }
        for (const c of v.cells) {
            if (typeof c.quant !== "string" || c.quant === "") {
                throw new ModelError(`${decl.id}/${v.id}: a cell needs a quant`);
            }
        }
    }
    // THE RECIPE↔WEIGHTS LAW (2026-09-29, the third live break's
    // silent half): a cell's artifact is the DOWNLOAD; the run loads
    // (atom ∪ variant) lane_inputs. A cell downloading a file the
    // lane truth never loads is a silent wrong-weights run — krea-2
    // raw shipped exactly that for 20 days (turbo's unet under a
    // 52-step marriage, masked behind the missing facts row). The
    // registry-wide sweep held at ZERO violators the day this wall
    // landed; the qwen lightning + tts melds declare the override
    // precedent (variant lane_inputs re-spell the swapped
    // checkpoint). A mismatch refuses HERE, at registration, forever.
    const WEIGHTS_FILE = /\.(safetensors|gguf|pth|bin|ckpt)$/i;
    // The loaded identity is the FILENAME: a ComfyUI-native lane spells
    // the bare name, an audiocpp-style tree lane spells a root-relative
    // path ("Tree/file.gguf" — resolved against the engine's models
    // root). Both name the same download; the law judges the basename.
    const weightsNames = (facts) => Object.values(facts ?? {})
        .filter((x) => typeof x === "string" && WEIGHTS_FILE.test(x))
        .flatMap((x) => [x, x.split("/").pop() ?? x]);
    const atomLoads = new Set(weightsNames(decl.lane_inputs));
    for (const v of decl.variants) {
        for (const c of v.cells) {
            // THE CELL-LANE CASCADE (the cell tier completes the law): the
            // loads a cell may satisfy are atom ∪ variant ∪ ITS OWN
            // lane_inputs — a quant cell that re-spells the unet (the
            // turbo-int8 pick under a bf16 variant) owns its load the same
            // way a variant does. Judging against variant-only loads would
            // refuse the honest cell.
            const loads = new Set([...atomLoads, ...weightsNames(v.lane_inputs), ...weightsNames(c.lane_inputs)]);
            const art = c.artifact;
            if (art === undefined || art === null)
                continue;
            // CellArtifact carries no filename field — the download's
            // name is the source_url's last path segment, the same name
            // the catalog's relative_path rule lands under
            // models/<dest_sub>.
            /* v8 ignore next 3 -- String#split ALWAYS returns at least one
             * element ("" splits to [""]), so pop() yields a string and
             * never undefined; the ?? was a belt for an impossibility the
             * type already forbids. */
            const fn = art.source_url.split("/").pop() ?? "";
            if (fn === "")
                continue;
            if (!loads.has(fn)) {
                throw new ModelError(`${decl.id}/${v.id}: cell downloads '${fn}' but no lane_input loads it ` +
                    `(the recipe↔weights law — a variant that swaps checkpoints overrides lane_inputs; ` +
                    `a download the lane never loads is a silent wrong-weights run)`);
            }
        }
    }
    // THE VARIANT-AXIS LAW (2026-10-24, the "quant dressed as variant"
    // crime — live on both qwen 2.1 families the day before the
    // reshape): a Variant-group row's label must never equal one of
    // its own cells' labels. When it does, the row is not a variant
    // axis at all — it is a quant tier flattened into the variant
    // tree (INT8 ConvRot/BF16 as "variants"), which explodes the
    // matrix combinatorially (turbo × tier as four flat rows) and
    // lies about the topology the resolver cascades over. The cure
    // is the matrix: Variant = the real axis token (Base/Turbo),
    // cells carry the quant labels. Refused HERE, at registration.
    const fold = (t) => t.trim().toLowerCase();
    for (const v of decl.variants) {
        if ((v.group ?? "") !== "Variant")
            continue;
        const vLabel = fold(v.label ?? "");
        if (vLabel === "")
            continue;
        for (const c of v.cells) {
            if (fold(c.label ?? "") === vLabel) {
                throw new ModelError(`${decl.id}/${v.id}: variant '${v.label}' repeats its own cell '${c.label}' label ` +
                    `(the variant-axis law — that row is a quant tier dressed as a variant; the matrix is Variant = the axis token, cells = the quant tiers)`);
            }
        }
    }
    // THE ENGINE FACTS DOOR (the complexity floor's stroke 1): the
    // typed lane_inputs. A member the EngineFacts schema does not
    // know refuses HERE, at boot, on the family row and every
    // variant merge — the authoring hole the open dict left (typos
    // and dead keys merged silently; four keys rode the GAP-7
    // template on eighteen families with no reader). This door fires
    // BEFORE the per-action facts parses: unknown-member ownership is
    // the facts schema's, and the action doors only ever see their
    // own members.
    strippedKeys((decl.lane_inputs ?? {}), EngineFacts, `${String(decl.id)}/lane_inputs`).forEach((k) => {
        throw new ModelError(`model row ${String(decl.id)} lane_inputs: unknown member(s) refused (extra: forbid — the law): ${k}`);
    });
    for (const [i, v] of decl.variants.entries()) {
        const vrow = (v.lane_inputs ?? {});
        strippedKeys(vrow, EngineFacts, `${String(decl.id)}/variants[${String(i)}]/lane_inputs`).forEach((k) => {
            throw new ModelError(`model row ${String(decl.id)} variant ${String(v.id)} lane_inputs: unknown member(s) refused (extra: forbid — the law): ${k}`);
        });
    }
    // THE ACTION ADMISSION GATE (the atom vocabulary's family door,
    // stroke 0): a declared action's facts parse runs at REGISTRATION
    // over the family row AND every variant merge — the merge a run
    // actually composes (getModel splices variant over atom at read
    // time; the bf16 precedent re-spells two door-read keys). Drift
    // refuses HERE, at boot, in the door's own voice — the family's
    // parse throw, never reworded by the service.
    if (decl.actions !== undefined) {
        for (const action of decl.actions) {
            // spread of undefined yields {} — a door may face an empty
            // row only when the family omits lane_inputs entirely
            action.facts({ ...decl.lane_inputs });
            for (const v of decl.variants) {
                action.facts({ ...decl.lane_inputs, ...v.lane_inputs });
            }
        }
    }
    // THE DECLARED-PLANE DOOR (the atom vocabulary's family door,
    // the stroke the write-plane sweep opened): every write-plane
    // row — the family's defaults, each variant's resolver/wire
    // defaults, each cell's resolver defaults — is judged against
    // the union of the declared actions' ParamSpec rows. The surface
    // is the actions' own declaration, never the card's z-schema.
    const writeRows = [];
    const pushRow = (where, values) => {
        if (values !== undefined && values !== null && Object.keys(values).length > 0) {
            writeRows.push({ where, values });
        }
    };
    pushRow("defaults", decl.defaults);
    for (const v of decl.variants) {
        pushRow(`variant ${String(v.id)} resolver_defaults`, v.resolver_defaults);
        pushRow(`variant ${String(v.id)} wire_defaults`, v.wire_defaults);
        for (const c of v.cells) {
            pushRow(`cell ${String(v.id)}/${String(c.quant)} resolver_defaults`, c.resolver_defaults);
        }
    }
    validateWriteRowsAgainstActions(String(decl.id), writeRows, decl.actions ?? []);
    // SCHEMA LEG runs AFTER the predicates (wall law: the refusal
    // TEXTS are the contract — a corrupt id/genre must keep refusing
    // with the words, not a schemastery ValidationError). Strict
    // resolve THROWS on a shape miss (it never returns the error leg),
    // so the wrap rides a catch (fixed 2026-09-12: the old tuple read
    // let the ValidationError escape unwrapped).
    let strict;
    try {
        strict = Schema.resolve(decl, ModelDeclSchema, {}, true)[0];
    }
    catch (err) {
        /* v8 ignore next -- schemastery always throws ValidationError (an
           Error); the String(err) half is the non-Error defense, never
           constructible through this call (2026-09-12). */
        const detail = err instanceof Error ? err.message : String(err);
        throw new ModelError(`model row ${String(decl.id)}: schema refused — ${detail}`);
    }
    // Drift = a CARRIED key the strict resolve stripped (subset test —
    // the schema legitimately admits keys this DECL simply doesn't set).
    const stripped = Object.keys(decl).filter((k) => !(k in strict));
    if (stripped.length > 0) {
        throw new ModelError(`model row ${String(decl.id)}: unknown key(s) refused (extra: forbid — the law): ${stripped.sort().join(", ")}`);
    }
    // THE NESTED DRIFT LAW (2026-10-10, the DECL audit's HIGH-1): the
    // strip check above is TOP-LEVEL only, and schemastery drops
    // `strict` inside a nested property()/array resolve — so
    // `{variants:[{id:'v', parmas:['voice']}]}` booted clean, with the
    // typo MERGED and the lane's surface silently off by one field. A
    // relation word misspelled the same way (`requiers`) bound nothing
    // at all while its author believed a law held. Each nested level
    // gets the same subset test the top level has always had, using
    // the sub-schemas this module already exports.
    for (const [i, v] of decl.variants.entries()) {
        strippedKeys(v, VariantRowSchema, `${String(decl.id)}/variants[${String(i)}]`).forEach((k) => {
            throw new ModelError(`model row ${String(decl.id)} variant ${String(v.id)}: unknown key(s) refused (extra: forbid — the law): ${k}`);
        });
    }
    if (decl.relations !== undefined) {
        relationDrift(decl.relations, `${String(decl.id)}/relations`).forEach((k) => {
            throw new ModelError(`model row ${String(decl.id)} relations: unknown relation word/key refused (extra: forbid — the law): ${k}`);
        });
    }
    // THE VARIANT'S OWN RELATIONS GET THE SAME GATE (the DECL audit's
    // gap 5, 2026-10-10): relationDrift ran only on the FAMILY's rows,
    // so a variant row with a misspelled word (`requiers`) or a
    // misspelled member booted clean and bound NOTHING while its author
    // believed a law held — the same silence the family-level gate
    // was written to kill, one level down. Every declared row is
    // checked where it is declared.
    for (const [i, v] of decl.variants.entries()) {
        // the variant row declares `relations?: ParamRelationWords`; the
        // cast that read it through Record erased that and re-derived the
        // type by hand (the typed-seam audit, 2026-10-15)
        const vrel = v.relations;
        if (vrel === undefined || vrel === null)
            continue;
        relationDrift(vrel, `${String(decl.id)}/variants[${String(i)}]/relations`).forEach((k) => {
            throw new ModelError(`model row ${String(decl.id)} variant ${String(v.id)} relations: unknown relation word/key refused (extra: forbid — the law): ${k}`);
        });
    }
    /* v8 ignore next 3 -- dead by precedence: the schema leg refuses
     * a non-array $.params before this check can see it (pinned by
     * the spec arm "a top-level params that is not an array refuses
     * at the schema leg"). */
    if (decl.params !== undefined && !Array.isArray(decl.params)) {
        throw new ModelError(`${String(decl.id)}: params must be an array of field names`);
    }
}
/** The keys a nested object carries that its own schema strips (the
 *  top-level drift test, one level down). A shape the schema refuses
 *  outright throws above; this catches what it MERGES. */
function strippedKeys(row, schema, where) {
    let resolved;
    /* v8 ignore next 7 -- this catch is DEAD BY PRECEDENCE: every
     * caller resolves the same rows against schemas the
     * declaration-wide resolve above (:216, ModelDeclSchema — which
     * embeds ParamRelationWords, the variant row and the engine facts
     * themselves) has already run, so a row this resolve would refuse
     * was refused there first, in the caller's own voice. Measured:
     * a relation row of the wrong type and a lane_inputs row with an
     * unknown member both refuse ABOVE this line, never here. */
    try {
        resolved = Schema.resolve(row, schema, {}, true)[0];
    }
    catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new ModelError(`${where}: schema refused — ${detail}`);
    }
    return Object.keys(row).filter((k) => !(k in resolved));
}
/** The same subset test across the four relation words, per level. */
/** Each relation word's ROW schema, read from the grammar's own
 *  wrapper (2026-10-10). A word added to the grammar and not to this
 *  gate made a LEGAL declaration refuse at boot; enumerating the
 *  vocabulary twice is the same bug in a different coat. The wrapper's
 *  members ARE the words; each member's resolved shape is the row
 *  schema the drift check wants. */
function relationRowSchemas() {
    // THE WORDS ARE READ, NOT RETYPED (2026-10-10, the four-agent
    // contract audit's Step 0). This function used to return a
    // hand-written object literal listing all six words — the second
    // enumeration of the vocabulary, under a comment claiming it read
    // the schema's own keys. A seventh word landing in the grammar
    // would pass this gate's enumeration and boot an unbound law.
    //
    // The wrapper IS a schemastery object, so it carries its own .dict
    // (the pattern the codebase already reads at service.ts's own
    // formSchemas leg and in facts.ts) — the enumeration now comes from
    // the declaration itself, and the import of the six row schemas
    // disappears with the literal.
    // Schemastery's Schema declares `dict?: Dict<Schema>` — the wrapper
    // carries its own fields typed; the old cast erased that to re-add
    // it by hand (the typed-seam audit, 2026-10-15).
    const dict = ParamRelationWordsSchema.dict;
    if (dict === undefined) {
        throw new ModelError("the relation grammar's own wrapper carries no dict — the word enumeration would be a second hand list; refusing");
    }
    // Each word's value is `z.array(<row>)` — the ROW schema is the
    // array's element (schemastery keeps it on `.inner`, the same
    // accessor the card seat already reads for array-of-object dicts).
    return Object.fromEntries(Object.entries(dict).map(([word, schema]) => [
        word,
        schema.inner ?? schema,
    ]));
}
function relationDrift(relations, where) {
    // THE RELATION WORDS, FROM THE CONTRACT'S SCHEMA (2026-10-10 — a
    // word added to the grammar and not to this gate made a legal
    // declaration refuse at boot: "unknown relation word/key refused:
    // required". The gate enumerated the vocabulary a second time; it
    // now READS the schema object's own keys, so a word cannot land in
    // one place and not the other.
    const words = relationRowSchemas();
    const out = [];
    for (const key of Object.keys(relations)) {
        const schema = words[key];
        if (schema === undefined) {
            out.push(key);
            continue;
        }
        const rows = relations[key];
        /* v8 ignore next 2 -- dead by precedence: the schema leg refuses
         * a non-array word value before this check can see it (pinned by
         * the spec arm "PRECEDENCE PIN: a non-array word value"). */
        if (!Array.isArray(rows))
            continue;
        rows.forEach((row, i) => {
            /* v8 ignore next 2 -- dead by precedence: the schema leg
             * refuses a null row member before this check can see it
             * (pinned by the spec arm "PRECEDENCE PIN: a null row
             * member"). */
            if (row === null || typeof row !== 'object')
                return;
            for (const k of strippedKeys(row, schema, `${where}/${key}[${String(i)}]`)) {
                out.push(`${key}[${String(i)}].${k}`);
            }
            // THE EITHER_OR FLOOR, AT THE ADMISSION SEAT (the schema
            // auditor, 2026-09-28): schemastery does not enforce `.min()`
            // on a NESTED array, so the two-alternative floor the grammar
            // claims was never applied — a one-alternative (or empty)
            // either_or registered and then judged nothing at run time,
            // which is a word that means nothing. A word's shape is a
            // DECLARATION question, so it is refused HERE, where the row is
            // written, with the row's own coordinates in the voice. (The
            // judge keeps its pinned law: a malformed row judges nothing —
            // it never invents a claim. One admission per door.)
            if (key === "either_or") {
                const groups = row.groups;
                /* v8 ignore next 2 -- dead by precedence: the schema leg
                 * refuses a non-array groups before this ternary's false arm
                 * can fire (pinned by the spec arm "PRECEDENCE PIN: a
                 * non-array either_or groups"). */
                const n = Array.isArray(groups) ? groups.length : 0;
                if (n < 2) {
                    out.push(`${key}[${String(i)}].groups (${String(n)} alternative${n === 1 ? "" : "s"} — either_or is a choice between at least two sources; one source is the 'required' word)`);
                }
            }
        });
    }
    return out;
}
export class ModelsService extends Service {
    table = new Map();
    /** The derived route index: flat id → owning model + variant (the
     *  hierarchy's derived realization — built at registration,
     *  read at serving; dispose retracts). */
    routes = new Map();
    /** registry rows by repo root (the artifact-reader half merged
     *  from catalog.ts 2026-09-08 — root-independent values,
     *  fiber-owned; fixture roots under MELITE_REPO_ROOT resolve at
     *  request time, never at boot). */
    rows = new Map();
    constructor(ctx) {
        super(ctx, MODELS_SERVICE);
    }
    /** Register one family. LOUD: duplicate ids refuse (the
     *  scan's one-owner-per-id law), invalid rows refuse at the gate
     *  (the metaclass's import-time validation, at registration).
     *  REVERTIBLE (the discharge stroke): returns the disposer —
     *  ctx.effect-wrapped at the plugin seam, the fiber owns the
     *  row's lifetime; dispose and the family is gone from the
     *  table (a dynamic re-port can retire a family mid-flight). */
    registerFamily(decl) {
        validateDecl(decl);
        if (this.table.has(decl.id)) {
            throw new ModelError(`model '${decl.id}' registered twice — one owner per model id (the interlock)`);
        }
        // THE ROUTE INDEX (the hierarchy stroke 2026-09-08): every
        // variant/cell route claims back into its OWNING model — one
        // route owner (a flat id claimed by two models is drift, the
        // flattener's sin refusing to repeat). The head's own route is
        // the model id itself.
        const claims = [];
        // COMPLETENESS (§3.2.2 satisfaction law): the model's own id is
        // an address — if no variant/cell route claims it, the head
        // address composes through the family default (the first
        // variant with cells). A registered atom that serves no
        // address is an unsatisfying boot — refused below, never
        // silently unaddressable.
        const resolving = decl.variants.find((v) => v.cells.length > 0) ?? decl.variants[0];
        if (resolving !== undefined && !decl.variants.some((v) => v.route === decl.id) && !decl.variants.some((v) => v.cells.some((c) => c.route === decl.id))) {
            claims.unshift({ route: decl.id, variantId: resolving.id, cellRoute: false });
        }
        for (const variant of decl.variants) {
            // truthiness, never =="" (the conformance stroke: absent
            // route = unaddressable — undefined must not claim).
            if (variant.route) {
                claims.push({ route: variant.route, variantId: variant.id, cellRoute: false });
            }
            for (const cell of variant.cells) {
                if (cell.route && cell.route !== variant.route) {
                    claims.push({ route: cell.route, variantId: variant.id, cellRoute: true });
                }
            }
        }
        for (const claim of claims) {
            // a SELF-ROUTE (the claim equals the model's own id) is the
            // model's composed head — it SUPERSEDES any alias a sibling
            // model's variant laid on the same flat id. FIRST SELF-ROUTE
            // WINS (the 1.7B head theft, transcript-014: customvoice and
            // voicedesign both claim 'qwen3-tts-voicedesign' — the
            // unconditional set let the SECOND claimant silently flip the
            // head to the design lane, contradicting the declaration-
            // order default law two lines up; a second head claim of the
            // SAME model is a shared-address alias, never a default flip)
            if (claim.route === decl.id) {
                const priorHead = this.routes.get(claim.route);
                if (priorHead === undefined || priorHead.modelId !== decl.id) {
                    this.routes.set(claim.route, { modelId: decl.id, variantId: claim.variantId, cellRoute: claim.cellRoute });
                }
                continue;
            }
            // a route that IS a registered model's id belongs to that
            // model (its own self-route); the sibling variant's claim on
            // the same flat id is its derived alias — the model wins
            if (this.table.has(claim.route))
                continue;
            const prior = this.routes.get(claim.route);
            // one owner per flat id — but a model may reuse its own route
            // across variants (a shared artifact addressing); only a
            // CROSS-model claim is drift
            if (prior !== undefined && prior.modelId !== decl.id) {
                throw new ModelError(`route '${claim.route}' claimed by both '${prior.modelId}' and '${decl.id}' — one owner per flat id (the flattener's sin refuses to repeat)`);
            }
            if (prior === undefined) {
                this.routes.set(claim.route, { modelId: decl.id, variantId: claim.variantId, cellRoute: claim.cellRoute });
            }
        }
        this.table.set(decl.id, decl);
        return () => {
            this.table.delete(decl.id);
            for (const claim of claims)
                this.routes.delete(claim.route);
        };
    }
    /** Every registered declaration, id-sorted (the table read that
     *  replaced registry.generated iteration). */
    allDecls() {
        return [...this.table.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
    }
    /** The table size (census + the transaction wall). */
    familyCount() {
        return this.table.size;
    }
    /** The SERVED enumeration (derived realization, paper §3.3):
     *  model ids ∪ their variant/cell routes — the flat ids every
     *  downstream address (catalog, doors, facts, flows, specs)
     *  already knows. One component, many addressed cells. */
    modelIds() {
        return [...new Set([...this.table.keys(), ...this.routes.keys()])].sort();
    }
    /** The MODEL registry ids (the declaration count — one per class
     *  class; the hierarchy's registry plane, vs the served view). */
    registryIds() {
        return [...this.table.keys()].sort();
    }
    /** The RAW model declaration (the atom as authored — no variant
     *  deltas composed). Registry-plane readers use this. */
    registryModel(id) {
        const head = this.table.get(id);
        if (head === undefined) {
            throw new ModelError(`no registered model '${id}' (routes compose; the registry holds atoms)`);
        }
        return head;
    }
    /** The OWNING ATOM of an address (the fold read, operator
     *  2026-09-23 — qvoice across ALL qwen3-tts): a route composes
     *  through its owner, an atom owns itself. Mods board at the
     *  ATOM (the interlock: families name atoms), so every envelope
     *  plane folds an address through this read — a variant route
     *  (qwen3-tts-base) carries its family's packs exactly like the
     *  head. Unknown ids return the name as given (the callers' own
     *  filters refuse). */
    owningAtom(id) {
        return this.routes.get(id)?.modelId ?? id;
    }
    /** The declaration for an address — EVERY served id composes
     *  through the cascade (the model id itself carries a route
     *  row: its resolving variant + cell; paper §3.2.3: base ←
     *  variant ← cell, the monoid merge — label/description
     *  resolved cell→variant→model, defaults and lane_inputs
     *  unioned through the intercepts). Derived, never stored:
     *  recovery discards it wholesale. The raw atom is
     *  registryModel. */
    getModel(id) {
        const route = this.routes.get(id);
        if (route !== undefined) {
            const model = this.table.get(route.modelId);
            /* v8 ignore start -- index drift is unconstructible: routes
               claim only own-table models (a foreign claim refuses at
               registration, dispose retracts both halves together), so
               both throws below never fire through the public API
               (2026-09-12). */
            if (model === undefined) {
                throw new ModelError(`route '${id}' points at unregistered model '${route.modelId}' — index drift`);
            }
            const variant = model.variants.find((v) => v.id === route.variantId);
            if (variant === undefined) {
                throw new ModelError(`route '${id}' points at unknown variant '${route.variantId}' of '${model.id}' — index drift`);
            }
            /* v8 ignore stop */
            // a variant-level address resolves its DEFAULT CELL (the one
            // routing to the address, else the variant's first cell) —
            // the quant's source/defaults compose the address view.
            // (The undefined half: a cellRoute claim always names its own
            // cell — the index builds the claim FROM the cell's route —
            // so the miss half only fires for variant addresses, which
            // fall back to the head cell. Unreachable defense,
            // v8-ignored 2026-09-12.)
            const cell = variant.cells.find((c) => c.route === id) ?? (route.cellRoute
                ? /* v8 ignore next */ undefined
                : variant.cells[0]);
            // attach override keys ONLY when a layer declares them — a
            // spread of absent layers would mint undefined-valued own
            // keys (no drift vs the served JSON round-trip)
            //
            // THE MUTATION SHAPE (operator order 2026-09-08: "THE MODEL
            // ISN'T BEING MUTATED, READ THE DESCRIPTION"): the atom
            // declares its identity ONCE; variants carry TOKENS
            // (Turbo/Base/SFT/XL) + real delta descriptions; cells carry
            // QUANT tokens (Q8/BF16/Native). The flat truth COMPOSES at
            // read: label = model + variant + quant tokens joined;
            // description = the variant's real delta, else the model's.
            const labelTokens = [model.label, variant.label ?? "", cell?.label ?? ""].filter((t) => t !== "");
            // absent ≡ empty (the conformance stroke): a missing model
            // description mints NO key — assigning undefined would mint
            // an undefined-valued own key (the drift above).
            const deltaDesc = (variant.description ?? "") !== "" ? variant.description : model.description;
            const derived = {
                ...model,
                id,
                label: labelTokens.join(" "),
                ...(deltaDesc ? { description: deltaDesc } : {}),
            };
            // ONLY THE QUANT CARRIES THE DOWNLOAD: the model's repo +
            // the CELL's artifact filename compose the route's source
            const cellSource = cell?.source;
            if (cellSource !== null && cellSource !== undefined) {
                derived.source = { ...(model.source ?? {}), filename: cellSource.filename };
            }
            if (model.defaults !== undefined || Object.keys(variant.resolver_defaults ?? {}).length > 0) {
                // A NULL STAMP UNSETS (the voicedesign meld 2026-09-08): the
                // intercept retracts the base default — a variant that
                // doesn't use an inherited key (voicedesign ≠ persona voice)
                // nulls it, and the key leaves the derived view entirely
                const merged = { ...(model.defaults ?? {}), ...variant.resolver_defaults, ...(cell?.resolver_defaults ?? {}) };
                for (const k of Object.keys(merged)) {
                    if (merged[k] === null || merged[k] === undefined)
                        delete merged[k];
                }
                derived.defaults = merged;
            }
            if (model.lane_inputs !== undefined || variant.lane_inputs !== undefined
                || (cell !== undefined && cell.lane_inputs !== undefined && Object.keys(cell.lane_inputs).length > 0)) {
                // THE CELL-LANE CASCADE (read half): the address view's
                // lane_inputs compose atom → variant → CELL — the same
                // precedence the resolver cascade gives defaults. A cell
                // that re-spells a lane token (a quant-specific unet
                // filename) owns the address view the way variants do.
                const cellFacts = cell !== undefined && cell.lane_inputs !== undefined && Object.keys(cell.lane_inputs).length > 0
                    ? cell.lane_inputs
                    : undefined;
                derived.lane_inputs = { ...(model.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}), ...cellFacts };
            }
            // THE ENGINE RIDES THE VARIANT (the moss meld 2026-09-08): a
            // family can span runtimes (comfyui sfx + audio_cpp GGUF) —
            // the address view carries the variant's engine, else the
            // cell's, else the atom's
            if ((variant.engine ?? "") !== "")
                derived.engine = variant.engine;
            else if (cell !== undefined && (cell.engine ?? "") !== "")
                derived.engine = cell.engine;
            return derived;
        }
        throw new ModelError(`unknown model '${id}' (registered: ${this.modelIds().slice(0, 12).join(", ")}…)`);
    }
    /** The variant coordinate (first declared = the family default,
     *  the matrix law). */
    variantOf(decl, variant) {
        if (variant === null)
            return decl.variants[0];
        const hit = decl.variants.find((v) => v.id === variant);
        if (hit === undefined) {
            throw new ModelError(`model '${decl.id}' has no variant '${variant}' (declared: ${decl.variants.map((v) => v.id).join(", ")})`);
        }
        return hit;
    }
    /** The quant coordinate (first declared = the variant default). */
    cellOf(variantRow, quant) {
        if (quant === null)
            return variantRow.cells[0] ?? null;
        const hit = variantRow.cells.find((c) => c.quant === quant);
        if (hit === undefined) {
            throw new ModelError(`variant '${variantRow.id}' has no quant '${quant}' (declared: ${variantRow.cells.map((c) => c.quant).join(", ")})`);
        }
        return hit;
    }
    /** THE CASCADE on the inherency primitive: family = base, the
     *  resolving variant = the INTERCEPT (its resolver_defaults dict
     *  is the intercept entry — cordis merges root-closer-first, so
     *  the variant's keys win over the family's), the resolving cell
     *  = head. Service[symbols.resolveConfig] (cordis service.ts:86)
     *  merges base → intercepts → head per-KEY — no hand-rolled
     *  Object.assign chain, no whole-dict replacement. */
    mergedDefaults(id, variant, quant) {
        const decl = this.getModel(id);
        if (variant === undefined && quant === undefined) {
            return { ...(decl.defaults ?? {}) };
        }
        const v = this.variantOf(decl, variant ?? null);
        const c = this.cellOf(v, quant ?? null);
        return this.cascade(decl.defaults ?? {}, v.resolver_defaults ?? {}, c !== null && c.resolver_defaults !== undefined ? c.resolver_defaults : null);
    }
    /** base → intercept → head through the framework's own chain
     *  (the wall pins the precedence, isolation, and the shipped
     *  symbol identity). */
    cascade(base, intercept, head) {
        let view = this.ctx;
        if (intercept !== null && Object.keys(intercept).length > 0) {
            view = this.ctx.intercept(MODELS_SERVICE, intercept);
        }
        const svc = view[MODELS_SERVICE];
        return svc[symbols.resolveConfig](base, head !== null && Object.keys(head).length > 0 ? head : undefined);
    }
    /** Matrix coordinates → { route, engine, cell } (the R1
     *  contract). The ENGINE_TRUTH triple ("mode", "variant",
     *  "model") is validate.ts's export — the compose's own
     *  declaration; the cascade never touches it. (The comment
     *  drifted from the SSOT it described until the schema audit
     *  named it: two words where the export carries three.) */
    resolve(id, variant, quant) {
        const decl = this.getModel(id);
        const v = this.variantOf(decl, variant ?? null);
        const c = this.cellOf(v, quant ?? null);
        return {
            // unaddressable coordinates resolve to the owner (the claim
            // table unshifts decl.id for exactly this variant — a route
            // never renders ""). ||, not ??: an explicitly-passed
            // unrouted variant carries route "" (fixed 2026-09-12 — the
            // old ?? let "" through, breaking the contract above).
            route: (c !== null && c.route ? c.route : v.route) || decl.id,
            engine: (decl.engine ?? "") !== "" ? decl.engine : "comfyui",
            cell: c,
            variant: v,
        };
    }
    /** The served catalog rows (OFFERING LAW + LAW 0 engine gate —
     *  one place: catalogEmission's buildCatalog over the SAME
     *  registration set). */
    servedModels() {
        // THE DERIVED SERVING (the hierarchy stroke): every route of
        // every model enumerates (the flat ids the runtime knows +
        // the variant/cell routes one model serves) — getModel
        // resolves the cascade per route; isServedFamily filters as
        // before. The registry (allDecls) is the declaration plane;
        // serving is the derived realization (never stored).
        return buildCatalog(this.modelIds().map((id) => this.getModel(id))).models;
    }
    // ── the artifact-reader half (merged from catalog.ts, the same
    //  pure cores — one ctx.models owns the whole registry plane) ──
    /** Test seam: drop catalog state (walls boot fresh processes). */
    resetForTests() {
        this.rows.clear();
    }
    /** The catalog rows for one repo root (the compiled-in registry —
     *  never a silent empty catalog; malformed rows died at the
     *  registration gate above, the only place a refusal belongs). */
    catalogModels(repoRoot = resolveRepoRoot()) {
        const hit = this.rows.get(repoRoot);
        if (hit !== undefined)
            return hit;
        const parsed = loadCatalogModels(this.allDecls(), repoRoot);
        this.rows.set(repoRoot, parsed);
        return parsed;
    }
    /** The downloadable rows for (model, variant, quant) — the
     *  manage door's rail. Throws CatalogMiss with the legacy texts
     *  (the door maps them to 404). */
    resolveCatalogArtifact(mid, variant = "", quant = "", repoRoot = resolveRepoRoot()) {
        return resolveArtifactRows(this.catalogModels(repoRoot), mid, variant, quant);
    }
    /** The on-disk hit for (relativePath, name), else null (mount
     *  bindings are deploy truth, loaded live per call). */
    checkModelPresent(relativePath, name, repoRoot = resolveRepoRoot()) {
        let cfg;
        try {
            cfg = loadEndpointConfig();
        }
        catch {
            cfg = null;
        }
        return findModelPresent(relativePath, name, repoRoot, cfg);
    }
    checkModelPathPresent(modelPath, repoRoot = resolveRepoRoot()) {
        return checkModelPathPresent(modelPath, repoRoot);
    }
}
/** The provider plugin (fiber-owned): owns the ModelsService
 *  lifetime. No prime step (rows load lazily per repo root).
 *  Mounts the catalog SERVICE alone — zero family plugins, zero
 *  registered families. Lanes that serve family flows mount
 *  modelsFamiliesProvider instead (the estate does); this bare
 *  form suits seats that only read the registry tables.
 *  Loadable entry:
 *  packages/engines/comfyui-cordis/src/entries/catalog-registry.ts. */
export const modelsProvider = {
    name: "engine-model-catalog",
    apply(ctx) {
        new ModelsService(ctx);
    },
};
/** The LANES' provider: the catalog service plus every family
 *  plugin applied into the SAME context — the bootModels recipe
 *  in-process, so a lane serving the runs doors reads its seat
 *  populated: ctx.get("models").allDecls() IS the booted table
 *  (stroke 4's compose-at-expansion reads that seat; a bare
 *  modelsProvider mount registers zero families and every family
 *  stage refuses "registered: none"). Transactional like the
 *  singleton boot: any family refusing or the contracts
 *  cross-validation refusing fails the provider mount — a lane
 *  never half-serves a table. */
export const modelsFamiliesProvider = {
    name: "engine-model-catalog-families",
    async apply(ctx) {
        await ctx.plugin(modelsProvider);
        const families = await loadFamilies();
        for (const family of families) {
            // await settles registration (registry.ts's fiber.await runs
            // the apply to completion): after this loop every family's
            // effect has run — no extra tick needed or sufficient.
            /* v8 ignore next -- ctx.plugin drives a plugin's effects to
             * completion synchronously, so the false arm would need a
             * plugin that neither registers nor throws. */
            await ctx.plugin(family);
        }
        // The injector read (the doors' own — property access on a
        // fiber ctx demands inject; ctx.get resolves registered
        // services without it).
        const svc = ctx.get("models");
        /* v8 ignore next 5 -- `await ctx.plugin(modelsProvider)` above
         * ran `new ModelsService(ctx)`, whose Service constructor
         * registers on that ctx, so the read cannot be absent; the guard
         * stays the loud check it has always been. */
        if (svc === undefined) {
            throw new ModelError("models service failed to register at the families provider mount");
        }
        /* v8 ignore next 5 -- every family plugin body is an unconditional
         * registerFamily(DECL) inside ctx.effect, and the loop above awaited
         * each apply to completion, so familyCount() equals
         * families.length whenever the mount returns. */
        if (svc.familyCount() !== families.length) {
            throw new ModelError(`the families provider registered ${svc.familyCount()} families but ${families.length} plugins loaded — a family registered nothing (the transactional gate)`);
        }
        await validateBootContracts(svc);
    },
};
/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param: an explicit arg wins. Null = the caller
 *  forgot to thread ctx.models — a bug, so reads throw LOUD. */
export function needModels(models, where) {
    if (models === null || models === undefined) {
        throw new Error("[models] no ModelsService for " + where +
            " — doors inject 'models' and pass ctx.models " +
            "(the manifest's engine-model-catalog row provides at boot)");
    }
    return models;
}
const MODELS_BOOT_KEY = "@melite/comfyui-cordis:models-boot";
function modelsBootCell() {
    const sym = Symbol.for(MODELS_BOOT_KEY);
    const holder = globalThis;
    holder[sym] ??= { booted: null, inFlight: null, cascade: null, bootedFrom: null };
    return holder[sym];
}
/** The facade's cascade memo, stored on the process-global boot
 * cell so every copy of this package shares one cascadeInit truth
 * (models.ts rides these; its own module scope is per-copy). */
export function cascadeMemo() {
    return modelsBootCell().cascade;
}
/** @param promise the memoized cascade boot promise, or null to
 * clear it (the retry law: a rejected boot clears the memo). */
export function setCascadeMemo(promise) {
    modelsBootCell().cascade = promise;
}
/** Test seam: drop the process-global boot cell entirely.
 * Production code never calls this — the cell is one-per-process
 * by design. Specs that pin a cold first caller (a refused boot's
 * retry, the pre-boot refusal) reset it because vitest resets the
 * per-file module registry but not globalThis, and the cell is
 * the storage the registry reset no longer clears. */
export function resetModelsBootForTests() {
    const sym = Symbol.for(MODELS_BOOT_KEY);
    delete globalThis[sym];
}
/** THE MOD INTERLOCK (the correction stroke 2026-09-08): the
 *  flavor↔DECL.mods satisfaction gate — the paper's §3.2.2 law, a
 *  component ACTIVATES ONLY AT A SATISFYING STATE. Pure over the
 *  registration sets (extracted 2026-09-12 for unit teeth — the
 *  boot feeds it the live sets below). Both directions refuse:
 *    (a) DECL.mods entry naming neither a registered pack nor a
 *        registered verb = a DEAD BOARDING (drift, the amnesty is
 *        over);
 *    (b) a flavor/verb registration whose family does not board
 *        that pack = an UNDECLARED MUTATION (the flavor claims a
 *        model that never declared it).
 *  Plus the satisfaction law's third edge (a declared pack
 *  boarding with no flavor for THIS family) and fourth edge (gate
 *  (d), the pack fate — verbs skip: their fate is the
 *  family-scoped mount). */
export function assertModInterlock(decls, packs, verbs, flavorsOf, verbRegs, packFate) {
    // THE MARRIAGE GRAMMAR (#36): DECL.mods entries are pack names or
    // {pack, marries} objects — the boarding test reads the pack name
    // either way (one normalizer, never two truths).
    const boardedPacks = (mods) => (mods ?? []).map((m) => (typeof m === 'string' ? m : m.pack));
    for (const flavor of flavorsOf) {
        for (const fam of flavor.families) {
            const d = decls.find((x) => x.id === fam);
            if (d === undefined) {
                throw new ModelError(`no registered model '${fam}' (routes compose; the registry holds atoms)`);
            }
            if (!boardedPacks(d.mods).includes(flavor.pack)) {
                throw new ModelError(`model ${fam}: a '${flavor.pack}' flavor is registered for it but DECL.mods does not board the pack — an undeclared mutation (the model declares its mods, nothing else)`);
            }
        }
    }
    // (b)-for-verbs: a verb naming a family that never boarded it
    // is the same undeclared mutation (the verb's families field
    // is its claim; the DECL is the model's answer — both refuse).
    for (const verb of verbRegs) {
        for (const fam of verb.families) {
            const d = decls.find((x) => x.id === fam);
            if (d === undefined) {
                throw new ModelError(`no registered model '${fam}' (routes compose; the registry holds atoms)`);
            }
            if (!boardedPacks(d.mods).includes(verb.id)) {
                throw new ModelError(`model ${fam}: verb '${verb.id}' claims it but DECL.mods does not board the verb — an undeclared mutation (the model declares its mods, nothing else)`);
            }
        }
    }
    for (const d of decls) {
        for (const pack of boardedPacks(d.mods)) {
            if (packs.has(pack) || verbs.has(pack))
                continue;
            throw new ModelError(`model ${d.id}: DECL.mods '${pack}' names no registered pack or verb — a dead boarding is drift, not a skip (the amnesty is over)`);
        }
        // the satisfaction law's third edge: a DECLARED pack boarding
        // with no flavor registering for THIS family = the mutation
        // silently never lands (delete the family's mods/<pack>.ts
        // while another family keeps the pack alive — the surface
        // loses the join with no refusal). Drift, refuses.
        //
        // the fourth edge (gate (d), the pack fate): a boarded pack
        // no lane fires or refuses-loud = a surfaced knob with no
        // lane to carry it. Verbs skip: their fate is the
        // family-scoped mount, pinned above.
        for (const entry of boardedPacks(d.mods)) {
            if (verbs.has(entry))
                continue;
            const mine = flavorsOf.some((f) => f.pack === entry && f.families.includes(d.id));
            if (!mine) {
                throw new ModelError(`model ${d.id}: DECL.mods boards '${entry}' but no flavor of that pack registers for it — ship families/${d.genre}/${d.id}/mods/${entry}.ts (a boarding without its flavor is a silent dead mutation)`);
            }
            if (packFate !== null && packFate[entry] === undefined) {
                throw new ModelError(`model ${d.id}: DECL.mods boards '${entry}' but the pack has no fate in this plane (no lane fires it, no firing gate refuses it) — land the lane or the loud refusal before any atom boards it (a surfaced knob with no lane is a silent skip)`);
            }
        }
    }
}
/** §3.2.2 SATISFACTION (pure half): every registered atom serves
 *  an address. The only trigger is a routeless row (variants: []
 *  claims nothing) — the live registry never carries one, so the
 *  boot's call above only ever passes silent; the refusal arm is
 *  unit-pinned here, never wall-reachable. */
export function assertAddressesServe(modelIds, registryIds) {
    for (const id of registryIds) {
        if (!modelIds.includes(id)) {
            throw new ModelError(`model '${id}' registers but serves no address — every atom resolves through its ladder (add a variant/cell route or a resolving default)`);
        }
    }
}
/** THE FACTS-CALLER CHECK (the compose contract: facts.models[id]
 *  .card must be one of the model's caller cards — the card
 *  selects atoms; the facts may not name a caller the cards do
 *  not). Pure over the boot's assembled maps (extracted
 *  2026-09-12 for unit teeth). */
export function assertFactsCallers(decls, factsModels, boardings) {
    const callersOf = new Map();
    for (const [cardId, boarded] of boardings) {
        for (const mid of boarded) {
            const list = callersOf.get(mid) ?? [];
            list.push(cardId);
            callersOf.set(mid, list);
        }
    }
    for (const d of decls) {
        const f = factsModels[d.id];
        if (f === undefined)
            continue;
        if (typeof f.card === "string" && !(callersOf.get(d.id) ?? []).includes(f.card)) {
            throw new ModelError(`model ${d.id}: facts card '${f.card}' is not one of its callers [${(callersOf.get(d.id) ?? []).join(", ")}] (the card selects atoms; the facts may not name a caller the cards do not)`);
        }
    }
}
async function validateBootContracts(svc) {
    const decls = svc.allDecls();
    let domains = null;
    const cardAdmits = new Map();
    const boardings = new Map();
    let factsModels = null;
    let cardSvc = null;
    let packFate = null;
    try {
        const cards = await import("../cardDefs.js");
        await cards.loadCardDefs();
        cardSvc = cards.theService();
        // the pack fate table (the consumption gate's boot leg — gate
        // (d)): same dynamic seam as the card plane, same degrade.
        const guard = await import("@melite/comfyui-card-kit/guard");
        packFate = guard.PACK_FATE;
        const { fieldDomains } = await import("./validate.js");
        // built as mutable Maps, read as the CardDomains readonly view
        const table = new Map();
        for (const id of cardSvc.cardIds()) {
            const def = cardSvc.getCardDef(id);
            const dict = (def?.schemaCarrier ?? def?.schema)?.dict;
            /* v8 ignore next -- every live card carries .dict (the card
               wall refuses carrier-less contracts), so the skip half
               never fires in a healthy boot; the check degrades, never
               poisons (2026-09-12). */
            if (dict !== undefined)
                table.set(id, fieldDomains(dict));
        }
        domains = table;
        // THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
        // only form the relation exists in — models declare nothing
        // about their callers)
        for (const id of cardSvc.cardIds()) {
            const def = cardSvc.getCardDef(id);
            /* v8 ignore next -- ids and defs read from the same service
               handle, so the miss half never fires (defense, 2026-09-12). */
            if (def !== undefined)
                boardings.set(id, def.boarded);
            // THE ADMISSION LAW: the same def carries its admitted
            // route-stamped keys — the validator honors them (2026-09-22)
            const admits = def?.admits;
            if (def !== undefined && admits !== undefined)
                cardAdmits.set(id, admits);
        }
        // the rows assemble from the registry + frozen card slices
        // (facts.ts derivation, same dynamic seam as the card plane:
        // static would cycle service→facts→models→service against
        // the top-level boot) — the boot reads the same contract
        // compose reads, never a second file spelling.
        const { loadFacts } = await import("@melite/comfyui-card-kit/facts");
        factsModels = loadFacts(join(packageRoot(), "data", "model-facts.json"), {
            getModel: (id) => svc.getModel(id),
            registryIds: () => svc.registryIds(),
            registryModel: (id) => svc.registryModel(id),
        }).models;
        /* v8 ignore start -- the cardless-consumer degrade: this catch
           fires only when the card plane fails to import (a consumer
           shipping models without cards). In this repo the plane always
           ships, the imports always succeed, and the walls pin the full
           path — unconstructible here (2026-09-12). */
    }
    catch (err) {
        // the card plane is a sibling that may not ship with every
        // consumer — the boot continues, the check degrades to a
        // logged skip (walls pin the full path)
        console.warn("[models] card-plane cross-validation skipped:", err.message);
    }
    /* v8 ignore stop */
    // §3.2.2 SATISFACTION GATE: every registered atom serves an
    // address — an unaddressable model refuses the boot (named,
    // loud; never a silent hole in the serving plane). Pure below
    // (extracted 2026-09-12 for unit teeth — a routeless variants:[]
    // row is the only trigger, and the live registry never carries
    // one).
    assertAddressesServe(svc.modelIds(), svc.registryIds());
    /* v8 ignore next -- the degrade's other half: domains is null
       only when the catch above fired (unconstructible here —
       see the range note). */
    if (domains !== null) {
        const { validateRegistryAgainstCards, ENGINE_TRUTH } = await import("./validate.js");
        // ENGINE_TRUTH ("mode", "variant", "model"): the compose's own
        // declaration keys, never card fields. "model" is the ROUTE
        // RE-POINT token (resolver_defaults.model, the krea-2-raw
        // precedent — a variant pick resolves server-side); a card
        // boarding a route address (qvoice across ALL qwen3-tts,
        // operator 2026-09-23) walks that view's defaults and the
        // token must skip like "variant" does.
        validateRegistryAgainstCards(decls, domains, ENGINE_TRUTH, boardings, new Set(svc.modelIds()), new Map(svc.modelIds().map((id) => [id, svc.getModel(id)])), cardAdmits);
    }
    // ── THE MOD INTERLOCK + THE FACTS-CALLER CHECK (pure halves
    //  above, unit-pinned): the boot feeds the live sets, never a
    //  second spelling of the refusal texts. The null halves ride
    //  the same degrade (cardSvc/factsModels null only when the
    //  catch above fired — unconstructible here).
    /* v8 ignore next -- see above. */
    if (cardSvc !== null) {
        assertModInterlock(decls, new Set(cardSvc.packNames()), new Set(cardSvc.verbIds()), cardSvc.flavorRegistrations(), cardSvc.verbRegistrations(), packFate);
    }
    /* v8 ignore next -- see above (factsModels null / empty boardings
       only on the degrade path). */
    if (factsModels !== null && boardings.size > 0) {
        assertFactsCallers(decls, factsModels, boardings);
    }
}
/** Boot the models system once — TRANSACTIONAL (the discharge
 *  stroke): one Context, the service, then every family plugin
 *  through ctx.plugin (each fiber registers through
 *  ctx.effect(() => ctx.models.registerFamily(DECL)) — the
 *  declaration is a REVERTIBLE effect). ANY family refusing
 *  (validation, duplicate, bad shape) DISPOSES the whole context:
 *  the table is empty, the boot throws — all-or-nothing, a broken
 *  family never half-serves. The contracts then cross-validate
 *  boot-loud (above) before the singleton owns the table. */
let bootInFlight = null;
export async function bootModels() {
    const cell = modelsBootCell();
    if (cell.booted !== null)
        return cell.booted;
    if (cell.inFlight !== null)
        return cell.inFlight;
    cell.inFlight = (async () => {
        const ctx = new Context();
        try {
            await ctx.plugin(modelsProvider);
            const families = await loadFamilies();
            for (const family of families) {
                await ctx.plugin(family);
            }
            // ctx.models is typed by this module's own declaration merge (the
            // `declare module "@deepseek-ai/cordis"` block below), so the read
            // needs no cast; the check stays as the runtime guard it always
            // was — cordis types what registration PROMISES, not what a
            // half-applied plugin produced (the typed-seam audit, 2026-10-15).
            const svc = ctx.models;
            /* v8 ignore next -- service registration is synchronous and
               immediate (service.ts:11); undefined is the impossible half
               (2026-09-12). */
            if (svc === undefined) {
                throw new ModelError("models service failed to register at boot");
            }
            /* v8 ignore next -- the transactional gate: every plugin
               registers exactly one family through its effect (a silent
               family breaks its own wall first); the mismatch half never
               fires in a green tree (2026-09-12). */
            if (svc.familyCount() !== families.length) {
                throw new ModelError(`boot registered ${svc.familyCount()} families but ${families.length} plugins loaded — a family registered nothing (the transactional gate)`);
            }
            await validateBootContracts(svc);
            cell.booted = svc;
            cell.bootedFrom = import.meta.url;
            return cell.booted;
            /* v8 ignore start -- the transactional discharge: fires only
               when a family refuses or the contracts refuse (a corrupt
               registry). The walls + the boot test pin the healthy path;
               a corrupt-family boot is unconstructible without breaking
               the tree's own gates first (2026-09-12). */
        }
        catch (err) {
            await ctx.fiber.dispose();
            cell.booted = null;
            throw err;
        }
        /* v8 ignore stop */
    })();
    try {
        return await cell.inFlight;
    }
    finally {
        cell.inFlight = null;
    }
}
/** The booted service (throws if bootModels has not settled). */
export function modelsService() {
    const cell = modelsBootCell();
    if (cell.booted === null) {
        throw new ModelError("models service not booted — await bootModels() first");
    }
    return cell.booted;
}
/** The boot-state probe (the form-spec census-arm split, 2026-10-13):
 * true once bootModels has settled in this process. Callers that
 * CATCH a getModel throw ask this before swallowing it — an
 * unbooted table's throw is the TABLE's own refusal and must ride,
 * never flatten into a not-found answer.
 *
 * @returns whether the models table is booted. */
export function modelsBooted() {
    return modelsBootCell().booted !== null;
}
/** The cascade through the booted service (the wall's entry). */
export function resolveCascade(base, intercept, head) {
    return modelsService().cascade(base, intercept, head);
}
//# sourceMappingURL=service.js.map