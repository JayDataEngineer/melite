export function sidecarStageOf(stage) {
    const out = {
        id: stage.id,
        name: stage.name,
        index: stage.index,
        status: stage.status,
        outputs: stage.outputs ?? {},
        expected: stage.expected ?? {},
    };
    if (typeof stage.benchStageId === 'string' && stage.benchStageId !== '')
        out.bench_stage_id = stage.benchStageId;
    if (typeof stage.engine === 'string')
        out.engine = stage.engine;
    if (typeof stage.url === 'string')
        out.url = stage.url;
    if (Array.isArray(stage.gallery)) {
        const gallery = stage.gallery.filter((entry) => typeof entry === 'object' && entry !== null && !Array.isArray(entry)
            && typeof entry.name === 'string'
            && entry.name !== '');
        if (gallery.length > 0)
            out.gallery = gallery;
    }
    if (typeof stage.result_outputs === 'object' && stage.result_outputs !== null && !Array.isArray(stage.result_outputs)) {
        out.result_outputs = stage.result_outputs;
    }
    if (typeof stage.error === 'string')
        out.error = stage.error;
    if (stage.merged === true)
        out.merged = true;
    return out;
}
/** A v1-judged scalar: the receipt's scope gate. */
function receiptScalarOf(value) {
    if (typeof value === "string")
        return value.trim() !== "" ? value : undefined;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : undefined;
    if (typeof value === "boolean")
        return value;
    return undefined;
}
/** THE RECEIPT SPINE: receipt one doc against one composed
 *  workflow (the `{workflow, output_nodes}` envelope the card walk
 *  yields — only `workflow`'s node inputs are judged).
 *  @param params the run door's admitted doc params (the snapshot's
 *    own row — bench stage row params, or the card arm's admitted
 *    request body)
 *  @param composed the card walk's composed envelope
 *  @returns the pair — node count, populated/carried/dropped
 *    (sorted), verdict `complete` iff nothing dropped */
export function graphReceiptOf(params, composed) {
    const carried = new Set();
    let nodes = 0;
    let windows = 0;
    let bake;
    const workflow = composed.workflow;
    if (workflow !== null && typeof workflow === "object" && !Array.isArray(workflow)) {
        for (const node of Object.values(workflow)) {
            if (node === null || typeof node !== "object" || Array.isArray(node))
                continue;
            nodes += 1;
            const cls = node.class_type;
            if (cls === "SamplerCustomAdvanced")
                windows += 1;
            const inputs = node.inputs;
            if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs))
                continue;
            for (const v of Object.values(inputs)) {
                if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
                    carried.add(v);
            }
            // THE BAKE RECORD (study §7 item 2): read off the graph's own
            // seat nodes — the extract's declared dials verbatim, the
            // ref count from its autogrow slots, the price string the run
            // voice renders. One bake per graph; the visual seat wins
            // over a stems-only loader (the per-call replace law).
            if (cls === "MiniMaxH3RefModExtract" || cls === "MiniMaxH3RefModsLoader") {
                const inp = inputs;
                if (cls === "MiniMaxH3RefModExtract") {
                    const visualRefs = Object.keys(inp).filter((k) => k.startsWith("refs_image.") || k.startsWith("refs_video.")).length;
                    bake = {
                        source: "baked",
                        ...(typeof inp["mode"] === "string" ? { mode: inp["mode"] } : {}),
                        ...(typeof inp["pool_h"] === "number" ? { pool: inp["pool_h"] } : {}),
                        ...(typeof inp["identity"] === "number" ? { refinement_steps: inp["identity"] } : {}),
                        ...(typeof inp["save"] === "boolean" ? { save: inp["save"] } : {}),
                        visual_refs: visualRefs,
                        windows,
                        price: "",
                    };
                }
                else {
                    const stems = Object.entries(inp).filter(([k, v]) => /^mod_\d+$/.test(k) && v !== "(none)").length;
                    bake = { source: "stems", stems, windows, price: "" };
                }
            }
        }
    }
    if (bake !== undefined) {
        const windows_ = windows;
        bake = bake.source === "baked"
            ? {
                ...bake,
                windows: windows_,
                price: "bake: " + String(bake.refinement_steps ?? "?") + " refinement steps × "
                    + String(bake.visual_refs ?? 0) + (bake.visual_refs === 1 ? " ref × " : " refs × ")
                    + String(windows_) + (windows_ === 1 ? " window" : " windows"),
            }
            : {
                ...bake,
                windows: windows_,
                price: "bake: " + String(bake.stems ?? 0) + (bake.stems === 1 ? " stem × " : " stems × ")
                    + String(windows_) + (windows_ === 1 ? " window" : " windows"),
            };
    }
    const populated = [];
    const found = [];
    const missed = [];
    for (const [key, value] of Object.entries(params)) {
        const scalar = receiptScalarOf(value);
        if (scalar === undefined)
            continue;
        populated.push(key);
        (carried.has(scalar) ? found : missed).push(key);
    }
    populated.sort();
    found.sort();
    missed.sort();
    return {
        nodes,
        populated,
        carried: found,
        dropped: missed,
        verdict: missed.length === 0 ? "complete" : "partial",
        ...(bake !== undefined ? { bake } : {}),
    };
}
/** Name one stage's pair with its stage id (the per-stage rows
 *  inside the run-level `graph_receipt`). */
