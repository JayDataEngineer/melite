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

/** Reconnect policy — same shape + defaults as the MCP supervisor. */
export interface SupervisorPolicy {
  /** Background re-probe after a failed probe (default true). */
  readonly enabled?: boolean;
  /** First re-probe delay ms; doubles per consecutive failure (default 500). */
  readonly initialDelayMs?: number;
  /** Backoff ceiling ms; also the uptime resetting the budget (default 30000). */
  readonly maxDelayMs?: number;
  /** Consecutive failed probes per outage before exhaustion (default 10). */
  readonly maxAttempts?: number;
}

export const SUPERVISOR_DEFAULTS: Required<SupervisorPolicy> =
  Object.freeze({
    enabled: true,
    initialDelayMs: 500,
    maxDelayMs: 30_000,
    maxAttempts: 10,
  });

export type ResolvedSupervisorPolicy = Readonly<
  Required<SupervisorPolicy>
>;

/** Explicit resolve step — misconfiguration fails LOUD at load
 *  (the resolveReconnectPolicy rule, same bounds minus the
 *  dsh-timeout dep this package does not carry). */
export function resolveSupervisorPolicy(
  policy: SupervisorPolicy | undefined,
  path: string,
): ResolvedSupervisorPolicy {
  if (policy !== undefined) {
    for (const key of Object.keys(policy)) {
      if (!Object.hasOwn(SUPERVISOR_DEFAULTS, key)) {
        throw new Error(path + "." + key + " is not a supervisor option");
      }
    }
  }
  const enabled: boolean = policy?.enabled ?? SUPERVISOR_DEFAULTS.enabled;
  const initialDelayMs: number =
    policy?.initialDelayMs ?? SUPERVISOR_DEFAULTS.initialDelayMs;
  const maxDelayMs: number =
    policy?.maxDelayMs ?? SUPERVISOR_DEFAULTS.maxDelayMs;
  const maxAttempts: number =
    policy?.maxAttempts ?? SUPERVISOR_DEFAULTS.maxAttempts;
  if (
    !Number.isFinite(initialDelayMs) ||
    initialDelayMs <= 0 ||
    initialDelayMs > 2_147_483_647
  ) {
    throw new Error(
      path + ".initialDelayMs must be a positive finite number",
    );
  }
  if (
    !Number.isFinite(maxDelayMs) ||
    maxDelayMs <= 0 ||
    maxDelayMs > 2_147_483_647
  ) {
    throw new Error(path + ".maxDelayMs must be a positive finite number");
  }
  if (initialDelayMs > maxDelayMs) {
    throw new Error(
      path + ".initialDelayMs must be less than or equal to maxDelayMs",
    );
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(path + ".maxAttempts must be a positive integer");
  }
  return Object.freeze({ enabled, initialDelayMs, maxDelayMs, maxAttempts });
}

export type EngineState = "unknown" | "up" | "down" | "exhausted";

export interface ProbeOutcome {
  readonly ok: boolean;
  readonly error?: unknown;
}

export interface EngineLog {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

type Timer = ReturnType<typeof setTimeout>;

export interface SupervisorDeps {
  /** One reachability probe — resolves on up, rejects on down. */
  readonly probe: () => Promise<void>;
  readonly policy?: SupervisorPolicy;
  readonly label?: string;
  readonly onUp?: () => void;
  readonly onDown?: (error: unknown) => void;
  readonly onExhausted?: (attempts: number) => void;
  readonly log?: EngineLog;
  readonly setTimer?: typeof setTimeout;
  readonly clearTimer?: typeof clearTimeout;
  readonly now?: () => number;
}

const noopLog: EngineLog = {
  info(): void {},
  warn(): void {},
  error(): void {},
};

/** Reachability supervisor for one engine base URL. */
export class EngineSupervisor {
  private readonly probeFn: () => Promise<void>;
  private readonly policy: ResolvedSupervisorPolicy;
  private readonly label: string;
  private readonly onUp: (() => void) | undefined;
  private readonly onDown: ((error: unknown) => void) | undefined;
  private readonly onExhausted: ((attempts: number) => void) | undefined;
  private readonly log: EngineLog;
  private readonly setTimerFn: typeof setTimeout;
  private readonly clearTimerFn: typeof clearTimeout;
  private readonly nowFn: () => number;

  private state: EngineState = "unknown";
  private lastError: unknown = undefined;
  private failedAttempts = 0;
  private upAt: number | undefined = undefined;
  private timer: Timer | undefined = undefined;
  private inFlight: Promise<void> | undefined = undefined;
  private disposed = false;
  private started = false;
  /** Probe start counter + the counter value traffic last proved:
   *  a probe that started BEFORE the latest traffic proof is stale
   *  and must not move state (the hasClosed() race rule). */
  private probeSeq = 0;
  private trafficSeq = -1;

  private readonly readyPromise: Promise<ProbeOutcome>;
  private resolveReady: ((outcome: ProbeOutcome) => void) | undefined =
    undefined;

  constructor(deps: SupervisorDeps) {
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
    this.readyPromise = new Promise<ProbeOutcome>((resolveP) => {
      this.resolveReady = resolveP;
    });
  }

  /** Current reachability (unknown until the first probe settles). */
  get current(): EngineState {
    return this.state;
  }

  /** Last probe failure (undefined when up or never probed). */
  get failure(): unknown {
    return this.lastError;
  }

  /** Settles with the FIRST probe outcome (success or failure) —
   *  the startup-await: boot records it, never blocks on it. */
  get ready(): Promise<ProbeOutcome> {
    return this.readyPromise;
  }

