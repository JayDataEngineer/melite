import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
// runsStart.ts — the start arm's pure chain, re-homed VERBATIM from
// the dead flowsRun door (REBUILD-6): the flow_inline structural
// compile (frozen texts over the admission verdicts in
// ./runsGates.ts) and the registration tail (mint + dir + the rich
// run row). Refusals keep the door's byte-pinned prose as tagged
// unions — the remote maps them to the protocol's ONE RemoteError.
//
// SCOPE (2026-10-10, the records audit's S1 — this header described
// a scope two strokes out of date and now contradicted its own body):
// this module is the start arm's chain for EVERY run shape the runs
// service registers — {model:} card runs, {flow:} registry runs,
// {flow_inline:} inline runs, and MULTI-STAGE bench rows. The
// refusals that remain are the ones listed at their own arms: the
// compile gates (an unknown node, an undeclared input, a dead wire,
// a self-wire) and the initial gate (a missing FromStage initial).
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FlowError } from "./runsValidateShared.js";
import { AGENT_ENGINE_ID, CRAFT_ENGINE_ID, COMFYUI_ENGINE_ID, engineIdOk, } from "@melite/engine-contract";
import { FLOW_INLINE_TOP_VOICE, INLINE_TOP_KEYS, STAGE_KEYS, checkFlowInlineTop, checkFlowStage, } from "./runsGates.js";
import { appendLedger, outRootFor, refusal, sidecarDoc, sidecarStageOf, variantOfBodies, writeJsonAtomic } from "./queue.js";
import { lifecycleInFlight } from "./lifecycleLatch.js";
import { toRemoteError } from "./runsRefusalVoices.js";
import { ENGINE_TABLE } from "./runsValidateShared.js";
import { rootsManifest } from "./rootsManifest.js";
// the envelope-refusal SSOT lives in queueSubmit.ts (beside
// walkSubmitEnvelope, the one walker the registry delegates to) —
// re-exported here so the registry's import sites stay stable
export { envelopeRefusal, unknownDraftRefusal } from "./queueSubmit.js";
// the doors twin's one home (the envelope-twin cure): the door set
// and both refusal texts ride queueSubmit's helpers
import { submitDoorsOf, ambiguousDoorsRefusal, noDoorRefusal } from "./queueSubmit.js";
import { saveBenchSnapshotStages } from "@melite/contracts/benchSnapshot";
import { collectSourceRefs, resolveSourceRefs } from "./runsSourceEcho.js";
/** One compiled stage (the rim the worker splices). */
/** THE COMPILED→WIRE PROJECTION (audits F-S4/S5 — the start-side
 *  parity judge consumes wire rows, the door compiles its own):
 *  inputNames encodes the source ("stage.output" or
 *  "__initial__.key") — stage ids are legal identifiers, so the
 *  first dot splits a stage ref exactly; only string-valued
 *  outputs/expected ride (the wire contract's kind map — anything
 *  else skips judgment, never coerced). */
const kindEntries = (m) => {
    const rows = [];
    for (const [name, v] of Object.entries(m)) {
        if (typeof v === "string")
            rows.push({ name, kind: v });
    }
    return rows;
};
export function compiledStageRow(st) {
    return {
        id: st.id,
        engine: st.engine,
        description: "",
        params: st.params,
        inputs: Object.entries(st.inputNames).map(([name, src]) => {
            if (src.startsWith("__initial__.")) {
                return { name, edge: { kind: "initial", key: src.slice("__initial__.".length) } };
            }
            const dot = src.indexOf(".");
            return {
                name,
                edge: { kind: "stage", stage: src.slice(0, dot), output: src.slice(dot + 1) },
            };
        }),
        outputs: kindEntries(st.outputs),
        expected: kindEntries(st.expected),
        card: "",
        cardIo: [],
        skipWhen: null,
    };
}
/** THE DOC-LOCAL DERIVATION (audits F-S4/S5): validate derives a
 *  row's expected kinds from the card ports BEFORE the lattice runs;
 *  a durable doc carries no cards, so the replay judge derives from
 *  the doc's own declared upstream outputs — an absent expected
 *  takes the upstream kind, and a wire to an upstream output the doc
 *  never declares refuses here with the lattice's link voice
 *  (kindsOk's mismatch arm would fire first and name the wrong
 *  fact). Declared expected rows re-judge exactly as validate did.
 *  An edge to a stage OUTSIDE the doc (the bench lane's cross-wire —
 *  the worker injects those stages at compose) is not doc-derivable
 *  and drops out of the judged rows: the judge runs only where the
 *  kinds were derivable, never a false refusal on the legal wire.
 *  A doc with ANY filled-outputs row skips the judge wholesale: its
 *  real channels live in the card plane (validate + the compose own
 *  those verdicts), and the doc is not self-describing. */
