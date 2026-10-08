// bundle-gate.ts — the gutted-lane boot gate.
//
// 2026-10-05: dsh-melite-test booted while its pnpm tree was broken,
// every @melite* bundle skipped with "cannot resolve profile bundle",
// and the lane still served :3088 with no melite tools, no /v1 doors
// and no card studios — warning-only. This gate is the estate's
// lane-side refusal: before the estate mounts its first row it checks
// the loader tree for the tool surface's bundle rows. A skipped bundle
// contributes no loader entry (its patch never applies), so an absent
// module name means the profile tree is broken, not that a sibling is
// still activating — presence, never fiber phase, is the signal.
//
// SCOPE: the core surface only (@melite/harness-tools: the agent tools
// plus the /v1 doors). Card studios stay optional by design — a
// headless commission estate composes without them — and the
// every-bundle sweep is dsh-app-boot's surface upstream, out of this
// tree's reach. DSH-owned bundles (dsh-base, dsh-web-app and the
// agent-team profile) are upstream's to judge, never the estate's.
//
// TWO ARMS: refuse (default — throw; the estate fiber goes FAILED,
// which the plugin inventory reports as fiberPhase failed) or degraded
// (the estate config's allowGuttedLane field — serve on, with the
// absence recorded on the meliteLaneHealth service for machine
// readers). Refuse-loud beats warn-and-serve.

// Erasable-syntax TS only: no enums, `import type` for types.

/** Environment opt-out of the refusal arm: serve degraded instead of throwing. */

/** Service name carrying the degraded mark for machine readers. */
export const LANE_HEALTH_SERVICE = "meliteLaneHealth";

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
export const REQUIRED_BUNDLES: readonly RequiredBundle[] = [
  {
    bundle: "@melite/harness-tools",
    modules: ["@melite/harness-tools", "@melite/harness-tools/doors"],
  },
];

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
export function resolveAllowGuttedLane(config: BundleGateConfig = {}): boolean {
  return config.allowGuttedLane === true;
}

/**
 * Find the required bundles with no loader entry.
 * @param entryNames - every loader entry's module name.
 * @returns the missing bundle package names, empty on a whole lane.
 */
export function findMissingBundles(entryNames: readonly string[]): readonly string[] {
  const present = new Set(entryNames);
  return REQUIRED_BUNDLES.filter((row) => !row.modules.some((module) => present.has(module))).map(
    (row) => row.bundle,
  );
}

/** Read every loader entry's module name, or undefined when no loader is observable. */
function readLoaderEntryNames(ctx: unknown): string[] | undefined {
  const probe = ctx as { get?(name: string): unknown; loader?: unknown };
  let loader: unknown;
  try {
    loader = typeof probe.get === "function" ? probe.get("loader") : undefined;
  } catch {
    loader = undefined;
  }
  if (loader === undefined) {
    try {
      loader = probe.loader;
    } catch {
      loader = undefined;
    }
  }
  const entries = (loader as { entries?: unknown } | undefined)?.entries;
  if (typeof entries !== "function") return undefined;
  let list: unknown;
  try {
    list = (entries as () => unknown).call(loader);
  } catch {
    return undefined;
  }
  const names: string[] = [];
  try {
    for (const entry of list as Iterable<unknown>) {
      const name = (entry as { options?: { name?: unknown } } | null)?.options?.name;
      if (typeof name === "string") names.push(name);
    }
  } catch {
    return undefined;
  }
  return names;
}

/** Record the degraded mark where machine readers probe it; a ctx without provide keeps serving unmarked. */
function markLaneDegraded(ctx: unknown, missing: readonly string[]): void {
  const probe = ctx as { provide?: unknown };
  if (typeof probe.provide !== "function") return;
  (probe.provide as (name: string, value: LaneHealth) => unknown).call(ctx, LANE_HEALTH_SERVICE, {
    degraded: true,
    missing: [...missing],
    checkedAt: new Date().toISOString(),
  });
}

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
export function checkBundleGate(ctx: unknown, config: BundleGateConfig = {}): BundleGateOutcome {
  const names = readLoaderEntryNames(ctx);
  if (names === undefined) {
    console.log(
      "[melite-estate] bundle gate: no loader visible — skipping the composition check (direct-mount rigs carry no bundle tree)",
    );
    return { checked: false, missing: [], degraded: false };
  }
  const missing = findMissingBundles(names);
  if (missing.length === 0) return { checked: true, missing, degraded: false };
  if (resolveAllowGuttedLane(config)) {
    console.log(
      `[melite-estate] bundle gate: DEGRADED lane — ${missing.join(", ")} did not compose (no loader entry); serving without the tool surface by explicit opt-out (the estate config's allowGuttedLane field)`,
    );
    markLaneDegraded(ctx, missing);
    return { checked: true, missing, degraded: true };
  }
  throw new Error(
    `melite-estate: gutted lane — ${missing.join(", ")} did not compose (no loader entry: the profile bundle skipped, e.g. "cannot resolve profile bundle" from a broken install). The lane would serve with no melite tools and no /v1 doors. Refusing the estate boot: repair the profile tree (reinstall the profile node_modules, re-run provision), or serve degraded explicitly with the estate config's allowGuttedLane field.`,
  );
}
