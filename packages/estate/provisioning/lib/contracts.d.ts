export type ResourceOwner = "family" | "card";
export interface ModelResourceRef {
    readonly kind: "model";
    readonly owner: ResourceOwner;
    readonly id: string;
    readonly variant?: string;
    readonly quant?: string;
}
export interface ExtensionResourceRef {
    readonly kind: "extension";
    readonly id: string;
}
export type ResourceRef = ModelResourceRef | ExtensionResourceRef;
export declare const PROVISION_STATES: readonly ["unknown", "absent", "requested", "acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked"];
export type ProvisionState = (typeof PROVISION_STATES)[number];
/** THE DURABLE DOWNLOAD SEAT (the lifetime finding, 2026-10-21):
 *  'requested' names a download WANTED whose fetch no process has
 *  claimed — a transient seat (an agent session) mints the row and
 *  never opens a wire; the durable seat (the operator's lane)
 *  claims it and owns the fetch's lifetime. It is never live (no
 *  fetch holds a plane slot) and never failed (nothing died) — it
 *  is waiting, and the waiting voice names the seat that owes the
 *  claim. */
export declare const DURABLE_QUEUE_DETAIL = "queued for the durable lane seat \u2014 the fetch starts there, never in this session";
/** THE CLAIMER HEARTBEAT SHAPE — the durable seat's liveness stamp
 *  on the shared store: which seat claims, and when it last ticked.
 *  @param bootId the claiming seat's boot id
 *  @param at epoch milliseconds of the seat's last claim tick */
export interface SeatHeartbeat {
    readonly bootId: string;
    readonly at: number;
}
/** THE CLAIMER FRESHNESS WINDOW — five default claim cadences: a
 *  heartbeat older than this names a dead seat, and a transient
 *  reading it must take the wire itself rather than queue into a
 *  store no one will claim (the dead-queue impossibility). Derived
 *  from DOWNLOAD_CLAIM_INTERVAL_MS × 5; a deployment running a
 *  slower cadence still fits (the window reads the stamp's age, not
 *  the cadence's configured value). */
export declare const DURABLE_CLAIMER_FRESH_MS = 10000;
/** THE LIVE ACQUIRE STATES — the states that name a fetch still
 *  holding its plane slot (one spelling for every reader that must
 *  tell a landing download from a settled row: the manage plane's
 *  rescue verbs refuse live ids, the run gate's lane-presence voice
 *  reports the live fraction). A settled row — landed, failed,
 *  blocked — is never in this set. */
export declare const LIVE_ACQUIRE_STATES: ReadonlySet<ProvisionState>;
/** THE ACQUIRE PHASES (audit download-stack-audit-2026-10-20 F2):
 *  the live liveness word on the weight ledger. The state word names
 *  the phase the operation is in; the phase word names the flow that
 *  is moving under a frozen byte count: 'stream' (bytes landing),
 *  'queue' (the manager queue draining), 'verify' (hash chunks read),
 *  'recheck' (a present file's re-hash before the count). The popup's
 *  only liveness window rides the poll; a frozen byte count with a
 *  live phase is flight, never death. */
export declare const ACQUIRE_PHASES: readonly ["stream", "queue", "verify", "recheck"];
export type AcquirePhase = (typeof ACQUIRE_PHASES)[number];
export declare const PROVISION_OUTCOMES: readonly ["active", "restart_required", "partial", "failed", "cancelled", "blocked"];
export type ProvisionOutcome = (typeof PROVISION_OUTCOMES)[number];
export interface ModelProvisionPlanItem {
    readonly kind: "model";
    readonly key: string;
    readonly owner: ResourceOwner;
    readonly id: string;
    readonly name: string;
    readonly folder: string;
    readonly url: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
    readonly required: boolean;
    readonly provider: string;
    readonly variant?: string;
    readonly quant?: string;
}
/** A pinned Hugging Face snapshot tree (the `snapshot_provisions`
 *  DECL row — the directory-shaped weight a single-file row cannot
 *  name). Acquisition lists the pinned repo, fetches the declared
 *  patterns, and verifies the tree's anchor files landed; presence
 *  is the same anchor probe. No digest: the revision pin is the
 *  integrity word (immutable bytes upstream). */