export function replayJudgeRows(compiled) {
    if (compiled.stages.some((st) => !st.outputsDeclared))
        return [];
    const rows = compiled.stages.map(compiledStageRow);
    const docStages = new Set(rows.map((r) => r.id));
    const outputsByStage = new Map(rows.map((r) => [r.id, new Map(r.outputs.map((o) => [o.name, o.kind]))]));
    const judged = [];
    for (const row of rows) {
        const expected = new Set(row.expected.map((e) => e.name));
        const inputs = [];
        for (const inp of row.inputs) {
            if (inp.edge.kind === "stage" && !docStages.has(inp.edge.stage)) {
                // the edge is undecidable without its stage — the declared
                // expected rides the same undecidability and drops with it
                row.expected = row.expected.filter((e) => e.name !== inp.name);
                continue;
            }
            inputs.push(inp);
            if (inp.edge.kind !== "stage")
                continue;
            const upstream = outputsByStage.get(inp.edge.stage);
            if (upstream === undefined)
                continue;
            const upstreamKind = upstream.get(inp.edge.output);
            if (upstreamKind === undefined) {
                throw new FlowError("flow stage " +
                    JSON.stringify(row.id) +
                    " input " +
                    JSON.stringify(inp.name) +
                    ": stage " +
                    JSON.stringify(inp.edge.stage) +
                    " has no output named " +
                    JSON.stringify(inp.edge.output) +
                    " (declared outputs: " +
                    JSON.stringify([...upstream.keys()].sort()) +
                    ")");
            }
            if (!expected.has(inp.name))
                row.expected.push({ name: inp.name, kind: upstreamKind });
        }
        row.inputs = inputs;
        // A declared expected whose input never wired in-doc is supplied
        // by the compose plane (the card-port rows) — same
        // non-self-describing class as a filled output: skip the doc.
        const wired = new Set(inputs.map((i) => i.name));
        if (row.expected.some((e) => !wired.has(e.name)))
            return [];
        judged.push(row);
    }
    return judged;
}
/** flow_inline structural compile — door-verbatim (structure via
 *  the admission verdicts, voice here; the engine policy +
 *  default-fills below are value-domain, not type structure).
 *
 *  THE ENGINE GATE (stroke 53, the engine-generics seam): the
 *  engine id must be GRAMMATICAL (the card plane's engine or 'mcp:<server>',
 *  engine-contract's engineIdOk) AND known to the caller. The
 *  caller passes the live registry ids (the 'engines' seat when
 *  mounted); the default (CARD_PLANE_ENGINE) keeps every seat-less boot
 *  (fixtures, walls) on the pre-seam voice. */
