// comfyui-merge.ts — merged submit: plan_merge + execute_flow (mergegraph.execute_flow port).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).
import { dirname, join } from "node:path";
import { ACTIVE, ComfyError } from "./comfyui-types.js";
import { resolveEngineBaseUrl } from "./comfyui-config.js";
import { uploadReferenced } from "./comfyui-upload.js";
import { assertPublishedOutputChannels, fetchOutputArtifacts, loudnessOf, normalizeTimeoutS, publishOutputChannels, qvoiceFreshnessOf, qvoicePathsOf } from "./comfyui-outputs.js";
import { hookProgress, submitPrompt, waitTerminal } from "./comfyui-execute.js";
import { sdkClient, withBound } from "./comfyui-transport.js";
/** In-stage wire namespacing (mergegraph._namespace_wires): every
 *  [node_id, slot] link pointing inside the stage rewrites to the
 *  namespaced id. */
export function namespaceWires(node, sid, stageIds) {
    if (Array.isArray(node)) {
        if (node.length === 2 &&
            typeof node[0] === "string" &&
            typeof node[1] === "number" &&
            stageIds.has(node[0])) {
            return [sid + "::" + node[0], node[1]];
        }
        return node.map((v) => namespaceWires(v, sid, stageIds));
    }
    if (typeof node === "object" && node !== null) {
        const out = {};
        for (const [k, v] of Object.entries(node)) {
            out[k] = namespaceWires(v, sid, stageIds);
        }
        return out;
    }
    return node;
}
/** $spell substitution (mergegraph._rewrite_spells): FromStage-wired
 *  names become link tuples, request initials substitute, anything
 *  left over refuses LOUD with the-identical text. */
export function rewriteSpells(value, links, initials, where) {
    if (typeof value === "string" && value.startsWith("$")) {
        const name = value.slice(1);
        if (name in links)
            return links[name];
        if (name in initials)
            return initials[name];
        throw new ComfyError(where +
            ": workflow carries $" +
            name +
            " — neither a FromStage-wired " +
            "input name nor a request initial (the merged graph has " +
            "no later substitution seam; name it or wire it)");
    }
    if (Array.isArray(value)) {
        return value.map((v) => rewriteSpells(v, links, initials, where));
    }
    if (typeof value === "object" && value !== null) {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = rewriteSpells(v, links, initials, where);
        }
        return out;
    }
    return value;
}
/** A [node, slot] link shape (mergegraph._is_wire). */
export function isWire(v) {
    return (Array.isArray(v) &&
        v.length === 2 &&
        typeof v[0] === "string" &&
        typeof v[1] === "number");
}
/** The dangling-wire integrity gate (mergegraph._assert_wires_resolve):
 *  construction refuses here, never at the server. */
export function assertWiresResolve(merged, links) {
    const ids = new Set(Object.keys(merged));
    const walk = (v) => {
        if (isWire(v)) {
            const target = v[0];
            if (!ids.has(target)) {
                throw new ComfyError("merged plan: wire " +
                    JSON.stringify(v) +
                    " targets no node in the merged graph");
            }
            return;
        }
        if (Array.isArray(v)) {
            for (const x of v)
                walk(x);
            return;
        }
        if (typeof v === "object" && v !== null) {
            for (const x of Object.values(v))
                walk(x);
        }
    };
    for (const node of Object.values(merged))
        walk(node);
    for (const link of Object.values(links)) {
        // Untestable-by-construction arm (2026-09-12): links are built
        // from producers-table keys two loops above, which are merged
        // keys by construction — a link can never dangle through the
        // public planner (the wire half above IS reachable: hand-spelled
        // tuples ride rewriteSpells untouched, and the battery pins one).
        /* v8 ignore next */
        if (!ids.has(link[0])) {
            throw new ComfyError("merged plan: link " +
                JSON.stringify(link) +
                " targets no node in the merged graph");
        }
    }
}
/** One stage's producer table: declared output_nodes win; else the
 *  single-Save binding; anything else refuses LOUD. Depends ONLY on
 *  the row's own workflow, which is what lets the planner read every
 *  table before it reads a single wire (see planMerge's pass 1). */