export interface SnapshotProvisionPlanItem {
    readonly kind: "snapshot";
    readonly key: string;
    readonly owner: ResourceOwner;
    readonly id: string;
    readonly name: string;
    readonly folder: string;
    readonly repoId: string;
    readonly revision: string;
    readonly allowPatterns: readonly string[];
    readonly required: boolean;
    readonly provider: "hf-snapshot";
}
export interface ExtensionProvisionPlanItem {
    readonly kind: "extension";
    readonly key: string;
    readonly id: string;
    readonly url?: string;
    readonly required: boolean;
    readonly provider: string;
    readonly ref?: string;
    readonly version?: string;
    readonly registry?: string;
    readonly requirements?: readonly string[];
    readonly nodeTypes?: readonly string[];
}
export type ProvisionPlanItem = ModelProvisionPlanItem | SnapshotProvisionPlanItem | ExtensionProvisionPlanItem;
export interface ProvisionPlan {
    readonly ref: ResourceRef;
    readonly items: readonly ProvisionPlanItem[];
}
export interface ResourceStatusItem {
    readonly key: string;
    readonly kind: "model" | "snapshot" | "extension";
    readonly state: ProvisionState;
    readonly path?: string;
    readonly sha256?: string;
    readonly integrity?: "declared-sha256" | "size-checked" | "operator-unverified";
    readonly errorCode?: string;
    readonly detail?: string;
}
export interface ResourceStatus {
    readonly ref: ResourceRef;
    readonly state: ProvisionState;
    readonly operationId?: string;
    readonly items: readonly ResourceStatusItem[];
    readonly detail?: string;
    readonly fetchable?: boolean;
    readonly bytes?: number;
    readonly total?: number;
    readonly phase?: AcquirePhase;
}
export interface ProvisionItemResult extends ResourceStatusItem {
    readonly outcome: ProvisionOutcome;
}
export interface ProvisionResult {
    readonly operationId: string;
    readonly ref: ResourceRef;
    readonly state: ProvisionOutcome;
    readonly outcome: ProvisionOutcome;
    readonly operationState: ProvisionState;
    readonly items: readonly ProvisionItemResult[];
    readonly restartRequired: boolean;
    readonly detail?: string;
}
export interface ProvisionOperation {
    readonly operationId: string;
    readonly ref: ResourceRef;
    readonly state: ProvisionState;
    readonly items: readonly ResourceStatusItem[];
    readonly outcome?: ProvisionOutcome;
    readonly startedAt: number;
    readonly finishedAt?: number;
    readonly detail?: string;
}
/** THE WEIGHT-ACQUISITION PROGRESS (F9 run-press acquisition):
 *  the live byte count for one weight fetch — the tracker polls
 *  this, never an animation. bytes counts LANDED bytes on the
 *  store (counted as the fetcher's stream lands); total is the
 *  DECL's declared size_bytes sum (0 when no row declares one).
 *  state mirrors the provisioning record (acquiring while the
 *  fetch lands, then the terminal operationState). */
