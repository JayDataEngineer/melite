// flowsData.ts — the TS flow-authoring plane, RE-HOMED (REBUILD-13,
// 2026-09-10): the named-flow declarations that lived in the dead
// gateway package (doors/flowsRegistry.ts, killed with the gateway
// app — KILL commit 40b57f94) live HERE as data, beside their
// serving owners (the runs registry {flow:} arms). Port verbatim:
// the eight declarations, the live from_flow expansion, and the
// inline shim (registryFlowToInline) — validate and start resolve
// stages LIVE through expandRegistryFlow, no snapshot drift.
//
// THE COMPILE-TIME INITIAL GATE (REBUILD-21, the deferral closed):
// registryInitialsError + checkFileInitial + InitialsRoots port
// verbatim (photo/glb file-initial checks + bake_params via the
// re-homed belt); the runs registry's {flow:} arms run it BEFORE
// any run registers — start can never queue what validate refuses.
//
// QUEUE LANE LAW unchanged: no legacy (no flow.py read — existence
// rides this registry), no fallbacks, no hardcodes.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { isFile } from "./skillFs.js";
import { CARD_PLANE_ENGINE, LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
import { join, resolve } from "node:path";
import { mediaVocab } from "./mediaKinds.js";
import { validateBakeParams } from "./bakeParams.js";
// ── shared builders ─────────────────────────────────────────────
export function initial(key) {
    return { initial: key };
}
export function fromStage(stage, output) {
    return { stage, output };
}
export function plainStage(row) {
    return {
        id: row.id,
        engine: row.engine,
        card: row.card ?? "",
        family: row.family ?? "",
        action: row.action ?? "",
        description: row.description,
        inputs: row.inputs,
        expected: row.expected ?? {},
        outputs: row.outputs ?? {},
        cardIo: row.cardIo ?? {},
        params: row.params,
        skipWhen: row.skipWhen ?? null,
        fromFlow: null,
    };
}
export function linkedStage(flow, stage, id, inputs) {
    return {
        id,
        engine: "",
        card: "",
        family: "",
        action: "",
        description: "",
        inputs,
        expected: {},
        outputs: {},
        cardIo: {},
        params: {},
        skipWhen: null,
        fromFlow: { flow, stage },
    };
}
// ── the eight declarations (cut 2026-10-13) ────────────────────
/** The craft loop (stroke 55, plan §2.3): ONE engine stage on
 *  'craft' — act (a nested engine command) → capture (run-dir
 *  artifacts) → critique (the image-capable route, the capture
 *  attached) → decide (done | refine-with-next-command), bounded
 *  by max_iterations (default unlimited, hard cap 1000). The
 *  operator's card sketch verbatim: model dropdown, inputs
 *  (generic), prompt for the agent, optional max iterations. The
 *  stage params carry those four fields at DRIVE time (the agent
 *  composes them into the start doc; the registry row is the
 *  template + the agent leaf). */
/** The agent spawner (stroke 61, plan §5): ONE engine stage on
 *  'agent' — a general tool-calling loop with the task as its brief
 *  (packages/engines/agent). The operator's card sketch verbatim:
 *  MCPs (blender, unity, custom), skills (dreamshot…), max turns
 *  (default unlimited), inputs (the plus-box list). The stage
 *  params carry those fields at DRIVE time; the registry row is
 *  the template + the agent leaf. */
import { BODY_TO_SOMAX, ANNY_HMR_COMMERCIAL, ANNY_PARAMS, AUDIO_NATIVE_TTS, CHARACTER_FACTORY, FIT_SEAT, IMAGE_UPSCALE, MUSIC_NATIVE, CRAFT_LOOP, OBJECT_FORGE, } from "./flowsRegistryRows.js";
import { Service } from "@deepseek-ai/cordis";
const REGISTRY = {
    "craft-loop": CRAFT_LOOP,
    "anny-hmr-commercial": ANNY_HMR_COMMERCIAL,
    "body-to-somax": BODY_TO_SOMAX,
    "character-factory": CHARACTER_FACTORY,
    "anny-params": ANNY_PARAMS,
    "audio-native-tts": AUDIO_NATIVE_TTS,
    "fit-seat": FIT_SEAT,
    "image-upscale": IMAGE_UPSCALE,
    "music-native": MUSIC_NATIVE,
    "object-forge": OBJECT_FORGE,
};
/** A pure read-only seat over the boot seed (REGISTRY verbatim, no
 *  registration surface): the door for callers with no host fiber —
 *  pure rigs and the walls. Service-owning callers read the live
 *  seat instead (ctx.get("meliteFlows")).
 * @returns the seeded FlowsSeat. */
export function seedFlowsSeat() {
    const rows = new Map(Object.entries(REGISTRY));
    return {
        get: (name) => rows.get(name),
        names: () => [...rows.keys()].sort(),
    };
}
/** The live flow registry seat (J4 cure: the table is instance
 *  state, never a module global). */
export class FlowsSeatService extends Service {
    static inject = [];
    // TS-private, not #private: cordis ctx.get returns a proxy, and
    // private-class-field reads die through it ("whose class did not
    // declare it"). The models seat rides public fields the same way.
    flows = new Map();
    constructor(ctx) {
        super(ctx, "meliteFlows");
        // THE SEED ROWS ARE FIBER-OWNED (the models precedent:
        // ctx.effect(() => ctx.models.registerFamily(DECL))): every row
        // registers through the same interlocks as a live drop-in —
        // disposing this service's fiber removes them.
        for (const flow of Object.values(REGISTRY)) {
            ctx.effect(() => this.register(flow));
        }
    }
    /** The raw (unexpanded) declaration, or undefined for unknown
     *  names. */
    get(name) {
        return this.flows.get(name);
    }
    /** All registered flow names, sorted. */
    names() {
        return [...this.flows.keys()].sort();
    }
    /** Register one flow into the live seat. LOUD: a duplicate id
     *  refuses (one owner per flow id — the same interlock as cards
     *  and model families); the stage and validator interlocks ride
     *  verbatim. Returns the disposer; call it (or dispose the
     *  ctx.effect that owns it) and the flow is gone from every
     *  read.
     * @param flow - the declaration to seat.
     * @returns the disposer removing exactly this row. */
    register(flow) {
        if (this.flows.has(flow.id)) {
            throw new Error(`flow '${flow.id}' registered twice — one owner per flow id (the interlock)`);
        }
        if (!Array.isArray(flow.stages) || flow.stages.length === 0) {
            throw new Error(`flow '${String(flow.id)}' has no stages — a flow is a pipeline, an empty one is authoring noise`);
        }
        // THE SEAM'S TWO HALVES MUST AGREE (registration, not first
        // use): a required initial the flow does not also VALIDATE gets
        // no shape check, and the extractor — which walks
        // initialValidators — never lifts it, so the value would reach
        // the merge unlinked and die there as an unresolvable token.
        // Refuse the row at its one registration instead of at the
        // door, sixty seconds later.
        for (const key of flow.requiredInitials ?? []) {
            if (flow.initialValidators[key] === undefined) {
                throw new Error(`flow '${String(flow.id)}' requires initial '${key}' but declares no validator for it — ` +
                    "a required initial needs its kind (the gate shapes it; the extractor lifts it)");
            }
        }
        // THE DRY-RUN (audit J-S1 — the gate was near-no-op): each
        // stage's own composition shape is judged HERE, at the row's
        // one registration, with the same gate expansion judges — a
        // mis-shaped row dies at boot/live-add with its name, never at
        // first compile. Cross-row wiring (from_flow targets) stays
        // compile-time law: a link may name a flow that registers
        // LATER, and demanding it now would break the boot order.
        for (const st of flow.stages) {
            if (st.fromFlow === null)
                refuseRawWorkflowShape(flow.id, st);
        }
        this.flows.set(flow.id, flow);
        return () => {
            // only OUR row dies — a later registration under the same id
            // (impossible today, the interlock above) would not be
            // reverted
            if (this.flows.get(flow.id) === flow)
                this.flows.delete(flow.id);
        };
    }
}
/** Resolve every fromFlow row against its source flow (Stage.from_flow
 *  verbatim: the source row's engine/card/description/expected/
 *  outputs/card_io/params ride; the link's id + inputs win). Throws
 *  LOUD on a dangling link (authoring bug — never a silent row). */
/** THE RAW-WORKFLOW REFUSAL (the strictness audit's fix 8,
 *  corrected against the dispatch truth): a stage is composed by
 *  exactly one of three planes — the card plane (card), the family
 *  plane (family AND action), or an engine verb (any engine but the
 *  card-plane one — craft/agent stages ride the runs door
 *  directly). A card-plane-engine stage naming no card and no
 *  family action is the retired raw-workflow authoring shape: it
 *  used to ride params-only to the engine and die there ("carries
 *  no inline workflow"). ONE gate, two fires: register() dry-runs
 *  it (audit J-S1 — a mis-shaped row refuses at registration, not
 *  sixty seconds later at first compile) and expansion re-judges
 *  (drop-in rows enter through register too; the expansion arm
 *  keeps the compile-time verdict for rows seeded before this
 *  gate). */
export function refuseRawWorkflowShape(flowId, st) {
    if (st.family !== "" && st.action === "") {
        throw new Error("[flows_registry] flow " + flowId + " stage " + st.id +
            " declares family " + st.family + " with no action — the family plane needs both (refused at expansion)");
    }
    if (st.card === "" && st.family === "" && st.action === "") {
        if (st.engine !== CARD_PLANE_ENGINE)
            return; // engine-verb stage — legal
        throw new Error("[flows_registry] flow " + flowId + " stage " + st.id +
            " names neither card nor family+action on engine " + st.engine +
            " — the raw-workflow authoring shape is retired (refused at expansion, never served)");
    }
}
/** THE TEMPLATE DETACH (round-21 flows audit F0): the expansion's
 *  stages are the press's params-overlay TARGETS — a stage row that
 *  aliases the registry's own object let one press's knobs become
 *  every later press's template (the served rows are shared). Both
 *  branches return fresh containers: the stage shallow-copied, and
 *  EVERY mutable container deep-copied — params, inputs, expected,
 *  outputs, cardIo, skipWhen (round-22 compose audit Q1a,
 *  TEMPLATE-DETACH-COMPLETE: inputs/expected rode by reference, so
 *  one future in-place inputs rewrite would poison the template
 *  across presses — the probe's INJECTED write was visible on the
 *  registry template itself). All are JSON-shaped by the
 *  RegistryStage contract, so structuredClone is total. fromFlow
 *  rides shared: a two-string link descriptor expansion only reads,
 *  never writes through. */
function detachStage(st) {
    return {
        ...st,
        params: structuredClone(st.params),
        inputs: structuredClone(st.inputs),
        expected: structuredClone(st.expected),
        outputs: structuredClone(st.outputs),
        cardIo: structuredClone(st.cardIo),
        skipWhen: structuredClone(st.skipWhen),
    };
}
export function expandRegistryFlow(flow, seat) {
    const stages = flow.stages.map((st) => {
        if (st.fromFlow === null) {
            refuseRawWorkflowShape(flow.id, st);
            return detachStage(st);
        }
        const link = st.fromFlow;
        // THE LIVE SEAT, not the boot literal (the G1 seat-gap finding,
        // 2026-09-28): link resolution read REGISTRY directly, so a
        // flow registered live could never be a from_flow TARGET — the
        // seat was write-only for expansion, and no wall could see it
        // (the seed flow the walls clone has no links). A drop-in that
        // registers a flow another flow links to is exactly the
        // composition the door exists for. The seat rides the caller's
        // param (J4): expansion reads the LIVE table, never a module
        // global.
        const src = seat.get(link.flow);
        if (src === undefined) {
            throw new Error("[flows_registry] flow " + flow.id + " stage " + st.id +
                " links unknown flow " + link.flow);
        }
        const base = src.stages.find((s) => s.id === link.stage);
        if (base === undefined) {
            throw new Error("[flows_registry] flow " + flow.id + " stage " + st.id +
                " links unknown stage " + link.flow + "/" +
                link.stage);
        }
        if (base.fromFlow !== null) {
            throw new Error("[flows_registry] flow " + flow.id + " stage " + st.id +
                " links a linked stage (single-hop only): " +
                link.flow + "/" + link.stage);
        }
        return detachStage({ ...base, id: st.id, inputs: st.inputs });
    });
    return { ...flow, stages };
}
/** Does a projected inline doc carry at least one CARD-bearing stage?
 *  (the 2026-10-04 admission for the card-flow cure: such a doc is
 *  the one shape the inline compiler refuses, so the start door
 *  composes its card stages through the card plane first). */
export function inlineStagesNameCards(doc) {
    const rows = doc["stages"];
    if (!Array.isArray(rows))
        return false;
    return rows.some((r) => typeof r === "object" && r !== null &&
        typeof r["card"] === "string" &&
        r["card"] !== "");
}
/** The registry flow as a flow_from_body-shaped inline doc (the
 *  validate compile + start shim both ride the EXISTING inline
 *  pipelines — no second validator). Card rows ride card/card_io;
 *  skip_when rides verbatim. */
export function registryFlowToInline(flow) {
    return {
        id: flow.id,
        description: flow.description,
        stages: flow.stages.map((st) => {
            const inputs = {};
            for (const [name, edge] of Object.entries(st.inputs)) {
                if ("initial" in edge)
                    inputs[name] = { initial: edge.initial };
                else {
                    inputs[name] = {
                        stage: edge.stage,
                        output: edge.output,
                    };
                }
            }
            const row = {
                id: st.id,
                engine: st.engine,
                description: st.description,
                inputs,
                outputs: { ...st.outputs },
                expected: { ...st.expected },
                params: st.params,
            };
            if (st.card !== "")
                row["card"] = st.card;
            if (Object.keys(st.cardIo).length > 0)
                row["card_io"] = { ...st.cardIo };
            if (st.skipWhen !== null) {
                row["skip_when"] = {
                    initial: st.skipWhen.initial,
                    when: st.skipWhen.when,
                };
            }
            return row;
        }),
    };
}
/** Check one photo/glb initial value. Null = passes. */
function checkFileInitial(key, kind, value, roots) {
    let ref;
    if (typeof value === "string")
        ref = value;
    else if (typeof value === "object" && value !== null && !Array.isArray(value) &&
        typeof value["path"] === "string") {
        ref = value["path"];
    }
    else {
        return ("initial " + JSON.stringify(key) + " must be a file path string or " +
            "{path: ...} (got " + (typeof value) + ")");
    }
    const raw = ref.trim();
    if (raw.startsWith("data:") || raw.startsWith("blob:")) {
        return ("initial " + JSON.stringify(key) +
            " is browser-local (nothing to stage) — upload the file first: " +
            "POST /v1/uploads, then pass its staged path");
    }
    // (split never yields [] — [0] is always a string here)
    const dot = raw.split(/[?#]/)[0].lastIndexOf(".");
    const ext = dot >= 0
        ? raw.split(/[?#]/)[0].slice(dot + 1).toLowerCase()
        : "";
    // The vocab is TYPED DATA now (mediaKinds.ts, REBUILD-7) — no
    // repo-anchored kindsPath read survives the re-home.
    const kinds = mediaVocab();
    const allowed = kind === "photo" ? kinds.image : kinds.model;
    if (!allowed.includes(ext)) {
        return ("initial " + JSON.stringify(key) + " is not a stageable " +
            (kind === "photo" ? "image" : "mesh") + " (got extension " +
            JSON.stringify(ext) + ")");
    }
    if (raw.includes("..")) {
        return "initial " + JSON.stringify(key) + " refuses traversal";
    }
    const cands = [];
    // BOTH run-media spellings (operator, 2026-10-10: no breakage,
    // ever): the live /melite-media/runs/ and the legacy
    // /v1/assets/runs/ that stored benches, archives and run rows
    // still name. The media route serves both, so a chained input
    // resolves whichever spelling it carries.
    // the contract's two names (benchStage.ts) — the same pair the
    // media route mounts and the bench heals
    const ASSET_RUNS_PREFIX = LEGACY_RUN_MEDIA_PREFIX + "/";
    const MEDIA_RUNS_PREFIX = RUN_MEDIA_PREFIX + "/";
    const runPrefix = raw.startsWith(MEDIA_RUNS_PREFIX)
        ? MEDIA_RUNS_PREFIX
        : raw.startsWith(ASSET_RUNS_PREFIX) ? ASSET_RUNS_PREFIX : "";
    if (runPrefix !== "") {
        const rel = raw.slice(runPrefix.length);
        if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
            return ("initial " + JSON.stringify(key) +
                " is a malformed artifact URL (want " + RUN_MEDIA_PREFIX + "/<run_id>/<file>)");
        }
        for (const root of [
            join(roots.stateRoot, "output"),
            join(roots.stateRoot, "test-output"),
            join(roots.repoRoot, "data", "runs", "output"),
            join(roots.repoRoot, "data", "runs", "test-output"),
        ]) {
            cands.push(join(root, rel));
        }
    }
    else if (raw.startsWith("/")) {
        cands.push(raw);
    }
    else {
        cands.push(resolve(roots.repoRoot, raw));
        cands.push(resolve(process.cwd(), raw));
    }
    for (const cand of cands) {
        if (isFile(cand))
            return null;
    }
    return "initial " + JSON.stringify(key) + " is not on disk (" + raw + ")";
}
/** The compile-time gate over a registry flow's initial_validators:
 *  the first refusal text, or null when every PRESENT initial
 *  passes (absent initials ride — the $channel/branch arms own
 *  them). Runs BEFORE any run registers, on both doors. */
export function registryInitialsError(flow, body, roots) {
    for (const [key, kind] of Object.entries(flow.initialValidators)) {
        const value = body[key];
        if (value === undefined || value === null)
            continue;
        if (kind === "bake_params") {
            const s = typeof value === "string"
                ? value
                : JSON.stringify(value);
            if (s === undefined) {
                return ("initial " + JSON.stringify(key) +
                    " must be a params_json string or object (got " +
                    (typeof value) + ")");
            }
            const err = validateBakeParams(s);
            if (err !== null) {
                return "initial " + JSON.stringify(key) + " refuses the preset dialect: " + err;
            }
            continue;
        }
        // A TEXT initial is a bare name, not a file: a bone, a rig slot.
        // The engine's own gate is on emptiness; the door's is on shape,
        // so a path can never arrive where a name belongs.
        if (kind === "text") {
            const text = typeof value === "string" ? value : "";
            if (text.trim() === "") {
                return "initial " + JSON.stringify(key) + " must be a non-empty name";
            }
            if (text.includes("..") || text.includes("/") || text.includes("\\")) {
                return "initial " + JSON.stringify(key) +
                    " is a bare name (no path separators, no traversal)";
            }
            continue;
        }
        const err = checkFileInitial(key, kind, value, roots);
        if (err !== null)
            return err;
    }
    // A REQUIRED INITIAL refuses here, before a run registers (an
    // optional one rides absent — the $channel/branch arms own it), and
    // AFTER the present-value checks so a request carrying a bad value
    // hears about THAT value first. The fit verb's bone is the case: the
    // vendor's row gate refuses an empty one, so a request that omits it
    // must learn that at the door, not sixty seconds into a render.
    for (const key of flow.requiredInitials ?? []) {
        const value = body[key];
        if (value === undefined || value === null || value === "") {
            return "initial " + JSON.stringify(key) +
                " is REQUIRED by the " + JSON.stringify(flow.id) + " flow — " +
                "this verb cannot run without it (name it in the request; the " +
                "door refuses here rather than the engine refusing later)";
        }
    }
    return null;
}
/** The initial VALUE one gate-blessed body entry carries, in the
 *  string form the engine merge links a $spell against: file
 *  initials give their path ({path: …} unwraps — the two spellings
 *  the gate blesses), bake_params gives its params_json string
 *  (objects stringify — the dialect the belt validates). Null
 *  refuses a shape the gate would have refused, so a mangled
 *  durable body fails loud at the door instead of shipping an
 *  "[object Object]" literal to the engine.
 *  @param key the initial's declared name, for the refusal voice
 *  @param kind the declared validator kind
 *  @param value the raw body entry
 *  @returns the normalized string, or null when the shape is neither */
export function normalizedInitialValue(key, kind, value) {
    // A TEXT initial is a BARE NAME: nothing unwraps it and nothing
    // path-shaped reaches it, so the {path: …} arm below never runs
    // for one. (It used to: a file path could be lifted as a bone
    // name, reachable only because every call site runs the gate
    // first — this arm makes the extractor honest on its own.)
    if (kind === "text")
        return typeof value === "string" ? value : null;
    if (typeof value === "string")
        return value;
    if (kind === "bake_params") {
        // JSON.stringify(undefined) is undefined — the null-ish check
        // in the caller skips absent entries before this arm.
        const s = JSON.stringify(value);
        return s === undefined ? null : s;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value) &&
        typeof value["path"] === "string") {
        return value["path"];
    }
    return null;
}
/** The request initials a body carries for a flow's declared
 *  validators, normalized per {@link normalizedInitialValue}:
 *  declared keys, present values only; absent stays absent (the
 *  $channel/branch arms own those). First refusal text, or null
 *  when every present value normalizes. Both start doors (the
 *  flow arm and the flow_inline replay arm, which recovers the
 *  declaration from the inline doc's registry id) call this —
 *  the replayed durable body re-extracts the same values the
 *  original start extracted, so a queued run that reboots mid-
 *  queue keeps its $spells linkable at the engine merge.
 *  @param flow the declaration whose initialValidators own the keys
 *  @param body the request body
 *  @returns the normalized initials record, or a refusal string */
export function extractRequestInitials(flow, body) {
    const initials = {};
    for (const [key, kind] of Object.entries(flow.initialValidators)) {
        const value = body[key];
        if (value === undefined || value === null)
            continue;
        const normalized = normalizedInitialValue(key, kind, value);
        if (normalized === null) {
            return {
                refusal: "initial " + JSON.stringify(key) +
                    (kind === "bake_params"
                        ? " must be a params_json string or object (got " +
                            (typeof value) + ")"
                        : kind === "text"
                            ? " must be a bare name (got " + (typeof value) + ")"
                            : " must be a file path string or {path: ...} (got " +
                                (typeof value) + ")"),
            };
        }
        initials[key] = normalized;
    }
    return { initials };
}
// ── the skill-body render (REBUILD-16; the tail beyond the
// REBUILD-13 cut) ──
function edgeText(edge, flow, seat) {
    // A REQUIRED INITIAL SAYS SO (the door refuses a request without
    // it; the served body is where a caller learns that before they
    // try). The flow's own requiredInitials list is the one truth.
    if ("initial" in edge) {
        return "initial '" + edge.initial + "'" +
            ((flow.requiredInitials ?? []).includes(edge.initial) ? " (REQUIRED)" : "");
    }
    const src = edge.stage + "." + edge.output;
    let kind = "";
    for (const st of flow.stages) {
        const base = st.fromFlow !== null ? resolveLink(st, seat) : st;
        if (base.id === edge.stage) {
            kind = base.outputs[edge.output] ?? base.cardIo[edge.output] ?? "";
        }
    }
    return "stage " + src + (kind !== "" ? " (" + kind + ")" : "");
}
/** L8 (the fallback audit, 2026-09-28): a dangling fromFlow link used
 *  to fall back to the LINKING row (`?? st`) — the rendered skill body
 *  then described the link's own engine/card as if it were the linked
 *  base, lying to the agent that reads it. The REGISTRY is code: a
 *  link that cannot resolve is an authoring bug and REFUSES LOUD,
 *  naming the flow and stage. (Both callers guard fromFlow !== null
 *  before the call; the fence throw below is the rim's contract.) */
function resolveLink(st, seat) {
    /* v8 ignore next 3 -- resolveLink is module-private and BOTH
     * callers (:671, :713) guard fromFlow !== null inline; the fence
     * is the rim's contract for future callers, not a reachable arm
     * (audit 2026-10-13). */
    if (st.fromFlow === null) {
        throw new Error("resolveLink: stage '" + st.id + "' carries no fromFlow link (caller guard missing)");
    }
    const link = st.fromFlow;
    // the LIVE SEAT, same law as expandRegistryFlow above
    const src = seat.get(link.flow);
    if (src === undefined) {
        throw new Error("registry: stage '" + st.id + "' links from unknown flow '" + link.flow +
            "' (known flows: " + seat.names().join(", ") + ")");
    }
    const base = src.stages.find((s) => s.id === link.stage);
    if (base === undefined) {
        throw new Error("registry: stage '" + st.id + "' links from unknown stage '" + link.flow + "/" + link.stage +
            "' (known stages: " + src.stages.map((s) => s.id).sort().join(", ") + ")");
    }
    return base;
}
/** Render one registry flow as its skill-body text. */
export function registrySkillBody(flow, seat) {
    const lines = ["# flow " + flow.id, "", flow.description, "", "## stages"];
    for (const st of flow.stages) {
        const base = st.fromFlow !== null ? resolveLink(st, seat) : st;
        let head = "- " + st.id + " (";
        head += st.fromFlow !== null
            ? "from " + st.fromFlow.flow + "/" + st.fromFlow.stage
            : base.engine + (base.card !== "" ? ", card " + base.card : "");
        head += ")";
        if (base.description !== "")
            head += ": " + base.description;
        lines.push(head);
        for (const [name, edge] of Object.entries(st.inputs)) {
            lines.push("  input " + name + ": " + edgeText(edge, flow, seat));
        }
        for (const [name, kind] of Object.entries(base.outputs)) {
            lines.push("  output " + name + ": " + kind);
        }
        for (const [name, kind] of Object.entries(base.cardIo)) {
            lines.push("  card_io " + name + ": " + kind);
        }
        if (st.skipWhen !== null) {
            lines.push("  skip when initial '" + st.skipWhen.initial + "' is " + st.skipWhen.when);
        }
    }
    return lines.join("\n") + "\n";
}
//# sourceMappingURL=flowsData.js.map