function inferProducers(sid, wf, row) {
    const declared = row.outputNodes ?? {};
    const stageProd = {};
    if (Object.keys(declared).length > 0) {
        for (const [channel, nid] of Object.entries(declared)) {
            if (!(String(nid) in wf)) {
                throw new ComfyError("stage " +
                    JSON.stringify(sid) +
                    ": output_nodes names node " +
                    JSON.stringify(String(nid)) +
                    " for channel " +
                    JSON.stringify(channel) +
                    " — the workflow carries no such node");
            }
            stageProd[sid + "::" + String(nid)] = channel;
        }
        return stageProd;
    }
    const saves = Object.keys(wf).filter((nid) => {
        const n = wf[nid];
        return (typeof n === "object" &&
            n !== null &&
            String(n["class_type"] ?? "").startsWith("Save"));
    });
    if (saves.length === 1) {
        for (const channel of Object.keys(row.outputs ?? {})) {
            stageProd[sid + "::" + saves[0]] = channel;
        }
    }
    else if (saves.length > 1 && Object.keys(row.outputs ?? {}).length > 0) {
        throw new ComfyError("stage " +
            JSON.stringify(sid) +
            ": ambiguous producers " +
            JSON.stringify(saves) +
            " — declare output_nodes {channel: node_id}");
    }
    return stageProd;
}
/** The wiring graph's acyclicity, judged ONCE over every stage's
 *  wires (the order law's replacement, 2026-10-11). Before this, a
 *  cycle was caught only by an accident: a stage could wire from a
 *  stage EARLIER in the array, so s_0→s_1 plus s_1→s_0 happened to
 *  refuse with a producer message that named the wrong fault. Now
 *  that position no longer decides, the cycle is refused for what it
 *  is, with its members named. */
function assertAcyclic(edges, ids) {
    const state = {}; // 0 unvisited, 1 open, 2 done
    const walk = (n, stack) => {
        if (state[n] === 2)
            return;
        if (state[n] === 1) {
            const at = stack.indexOf(n);
            throw new ComfyError("the stages wire a cycle: " +
                [...stack.slice(at < 0 ? 0 : at), n].join(" → ") +
                " — a cycle composes nothing; break the loop");
        }
        state[n] = 1;
        for (const next of edges[n] ?? [])
            walk(next, [...stack, n]);
        state[n] = 2;
    };
    for (const id of ids)
        walk(id, []);
}
/** The merge plan for the link-free shapes
 *  the TS preview serves: namespaced copy + FromStage link
 *  resolution + the Load file-slot gate + the dangling gate.
 *  Producer inference (_producers: declared output_nodes, else the
 *  single-Save binding) — an ambiguous graph refuses
 *  LOUD with the producer text.
 *
 *  THE ORDER LAW IS NOT A LAW (2026-10-11). This walks in three
 *  passes so a stage may wire from ANY other stage, not only one
 *  earlier in the array: pass 1 infers every producer table (each
 *  depends only on its own row), pass 2 judges acyclicity and
 *  resolves every wire against the finished tables, pass 3
 *  namespaces and substitutes. The single loop it replaced read
 *  `producers` as it filled it, so a backward wire — which the bench
 *  door admits and the draft store persists verbatim — died HERE,
 *  with a message blaming the upstream stage for "declaring no
 *  mergeable producer" when it declared one perfectly well. A
 *  position in an array is not a semantic law; the wires are. */
