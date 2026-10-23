// comfyui-execute.ts — per-stage execute over the SDK client
// (submit / wait / interrupt / history), with the estate's own
// laws layered on top: deadline and stop both interrupt the
// prompt, progress is additive (never load-bearing), and the
// history verdict owns the failure voice.
import { dirname } from "node:path";
import { ACTIVE, ComfyError } from "./comfyui-types.js";
import { withBound } from "./comfyui-transport.js";
import { resolveEngineBaseUrl } from "./comfyui-config.js";
import { sdkClient } from "./comfyui-transport.js";
import { spliceWorkflow, uploadReferenced } from "./comfyui-upload.js";
import { gateVramForStage } from "./comfyui-vram.js";
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
/** One raw queue-membership read (audit P-E3): fetchApi throws on
 *  transport death — the SDK's getQueue wrapper swallowed it into
 *  an empty queue, a dead engine read as "done", and the run
 *  hot-spun blind polls to its deadline with the engine-loss arm
 *  never seeing a throw. The signal bounds a hung (not dead) read:
 *  the abort surfaces as the bound's own refusal. */
async function rawQueueMembership(client, promptId, signal) {
    const res = await client.fetchApi("/queue", { signal });
    const body = (await res.json());
    const idOf = (row) => {
        const prompt = row["prompt"];
        return Array.isArray(prompt) ? String(prompt[1]) : "";
    };
    const running = (body.queue_running ?? []).some((row) => idOf(row) === promptId);
    const pending = (body.queue_pending ?? []).some((row) => idOf(row) === promptId);
    return { running, pending };
}
/** One raw history read (audit P-E4): same throw semantics as the
 *  membership read, keyed lookup (the /history body is an object
 *  keyed by prompt id), inside the same per-iteration signal — the
 *  verdict read can no longer wedge a finished run past its own
 *  deadline. */
async function rawHistoryEntry(client, promptId, signal) {
    const res = await client.fetchApi("/history?max_items=200", { signal });
    const body = (await res.json());
    return (body[promptId] ?? undefined);
}
/** The interrupt arm every exit shares (audits P-E2/S2): bounded —
 *  a hung engine never wedges the run's own teardown — and
 *  best-effort by law: the stop, budget, and failure voices must
 *  not depend on the engine accepting the interrupt. */
async function bestEffortInterrupt(client, promptId) {
    try {
        await withBound(() => client.interrupt(promptId), INTERRUPT_BOUND_MS, "POST /interrupt");
    }
    catch {
        // best-effort — the refusal never masks the cause
    }
}
/** Per-iteration bound on the queue/history reads. /queue and
 *  /history are in-memory reads engine-side; ten seconds is
 *  generous, and a read that cannot answer inside it is a wedged
 *  engine — refused loud, never spun past. */
const RAW_READ_BOUND_MS = 10_000;
/** The interrupt bound: the stop door's audit voice stays <6s. */
const INTERRUPT_BOUND_MS = 2_000;
/** The submit bound: symmetry with the upload plane's own 180s
 *  fuse (audit P-E5 — POST /prompt rode unbounded). */
const SUBMIT_BOUND_MS = 180_000;
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
/** The read-bound refusal's own type (2026-10-12): the abort reason
 *  carries a CLASS, not a message, so the catch can verify the
 *  diagnosis before discarding the run — a bound that fires while
 *  the engine actually completed must salvage the entry, never
 *  throw finished work away. */
class EngineReadBoundError extends ComfyError {
}
/** One bounded history read after a read-bound abort: if the engine
 *  answers, the diagnosis was false and the answer decides the run
 *  (completed → the entry; failed → the engine's own truth; not
 *  terminal → polling resumes). A refused salvage stands the
 *  diagnosis — the engine really stopped answering. */
