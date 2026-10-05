// comfyui-execute.ts — per-stage execute over the SDK client
// (submit / wait / interrupt / history), with the estate's own
// laws layered on top: deadline and stop both interrupt the
// prompt, progress is additive (never load-bearing), and the
// history verdict owns the failure voice.
import { dirname } from "node:path";
import { PollingTimeoutError } from "@stable-canvas/comfyui-client";
import { ACTIVE, ComfyError } from "./comfyui-types.js";
import { resolveEngineBaseUrl } from "./comfyui-config.js";
import { sdkClient } from "./comfyui-transport.js";
import { spliceWorkflow, uploadReferenced } from "./comfyui-upload.js";
import { isTransportDownError } from "./supervisor.js";
import { fetchOutputs, loudnessOf, qvoiceFreshnessOf, mapHistoryEntry, normalizeTimeoutS, publishOutputChannels, qvoicePathsOf } from "./comfyui-outputs.js";
/** Submit one graph through the SDK (POST /prompt). The SDK owns
 *  the body shape and the refusal voice (its typed enqueue error);
 *  the server's prompt_id is the receipt. */
export async function submitPrompt(client, graph) {
    const res = await client.queuePrompt(0, {
        prompt: graph,
        workflow: null,
    });
    // THE SILENT-TRUNCATION REFUSAL (2026-10-08, the operator's
    // "it gave me a red box instead of a mask" hunt): ComfyUI
    // answers 200 with node_errors populated and EXECUTES ONLY THE
    // VALID SUBGRAPH (a missing checkpoint drops its whole dependent
    // chain; the run then reports success with half the artifacts —
    // the mask arm vanished exactly this way for weeks). The queue
    // answer's own verdict rides here: ANY dropped node REFUSES the
    // run LOUD, naming the node, its first message, and the outputs
    // that would have silently vanished.
    const nodeErrors = res["node_errors"];
    if (nodeErrors !== null && typeof nodeErrors === "object" &&
        Object.keys(nodeErrors).length > 0) {
        const lines = [];
        for (const [nodeId, row] of Object.entries(nodeErrors)) {
            const first = Array.isArray(row["errors"]) && row["errors"].length > 0
                ? String(row["errors"][0]?.["message"] ?? "")
                : "validation error";
            const deps = Array.isArray(row["dependent_outputs"]) && row["dependent_outputs"].length > 0
                ? ` (silently dropped outputs: ${row["dependent_outputs"].join(", ")})`
                : "";
            lines.push(`${nodeId}: ${first}${deps}`);
        }
        throw new ComfyError(`the engine refused ${lines.length} node(s) at validation — the run would execute a TRUNCATED graph, never a silent half-result: ${lines.join("; ")}`);
    }
    const id = res["prompt_id"];
    if (typeof id !== "string" || id === "") {
        throw new ComfyError("POST /prompt returned no prompt_id");
    }
    return { promptId: id, clientId: String(client.clientId) };
}
/** The stop probe: a 250ms tick racing the SDK's wait. dispose()
 *  clears the tick — never a stray interval after a settled run. */
function stopProbe(shouldStop) {
    // (the Promise executor runs synchronously — the tick is always
    //  set before dispose can run; the null guard was a dead arm,
    //  deleted 2026-09-19 under the fallback ban.)
    let tick;
    const promise = new Promise((_, rejectP) => {
        tick = setInterval(() => {
            if (shouldStop()) {
                rejectP(new ComfyError("stopped (interrupt delivered)"));
            }
        }, 250);
        tick.unref();
    });
    return {
        promise,
        dispose: () => {
            clearInterval(tick);
        },
    };
}
/** Find one prompt's entry in the engine history (the SDK fetches
 *  the history window; the entry carries status + outputs). */
async function historyEntry(client, promptId) {
    const { History } = await client.getHistory();
    const hit = History.find((e) => {
        const prompt = e["prompt"];
        return Array.isArray(prompt) && String(prompt[1]) === promptId;
    });
    return hit;
}
/** Wait to terminal: the SDK's queue-membership wait under the
 *  estate's deadline + stop, then the history verdict decides.
 *  Every exit path but success delivers the interrupt first.
 *
 *  THE ENGINE-LOSS ARM (roadmap §21 — measured live 2026-09-22: the
 *  OOM kill wedged 101,501 blind polls over 84 min): transport-dead
 *  failures (refused/reset/unroutable — never timeouts or HTTP
 *  statuses; a sick engine is still a live one) ride a streak with
 *  backoff (250ms → 30s ceiling). A streak of ENGINE_LOST_STREAK
 *  spanning ENGINE_LOST_MIN_MS settles the run failed LOUD with the
 *  sanctioned recovery instead of sitting the deadline — submit
 *  already gated on a live engine, so transport failing later means
 *  the engine died mid-run. A lone slow poll never settles (the
 *  streak resets on any success). */