export function graphReceiptStageOf(stage, pair) {
    return {
        stage,
        nodes: pair.nodes,
        populated: [...pair.populated],
        carried: [...pair.carried],
        dropped: [...pair.dropped],
        verdict: pair.verdict,
        ...(pair.bake !== undefined ? { bake: pair.bake } : {}),
    };
}
/** Fold per-stage rows into the run-level receipt (nodes SUM —
 *  the run's graph key space; populated/carried/dropped the
 *  sorted union; verdict `complete` iff every stage is). */
export function graphReceiptFoldOf(rows, promptId) {
    const union = (pick) => {
        const s = new Set();
        for (const r of rows)
            for (const k of pick(r))
                s.add(k);
        return [...s].sort();
    };
    let nodes = 0;
    let complete = true;
    for (const r of rows) {
        nodes += r.nodes;
        if (r.verdict !== "complete")
            complete = false;
    }
    return {
        nodes,
        populated: union((r) => r.populated),
        carried: union((r) => r.carried),
        dropped: union((r) => r.dropped),
        verdict: complete ? "complete" : "partial",
        stages: rows.map((r) => graphReceiptStageOf(r.stage, r)),
        // THE BAKE rides the fold: the first stage that carries one
        // (the card run's single stage; a multi-stage flow receipts the
        // first bake seat it composes).
        ...(rows.find((r) => r.bake !== undefined)?.bake !== undefined
            ? { bake: rows.find((r) => r.bake !== undefined).bake }
            : {}),
        ...(promptId !== undefined && promptId !== "" ? { prompt_id: promptId } : {}),
    };
}
/** THE VARIANT LIFT (commission 033's self-critique #5, 2026-09-24):
 *  the first non-empty `variant` string across the submitted bodies —
 *  the LANE the run rode (voicedesign vs customvoice on the same
 *  family). The 033 ledger read pipeline `qwen3-tts-voicedesign` on
 *  BOTH a design run and a performing CustomVoice run — an analyst
 *  reading the ledger alone could not tell them apart (only
 *  `sources: 1` hinted). Compiled stage params are engine-shaped
 *  (the compose may consume card keys — the exportName stamp's
 *  024 lesson), so callers pass run.params FIRST and the exact
 *  submitted body (card snapshot / request body) as the fallback,
 *  same order as the export-name stamp. */
export function variantOfBodies(bodies) {
    for (const p of bodies) {
        if (p === null || typeof p !== "object" || Array.isArray(p))
            continue;
        const v = p["variant"];
        if (typeof v === "string" && v.trim() !== "")
            return v.trim();
    }
    return undefined;
}
/** The sidecar document: KEY ORDER as (run_id, status, error,
 *  stages, skipped_stages, artifacts, created_at, test, draft_id,
 *  pipeline, graph). error rides the JSON error capped at 20000 chars when
 *  set (a JSON-quoted string — the writer quirk, mirrored, never
 *  "fixed"), else "". */