export function planMerge(rows, initials, inputNames) {
    const merged = {};
    const producers = {};
    const wfs = {};
    const ids = [];
    for (const row of rows) {
        const sid = row.stageId;
        const wf = row.workflow;
        if (typeof wf !== "object" || wf === null || Object.keys(wf).length === 0) {
            throw new ComfyError("stage " +
                JSON.stringify(sid) +
                ": no workflow to merge (card stages must " +
                "bridge first; engine-only stages need params.workflow)");
        }
        wfs[sid] = wf;
        producers[sid] = inferProducers(sid, wf, row);
        ids.push(sid);
    }
    // ── PASS 2: the cycle gate, then every wire against the FINISHED
    // producer tables (position no longer decides). ──────────────
    const edges = {};
    for (const sid of ids) {
        edges[sid] = [];
        for (const ref of Object.values(inputNames[sid] ?? {})) {
            if (ref.startsWith("__initial__."))
                continue;
            // EVERY ref is an edge, dot or not. A dot-less ref names an
            // upstream with an EMPTY channel, which no producer table can
            // match — so it is refused below as a missing channel. Letting
            // it skip the edge list would give one shape two voices: a
            // dot-less SELF-ref would be reported as a missing producer
            // rather than as the self-wire it is. `assertAcyclic` walks
            // only over `ids`, so a ref naming a stage that is not on the
            // bench adds an edge nobody follows and never a false cycle.
            const dot = ref.indexOf(".");
            edges[sid].push(dot < 0 ? ref : ref.slice(0, dot));
        }
    }
    assertAcyclic(edges, ids);
    const linksByStage = {};
    for (const sid of ids) {
        // this stage's FromStage-wired inputs -> link tuples.
        const links = {};
        for (const [name, ref] of Object.entries(inputNames[sid] ?? {})) {
            if (ref.startsWith("__initial__."))
                continue;
            const dot = ref.indexOf(".");
            const upstream = dot < 0 ? ref : ref.slice(0, dot);
            const channel = dot < 0 ? "" : ref.slice(dot + 1);
            if (!(upstream in producers)) {
                throw new ComfyError("stage " +
                    JSON.stringify(sid) +
                    " input " +
                    JSON.stringify(name) +
                    " wires " +
                    JSON.stringify(ref) +
                    " — the upstream stage declares no mergeable producer for it");
            }
            // `upstream in producers` was just proved — the table read
            // casts (the ?? {} / ?. tolls are uncoverable arms, never
            // runtime paths; 2026-09-12).
            const table = producers[upstream];
            const ups = Object.keys(table).filter((n) => table[n] === channel);
            if (ups.length === 0) {
                throw new ComfyError("stage " +
                    JSON.stringify(sid) +
                    " input " +
                    JSON.stringify(name) +
                    " wires channel " +
                    JSON.stringify(channel) +
                    " — upstream stage " +
                    JSON.stringify(upstream) +
                    " produces no such channel");
            }
            links[name] = [ups[0], 0];
        }
        linksByStage[sid] = links;
    }
    // ── PASS 3: namespace, gate, substitute. ─────────────────────
    const allLinks = {};
    for (const sid of ids) {
        const wf = wfs[sid];
        const links = linksByStage[sid];
        const stageIds = new Set(Object.keys(wf));
        const nsKeys = [];
        for (const [nid, node] of Object.entries(wf)) {
            const key = sid + "::" + nid;
            if (key in merged) {
                throw new ComfyError("stage " +
                    JSON.stringify(sid) +
                    ": duplicate namespaced node " +
                    JSON.stringify(key) +
                    " — stage ids and node ids collided");
            }
            merged[key] = namespaceWires(node, sid, stageIds);
            nsKeys.push(key);
        }
        Object.assign(allLinks, links);
        // ROW-4 file-slot gate: a producer link
        // may only land in a tensor slot — Load* file slots refuse.
        for (const key of nsKeys) {
            const node = merged[key];
            const cls = String(node["class_type"] ?? "");
            if (!cls.startsWith("Load"))
                continue;
            const ins = node["inputs"];
            if (typeof ins !== "object" || ins === null || Array.isArray(ins))
                continue;
            for (const [slot, val] of Object.entries(ins)) {
                if (typeof val === "string" && val.startsWith("$") && val.slice(1) in links) {
                    throw new ComfyError("stage " +
                        JSON.stringify(sid) +
                        " node " +
                        JSON.stringify(key.split("::", 2)[1]) +
                        " (" +
                        cls +
                        "): input " +
                        JSON.stringify(slot) +
                        " carries the $spell " +
                        JSON.stringify(val) +
                        " — a producer link cannot land in a file slot. The merged path needs the arm's " +
                        "tensor entry (drop the loader); the per-stage path owns the disk handoff");
                }
            }
        }
        for (const key of nsKeys) {
            const node = merged[key];
            merged[key] = rewriteSpells(node, links, initials, "stage " + JSON.stringify(sid) + " node " + JSON.stringify(key.split("::", 2)[1]));
        }
    }
    // THE DANGLING GATE, ONCE, OVER THE WHOLE GRAPH (it always walked
    // the entire `merged` dict; calling it per stage could only ever
    // see a prefix, and the wires it judges now come from every stage).
    assertWiresResolve(merged, allLinks);
    return { workflow: merged };
}
/** mergegraph.execute_flow port: plan, submit ONCE, tap-less poll,
 *  per-stage harvest.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-start worker) use
 *  ComfyUIHostService.executeFlow (same inner, fiber-owned prompts
 *  map + service-resolved server). Documented split, never two truths. */
