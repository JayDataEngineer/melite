export declare function isTransportDownError(error: unknown): boolean;
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
export declare const SUPERVISOR_DEFAULTS: Required<SupervisorPolicy>;
export type ResolvedSupervisorPolicy = Readonly<Required<SupervisorPolicy>>;
/** Explicit resolve step — misconfiguration fails LOUD at load
 *  (the resolveReconnectPolicy rule, same bounds minus the
 *  dsh-timeout dep this package does not carry). */
export declare function resolveSupervisorPolicy(policy: SupervisorPolicy | undefined, path: string): ResolvedSupervisorPolicy;
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
/** Reachability supervisor for one engine base URL. */
export declare class EngineSupervisor {
    private readonly probeFn;
    private readonly policy;
    private readonly label;
    private readonly onUp;
    private readonly onDown;
    private readonly onExhausted;
    private readonly log;
    private readonly setTimerFn;
    private readonly clearTimerFn;
    private readonly nowFn;
    private state;
    private lastError;
    private failedAttempts;
    private upAt;
    private timer;
    private inFlight;
    private disposed;
    private started;
    /** Probe start counter + the counter value traffic last proved:
     *  a probe that started BEFORE the latest traffic proof is stale
     *  and must not move state (the hasClosed() race rule). */
    private probeSeq;
    private trafficSeq;
    private readonly readyPromise;
    private resolveReady;
    constructor(deps: SupervisorDeps);
    /** Current reachability (unknown until the first probe settles). */
    get current(): EngineState;
    /** Last probe failure (undefined when up or never probed). */
    get failure(): unknown;
    /** Settles with the FIRST probe outcome (success or failure) —
     *  the startup-await: boot records it, never blocks on it. */
    get ready(): Promise<ProbeOutcome>;
    /** Begin probing (idempotent). First probe runs immediately. */
    start(): void;
    /** Submit-path gate: up/unknown proceed; down throws the RECORDED
     *  error fast; exhausted runs ONE re-arm probe (success proceeds,
     *  failure throws). Never waits on the background timer. */
    ensureUp(): Promise<void>;
    /** Fresh state read as a call (defeats property narrowing — the
     *  state can move across the await above). */
    private settledUp;
    /** Submit-path liveness report: a request that PROVED reachability
     *  (any HTTP status — even a 500 is an alive engine) refreshes the
     *  up state. The onclose analog: traffic is the liveness channel
     *  (the MCP supervisor keeps no ping either). */
    noteSuccess(): void;
    /** Submit-path liveness report: a TRANSPORT failure (refused /
     *  reset / unreachable — never a timeout or HTTP status, which
     *  prove the engine alive) drops the state and arms backoff. */
    noteFailure(error: unknown): void;
    /** Stop the background timer and quiesce the in-flight probe. */
    dispose(): Promise<void>;
    private fastError;
    private armTimer;
    private runProbe;
    private onProbeSuccess;
    private onProbeFailure;
    private clearFlight;
    private resolveReadyOnce;
}
//# sourceMappingURL=supervisor.d.ts.map