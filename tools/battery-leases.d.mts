// battery-leases.d.mts — the TYPE TWIN of battery-leases.mjs (2026-11-25,
// CI run 45559945959): the package-local walls import the tier table, the
// glob matcher, and the gate decision straight from the .mjs, and the
// test tier's per-package tsc config has no `allowJs` — the fence spec
// dead-lettered TS7016 ("implicitly has an 'any' type") while the walls
// project's own config stayed green, so the red surfaced only in the
// package that imported it. The twin declares the module's real surface;
// keep it beside every export the specs consume (knip ignores the class
// via `tools/*.d.mts`, and the lane-pairing fence's derived-roster arm
// requires that ignore to exist).

/** Minimal glob: `**` spans directories, `*` within one segment. */
export function globMatch(pattern: string, relPath: string): boolean

/** Every file under root matching any glob (deduped, repo-relative, forward-slash). */
export function expandGlobs(root: string, globs: readonly string[]): string[]

/** Per-tier judged surfaces, one home for what each tier hashes. */
export const TIER_INPUTS: Record<string, string[]>

/** The tier's globs plus the self-input law (battery logic, lockfile, control files). */
export function tierGlobs(tierId: string): string[]

/** 'carry' only on a green lease whose recorded hash equals the live hash. */
export function carryDecision(lease: unknown, liveHash: string): 'carry' | 'fire'

/** Load a lease store; any parse/shape trouble answers {} (every tier fires). */
export function loadLeases(path: string): Record<string, { status?: string; hash?: string }>

/** Persist a lease store. */
export function saveLeases(path: string, leases: Record<string, unknown>): void

/** Hash the tier's judged surface and decide carry vs fire. */
export function tierGate(
  root: string,
  leases: Record<string, unknown>,
  tierId: string,
): { tierId: string; hash: string; files: number; decision: 'carry' | 'fire' }

/** sha256 over (sorted relpath + content) of every matched file. */
export function hashTree(root: string, globs: readonly string[]): string

/** Recursive remove, forced. */
export function rmTree(path: string): void
