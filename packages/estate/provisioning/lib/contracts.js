export const PROVISION_STATES = [
    "unknown",
    "absent",
    "requested",
    "acquiring",
    "verifying",
    "installed",
    "restart_required",
    "active",
    "failed",
    "blocked",
];
/** THE DURABLE DOWNLOAD SEAT (the lifetime finding, 2026-10-21):
 *  'requested' names a download WANTED whose fetch no process has
 *  claimed — a transient seat (an agent session) mints the row and
 *  never opens a wire; the durable seat (the operator's lane)
 *  claims it and owns the fetch's lifetime. It is never live (no
 *  fetch holds a plane slot) and never failed (nothing died) — it
 *  is waiting, and the waiting voice names the seat that owes the
 *  claim. */
export const DURABLE_QUEUE_DETAIL = "queued for the durable lane seat — the fetch starts there, never in this session";
/** THE CLAIMER FRESHNESS WINDOW — five default claim cadences: a
 *  heartbeat older than this names a dead seat, and a transient
 *  reading it must take the wire itself rather than queue into a
 *  store no one will claim (the dead-queue impossibility). Derived
 *  from DOWNLOAD_CLAIM_INTERVAL_MS × 5; a deployment running a
 *  slower cadence still fits (the window reads the stamp's age, not
 *  the cadence's configured value). */
export const DURABLE_CLAIMER_FRESH_MS = 10_000;
/** THE LIVE ACQUIRE STATES — the states that name a fetch still
 *  holding its plane slot (one spelling for every reader that must
 *  tell a landing download from a settled row: the manage plane's
 *  rescue verbs refuse live ids, the run gate's lane-presence voice
 *  reports the live fraction). A settled row — landed, failed,
 *  blocked — is never in this set. */
export const LIVE_ACQUIRE_STATES = new Set([
    "acquiring",
    "verifying",
]);
/** THE ACQUIRE PHASES (audit download-stack-audit-2026-10-20 F2):
 *  the live liveness word on the weight ledger. The state word names
 *  the phase the operation is in; the phase word names the flow that
 *  is moving under a frozen byte count: 'stream' (bytes landing),
 *  'queue' (the manager queue draining), 'verify' (hash chunks read),
 *  'recheck' (a present file's re-hash before the count). The popup's
 *  only liveness window rides the poll; a frozen byte count with a
 *  live phase is flight, never death. */
export const ACQUIRE_PHASES = [
    "stream",
    "queue",
    "verify",
    "recheck",
];
export const PROVISION_OUTCOMES = [
    "active",
    "restart_required",
    "partial",
    "failed",
    "cancelled",
    "blocked",
];
export function resourceKey(ref) {
    if (ref.kind === "extension") {
        return JSON.stringify(["extension", ref.id]);
    }
    return JSON.stringify([
        "model",
        ref.owner,
        ref.id,
        ref.variant ?? null,
        ref.quant ?? null,
    ]);
}
export function sameResourceRef(left, right) {
    return resourceKey(left) === resourceKey(right);
}
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
export const PROVISION_PROVIDERS = [
    /** installed in the engine already; verified, never installed here */
    "local",
    /** installed through ComfyUI-Manager */
    "manager",
    /** installed from a pinned git repository (the git provider) */
    "git",
    /** a direct artifact fetch to the model store */
    "direct",
    /** a model fetched outside the plan (the card's own external row) */
    "external",
];
/** Is this a provider the vocabulary admits? */
export function providerOk(name) {
    return PROVISION_PROVIDERS.includes(name);
}
/** The refusal a plan item earns by naming a provider the service
 *  cannot honour — the honest voice for "this token has no arm". */
export function unknownProviderRefusal(name) {
    return "plan item names provider " + JSON.stringify(name) +
        " which is outside the vocabulary (" + PROVISION_PROVIDERS.join(", ") +
        ") — a provider token with no arm is refused by name, never routed to a default";
}
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
export function formatByteSize(bytes) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0)
        return '0 B';
    if (bytes < 1024)
        return String(Math.floor(bytes)) + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return value.toFixed(1) + ' ' + units[unit];
}
/** THE HUMAN PROGRESS LINE (the same burn): "4.8/6.8 GB (71%)"
 *  — human sizes over the DECL total with the percent the bar
 *  already carries. A total=0 row has no line (the purge P5
 *  undeclared face owns it) — empty string, never "0/0".
 *  @param bytes the landed byte count
 *  @param total the declared total the percent rides
 *  @returns "4.8/6.8 GB (71%)"-shaped line, or "" when total=0 */
export function formatWeightProgress(bytes, total) {
    if (!(total > 0))
        return '';
    const pct = Math.min(100, Math.round((bytes / total) * 100));
    return formatByteSize(bytes) + '/' + formatByteSize(total) + ' (' + String(pct) + '%)';
}
/** THE SHARED PERCENT (the meter's number, one spelling beside the
 *  byte voice it mirrors): the 0–100 integer formatWeightProgress
 *  prints in parentheses. Clamped at 100 — an over-delivered row
 *  never reads 104%.
 *  @param bytes the landed byte count
 *  @param total the declared total
 *  @returns the clamped 0–100 percent integer */
export function weightPercent(bytes, total) {
    if (!(total > 0))
        return 0;
    return Math.min(100, Math.round((bytes / total) * 100));
}
//# sourceMappingURL=contracts.js.map