export function sidecarDoc(args) {
    return {
        // IDENTITY KEYS FIRST (stroke 82): buildRunCard and the listRuns
        // scan slice(0, 8191) the sidecar — with stages/error/graph in
        // the prefix, any bulky payload pushed created_at/draft_id/
        // pipeline past the window and the row listed as a zombie
        // (empty pipeline, draft cleared, created 0). The scalars ride
        // ahead of every payload; a big error or graph can only
        // truncate what follows it.
        run_id: args.runId,
        status: args.status,
        created_at: args.createdAt,
        test: args.testFlag,
        draft_id: args.draftId,
        pipeline: args.pipeline,
        // THE STAGE-ID DIGEST (commission 015, §6 finding 6): the ids of
        // the stages THIS run composed, CSV-compact, riding with the
        // identity scalars AHEAD of every payload — the list row's
        // 8191-byte window cannot reach the stages array, but it always
        // reaches this. Derived from the very stages the doc stores, so
        // digest and array can never disagree; every writer (queued,
        // settled, resurrect) shares this one seat.
        // THE DRAFT NAMESPACE (the invisible-press cure, 2026-10-20):
        // the digest is the bench read's MEMBERSHIP TICKET
        // (melite-construct's withLastRun joins stage_ids against the
        // bench draft's row ids) — a single-card press composes the
        // card's own skeleton ('generate'), a namespace the draft doc
        // never heard of, so the ticket takes the bench_stage_id seam
        // first and falls back to the row id only when the draft
        // address is absent (inline runs, multi-row bench loops — those
        // stamp each row's own id). The skeleton survives on the stage
        // row's own `id`, named beside its draft address.
        stage_ids: args.stages
            .map((s) => (s.bench_stage_id !== undefined && s.bench_stage_id !== "" ? s.bench_stage_id : s.id))
            .filter((id) => id !== "")
            .join(","),
        ...(args.exportName !== undefined && args.exportName !== "" ? { export_name: args.exportName } : {}),
        ...(args.exportPath !== undefined && args.exportPath !== "" ? { export_path: args.exportPath } : {}),
        ...(args.variant !== undefined && args.variant !== "" ? { variant: args.variant } : {}),
        ...(args.loudness !== undefined ? { loudness: args.loudness } : {}),
        ...(args.voiceFreshness !== undefined ? { voice_freshness: args.voiceFreshness } : {}),
        ...(args.replaySuspect === true ? { replay_suspect: true } : {}),
        error: args.error !== "" ? JSON.stringify(args.error).slice(0, 20000) : "",
        stages: args.stages,
        skipped_stages: [...args.skippedStages],
        artifacts: [...args.artifacts],
        graph: args.graph,
        ...(args.cardSnapshot !== undefined ? { card_snapshot: args.cardSnapshot } : {}),
        // THE RECIPE (the F27 cure): the admitted card doc — envelope
        // lifted, stanza unwrapped — rides beside the raw request echo.
        ...(args.cardRecipe !== undefined ? { card_recipe: args.cardRecipe } : {}),
        ...(args.benchSnapshot !== undefined ? { bench_snapshot: args.benchSnapshot } : {}),
        ...(args.warnings !== undefined && args.warnings.length > 0 ? { warnings: [...args.warnings] } : {}),
        ...(args.composeEcho !== undefined ? { compose_echo: args.composeEcho } : {}),
        ...(args.graphReceipt !== undefined ? { graph_receipt: args.graphReceipt } : {}),
        ...(args.sourceEcho !== undefined ? { source_echo: args.sourceEcho } : {}),
    };
}
/** The door name the run started with (_pipeline_of 2111-2119:
 *  exactly one of flow | flow_inline | model — the sidecar's
 *  `pipeline` and the queued ledger row share this one truth). */
export function pipelineOf(request) {
    if (typeof request.flow === "string" && request.flow !== "") {
        return request.flow;
    }
    if (typeof request.model === "string" && request.model !== "") {
        return request.model;
    }
    const inline = request.flow_inline;
    if (typeof inline === "object" &&
        inline !== null &&
        typeof inline.id === "string") {
        return inline.id;
    }
    return "";
}
/**
 * THE SIDECAR PARSE — the contract's READ half (2026-10-10, the
 * bypass audit's HIGH-5: the sidecar had a writer contract and no
 * reader contract, so six readers JSON.parsed and `as`-cast it, and a
 * hand-edited `_flow.json` with a stage that has no id, or a
 * `pipeline` of nonsense, loaded silently — `stages.find(s => s.id ===
 * …)` simply missed, and the run routed by a value nothing validated).
 *
 * This is the ONE parse. It returns null for a doc that does not
 * answer the shape, and every reader treats null as unreadable (the
 * quarantine arm the boot sweep already has) rather than casting its
 * way forward.
 */
export function parseSidecar(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const doc = raw;
    // the STAGES: an array of records, each with a STRING id (the one
    // field every reader keys on) — a row without one cannot be found
    // by id and is refused rather than silently invisible
    const rawStages = doc["stages"];
    const stages = [];
    if (rawStages !== undefined && rawStages !== null) {
        if (!Array.isArray(rawStages))
            return null;
        for (const s of rawStages) {
            if (s === null || typeof s !== "object" || Array.isArray(s))
                return null;
            const row = s;
            if (typeof row["id"] !== "string" || row["id"] === "")
                return null;
            stages.push(row);
        }
    }
    // the REQUEST: a record when present — and it is what `request`
    // returns (the check was dead theater: it validated the key, then
    // handed back the whole doc; strictness fix 7, 2026-10-01)
    const rawRequest = doc["request"];
    if (rawRequest !== undefined && rawRequest !== null) {
        if (typeof rawRequest !== "object" || Array.isArray(rawRequest))
            return null;
    }
    // CONTENT typing (strictness fix 7): `pipeline` and `status` are
    // strings when PRESENT. Absent keys stay legal — the file-era
    // convention (found-ness matters; absent pipeline is "" to the
    // list reader). A present-but-non-string value is corruption the
    // old parse silently retyped: `pipeline: 42` became "" and served.
    if (doc["pipeline"] !== undefined && typeof doc["pipeline"] !== "string")
        return null;
    if (doc["status"] !== undefined && typeof doc["status"] !== "string")
        return null;
    return {
        // the CALLER's own row, fields intact (this judges the shape; it
        // never rebuilds a sidecar — a settle carries the old row's own
        // faces forward, and a rebuild would drop them)
        stages: Array.isArray(rawStages) ? rawStages : [],
        pipeline: typeof doc["pipeline"] === "string" ? doc["pipeline"] : "",
        request: rawRequest !== undefined && rawRequest !== null
            ? rawRequest
            : doc,
    };
}
//# sourceMappingURL=queueSidecar.js.map
