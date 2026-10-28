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
/** One node_errors table → refusal lines (the engine's validation
 * dialect, shared by both folds below: the 200-with-node_errors
 * answer and the 4xx body WO-1 folds). */
function nodeErrorLines(nodeErrors) {
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
    return lines;
}
export async function submitPrompt(client, graph) {
    let res;
    try {
        // THE WORKFLOW SLOT (the openjutsu lane burn, 2026-10-28): the
        // SDK wraps this verbatim into extra_data.extra_pnginfo.workflow.
        // `null` shipped {workflow: null} — the key PRESENT, so VHS's
        // `.get('workflow', {})` default never fired and every
        // VHS_VideoCombine died post-sampling ("'NoneType' object has
        // no attribute 'get'", runs dd6b4477/3d6484224 — 6 nodes
        // executed first). An OBJECT rides: metadata-reading nodes see
        // an empty workflow, never null.
        res = await client.queuePrompt(0, {
            prompt: graph,
            workflow: {},
        });
    }
    catch (err) {
        // WO-1 (the 2026-10-22 input-prep audit, cured 2026-11-12): the
        // engine's /prompt 4xx answers carry their own JSON dialect —
        // error.type/details plus node_errors naming the node and the
        // rejected value — and the SDK's HttpError HOLDS that body
        // (fields status/json). Left alone, the run face served only the
        // SDK's status line ("Endpoint Bad Request (400 …)"): loud but
        // VOICELESS. Fold the engine's own body in verbatim; anything
        // without that shape rethrows untouched.
        const status = err.status;
        const json = err.json;
        if (typeof status === "number" && json !== null && typeof json === "object") {
            const body = json;
            const parts = [];
            const error = body["error"];
            if (error !== null && typeof error === "object") {
                const type = error["type"];
                const details = error["details"];
                if (typeof type === "string" && type !== "")
                    parts.push(type);
                if (typeof details === "string" && details !== "")
                    parts.push(details);
            }
            else if (typeof error === "string" && error !== "") {
                parts.push(error);
            }
            const nodeErrors = body["node_errors"];
            if (nodeErrors !== null && typeof nodeErrors === "object") {
                parts.push(...nodeErrorLines(nodeErrors));
            }
            const voice = parts.length > 0 ? parts.join("; ") : JSON.stringify(body);
            throw new ComfyError(`the engine refused the prompt — HTTP ${status}: ${voice}`);
        }
        throw err;
    }
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
        const lines = nodeErrorLines(nodeErrors);
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
/** The close arm's re-read budget (WO-2, the 2026-10-22 input-prep
 *  audit): under engine contention the FIRST salvage read can ride
 *  the same bound the diagnosis rode — run-22b930e63fa1 completed
 *  engine-side while both reads refused and the estate served
 *  failed-with-no-artifacts. The close verdict re-reads history this
 *  many times before the diagnosis stands. */
const SALVAGE_ATTEMPTS = 3;
/** The sleep between salvage re-reads: long enough for contention to
 *  clear, short enough that a wedged engine's close stays bounded
 *  (attempts × bound + sleeps, never a hang). */
const SALVAGE_RETRY_SLEEP_MS = 1_000;
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
 *  terminal → polling resumes). A refused read is one attempt —
 *  salvageAtClose owns the budget. */
async function salvageHistoryEntry(client, promptId, boundMs) {
    return withBound(() => rawHistoryEntry(client, promptId, new AbortController().signal), boundMs, "GET /history (salvage)");
}
/** The close arm (WO-2): a read-bound diagnosis is only final when
 *  every salvage re-read refused — the observed contention case had
 *  the engine COMPLETE the graph while both the poll and the first
 *  salvage rode their bounds, and the run face served
 *  failed-with-no-artifacts for work that landed. Each attempt is
 *  bounded; a stop request or an exhausted run budget ends the arm
 *  before the next attempt — the re-read never becomes a hang. */