export interface WeightAcquireProgress {
    readonly operationId: string;
    readonly ref: ResourceRef;
    readonly state: ProvisionState;
    readonly bytes: number;
    readonly total: number;
    readonly detail?: string;
    /** THE LIVE PHASE (audit F2): the flow moving under the byte
     *  count — stream, queue, verify, recheck. Absent on rows seeded
     *  before the phase law; every flight the service opens carries it
     *  from the first poll. Absent on SETTLED rows (the acceptance
     *  law, 2026-11-10): the phase belongs to the flight, not the
     *  landing — a settled row shedding it at complete() voices the
     *  ready word alone, never a live-flow word a face would wait on. */
    readonly phase?: AcquirePhase;
}
export interface EnsureOptions {
    readonly items?: readonly string[];
    readonly activate?: boolean;
    readonly activateIfIdle?: boolean;
    readonly force?: boolean;
}
export interface ActivateOptions {
    readonly force?: boolean;
    readonly ifIdle?: boolean;
}
export interface ExternalOptions {
    readonly operatorConfirmed: boolean;
    readonly force?: boolean;
}
export interface ExternalModelProvisionRequest {
    readonly kind: "model";
    readonly url: string;
    readonly relativePath?: string;
    readonly filename?: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
}
export interface ExternalExtensionProvisionRequest {
    readonly kind: "extension";
    readonly url: string;
    readonly ref?: string;
}
export type ExternalProvisionRequest = ExternalModelProvisionRequest | ExternalExtensionProvisionRequest;
export declare function resourceKey(ref: ResourceRef): string;
export declare function sameResourceRef(left: ResourceRef, right: ResourceRef): boolean;
/**
 * THE PROVIDER VOCABULARY (2026-10-10, the MCP/media audit's C4).
 *
 * The plan's `provider` is a PROTOCOL TOKEN, and the estate writes
 * four of them ("direct", "git", "manager", "local") — but the
 * service dispatched on ONE (`provider === "local"`), so a "git" or
 * "direct" item silently fell into the Manager path: an extension
 * declared with a git URL went to ComfyUI-Manager, and on a lane
 * with no Manager it refused `manager/unavailable` while a git
 * provider sat right there. A token with no arm is not a default —
 * it is a refusal, by name.
 *
 * The vocabulary is closed here, and each arm below is implemented or
 * refused BY NAME. Adding a token means adding an arm, and the wall
 * (provision-contracts.spec.ts) fails when a plan names one the
 * service has no arm for.
 */
export declare const PROVISION_PROVIDERS: readonly ["local", "manager", "git", "direct", "external"];
export type ProvisionProvider = (typeof PROVISION_PROVIDERS)[number];
/** Is this a provider the vocabulary admits? */
export declare function providerOk(name: string): name is ProvisionProvider;
/** The refusal a plan item earns by naming a provider the service
 *  cannot honour — the honest voice for "this token has no arm". */
export declare function unknownProviderRefusal(name: string): string;
/** THE HUMAN BYTE VOICE (operator 2026-10-20: "THE TRACKING OF
 *  BYTES ALONE IS INEXCUSABLE" — the popup showed
 *  "5196173399/7343591088 bytes (71%)", a wall of digits no
 *  operator can read at a glance). Binary-base sizes with one
 *  decimal: 7343591088 → "6.8 GB", 519617399 → "4.8 GB".
 *  Non-finite or negative input voices "0 B" (never NaN on the
 *  face). Re-homed here (2026-11, audit F10 last remainder) as the
 *  ONE byte vocabulary both the rescue popup and the deck's
 *  declared-resources face import — never a second spelling.
 *  @param bytes the byte count to voice
 *  @returns the human size, one decimal, binary base */
export declare function formatByteSize(bytes: number): string;
/** THE HUMAN PROGRESS LINE (the same burn): "4.8/6.8 GB (71%)"
 *  — human sizes over the DECL total with the percent the bar
 *  already carries. A total=0 row has no line (the purge P5
 *  undeclared face owns it) — empty string, never "0/0".
 *  @param bytes the landed byte count
 *  @param total the declared total the percent rides
 *  @returns "4.8/6.8 GB (71%)"-shaped line, or "" when total=0 */
export declare function formatWeightProgress(bytes: number, total: number): string;
/** THE SHARED PERCENT (the meter's number, one spelling beside the
 *  byte voice it mirrors): the 0–100 integer formatWeightProgress
 *  prints in parentheses. Clamped at 100 — an over-delivered row
 *  never reads 104%.
 *  @param bytes the landed byte count
 *  @param total the declared total
 *  @returns the clamped 0–100 percent integer */
export declare function weightPercent(bytes: number, total: number): number;
//# sourceMappingURL=contracts.d.ts.map