export async function executeFlow(rows, runDir, inputNames, initials, opts = {}, serverOverride = "") {
    const server = serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
    return executeFlowInner(rows, runDir, inputNames, initials, opts, server, ACTIVE);
}
/** Shared merged core (no resolution, no registry choice). */
export async function executeFlowInner(rows, runDir, inputNames, initials, opts, server, active) {
    const plan = planMerge(rows, { ...initials }, inputNames);
    const client = sdkClient(server);
    // THE MERGE SEAM'S NO-ADDITION CLAIM IS WALLED (the li-bb stroke,
    // 2026-10-11 — this comment used to claim a names-walk that
    // existed nowhere, then claimed the engines adapter's post-splice
    // seat would catch an added name, which walks for other laws).
    // wire-order.spec.ts's "the merge adds no names" block now pins it
    // AT THE SEAM: the merged key set IS the namespaced union, every
    // node's top-level keys and input keys are its source's exactly,
    // class_type and _meta untouched — and the mutations that grow a
    // key in namespaceWires or rewriteSpells red it by name. The day
    // the merge learns to ADD a name legitimately, that wall is where
    // the law gets restated — and this comment moves with it.
    const staged = await uploadReferenced(client, plan.workflow, { runsRoot: dirname(String(runDir)), stateRoots: opts.stateRoots });
    // the submit bound (audit P-E5): POST /prompt rides the same
    // 180s fuse the upload plane already answers to
    const { promptId, clientId } = await withBound(() => submitPrompt(client, staged.graph), 180_000, "POST /prompt");
    active.set(String(runDir), { promptId, clientId, server });
    // THE PROGRESS TAP: the merged submit mints ONE client — every
    // stage's row shares the same live fold (the report consumer
    // stamps each stage; the stages share the run).
    // THE TAP INSIDE THE FENCE (audit M-S8): a synchronous throw from
    // the tap must not skip the finally — the active row and the
    // client both die with the run. Declared here, seated inside.
    let unhook = null;
    // the merged deadline: the SUM of the stages' own budgets;
    // per-stage floors apply.
    let budget = 0;
    for (const r of rows) {
        budget += normalizeTimeoutS(r.params["timeout_s"]);
    }
    const floor = Math.max(budget, 2400);
    const deadline = Date.now() + floor * 1000;
    try {
        unhook = hookProgress(client, promptId, opts.report);
        const entry = await waitTerminal(client, promptId, deadline, opts.shouldStop ?? (() => false));
        const allOutputs = entry["outputs"];
        const allRec = typeof allOutputs === "object" && allOutputs !== null && !Array.isArray(allOutputs)
            ? allOutputs
            : {};
        const results = {};
        for (const r of rows) {
            const prefix = r.stageId + "::";
            const subOutputs = {};
            for (const [k, v] of Object.entries(allRec)) {
                if (k.startsWith(prefix))
                    subOutputs[k.slice(prefix.length)] = v;
            }
            const stageDir = join(String(runDir), r.stageId);
            const records = await fetchOutputArtifacts(client, stageDir, {
                outputs: subOutputs,
            }, r.params["timeout_s"]);
            const arts = records.map((record) => record.path);
            // THE OPTIONAL BINDINGS (the plan path's own law, line ~178:
            // outputNodes ?? {} — a row without bindings harvests
            // unbound, never crashes the merge).
            const nodeBindings = Object.fromEntries(Object.entries(r.outputNodes ?? {}).map(([channel, node]) => [channel, String(node)]));
            const outputs = publishOutputChannels(r.outputs, arts, nodeBindings, records);
            assertPublishedOutputChannels(r.outputs, outputs, nodeBindings);
            // THE QVOICE CHANNEL (the export FULL PATH): the minted path
            // rides the stage result verbatim — same law as the single
            // path, the merge just walks per-stage subOutputs.
            const qvoice = qvoicePathsOf(subOutputs);
            if (qvoice !== "")
                outputs["qvoice_path"] = qvoice;
            // THE LOUDNESS RECEIPT (§39): same law as the single seat —
            // the merge walks per-stage subOutputs, the reading rides the
            // stage's result rows verbatim.
            const loud = loudnessOf(subOutputs);
            if (loud !== null)
                outputs["loudness"] = loud;
            // THE FRESHNESS RECEIPT (the loudness sibling), per-stage law.
            const fresh = qvoiceFreshnessOf(subOutputs);
            if (fresh !== null)
                outputs["voice_freshness"] = fresh;
            results[r.stageId] = {
                outputs,
                artifacts: arts,
            };
        }
        return { stages: results, promptId };
    }
    finally {
        unhook?.();
        client.close();
        active.delete(String(runDir));
    }
}
//# sourceMappingURL=comfyui-merge.js.map