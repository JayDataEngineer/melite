/** Environment opt-out of the refusal arm: serve degraded instead of throwing. */
/** Service name carrying the degraded mark for machine readers. */
export declare const LANE_HEALTH_SERVICE = "meliteLaneHealth";
/** One required bundle: its manifest name plus the loader entry module names its patch contributes. */
export interface RequiredBundle {
    /** The profile manifest's bundle package name. */
    readonly bundle: string;
    /** Loader entry module names, as spelled in the bundle's cordis.patch.yml. */
    readonly modules: readonly string[];
}
/**
 * The lane's core surface, derived from the provisioner's PROFILE
 * base (packages/harness/provisioner/bin/infer-provision.mjs):
 * the estate row itself is vacuous here (this
 * gate running proves its bundle composed), so the table names the
 * tool surface — @melite/harness-tools contributes the melite-tools
 * row (agent tools) and the melite-tools-doors row (the /v1 doors);
 * either entry proves the bundle composed (server profiles disable
 * the doors row by id, headless lanes never mount it). A bundle is
 * missing only when NONE of its modules has a loader entry.
 * @returns the required bundle table.
 */
export declare const REQUIRED_BUNDLES: readonly RequiredBundle[];
/** The gate's config face: explicit opt-out, never an implicit default. */
export interface BundleGateConfig {
    /** Serve degraded when required bundles are absent instead of refusing. */
    readonly allowGuttedLane?: boolean;
}
/** What the gate observed. */
export interface BundleGateOutcome {
    /** False when no loader was visible, so there was no tree to judge. */
    readonly checked: boolean;
    /** Required bundles with no loader entry, empty on a whole lane. */
    readonly missing: readonly string[];
    /** True only on the explicit degraded arm. */
    readonly degraded: boolean;
}
/** The machine-readable degraded mark provided on the ctx. */
export interface LaneHealth {
    /** Always true; presence of the service IS the degraded signal. */
    readonly degraded: boolean;
    /** Required bundles with no loader entry. */
    readonly missing: readonly string[];
    /** ISO timestamp of the observation. */
    readonly checkedAt: string;
}
/**
 * Resolve the degraded opt-out from the estate's config face alone
 * (V6/J12 cure, 2026-10-18: no env seam — the profile's cordis.yml
 * row pins the opt-out).
 * @param config - the estate's config face.
 * @returns true when the lane serves degraded instead of refusing.
 */
export declare function resolveAllowGuttedLane(config?: BundleGateConfig): boolean;
/**
 * Find the required bundles with no loader entry.
 * @param entryNames - every loader entry's module name.
 * @returns the missing bundle package names, empty on a whole lane.
 */
export declare function findMissingBundles(entryNames: readonly string[]): readonly string[];
/**
 * Run the boot gate: refuse the gutted lane, mark it degraded on the
 * explicit opt-out, or pass silent on a whole tree. Direct-mount rigs
 * (unit fakes, wall boots without a loader service) carry no bundle
 * tree, so the gate logs loud and skips — it judges loader trees,
 * never bare compositions.
 * @param ctx - the estate fiber's context, probed and never injected.
 * @param config - the estate's config face.
 * @returns what the gate observed.
 * @throws {Error} when required bundles are absent and the degraded arm is not opted in.
 */
export declare function checkBundleGate(ctx: unknown, config?: BundleGateConfig): BundleGateOutcome;
//# sourceMappingURL=bundle-gate.d.ts.map