export function compileFlowInline(inline, knownEngines = [CARD_PLANE_ENGINE]) {
    const top = checkFlowInlineTop(inline);
    if (top.kind === "not-object" || top.kind === "bad-stages") {
        return refusal(400, FLOW_INLINE_TOP_VOICE[top.kind], "invalid_request");
    }
    if (top.kind === "unknown-keys") {
        return refusal(400, "flow body carries unknown keys " +
            JSON.stringify(top.dead) +
            " — allowed: " +
            JSON.stringify([...INLINE_TOP_KEYS].sort()), "invalid_request");
    }
    if (top.kind === "missing-id-stages") {
        return refusal(400, "flow body needs at least id and stages — got keys " +
            JSON.stringify(top.keys), "invalid_request");
    }
    const rec = top.rec;
    const stages = [];
    const rows = rec["stages"];
    for (let i = 0; i < rows.length; i++) {
        const checked = checkFlowStage(rows[i]);
        if (checked.kind === "not-object") {
            return refusal(400, "stage[" + i + "] must be an object", "invalid_request");
        }
        if (checked.kind === "unknown-fields") {
            const st = checked.st;
            return refusal(400, "stage[" +
                i +
                "] " +
                JSON.stringify(String(st["id"] ?? "<no id>")) +
                ": body carries unknown field(s) " +
                JSON.stringify(checked.extras) +
                " — the schema declares " +
                JSON.stringify([...STAGE_KEYS].sort()) +
                " (extra=forbid at the door)", "invalid_request");
        }
        if (checked.kind === "bad-id") {
            const sid = String(checked.st["id"] ?? "");
            return refusal(400, "stage id " + JSON.stringify(sid) + " is not a legal identifier", "invalid_request");
        }
        const st = checked.st;
        // (the bad-id gate above refuses id-less stages — the id is a
        // string here.)
        const sid = st["id"];
        const engine = String(st["engine"] ?? "");
        if (engine === "") {
            return refusal(400, "stage " + JSON.stringify(sid) + ": no engine named", "invalid_request");
        }
        if (engine !== CARD_PLANE_ENGINE) {
            // Grammar first (drift in the id itself), then membership
            // (an id the gateway cannot serve). Both refuse with the
            // engine named — never a silent skip. The seat-less default
            // (the card plane's engine) keeps the pre-seam refusal for foreign ids.
            if (!engineIdOk(engine)) {
                return refusal(400, "flow_inline stage " +
                    JSON.stringify(sid) +
                    " names engine " +
                    JSON.stringify(engine) +
                    " — engine ids are " +
                    COMFYUI_ENGINE_ID + ", " + CRAFT_ENGINE_ID + ", " +
                    AGENT_ENGINE_ID +
                    " or 'mcp:<server>' ([A-Za-z0-9_-]{1,32})", "invalid_request");
            }
            if (!knownEngines.includes(engine)) {
                return refusal(400, "flow_inline stage " +
                    JSON.stringify(sid) +
                    " names engine " +
                    JSON.stringify(engine) +
                    " — this gateway serves registered engines only (" +
                    (knownEngines.length === 0
                        ? "none registered"
                        : knownEngines.slice().sort().join(", ")) +
                    ")", "preview_scope");
            }
        }
        // No branch pruning on this gateway: skip_when is unported.
        if (st["skip_when"] !== undefined && st["skip_when"] !== null) {
            return refusal(400, "flow_inline stage " +
                JSON.stringify(sid) +
                ": skip_when is unported on this gateway", "preview_scope");
        }
        // (the undefined guard above fired — the ?? below is dead.)
        if (st["card"] !== undefined && String(st["card"]) !== "") {
            return refusal(400, "flow_inline stage " +
                JSON.stringify(sid) +
                ": card= stages are unported on this gateway", "preview_scope");
        }
        // A MALFORMED CONTAINER IS REFUSED, NOT COERCED (the coverage
        // audit's HIGH finding, proven independently by two auditors).
        // This door used to treat `params: ["x"]` and `inputs: ["x"]` as
        // absent: the run registered "clean", the operator saw a
        // completed run with its wiring silently gone, and
        // runs-start.spec.ts ASSERTED that silence. The bench door
        // refuses the same shapes (bench/bad-wire) — two seats, one
        // shape, opposite judgments. The bench is right: a container that
        // cannot be read is not an absent container.
        for (const key of ["params", "inputs", "outputs", "expected"]) {
            const raw = st[key];
            if (raw === undefined)
                continue;
            if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
                return refusal(400, "flow_inline stage " + JSON.stringify(sid) + ": " + key +
                    " must be an object (got " +
                    (raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw) +
                    "); a shape that cannot be read is refused here, not dropped — a dropped " +
                    key + " makes the run register without it", "invalid_request");
            }
        }
        // AND A MALFORMED BINDING inside a well-formed container, for the
        // same reason: `{stage: "up"}` with no output channel is a wire
        // that resolves to nothing, and dropping it is indistinguishable
        // from never having wired it.
        const rawInputs = st["inputs"];
        for (const [name, ref] of Object.entries(rawInputs ?? {})) {
            const rr = ref;
            const shaped = typeof rr === "object" && rr !== null && !Array.isArray(rr);
            if (shaped && (typeof rr["stage"] === "string" && typeof rr["output"] === "string"))
                continue;
            if (shaped && typeof rr["initial"] === "string")
                continue;
            return refusal(400, "flow_inline stage " + JSON.stringify(sid) + ": input " + JSON.stringify(name) +
                " is neither {stage, output} nor {initial} (got " + JSON.stringify(ref) +
                ") — a wire that cannot be read is refused here, not dropped", "invalid_request");
        }
        const params = typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"])
            ? st["params"]
            : {};
        // THE ENGINE TABLE'S OWN DEFAULT (audit S-S6, 2026-10-22):
        // validate's lattice treats an EMPTY outputs map as stageless
        // and judges the stage by the engine's table def (craft->image,
        // agent->text); start's flat "image" bound a different kind than
        // the lattice judged. One fill law, both doors: empty-or-absent
        // outputs take the table's default channel.
        const declaredOutputs = st["outputs"];
        const outputsDeclared = typeof declaredOutputs === "object" && declaredOutputs !== null &&
            !Array.isArray(declaredOutputs) &&
            Object.keys(declaredOutputs).length > 0;
        const outputs = outputsDeclared
            ? declaredOutputs
            : { default: ENGINE_TABLE[engine] !== undefined ? ENGINE_TABLE[engine].def : "image" };
        const expected = typeof st["expected"] === "object" && st["expected"] !== null && !Array.isArray(st["expected"])
            ? st["expected"]
            : {};
        const outputNodes = typeof params["output_nodes"] === "object" &&
            params["output_nodes"] !== null &&
            !Array.isArray(params["output_nodes"])
            ? params["output_nodes"]
            : {};
        const inputNames = {};
        const inputs = st["inputs"];
        if (typeof inputs === "object" && inputs !== null && !Array.isArray(inputs)) {
            for (const [name, ref] of Object.entries(inputs)) {
                const rr = ref;
                if (typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
                    typeof rr["stage"] === "string" && typeof rr["output"] === "string") {
                    inputNames[name] = String(rr["stage"]) + "." + String(rr["output"]);
                }
                else {
                    // the binding wall above already refused every entry that
                    // is neither {stage, output} nor {initial} — reaching the
                    // else means the {initial} shape, no re-test needed
                    inputNames[name] = "__initial__." + String(rr["initial"]);
                }
            }
        }
        // THE SPELL GATE (2026-10-09, the operator's live refusal): a
        // $spell in params resolves against EXACTLY this inputNames map
        // at the merge (rewriteSpells) — a spell naming no wired input
        // used to pass this door and die mid-run with 'workflow carries
        // $image1'. THE DOOR COVERS WHAT THE RUN WILL DO: refuse here,
        // in the door's voice, naming the spell and the fix.
        const ghosts = [];
        const sweep = (v) => {
            if (typeof v === "string") {
                if (v.startsWith("$") && !(v.slice(1) in inputNames))
                    ghosts.push(v);
            }
            else if (Array.isArray(v)) {
                for (const x of v)
                    sweep(x);
            }
            else if (typeof v === "object" && v !== null) {
                for (const x of Object.values(v))
                    sweep(x);
            }
        };
        sweep(params);
        if (ghosts.length > 0) {
            return refusal(400, "flow_inline stage " +
                JSON.stringify(sid) +
                ": params carry " +
                JSON.stringify([...new Set(ghosts)].sort()) +
                " but the stage wires no input of that name — the merge would refuse it at run time ('$name' must name a FromStage-wired input or a request initial; name it or wire it)", "invalid_request");
        }
        stages.push({ id: sid, engine, params, outputs, outputsDeclared, expected, outputNodes, inputNames });
    }
    return { stages };
}
/** The door-selection gate: exactly one of flow / flow_inline /
 *  model, in DOOR order for the ambiguity text (resolve_request
 *  302). Returns the selected door key, or the refusal. The
 *  `draftBench` option admits the DRAFT DOOR: a body with no door
 *  key over a live bench draft (the tool's familyless bench walk
 *  presses {test, draft_id} alone — a model key would select the
 *  card arm and hit the board check), which the caller restages
 *  onto the wired-bench compose. */
