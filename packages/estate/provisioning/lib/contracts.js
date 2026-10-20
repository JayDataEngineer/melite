export const PROVISION_STATES = [
    "unknown",
    "absent",
    "acquiring",
    "verifying",
    "installed",
    "restart_required",
    "active",
    "failed",
    "blocked",
];
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
//# sourceMappingURL=contracts.js.map