async function salvageAtClose(client, promptId, deadline, shouldStop, boundMs, attempts, sleepMs) {
    for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt > 0) {
            await new Promise((done) => setTimeout(done, sleepMs));
            if (shouldStop() || deadline - Date.now() <= 0)
                break;
        }
        try {
            const entry = await salvageHistoryEntry(client, promptId, boundMs);
            return { answered: true, entry };
        }
        catch {
            // this attempt refused — the next re-read decides
        }
    }
    return { answered: false };
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
            // THE CLOSE ARM (2026-10-12 salvage + WO-2 2026-10-22 re-read):
            // the bound's diagnosis is "the engine stopped answering" —
            // verify it before discarding the run. Live lane 2026-10-12
            // 05:46: the queue poll hung its 10s bound while the engine
            // executed the tagger in 3.16s and printed the tags; the old
            // path interrupted and refused a COMPLETED run. Live lane
            // 2026-10-22 (run-22b930e63fa1): under contention the first
            // salvage rode its bound TOO, and the completed run served
            // failed — the re-read arm owns the second look. An answered
            // entry is the run's truth (completed returns it, failed
            // refuses with the engine's detail), an answered not-terminal
            // means the diagnosis was false and polling resumes, every
            // attempt refused stands the diagnosis loud.
            if (e instanceof EngineReadBoundError) {
                const close = await salvageAtClose(client, promptId, deadline, shouldStop, readBoundMs, policy?.salvageAttempts ?? SALVAGE_ATTEMPTS, policy?.salvageRetrySleepMs ?? SALVAGE_RETRY_SLEEP_MS);
                if (close.answered) {
                    if (close.entry !== undefined) {
                        const verdict = mapHistoryEntry(close.entry);
                        if (verdict.kind === "failed") {
                            await bestEffortInterrupt(client, promptId);
                            throw new ComfyError("ComfyUI run failed: " + verdict.detail);
                        }
                        if (verdict.kind === "completed")
                            return close.entry;
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
    let deadline = Date.now() + timeoutS * 1000;
    const { promptId: firstPromptId, clientId } = await withBound(() => submitPrompt(client, staged.graph), SUBMIT_BOUND_MS, "POST /prompt");
    let promptId = firstPromptId;
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
        let entry = await waitTerminal(client, promptId, deadline, opts.shouldStop ?? (() => false));
        // THE H3 CHAIN REQUEUE DRIVER (2026-10-28, the swap-chain burn:
        // top_level_requeue mode checkpoints each scene and ends its
        // prompt with a durable handoff row — the ui row
        // `h3_chain_top_level_requeue` is the ONLY machine-readable
        // owed-scene signal; without a driver, scene N+1 never runs and
        // the operator re-posts by hand (which re-rendered scene 1: the
        // bare re-POST keeps LoopStart.start_clip at its default 1).
        // The choreography rides the pack's OWN handoff routes on this
        // engine (claim → patch LoopStart to the owed scene → transition
        // queued → submit → transition consumed) until the final prompt
        // answers `h3_chain_top_level_complete`; outputs then harvest
        // from the FINAL entry (the film assembles only there). Every
        // non-chain graph carries no row and skips this loop untouched.
        entry = await driveH3ChainRequeue(client, entry, staged.graph, {
            report: opts.report,
            shouldStop: opts.shouldStop,
            deadline: () => {
                deadline = Date.now() + timeoutS * 1000;
                return deadline;
            },
            activeKey: String(runDir),
            active,
            retap: (nextId) => {
                unhook?.();
                unhook = hookProgress(client, nextId, opts.report);
            },
        });
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
/** The scenes-per-stage ceiling: a chain longer than this is a
 * mis-authored plan, not a run — refuse loud rather than spin the
 * requeue loop on a hostile graph. */
const H3_CHAIN_SCENE_CAP = 32;
function outputRowsOf(entry, key) {
    const outputs = entry["outputs"];
    if (outputs === null || typeof outputs !== "object" || Array.isArray(outputs))
        return [];
    const rows = [];
    for (const node of Object.values(outputs)) {
        if (node === null || typeof node !== "object" || Array.isArray(node))
            continue;
        const raw = node[key];
        if (Array.isArray(raw)) {
            for (const row of raw) {
                if (row !== null && typeof row === "object" && !Array.isArray(row)) {
                    rows.push(row);
                }
            }
        }
    }
    return rows;
}
/** The owed-scene row of a terminal history entry, or null when the
 * entry is chain-complete (or not a chain prompt at all). */
export function h3RequeueRowOf(entry) {
    for (const row of outputRowsOf(entry, "h3_chain_top_level_requeue")) {
        const runName = row["run_name"];
        const handoffId = row["handoff_id"];
        const scene = row["scene"];
        const endClip = row["end_clip"];
        if (typeof runName === "string" && runName !== "" &&
            typeof handoffId === "string" && handoffId !== "" &&
            typeof scene === "number" && typeof endClip === "number") {
            return { ...row, run_name: runName, handoff_id: handoffId, scene, end_clip: endClip };
        }
    }
    return null;
}
/** Whether the entry is a chain's FINAL prompt (the pack emits
 * `h3_chain_top_level_complete` only when the last scene lands). */
export function h3ChainCompleteOf(entry) {
    return outputRowsOf(entry, "h3_chain_top_level_complete").length > 0;
}
/** Patch the stored graph's LoopStart to the owed scene: start_clip
 * is the scene the handoff names, scene_range the range it carries
 * (absent view fields leave the stored input untouched). Returns a
 * FRESH graph object — the staged original is never mutated (each
 * re-submission derives from it again). */
export function patchChainLoopStart(graph, view) {
    const next = { ...graph };
    let loopStartId = "";
    for (const [id, node] of Object.entries(graph)) {
        const classType = node?.["class_type"];
        if (typeof classType === "string" && /ChainLoopStart$/.test(classType)) {
            loopStartId = id;
            break;
        }
    }
    if (loopStartId === "") {
        throw new ComfyError("H3 chain requeue: the graph carries no MiniMaxH3ChainLoopStart node to patch — the handoff row promised a chain graph");
    }
    const node = { ...next[loopStartId] };
    const inputs = { ...node["inputs"] };
    const startClip = view["start_clip"];
    if (typeof startClip === "number")
        inputs["start_clip"] = startClip;
    const sceneRange = view["scene_range"];
    if (typeof sceneRange === "string")
        inputs["scene_range"] = sceneRange;
    node["inputs"] = inputs;
    next[loopStartId] = node;
    return next;
}
/** One handoff-route call (the routes live on this engine's own
 * PromptServer — the SDK client's fetchApi reaches them same-origin
 * with the session auth). */
async function handoffCall(client, path, body) {
    const res = await withBound(() => client.fetchApi(path, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    }), SUBMIT_BOUND_MS, "POST /minimax_h3_context_loop/handoffs");
    const parsed = (await res.json());
    const error = parsed["error"];
    if (typeof error === "string" && error !== "") {
        throw new ComfyError(`H3 chain handoff route refused ${path}: ${error}`);
    }
    return parsed;
}
/** The driver loop — see executeSingleInner's call site. Each scene:
 * claim (exactly-once; a 409 means another coordinator holds the
 * chain — refuse loud, never spin), patch, transition queued,
 * submit, wait, transition consumed, report the scene row. The
 * deadline re-arms per scene (the budget is per engine prompt); a
 * stop between scenes releases the handoff and refuses loud (the
 * checkpoints survive; the owed-scene resume is the handoff's own).
 * The submit/wait seams exist for the driver's own wall (the
 * choreography is the contract; the transports are injectable —
 * defaults ride the real prompt door). */
export async function driveH3ChainRequeue(client, firstEntry, graph, ride) {
    let entry = firstEntry;
    let scenes = 0;
    for (;;) {
        const row = h3RequeueRowOf(entry);
        if (row === null) {
            if (!h3ChainCompleteOf(entry) && scenes > 0) {
                throw new ComfyError("H3 chain requeue: the prompt ended without a requeue row or a completion row — the chain state is uncertain (inspect the run's checkpoints before re-pressing)");
            }
            return entry;
        }
        if (++scenes > H3_CHAIN_SCENE_CAP) {
            throw new ComfyError(`H3 chain requeue: exceeded ${H3_CHAIN_SCENE_CAP} scenes in one stage — a plan this long is mis-authored, refusing the loop`);
        }
        if (ride.shouldStop?.() === true) {
            await handoffCall(client, "/minimax_h3_context_loop/handoffs/release", {
                run_name: row.run_name, handoff_id: row.handoff_id,
                reason: "estate run stopped between chain scenes",
            }).catch(() => { });
            throw new ComfyError(`H3 chain: stopped between scenes (scene ${row.scene} of ${row.end_clip} owed; handoff released — checkpoints survive)`);
        }
        const claimed = await handoffCall(client, "/minimax_h3_context_loop/handoffs/claim", {
            run_name: row.run_name,
            handoff_id: row.handoff_id,
        });
        const view = claimed["handoff"];
        if (view === null || typeof view !== "object") {
            throw new ComfyError(`H3 chain handoff claim answered no handoff view for ${row.handoff_id}`);
        }
        const nextGraph = patchChainLoopStart(graph, view);
        await handoffCall(client, "/minimax_h3_context_loop/handoffs/transition", {
            run_name: row.run_name, handoff_id: row.handoff_id, status: "queued",
        });
        const submit = ride.submit ?? ((g) => submitPrompt(client, g));
        const { promptId } = await submit(nextGraph);
        ride.retap(promptId);
        const existing = ride.active.get(ride.activeKey);
        if (existing !== undefined) {
            ride.active.set(ride.activeKey, { ...existing, promptId });
        }
        // consumed carries the accepted prompt id — the pack's exactly-once
        // audit key (a crashed driver leaves the handoff claimable again).
        await handoffCall(client, "/minimax_h3_context_loop/handoffs/transition", {
            run_name: row.run_name, handoff_id: row.handoff_id,
            status: "consumed", accepted_prompt_id: promptId,
        });
        const wait = ride.wait ?? ((id, dl) => waitTerminal(client, id, dl, ride.shouldStop ?? (() => false)));
        try {
            entry = await wait(promptId, ride.deadline());
        }
        catch (err) {
            await handoffCall(client, "/minimax_h3_context_loop/handoffs/transition", {
                run_name: row.run_name, handoff_id: row.handoff_id, status: "failed",
            }).catch(() => { });
            throw err;
        }
        ride.report?.({
            activity: `h3 chain scene ${Math.max(0, row.scene)}/${row.end_clip} checkpointed (requeue consumed)`,
        });
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
/** The first scene a resume press owes, or null when nothing is
 * saved: one past the highest CONTIGUOUS active scene counted from
 * scene 1. An inactive take is not resumable through (the resume
 * gate would refuse it) — the chain re-renders from that scene. */
export function nextOwedH3Scene(rows) {
    const active = new Set();
    for (const row of rows) {
        const reason = row["inactive_reason"];
        if (typeof row.scene === "number" &&
            (reason === undefined || reason === "")) {
            active.add(row.scene);
        }
    }
    if (active.size === 0)
        return null;
    let next = 1;
    while (active.has(next))
        next += 1;
    return next;
}
/** Patch the stored graph's LoopEnd into requeue mode: a crashed
 * recursive run resumes as a top-level requeue chain (each remaining
 * scene is its own prompt; recursive expansion dies past clip 2).
 * Fresh graph object, loud refusal when no LoopEnd rides the graph. */
export function patchChainLoopEndRequeue(graph) {
    const next = { ...graph };
    for (const [id, node] of Object.entries(graph)) {
        const classType = node?.["class_type"];
        if (typeof classType === "string" && /ChainLoopEnd$/.test(classType)) {
            const patched = { ...next[id] };
            const inputs = { ...patched["inputs"] };
            inputs["execution_mode"] = "top_level_requeue";
            patched["inputs"] = inputs;
            next[id] = patched;
            return next;
        }
    }
    throw new ComfyError("H3 chain resume: the graph carries no MiniMaxH3ChainLoopEnd node to patch — not a chain graph");
}
/** One checkpoint-listing call (the pack's own headless read route). */
async function fetchCheckpointListing(client, runName) {
    const res = await withBound(() => client.fetchApi(`/minimax_h3_context_loop/checkpoints?run_name=${encodeURIComponent(runName)}&include_graph=false`, { method: "GET" }), SUBMIT_BOUND_MS, "GET /minimax_h3_context_loop/checkpoints");
    const parsed = (await res.json());
    const error = parsed["error"];
    if (typeof error === "string" && error !== "") {
        throw new ComfyError(`H3 chain checkpoint listing refused: ${error}`);
    }
    const rows = parsed["checkpoints"];
    if (!Array.isArray(rows))
        return [];
    return rows.filter((row) => row !== null && typeof row === "object" && !Array.isArray(row));
}
/** Resume a crashed chain from its own checkpoints, headlessly: the
 * stored graph is patched to the first owed scene in requeue mode,
 * submitted once, and the requeue driver completes the chain. The
 * seams mirror the driver's (fetchListing/submit/wait injectable for
 * the wall; defaults ride the real routes). */
export async function resumeH3ChainFromCheckpoints(client, graph, opts) {
    const listing = await (opts.fetchListing ??
        ((rn) => fetchCheckpointListing(client, rn)))(opts.runName);
    const next = nextOwedH3Scene(listing);
    if (next === null) {
        throw new ComfyError(`H3 chain resume: run ${opts.runName} has no active checkpoints to resume from — start a fresh run instead`);
    }
    opts.report?.({
        activity: `h3 chain resume: scenes 1-${next - 1} checkpointed, resuming at scene ${next} (requeue mode)`,
    });
    const resumeGraph = patchChainLoopEndRequeue(patchChainLoopStart(graph, { start_clip: next, scene_range: "" }));
    const submit = opts.submit ?? ((g) => submitPrompt(client, g));
    const wait = opts.wait ?? ((id, dl) => waitTerminal(client, id, dl, opts.shouldStop ?? (() => false)));
    const { promptId } = await submit(resumeGraph);
    opts.retap?.(promptId);
    let entry = await wait(promptId, opts.deadline());
    // The resume scene itself may hand off the next — the driver loop
    // completes the chain from the same patched graph.
    return driveH3ChainRequeue(client, entry, resumeGraph, {
        report: opts.report,
        shouldStop: opts.shouldStop,
        deadline: opts.deadline,
        activeKey: opts.runName,
        active: new Map(),
        retap: opts.retap ?? (() => { }),
        submit,
        wait,
    });
}
//# sourceMappingURL=comfyui-execute.js.map