  /** Begin probing (idempotent). First probe runs immediately. */
  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    void this.runProbe(true);
  }

  /** Submit-path gate: up/unknown proceed; down throws the RECORDED
   *  error fast; exhausted runs ONE re-arm probe (success proceeds,
   *  failure throws). Never waits on the background timer. */
  async ensureUp(): Promise<void> {
    if (this.settledUp()) return;
    if (this.state === "down") throw this.fastError();
    await this.runProbe(false);
    if (this.settledUp()) return;
    throw this.fastError();
  }

  /** Fresh state read as a call (defeats property narrowing — the
   *  state can move across the await above). */
  private settledUp(): boolean {
    return this.state === "up" || this.state === "unknown";
  }

  /** Submit-path liveness report: a request that PROVED reachability
   *  (any HTTP status — even a 500 is an alive engine) refreshes the
   *  up state. The onclose analog: traffic is the liveness channel
   *  (the MCP supervisor keeps no ping either). */
  noteSuccess(): void {
    if (this.disposed) return;
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
  noteFailure(error: unknown): void {
    if (this.disposed) return;
    this.onProbeFailure(error, this.probeSeq);
  }

  /** Stop the background timer and quiesce the in-flight probe. */
  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.timer !== undefined) {
      this.clearTimerFn(this.timer);
      this.timer = undefined;
    }
    if (this.inFlight !== undefined) await this.inFlight;
  }

  private fastError(): Error {
    const detail: string =
      this.lastError instanceof Error
        ? this.lastError.message
        : String(this.lastError);
    return new Error(this.label + " is unreachable (" + detail + ")");
  }

  private armTimer(delayMs: number): void {
    if (this.timer !== undefined) this.clearTimerFn(this.timer);
    const t: Timer = this.setTimerFn(() => {
      this.timer = undefined;
      void this.runProbe(false);
    }, delayMs);
    if (
      typeof t === "object" &&
      t !== null &&
      "unref" in t &&
      typeof (t as { unref?: unknown }).unref === "function"
    ) {
      (t as unknown as { unref(): void }).unref();
    }
    this.timer = t;
  }

  private async runProbe(first: boolean): Promise<void> {
    if (this.disposed) return;
    if (this.inFlight !== undefined) {
      await this.inFlight;
      return;
    }
    const mySeq: number = this.probeSeq++;
    // Identity cell: the body below must clear the flight BEFORE it
    // settles (see clearFlight), but naming the promise directly is
    // a TDZ use-before-assign — the cell breaks the cycle (it is
    // only READ after assignment, single-threaded).
    let flight: Promise<void> | undefined = undefined;
    const attempt: Promise<void> = (async (): Promise<void> => {
      try {
        await this.probeFn();
      } catch (error: unknown) {
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
    } finally {
      if (this.inFlight === attempt) this.inFlight = undefined;
    }
  }

  private onProbeSuccess(first: boolean): void {
    const was: EngineState = this.state;
    this.state = "up";
    this.lastError = undefined;
    this.failedAttempts = 0;
    this.upAt = this.nowFn();
    if (was === "down" || was === "exhausted" || was === "unknown") {
      if (!first) this.log.info(this.label + ": engine reachable");
      if (was !== "unknown" && this.onUp !== undefined) this.onUp();
    }
    this.resolveReadyOnce({ ok: true });
  }

  private onProbeFailure(error: unknown, mySeq: number): void {
    // Stale probe: traffic proved reachability after this probe
    // started — the fresher fact wins, state does not move (ready
    // already settled ok via noteSuccess when this fires late).
    if (mySeq < this.trafficSeq) return;
    // Stability window: uptime past the ceiling ends the outage —
    // the next disconnect starts a fresh budget.
    if (
      this.upAt !== undefined &&
      this.nowFn() - this.upAt >= this.policy.maxDelayMs
    ) {
      this.failedAttempts = 0;
    }
    this.upAt = undefined;
    this.failedAttempts += 1;
    this.lastError = error;
    const was: EngineState = this.state;
    this.state = "down";
    if (was === "up" || was === "unknown") {
      this.log.warn(this.label + ": engine unreachable: " + String(error));
      if (was === "up" && this.onDown !== undefined) this.onDown(error);
    }
    this.resolveReadyOnce({ ok: false, error });
    if (!this.policy.enabled) {
      this.log.error(
        this.label + ": re-probe disabled — submits fail fast until reload",
      );
      return;
    }
    if (this.failedAttempts > this.policy.maxAttempts) {
      this.state = "exhausted";
      this.log.error(
        this.label + ": giving up after " + this.policy.maxAttempts +
          " consecutive failed probes — submits re-arm with one fresh probe",
      );
      if (this.onExhausted !== undefined) {
        this.onExhausted(this.policy.maxAttempts);
      }
      return;
    }
    const delayMs: number = Math.min(
      this.policy.maxDelayMs,
      this.policy.initialDelayMs * 2 ** (this.failedAttempts - 1),
    );
    this.armTimer(delayMs);
  }

  private clearFlight(flight: Promise<void> | undefined): void {
    if (flight !== undefined && this.inFlight === flight) {
      this.inFlight = undefined;
    }
  }

  private resolveReadyOnce(outcome: ProbeOutcome): void {
    if (this.resolveReady !== undefined) {
      const resolveP = this.resolveReady;
      this.resolveReady = undefined;
      resolveP(outcome);
    }
  }
}