export function selectSubmitDoor(body, opts = {}) {
    const doors = submitDoorsOf(body);
    if (doors.length > 1) {
        return ambiguousDoorsRefusal(doors);
    }
    if (doors.length === 0) {
        if (opts.draftBench === true)
            return { door: "draft" };
        return noDoorRefusal();
    }
    return { door: doors[0] };
}
/** The registration tail (door-verbatim): mint the id, route the
 *  out root on the test flag, build the rich run row. The caller
 *  (the remote) enqueues it on the queue core + kicks the pump.
 *  Returns the row and its queue position. */
export async function registerCompiledRun(args) {
    const { compiled, testFlag, draftId, stateRoot, enqueue, door } = args;
    // THE ONE RUN ID (see the type above): the caller's. There is no
    // second producer here, and there cannot be one without failing the
    // compiler.
    const runId = door.runId;
    // THE SOURCE-ECHO GUARD (the source-echo law, 2026-09-23): every
    // compiled stage's params are swept for source pointers BEFORE the
    // run dir exists — a dead source refuses here with its URL named,
    // never mid-render, and nothing registers. The roots are the
    // manifest (own root first — the media server's own walk); tails
    // fall through to the lane cwd, the stager's own order. The run's
    // own id is exempt (the compose writes its future output path
    // into the graph — a forward reference, not a source).
    const roots = rootsManifest(stateRoot);
    let sources;
    try {
        sources = resolveSourceRefs(collectSourceRefs(compiled.stages.map((s) => s.params)), roots, process.cwd(), runId);
    }
    catch (e) {
        return refusal(400, e.message, "invalid_request", "params");
    }
    const dir = join(outRootFor(stateRoot, testFlag), runId);
    mkdirSync(dir, { recursive: true });
    // THE MULTI-STAGE ROW (2026-09-25, the curated-lane lift): every
    // compiled stage rides the run row — one GraphRow + one RunStageRow +
    // one params/outputNodes slot each, input_names carrying the
    // cross-stage wiring the merged walk consumes. The single-stage
    // shape is the N=1 case of this SAME loop (byte-identical row for
    // the one-stage docs the gateway served before).
    const createdAt = Date.now() / 1000;
    const graphRows = compiled.stages.map((st) => ({
        id: st.id,
        type: st.engine,
        input_from: [],
        input_names: { ...st.inputNames },
        outputs: { ...st.outputs },
        params: { ...st.params },
    }));
    const run = {
        runId,
        status: "queued",
        stages: compiled.stages.map((st, i) => ({
            id: st.id,
            name: st.id,
            index: i,
            status: "pending",
            engine: st.engine,
            outputs: { ...st.outputs },
            expected: { ...st.expected },
        })),
        skippedStages: [],
        artifacts: [],
        error: "",
        draftId,
        dir,
        testFlag,
        stopFlag: false,
        params: compiled.stages.map((st) => ({ ...st.params })),
        createdAt,
        pipeline: "flow_inline",
        graphRows,
        outputNodes: compiled.stages.map((st) => ({ ...st.outputNodes })),
        initials: { ...door.initials },
        ...(door.initialFileKeys !== undefined && door.initialFileKeys.length > 0
            ? { initialFileKeys: [...door.initialFileKeys] }
            : {}),
    };
    run.inputNames = Object.fromEntries(compiled.stages.map((st) => [st.id, { ...st.inputNames }]));
    if (args.warnings !== undefined && args.warnings.length > 0) {
        run.warnings = [...args.warnings];
    }
    // THE DOOR IS REQUIRED (the run id is read from it above) — the
    // door-undefined guards and the `?.`/`??` vestiges of the old
    // optional door were dead legs, pruned with the door law. (The
    // re-audit caught three survivors this comment once overclaimed
    // as gone — the benchDoc gate, the benchRec read, and the
    // variant-lift body — pruned in the same law, 2026-10-16.)
    run.pipeline = door.pipeline;
    if (door.cardId !== undefined)
        run.cardId = door.cardId;
    // THE CLAIM-TIME RE-PROBE'S KEY (audit 2026-10-22): the presence
    // gate ran at press; weights can leave between press and claim.
    // The row carries the card arm's family so the pump re-probes at
    // claim and fails loud with the lane voice — never an unnamed
    // engine-side death. Flow stages stamp fam per stage row.
    if (door.fam !== undefined && door.fam !== "")
        run.fam = door.fam;
    if (door.stageFams !== undefined && Object.keys(door.stageFams).length > 0) {
        run.stageFams = door.stageFams;
    }
    // THE CARD SNAPSHOT LAW (stroke 45, the operator's wand complaint):
    // _flow.json's stage faces are HOLLOW (ids/status only) — the card
    // + params that actually ran were recorded nowhere, so "restore the
    // workflow that made this image" could only re-read the MUTABLE
    // bench draft and serve whatever it holds NOW. The card arm knows
    // the exact card + body here; they ride the sidecar verbatim. The
    // wand reconstructs from THIS, never from the living bench.
    // THE SNAPSHOT IS NOT THE CARD ARM'S PRIVILEGE (the adversarial
    // verification, 2026-09-28). The whole block was gated on
    // `cardId !== undefined`, which a BENCH-COMPOSED run never sets —
    // so Run ALL registered a run with no snapshot at all, and the
    // wand's "restore the workflow that made this" fell back to the
    // LIVE bench draft, which is exactly the staleness this law was
    // built to kill. The card identity and the bench identity are
    // separate facts and each rides when it exists.
    if (door.cardId !== undefined) {
        run.cardSnapshot = {
            card: door.cardId,
            params: door.requestBody,
        };
    }
    if (door.benchDoc !== undefined) {
        const benchStages = Array.isArray(door.benchDoc["stages"])
            ? door.benchDoc["stages"]
            : undefined;
        if (benchStages !== undefined && benchStages.length > 0) {
            // THE PROVENANCE HEAD (2026-09-25, the maker's fabrication
            // finding): card-mode runs MINT their bench (the CARD BIRTH
            // law wants a doc-backed draft) while a studio user HAND-
            // COMPOSES one through melite_construct — and the snapshot
            // alone could not tell them apart. The bench's OWN log head
            // can: its author + kind say who wrote the bench the run was
            // born from, verbatim from the domain row (never a synthesized
            // label, never a guess — absent log, the key rides undefined
            // and the snapshot says only what was provably read).
            const benchLog = door.benchDoc?.["log"];
            const head = Array.isArray(benchLog) && benchLog.length > 0 &&
                typeof benchLog[0] === "object" && benchLog[0] !== null &&
                !Array.isArray(benchLog[0])
                ? { ...benchLog[0] }
                : undefined;
            // THE SNAPSHOT CONTRACT (the operator's order, 2026-09-26:
            // "the saving should 100% be a schemamaster contract, that
            // way we know 100% if it will load again"): the writer stamps
            // bench_snapshot THROUGH the shared contract in
            // @melite/contracts/benchSnapshot, never raw — run memory and
            // the era's self-naming model strip AT SAVE, provenance rides
            // 'restored' (the admission repair law's coordinate), and a
            // row that cannot load is DROPPED with a warning on the
            // sidecar (visible loss, never persisted-unloadable). The
            // guarantee is exact: everything saved under the contract
            // parses on the load side.
            const contracted = saveBenchSnapshotStages(benchStages);
            if (contracted.warnings.length > 0) {
                run.warnings = [
                    ...(run.warnings ?? []),
                    ...contracted.warnings.map((w) => `bench snapshot: ${w}`),
                ];
            }
            if (contracted.stages.length > 0) {
                run.benchSnapshot = {
                    stages: contracted.stages,
                    intent: typeof door.benchDoc?.["intent"] === "string"
                        ? door.benchDoc?.["intent"]
                        : "",
                    ...(head !== undefined ? { bench_head: head } : {}),
                };
            }
        }
    }
    // R3 durable queue (submit 1317-1351): the request rides
    // _request.json, the compiled document rides _flow.json,
    // and run.queued in the ledger is what a restart reconciles
    // against. The card door passes its body — coerced through the
    // snapshot-coercion law at the door (declared numerics restored,
    // BRIEF14 finding #2: the sidecar proves type integrity, the
    // seam/structure evidence rides unchanged); the inline door passes
    // the envelope's flow_inline doc below (same writes, same order).
    const requestBody = door.requestBody;
    // THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23: the
    // operator pressed carried, the engine received cut, and the run
    // left NO voice saying which — the film was 15 minutes of the
    // wrong seam and the post-mortem could only infer). Computed BEFORE
    // the durable writes, stamped ON them: the run record + the console
    // + the ledger row name the doc revision the compose read and the
    // seam values the engine actually received. "What did ComfyUI get?"
    // is one grep away, forever, on every run — the read-side half of
    // the law (the write-side half is the client's run gate: the engine
    // never composes from a doc the press has not confirmed).
    const bodyRec = requestBody;
    const echoCalls = Array.isArray(bodyRec?.["calls"])
        ? bodyRec["calls"]
        : [];
    const benchRec = door.benchDoc;
    const benchRev = typeof benchRec?.bench?.rev === "number" ? benchRec.bench.rev : null;
    if (echoCalls.length > 0) {
        const seam = echoCalls
            .map((c) => (typeof c["transition"] === "string" ? c["transition"] : "carry"))
            .join(",");
        run.composeEcho = { seam, calls: echoCalls.length, benchRev };
        console.log(`[compose] run=${runId} draft=${draftId} calls=${echoCalls.length} seam=${seam} bench_rev=${benchRev ?? "?"}`);
    }
    // THE SOURCE ECHO STAMP (the same law, source-side): the resolved
    // files ride the record, the console, and the ledger row — "what
    // created this run" is one grep away, forever. Sourceless runs
    // stamp nothing.
    if (sources.length > 0) {
        run.sourceEcho = { refs: sources.map((s) => ({ url: s.url, file: s.file })) };
        console.log(`[sources] run=${runId} draft=${draftId} refs=${sources.length} ${sources.map((s) => s.url).join(",")}`);
    }
    // THE VARIANT STAMP (commission 033's self-critique #5,
    // 2026-09-24): the lane the run rides (voicedesign vs
    // customvoice) names itself at BIRTH — the 033 ledger read
    // pipeline qwen3-tts-voicedesign on both a design run and a
    // performing run, indistinguishable. run.params first, the exact
    // submitted body (card snapshot / request body) as fallback —
    // the export-name stamp's 024 lesson. Variant-less runs stamp
    // nothing (the lift returns undefined; absent, never guessed).
    const regVariant = variantOfBodies([...run.params, door.requestBody]);
    if (regVariant !== undefined) {
        run.variant = regVariant;
        console.log(`[variant] run=${runId} draft=${draftId} variant=${regVariant}`);
    }
    await writeJsonAtomic(join(dir, "_request.json"), requestBody);
    await writeJsonAtomic(join(dir, "_flow.json"), sidecarDocFor(run));
    // THE LATCH RE-CHECK (round-18 registry audit R18L-01, 2026-10-10):
    // the press read the latch five awaits ago (RunsRegistry.start's
    // gate); a teardown whose guard passed on the then-empty census can
    // hold it by now. The sidecar above made this run visible to the
    // census, so any teardown from here on is refused by the guard —
    // the refused press removes the minted dir and answers the same
    // named code, having told the ledger nothing.
    const heldLifecycle = lifecycleInFlight();
    if (heldLifecycle !== null) {
        // The unlink is best-effort: a failed removal must not replace the
        // named 409 (the client would lose the retry-hint code) — but the
        // leftover queued sidecar poisons the teardown guard until a sweep
        // clears it, so the failure is logged loudly, never swallowed.
        try {
            rmSync(dir, { recursive: true, force: true });
        }
        catch (cleanupError) {
            console.error(`[runs] refused press could not remove ${dir}:`, cleanupError);
        }
        throw toRemoteError(refusal(409, "refused: lifecycle " + heldLifecycle +
            " in flight — retry the press when it settles (the teardown holds the run gate until it completes)", "lifecycle_inflight"));
    }
    if (echoCalls.length > 0) {
        appendLedger(stateRoot, "run.queued", {
            run_id: runId,
            draft_id: draftId,
            pipeline: run.pipeline,
            ...(regVariant !== undefined ? { variant: regVariant } : {}),
            seam: run.composeEcho?.seam,
            calls: echoCalls.length,
            bench_rev: benchRev,
            sources: sources.length,
        });
    }
    else {
        appendLedger(stateRoot, "run.queued", {
            run_id: runId,
            draft_id: draftId,
            pipeline: run.pipeline,
            ...(regVariant !== undefined ? { variant: regVariant } : {}),
            sources: sources.length,
        });
    }
    const queuePosition = enqueue(run);
    return { run, queuePosition };
}
/** The queued sidecar doc for a registered run (the queue.ts
 *  sidecarDoc over the row's live stage faces — the same writer
 *  the settle path rides). */
function sidecarDocFor(run) {
    return sidecarDoc({
        runId: run.runId,
        status: "queued",
        error: "",
        stages: run.stages.map((s) => sidecarStageOf(s)),
        skippedStages: [],
        artifacts: [],
        createdAt: run.createdAt,
        testFlag: run.testFlag,
        draftId: run.draftId,
        pipeline: run.pipeline,
        graph: run.graphRows,
        cardSnapshot: run.cardSnapshot,
        benchSnapshot: run.benchSnapshot,
        // F-6(b): admission warnings ride the queued sidecar (disk
        // rows carry them after a reload).
        warnings: run.warnings,
        // THE COMPOSE ECHO: what the engine received rides the queued
        // sidecar too (the wand/restore reads disk, not memory).
        composeEcho: run.composeEcho,
        // THE SOURCE ECHO: the files that created the run ride the
        // queued sidecar too.
        sourceEcho: run.sourceEcho,
        // THE VARIANT: the lane rides the queued sidecar too (the
        // wand/restore reads disk, not memory).
        variant: run.variant,
    });
}
//# sourceMappingURL=runsStart.js.map
