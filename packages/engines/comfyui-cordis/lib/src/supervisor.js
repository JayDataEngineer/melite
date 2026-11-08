// supervisor.ts — engine reachability supervisor (the DSH
// mcp-client connection pattern, ported to stateless HTTP).
//
// The MCP supervisor (references/deepseek-harness
// packages/mcp/mcp-client/src/connection.ts — read, never ported
// verbatim) supervises a STATEFUL protocol session: fresh client per
// generation, onclose-driven disconnect, bounded exponential backoff
// (500ms x2 cap 30s, 10 attempts/outage), a stability window that
// resets the budget, exhaustion that unregisters + stops, ready +
// dispose with quiescence. ComfyUI's HTTP has no session to own, so
// the supervisable fact here is REACHABILITY (one GET
// <base>/system_stats probe — the same voice manage.ts already
// probes one-shot), and the supervised consumers are the submit
// paths, which fail FAST with the recorded error instead of burning
// a timeout per stage.
//
// Two deliberate deviations, both reasoned (the pattern's reason
// does not transfer):
//   - NO stop-on-exhaustion: MCP stops to avoid overlapping spawned
//     CHILDREN; we spawn nothing (ComfyUI is an independent
//     service, often legitimately restarting). Exhaustion is LOUD
//     (onExhausted) and the background timer stops, but the next
//     submit re-arms with one fresh probe — self-heal on demand,
//     never eternal polling.
//   - NO tool re-sync: there is no registry to keep in sync; the
//     transition hooks are onUp/onDown (status views subscribe).
//
// Never blocks a run on the monitor: unknown (first probe in
// flight) proceeds; down throws the RECORDED error fast (same LOUD
// failure class as today, minus the timeout burn).
//
// PROCESS LIFECYCLE (operator order 2026-11-06) is explicitly NOT
// this supervisor's job — "we spawn nothing" above stands for the
// supervisor's exhaustion behavior. The explicit process owner is
// scripts/comfy-engine.sh (status/up/down, config-driven off the
// endpoint config's url + boot_cmd, pidfile under the repo's
// untracked data tree; down refuses a busy engine unless
// --force). Reachability here, process there — one home per fact.
/** Transport-dead signals: the engine's TCP stack is unreachable
 *  (refused/reset/unroutable/unresolvable). Timeouts, socket
 *  hang-ups, and HTTP statuses are EXCLUDED — a slow or sick engine
 *  is still a LIVE engine, and marking down on them would fail
 *  healthy-but-busy submits fast. Only the codes below may drive
 *  noteFailure (caller discipline, pinned by wall). */
const TRANSPORT_DEAD_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "EHOSTDOWN",
    "ENETUNREACH",
    "ENETDOWN",
    "EPIPE",
]);
export function isTransportDownError(error) {
    if (typeof error !== "object" || error === null)
        return false;
    const code = error.code;
    if (typeof code === "string" && TRANSPORT_DEAD_CODES.has(code)) {
        return true;
    }
    const message = error.message;
    if (typeof message !== "string")
        return false;
    return (message.includes("ECONNREFUSED") ||
        message.includes("ECONNRESET") ||
        message.includes("ENOTFOUND") ||
        message.includes("EHOSTUNREACH") ||
        message.includes("ENETUNREACH") ||
        message.includes("EPIPE"));
}
export const SUPERVISOR_DEFAULTS = Object.freeze({
    enabled: true,
    initialDelayMs: 500,
    maxDelayMs: 30_000,
    maxAttempts: 10,
});
/** Explicit resolve step — misconfiguration fails LOUD at load
 *  (the resolveReconnectPolicy rule, same bounds minus the
 *  dsh-timeout dep this package does not carry). */