const ENGINE_LOST_STREAK = 3;
const ENGINE_LOST_MIN_MS = 30_000;
const ENGINE_LOST_BACKOFF_CAP_MS = 30_000;
export async function waitTerminal(client, promptId, deadline, shouldStop, policy) {
    const lostStreak = policy?.streak ?? ENGINE_LOST_STREAK;
    const lostMinMs = policy?.minMs ?? ENGINE_LOST_MIN_MS;
    const backoffCapMs = policy?.backoffCapMs ?? ENGINE_LOST_BACKOFF_CAP_MS;
    let cadence = 250;
    let downStreak = 0;
    let firstDownAt = 0;
    for (;;) {
        const probe = stopProbe(shouldStop);
        let entry;
        try {
            await Promise.race([
                client.waitForPrompt(promptId, cadence, deadline - Date.now()),
                probe.promise,
            ]);
            entry = await historyEntry(client, promptId);
            // any success breaks the streak — a lone slow poll never settles
            downStreak = 0;
            cadence = 250;
        }
        catch (e) {
            if (isTransportDownError(e)) {
                const now = Date.now();
                if (downStreak === 0)
                    firstDownAt = now;
                downStreak++;
                if (downStreak >= lostStreak &&
                    now - firstDownAt >= lostMinMs) {
                    try {
                        await client.interrupt(promptId);
                    }
                    catch {
                        /* best-effort — the refusal never masks the cause */
                    }
                    throw new ComfyError("engine unreachable — ComfyUI stopped answering mid-run " +
                        "(restart + rerun sanctioned, identical params/seed ride " +
                        "the node cache)");
                }
                cadence = Math.min(cadence * 2, backoffCapMs);
                continue;
            }
            try {
                await client.interrupt(promptId);
            }
            catch {
                /* best-effort — the refusal never masks the cause */
            }
            if (e instanceof ComfyError)
                throw e;
            if (e instanceof PollingTimeoutError) {
                throw new ComfyError("run exceeded its budget (interrupt delivered)");
            }
            throw new ComfyError(e instanceof Error ? e.message : String(e));
        }
        finally {
            probe.dispose();
        }
        const verdict = mapHistoryEntry(entry);
        if (verdict.kind === "failed") {
            throw new ComfyError("ComfyUI run failed: " + verdict.detail);
        }
        if (verdict.kind === "completed" && entry !== undefined) {
            return entry;
        }
        // queue says done but history is not terminal yet — loop on
    }
}
/** Fold the client's ws events into report() calls. Progress is
 *  additive: a refused/dropped socket logs nothing and simply
 *  yields no events — never a killed run. Returns the unhook. */
export function hookProgress(client, promptId, report) {
    if (report === undefined)
        return null;
    void client
        .connect({ websocket: { enabled: true }, timeout_ms: 2000 })
        .catch(() => {
        /* the tap stays empty — progress is never load-bearing */
    });
    const offs = [
        client.on("progress", (d) => {
            if (typeof d.value !== "number")
                return;
            const mx = typeof d.max === "number" ? d.max : 0;
            report({
                progress: {
                    value: d.value,
                    max: mx,
                    node: String(d.node ?? ""),
                },
                activity: "sampling " + Math.trunc(d.value) + "/" +
                    (mx > 0 ? String(Math.trunc(mx)) : "?"),
            });
        }),
        client.on("executing", (d) => {
            if (d.prompt_id !== undefined && d.prompt_id !== null && String(d.prompt_id) !== promptId)
                return;
            if (d.node === undefined || d.node === null)
                return;
            report({ activity: "node " + String(d.node) });
        }),
        client.on("progress_text", (d) => {
            if (typeof d.text !== "string" || d.text === "")
                return;
            report({ activity: d.text });
        }),
    ];
    return () => {
        for (const off of offs)
            off();
    };
}
/** The execute core (no resolution, no registry choice). */
export async function executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, active) {
    const client = sdkClient(server);
    const params = { ...nodeParams };
    const wf = spliceWorkflow(params);
    const staged = await uploadReferenced(client, wf, { runsRoot: dirname(String(runDir)) });
    const timeoutS = normalizeTimeoutS(params["timeout_s"]);
    const deadline = Date.now() + timeoutS * 1000;
    const { promptId, clientId } = await submitPrompt(client, staged.graph);
    active.set(String(runDir), {
        promptId,
        clientId,
        server,
    });
    // THE PROGRESS TAP: hooked only when a report fold exists — no
    // consumer, no socket (progress is additive).
    const unhook = hookProgress(client, promptId, opts.report);
    try {
        const entry = await waitTerminal(client, promptId, deadline, opts.shouldStop ?? (() => false));
        const arts = await fetchOutputs(client, String(runDir), entry, params["timeout_s"]);
        const outputs = { prompt_id: promptId };
        Object.assign(outputs, publishOutputChannels(nodeOutputs, arts));
        // THE QVOICE CHANNEL: the export node's minted path rides the
        // stage result verbatim (engine-reported absolute — no
        // hardcode, no /view fetch: the file lives in the voices root).
        const qvoice = qvoicePathsOf(entry["outputs"]);
        if (qvoice !== "")
            outputs["qvoice_path"] = qvoice;
        // THE LOUDNESS RECEIPT (§39): the meter's reading rides the stage
        // result alongside the qvoice path — same collector law.
        const loud = loudnessOf(entry["outputs"]);
        if (loud !== null)
            outputs["loudness"] = loud;
        // THE FRESHNESS RECEIPT (the loudness sibling): which voice file
        // won and whether it predates this run — the single-tenant
        // voice-name law's only signal, stamped not thrown away.
        const fresh = qvoiceFreshnessOf(entry["outputs"]);
        if (fresh !== null)
            outputs["voice_freshness"] = fresh;
        return { outputs, artifacts: arts, promptId };
    }
    finally {
        unhook?.();
        // the client owns the socket + its listeners — closing it here
        // retires the run's tap; the stop-handle map is the caller's
        // (the service face passes its own prompts map).
        client.close();
        active.delete(String(runDir));
    }
}
/** The non-plugin execute face (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export async function executeSingle(runDir, nodeParams, nodeOutputs, opts = {}, serverOverride = "") {
    const server = serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
    return executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, ACTIVE);
}
//# sourceMappingURL=comfyui-execute.js.map
