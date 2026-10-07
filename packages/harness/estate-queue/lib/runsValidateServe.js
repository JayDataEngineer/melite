// runsValidateServe.ts — the shared compile-serve tail split from
// runsValidate.ts (pure move, zero logic changes): branch prune, to_graph,
// the $channel gate, cost preview, and the inline/named serve arms.
import { engineIdOk } from "@melite/engine-contract";
import { ENGINE_TABLE, FlowError } from "./runsValidateShared.js";
import { edgeRef } from "./runsValidateInline.js";
import { flowFromBody, kindsOk, wiresResolve } from "./runsValidateStages.js";
import { batchRows, sweepWorkflows } from "./runsValidateSweeps.js";
// ── branch prune (pruned_for — verbatim) ────────────
export function prunedFor(flow, body, cards) {
    if (!flow.stages.some((st) => st.skipWhen !== null))
        return { flow, pruned: [] };
    const pruned = new Map();
    const kept = [];
    for (const st of flow.stages) {
        const cond = st.skipWhen;
        if (cond === null) {
            kept.push(st);
            continue;
        }
        const present = body[cond.initial] !== undefined && body[cond.initial] !== null;
        const fire = cond.when === "present" ? present : !present;
        if (fire)
            pruned.set(st.id, cond);
        else
            kept.push(st);
    }
    if (kept.length === 0) {
        throw new FlowError("flow " +
            JSON.stringify(flow.id) +
            ": the branch pruned every stage (fired: " +
            JSON.stringify([...pruned.keys()].sort()) +
            ") — a run with no stages never registers");
    }
    const merged = [];
    for (const st of kept) {
        const hitsPruned = st.inputs.some((i) => i.edge.kind === "stage" && pruned.has(i.edge.stage));
        if (!hitsPruned) {
            merged.push(st);
            continue;
        }
        const newInputs = st.inputs.map((i) => ({ ...i }));
        for (const inp of newInputs) {
            if (inp.edge.kind !== "stage" || !pruned.has(inp.edge.stage))
                continue;
            const cond = pruned.get(inp.edge.stage);
            if (cond.when !== "present") {
                throw new FlowError("flow " +
                    JSON.stringify(flow.id) +
                    " stage " +
                    JSON.stringify(st.id) +
                    " input " +
                    JSON.stringify(inp.name) +
                    " wires FromStage(" +
                    JSON.stringify(edgeRef(inp.edge)) +
                    ") to pruned stage " +
                    " (branch " +
                    JSON.stringify(cond.initial) +
                    " fired) — no request key to merge (absent-trigger prunes " +
                    "carry nothing)");
            }
            inp.edge = { kind: "initial", key: cond.initial };
        }
        merged.push({ ...st, inputs: newInputs });
    }
    // RECONSTRUCTED — every construction validator re-runs (TS scope:
    // wires + deferred kinds; card/tool/validators are no-ops here).
    wiresResolve(flow.id, merged);
    kindsOk(flow.id, merged, {}, cards);
    return { flow: { id: flow.id, description: flow.description, stages: merged }, pruned: [...pruned.keys()] };
}
export function toGraph(flow) {
    return flow.stages.map((st) => {
        const outputs = [];
        if (st.outputs.length > 0) {
            for (const o of st.outputs)
                outputs.push({ ...o });
        }
        else if (st.cardIo.length > 0) {
            for (const o of st.cardIo)
                outputs.push({ ...o });
        }
        else {
            // validateEngines already refused unknown engines and the
            // table carries a default for every known one — the
            // try/except-unknown shape of to_graph collapses to the table.
            // validateEngines refused unknown engines upstream — the hit is proven.
            const row = st.engine.startsWith("mcp:") && engineIdOk(st.engine)
                ? { plugin: "mcp-client", def: "image" }
                : ENGINE_TABLE[st.engine];
            outputs.push({ name: "default", kind: row.def });
        }
        return {
            id: st.id,
            engine: st.engine,
            description: st.description,
            inputFrom: st.inputs.map((i) => edgeRef(i.edge)),
            inputNames: st.inputs.map((i) => i.name),
            outputs,
            params: st.params,
        };
    });
}
// dollarTokens (same file): whole-string $-tokens.
export function dollarTokens(params) {
    const out = [];
    const walk = (v) => {
        if (typeof v === "string") {
            if (v.startsWith("$") && v.length > 1)
                out.push(v.slice(1));
        }
        else if (Array.isArray(v)) {
            for (const item of v)
                walk(item);
        }
        else if (typeof v === "object" && v !== null) {
            for (const val of Object.values(v))
                walk(val);
        }
    };
    walk(params);
    return out;
}
// compileFlow (same file): prune, then toGraph, then the unresolved $channel gate (per-node pool, ALL bad joined).
export function compileFlow(flow, body, cards) {
    const { flow: built, pruned } = prunedFor(flow, body, cards);
    const nodes = toGraph(built);
    const bad = [];
    for (const node of nodes) {
        const pool = new Set(node.inputNames);
        for (const ref of node.inputFrom) {
            if (ref.startsWith("__initial__."))
                pool.add(ref.split(".", 2)[1]); // the prefix guarantees [1]
            else
                pool.add(ref);
        }
        const sortedPool = [...pool].sort();
        for (const token of dollarTokens(node.params)) {
            if (!pool.has(token)) {
                bad.push("stage " +
                    JSON.stringify(node.id) +
                    " references $" +
                    token +
                    " (available: " +
                    (sortedPool.length > 0 ? sortedPool.join(", ") : "nothing") +
                    ")");
            }
        }
    }
    if (bad.length > 0) {
        throw new FlowError("unresolved $channel(s): " + bad.join("; "));
    }
    return { nodes, skipped: pruned };
}
// ── model facts + model-dir scan (resolve_model's TS mirror) ────
// (Stroke 2a: the facts/route/mids caches that lived here are
// CardRegistryLike state now — this door reads them through its
// injected service. The absent-facts degrade survives at the
// modelArm call site, which catches the service's strict read.)
// ── {model} arm (resolve_card_model, ported subset) ─
export function costPreview(engineTypes) {
    // A fresh Gateway: depth 0, eta null, medians unknown
    // (cost_preview — no engine stats).
    return {
        queue_depth: 0,
        eta_queue_s: null,
        stages: engineTypes.map((et) => ({ engine: et, median_s: null, samples: 0 })),
    };
}
export function inlineArm(full, cards) {
    const fullRec = typeof full === "object" && full !== null && !Array.isArray(full)
        ? full
        : {};
    const hasInline = typeof full === "object" && full !== null && !Array.isArray(full) && "flow_inline" in fullRec;
    const envelope = hasInline ? fullRec["flow_inline"] : undefined;
    const subject = envelope !== undefined && envelope !== null ? envelope : full;
    return serveSubject(subject, fullRec, cards);
}
// ── the shared compile-serve tail (flowFromBody -> compile ->
// pin sweep -> the 200 shape; the inline arm and the named arm
// both ride it — one validator, never two) ──────────────────────
export function serveSubject(subject, fullRec, cards) {
    let flow;
    try {
        flow = flowFromBody(subject, cards);
    }
    catch (e) {
        if (e instanceof FlowError) {
            return {
                status: 400,
                payload: {
                    error: e.message,
                    code: "flow_compile",
                    loc: "flow",
                    errors: batchRows(subject, e.message, cards),
                },
            };
        }
        throw e;
    }
    let compiled;
    try {
        compiled = compileFlow(flow, fullRec, cards);
    }
    catch (e) {
        /* v8 ignore next -- compileFlow's pipeline throws FlowError only
           (cardGate already passed in flowFromBody with the same cards and
           rows): the plain-Error arm never fires. The live FlowError arm
           stays asserted by the $/prune 400 tests (2026-09-12) */
        if (e instanceof FlowError) {
            return {
                status: 400,
                payload: {
                    error: e.message,
                    code: "flow_compile",
                    loc: "flow",
                    errors: batchRows(subject, e.message, cards),
                },
            };
        }
        /* v8 ignore next -- same proof as above (2026-09-12) */
        throw e;
    }
    const wfRows = sweepWorkflows(subject, cards);
    if (wfRows.length > 0) {
        const first = wfRows[0];
        return {
            status: 400,
            payload: {
                error: first["error"],
                code: "workflow_pin",
                loc: first["stage"], // sweep rows always stamp stage
                errors: wfRows,
            },
        };
    }
    return {
        status: 200,
        payload: {
            ok: true,
            skipped: compiled.skipped,
            flow: flow.id,
            cost: costPreview(compiled.nodes.map((n) => n.engine)),
            stages: compiled.nodes.map((n) => ({
                id: n.id,
                engine: n.engine,
                description: n.description,
                inputs: n.inputFrom,
                outputs: Object.fromEntries(n.outputs.map((o) => [o.name, o.kind])),
            })),
        },
    };
}
//# sourceMappingURL=runsValidateServe.js.map