export function resolveSupervisorPolicy(policy, path) {
    if (policy !== undefined) {
        for (const key of Object.keys(policy)) {
            if (!Object.hasOwn(SUPERVISOR_DEFAULTS, key)) {
                throw new Error(path + "." + key + " is not a supervisor option");
            }
        }
    }
    const enabled = policy?.enabled ?? SUPERVISOR_DEFAULTS.enabled;
    const initialDelayMs = policy?.initialDelayMs ?? SUPERVISOR_DEFAULTS.initialDelayMs;
    const maxDelayMs = policy?.maxDelayMs ?? SUPERVISOR_DEFAULTS.maxDelayMs;
    const maxAttempts = policy?.maxAttempts ?? SUPERVISOR_DEFAULTS.maxAttempts;
    if (!Number.isFinite(initialDelayMs) ||
        initialDelayMs <= 0 ||
        initialDelayMs > 2_147_483_647) {
        throw new Error(path + ".initialDelayMs must be a positive finite number");
    }
    if (!Number.isFinite(maxDelayMs) ||
        maxDelayMs <= 0 ||
        maxDelayMs > 2_147_483_647) {
        throw new Error(path + ".maxDelayMs must be a positive finite number");
    }
    if (initialDelayMs > maxDelayMs) {
        throw new Error(path + ".initialDelayMs must be less than or equal to maxDelayMs");
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        throw new Error(path + ".maxAttempts must be a positive integer");
    }
    return Object.freeze({ enabled, initialDelayMs, maxDelayMs, maxAttempts });
}
const noopLog = {
    info() { },
    warn() { },
    error() { },
};
/** Reachability supervisor for one engine base URL. */
export class EngineSupervisor {
    probeFn;
    policy;
    label;
    onUp;
    onDown;
    onExhausted;
    log;
    setTimerFn;
    clearTimerFn;
    nowFn;
    state = "unknown";
    lastError = undefined;
    failedAttempts = 0;
    upAt = undefined;
    timer = undefined;
    inFlight = undefined;
    disposed = false;
    started = false;
    /** Probe start counter + the counter value traffic last proved:
     *  a probe that started BEFORE the latest traffic proof is stale
     *  and must not move state (the hasClosed() race rule). */
    probeSeq = 0;
    trafficSeq = -1;
    readyPromise;
    resolveReady = undefined;
    constructor(deps) {
        this.probeFn = deps.probe;
        this.policy = resolveSupervisorPolicy(deps.policy, "supervisor");
        this.label = deps.label ?? "engine";
        this.onUp = deps.onUp;
        this.onDown = deps.onDown;
        this.onExhausted = deps.onExhausted;
        this.log = deps.log ?? noopLog;
        this.setTimerFn = deps.setTimer ?? setTimeout;
        this.clearTimerFn = deps.clearTimer ?? clearTimeout;
        this.nowFn = deps.now ?? Date.now;
        this.readyPromise = new Promise((resolveP) => {
            this.resolveReady = resolveP;
        });
    }
    /** Current reachability (unknown until the first probe settles). */
    get current() {
        return this.state;
    }
    /** Last probe failure (undefined when up or never probed). */
    get failure() {
        return this.lastError;
    }
    /** Settles with the FIRST probe outcome (success or failure) —
     *  the startup-await: boot records it, never blocks on it. */
    get ready() {
        return this.readyPromise;
    }
    /** Begin probing (idempotent). First probe runs immediately. */
    start() {
        if (this.started || this.disposed)
            return;
        this.started = true;
        void this.runProbe(true);
    }
    /** Submit-path gate: up/unknown proceed; down throws the RECORDED
     *  error fast; exhausted runs ONE re-arm probe (success proceeds,
     *  failure throws). Never waits on the background timer. */
    async ensureUp() {
        if (this.settledUp())
            return;
        if (this.state === "down")
            throw this.fastError();
        await this.runProbe(false);
        if (this.settledUp())
            return;
        throw this.fastError();
    }
    /** Fresh state read as a call (defeats property narrowing — the
     *  state can move across the await above). */
    settledUp() {
        return this.state === "up" || this.state === "unknown";
    }
    /** Submit-path liveness report: a request that PROVED reachability
     *  (any HTTP status — even a 500 is an alive engine) refreshes the
     *  up state. The onclose analog: traffic is the liveness channel
     *  (the MCP supervisor keeps no ping either). */
    noteSuccess() {
        if (this.disposed)
            return;
        this.trafficSeq = this.probeSeq;
        if (this.timer !== undefined) {
            this.clearTimerFn(this.timer);
            this.timer = undefined;
        }
        // Traffic-proven reachability settles startup-await as success —
        // a later-stale probe failure must not contradict it below.
        this.resolveReadyOnce({ ok: true });
        this.onProbeSuccess(false);
    }
    /** Submit-path liveness report: a TRANSPORT failure (refused /
     *  reset / unreachable — never a timeout or HTTP status, which
     *  prove the engine alive) drops the state and arms backoff. */
    noteFailure(error) {
        if (this.disposed)
            return;
        this.onProbeFailure(error, this.probeSeq);
    }
    /** Stop the background timer and quiesce the in-flight probe. */
    async dispose() {
        this.disposed = true;
        if (this.timer !== undefined) {
            this.clearTimerFn(this.timer);
            this.timer = undefined;
        }
        if (this.inFlight !== undefined)
            await this.inFlight;
    }
    fastError() {
        const detail = this.lastError instanceof Error
            ? this.lastError.message
            : String(this.lastError);
        return new Error(this.label + " is unreachable (" + detail + ")");
    }
    armTimer(delayMs) {
        if (this.timer !== undefined)
            this.clearTimerFn(this.timer);
        const t = this.setTimerFn(() => {
            this.timer = undefined;
            void this.runProbe(false);
        }, delayMs);
        if (typeof t === "object" &&
            t !== null &&
            "unref" in t &&
            typeof t.unref === "function") {
            t.unref();
        }
        this.timer = t;
    }
    async runProbe(first) {
        if (this.disposed)
            return;
        if (this.inFlight !== undefined) {
            await this.inFlight;
            return;
        }
        const mySeq = this.probeSeq++;
        // Identity cell: the body below must clear the flight BEFORE it
        // settles (see clearFlight), but naming the promise directly is
        // a TDZ use-before-assign — the cell breaks the cycle (it is
        // only READ after assignment, single-threaded).
        let flight = undefined;
        const attempt = (async () => {
            try {
                await this.probeFn();
            }
            catch (error) {
                this.onProbeFailure(error, mySeq);
                // Clear BEFORE the IIFE settles: onProbeFailure already
                // resolved ready, and ready-waiters must observe a settled
                // flight (a waiter that fires the next timer would otherwise
                // join this stale flight and drop its probe).
                this.clearFlight(flight);
                return;
            }
            this.onProbeSuccess(first);
            this.clearFlight(flight);
        })();
        flight = attempt;
        this.inFlight = attempt;
        try {
            await attempt;
        }
        finally {
            /* v8 ignore next -- the IIFE's clearFlight strictly precedes
             * the settle (single-threaded: the flight cell is assigned
             * before any continuation runs), so the flight is always
             * cleared already here. The guard stays as the backstop for
             * a future edit that breaks the IIFE clear — a leak would
             * pin every later probe to a settled flight. */
            if (this.inFlight === attempt)
                this.inFlight = undefined;
        }
    }
    onProbeSuccess(first) {
        const was = this.state;
        this.state = "up";
        this.lastError = undefined;
        this.failedAttempts = 0;
        this.upAt = this.nowFn();
        if (was === "down" || was === "exhausted" || was === "unknown") {
            if (!first)
                this.log.info(this.label + ": engine reachable");
            if (was !== "unknown" && this.onUp !== undefined)
                this.onUp();
        }
        this.resolveReadyOnce({ ok: true });
    }
    onProbeFailure(error, mySeq) {
        // Stale probe: traffic proved reachability after this probe
        // started — the fresher fact wins, state does not move (ready
        // already settled ok via noteSuccess when this fires late).
        if (mySeq < this.trafficSeq)
            return;
        // Stability window: uptime past the ceiling ends the outage —
        // the next disconnect starts a fresh budget.
        if (this.upAt !== undefined &&
            this.nowFn() - this.upAt >= this.policy.maxDelayMs) {
            this.failedAttempts = 0;
        }
        this.upAt = undefined;
        this.failedAttempts += 1;
        this.lastError = error;
        const was = this.state;
        this.state = "down";
        if (was === "up" || was === "unknown") {
            this.log.warn(this.label + ": engine unreachable: " + String(error));
            if (was === "up" && this.onDown !== undefined)
                this.onDown(error);
        }
        this.resolveReadyOnce({ ok: false, error });
        if (!this.policy.enabled) {
            this.log.error(this.label + ": re-probe disabled — submits fail fast until reload");
            return;
        }
        if (this.failedAttempts > this.policy.maxAttempts) {
            this.state = "exhausted";
            this.log.error(this.label + ": giving up after " + this.policy.maxAttempts +
                " consecutive failed probes — submits re-arm with one fresh probe");
            if (this.onExhausted !== undefined) {
                this.onExhausted(this.policy.maxAttempts);
            }
            return;
        }
        const delayMs = Math.min(this.policy.maxDelayMs, this.policy.initialDelayMs * 2 ** (this.failedAttempts - 1));
        this.armTimer(delayMs);
    }
    clearFlight(flight) {
        /* v8 ignore next -- the flight cell is only ever READ after its
         * synchronous assignment (single-threaded), and joiners never
         * replace the flight, so both bail arms are unreachable: the
         * guard always clears. The guard stays so a future edit that
         * touches the flight protocol fails safe instead of leaking. */
        if (flight !== undefined && this.inFlight === flight) {
            this.inFlight = undefined;
        }
    }
    resolveReadyOnce(outcome) {
        if (this.resolveReady !== undefined) {
            const resolveP = this.resolveReady;
            this.resolveReady = undefined;
            resolveP(outcome);
        }
    }
}
//# sourceMappingURL=supervisor.js.map