async function salvageHistoryEntry(client, promptId, boundMs) {
    return withBound(() => rawHistoryEntry(client, promptId, new AbortController().signal), boundMs, "GET /history (salvage)");
}
export async function waitTerminal(client, promptId, deadline, shouldStop, policy) {
    const lostStreak = policy?.streak ?? ENGINE_LOST_STREAK;
    const lostMinMs = policy?.minMs ?? ENGINE_LOST_MIN_MS;
    const backoffCapMs = policy?.backoffCapMs ?? ENGINE_LOST_BACKOFF_CAP_MS;
    const readBoundMs = policy?.readBoundMs ?? RAW_READ_BOUND_MS;
    let cadence = 250;
    let downStreak = 0;
    let firstDownAt = 0;
    for (;;) {
        const probe = stopProbe(shouldStop);
        // THE READS (audits P-E3/E4/E6): the queue and history reads
        // are OURS — raw fetchApi with a per-iteration signal — and the
        // budget is checked HERE, before each read. The old loop
        // delegated both to the SDK, whose wrappers swallow transport
        // death into empty results (a dead engine read as "done") and
        // whose timeout only fires BETWEEN polls (a negative remainder
        // disabled it entirely).
        let left = false;
        let entry;
        try {
            if (deadline - Date.now() <= 0) {
                await bestEffortInterrupt(client, promptId);
                throw new ComfyError("run exceeded its budget (interrupt delivered)");
            }
            const ac = new AbortController();
            const bound = setTimeout(() => {
                ac.abort(new EngineReadBoundError("the engine stopped answering its queue/history reads (" +
                    String(readBoundMs) + "ms bound) — refusing closed"));
            }, readBoundMs);
            try {
                const membership = await Promise.race([
                    rawQueueMembership(client, promptId, ac.signal),
                    probe.promise,
                ]);
                left = !membership.running && !membership.pending;
                if (left)
                    entry = await rawHistoryEntry(client, promptId, ac.signal);
                if (!left) {
                    // the poll gap rides the probe — a stop is observed within
                    // one tick even while the cadence backs off (audit P-S3:
                    // no racing leg outlives the iteration; the signal kills
                    // the read, the probe kills the wait)
                    await Promise.race([
                        new Promise((done) => setTimeout(done, cadence)),
                        probe.promise,
                    ]);
                }
            }
            finally {
                clearTimeout(bound);
            }
            // any success breaks the streak — a lone slow poll never settles
            downStreak = 0;
            cadence = 250;
        }
        catch (e) {
            // THE SALVAGE READ (2026-10-12): the bound's diagnosis is "the
            // engine stopped answering" — verify it before discarding the
            // run. Live lane 2026-10-12 05:46: the queue poll hung its
            // 10s bound while the engine executed the tagger in 3.16s and
            // printed the tags; the old path interrupted and refused a
            // COMPLETED run. One bounded history read now decides: an
            // answered entry is the run's truth (completed returns it,
            // failed refuses with the engine's detail), an answered
            // not-terminal means the diagnosis was false and polling
            // resumes, a refused salvage stands the diagnosis loud.
            if (e instanceof EngineReadBoundError) {
                let salvaged;
                let answered = false;
                try {
                    salvaged = await salvageHistoryEntry(client, promptId, readBoundMs);
                    answered = true;
                }
                catch {
                    // the salvage read refused — the diagnosis stands
                }
                if (answered) {
                    if (salvaged !== undefined) {
                        const verdict = mapHistoryEntry(salvaged);
                        if (verdict.kind === "failed") {
                            await bestEffortInterrupt(client, promptId);
                            throw new ComfyError("ComfyUI run failed: " + verdict.detail);
                        }
                        if (verdict.kind === "completed")
                            return salvaged;
                    }
                    downStreak = 0;
                    cadence = 250;
                    continue;
                }
            }
            if (isTransportDownError(e)) {
                const now = Date.now();
                if (downStreak === 0)
                    firstDownAt = now;
                downStreak++;
                if (downStreak >= lostStreak &&
                    now - firstDownAt >= lostMinMs) {
                    await bestEffortInterrupt(client, promptId);
                    throw new ComfyError("engine unreachable — ComfyUI stopped answering mid-run " +
                        "(restart + rerun sanctioned, identical params/seed ride " +
                        "the node cache)");
                }
                cadence = Math.min(cadence * 2, backoffCapMs);
                continue;
            }
            await bestEffortInterrupt(client, promptId);
            if (e instanceof ComfyError)
                throw e;
            throw new ComfyError(e instanceof Error ? e.message : String(e));
        }
        finally {
            probe.dispose();
        }
        if (left) {
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
}
/** Fold the client's ws events into report() calls. Progress is
 *  additive: a refused/dropped socket warns (the lane log, never
 *  silent) and simply yields no events — never a killed run.
 *  Returns the tap handle (the unhook + its liveness readings). */
export function hookProgress(client, promptId, report) {
    if (report === undefined)
        return null;
    let alive = false;
    let events = 0;
    void client
        .connect({ websocket: { enabled: true }, timeout_ms: 2000 })
        .then(() => {
        alive = true;
    })
        .catch((e) => {
        // THE VOICED TAP (D11, 2026-10-11): a refused socket used to
        // die silent here — the run still completed via polls while
        // the tile sat frozen at "merged submit" with no signal
        // anywhere. The death rides the lane log now; the tap stays
        // additive (never load-bearing), but never again silent.
        console.warn('[comfyui-cordis] progress tap unavailable (the engine refused the websocket — polls still settle the run):', e instanceof Error ? e.message : String(e));
    });
    const offs = [
        client.on("progress", (d) => {
            if (typeof d.value !== "number")
                return;
            events++;
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
            events++;
            report({ activity: "node " + String(d.node) });
        }),
        client.on("progress_text", (d) => {
            if (typeof d.text !== "string" || d.text === "")
                return;
            events++;
            report({ activity: d.text });
        }),
    ];
    const tap = (() => {
        for (const off of offs)
            off();
    });
    tap.tapAlive = () => alive;
    tap.tapEvents = () => events;
    return tap;
}
/** The execute core (no resolution, no registry choice). */
export async function executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, active) {
    const client = sdkClient(server);
    const params = { ...nodeParams };
    const wf = spliceWorkflow(params);
    // THE VRAM HEADROOM GATE (the "ComfyUI should prevent oom" law,
    // 2026-10-23 — the estate never evicts, ComfyUI manages VRAM
    // auto): a stage declaring vram_budget_mb proves that much free
    // VRAM BEFORE submit — short headroom REFUSES loud, never a
    // mid-run OOM, never a /free (the engine's own management owns
    // residency). Absent knob = zero traffic (back-compat). Fired
    // before uploadReferenced so a refused run moves no bytes.
    await gateVramForStage(server, params, client);
    const staged = await uploadReferenced(client, wf, { runsRoot: dirname(String(runDir)), stateRoots: opts.stateRoots });
    const timeoutS = normalizeTimeoutS(params["timeout_s"]);
    const deadline = Date.now() + timeoutS * 1000;
    const { promptId, clientId } = await withBound(() => submitPrompt(client, staged.graph), SUBMIT_BOUND_MS, "POST /prompt");
    active.set(String(runDir), {
        promptId,
        clientId,
        server,
    });
    // THE PROGRESS TAP: hooked only when a report fold exists — no
    // consumer, no socket (progress is additive).
    // THE TAP INSIDE THE FENCE (audit M-S8): a synchronous throw from
    // the tap (client.on/connect) must not skip the finally — the
    // active row and the client both die with the run.
    let unhook = null;
    try {
        unhook = hookProgress(client, promptId, opts.report);
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
        // THE REPLAY VERDICT (D11, 2026-10-11): a seated tap that folded
        // no engine events while the run completed means the engine
        // served memo'd outputs without executing — the harvest is the
        // previous run's film, and the tile must say so (a dead tap
        // withholds the verdict — silence there is the tap's own warn,
        // never a replay claim).
        const replaySuspect = unhook !== null && unhook.tapAlive() && unhook.tapEvents() === 0;
        return { outputs, artifacts: arts, promptId, replaySuspect };
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
