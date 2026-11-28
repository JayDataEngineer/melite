/** The declaration face of tools/hook-client-bundle-bytes.mjs — the
 * .mjs is JS-by-design repo tooling (the pre-push byte gate), and the
 * TS test tier (spec files typecheck against declarations) needs the
 * pairing for its one consumer: the bundle-freshness wall imports the
 * gate's pure seats so its firing arms ride the SAME functions the hook
 * runs. Bundles are repo-relative package dirs
 * (`packages/web/melite-card-view`); imports are workspace names
 * (`@melite/estate-drafts`). The recipe itself lives in the .mjs,
 * never here. */

/** Workspace package name of a repo-relative path's owner
 * (packages/<scope>/<pkg> or packages/<pkg>), via its manifest's
 * `name`; null outside packages/ or for a dir with no manifest.
 * `readPkg` is the manifest read (defaults to the tree's). */
export function ownerPackageName(
  repoRel: string,
  opts?: { readPkg?: (dir: string) => { name?: unknown } },
): string | null

/** Bundle roster: package dirs seating a tracked tsdown config AND a
 * seated lib/client.js, sorted. Derived, zero maintained literals;
 * `tracked` overrides the git ls-files read (the wall's synthetic
 * roster). */
export function bundlePackages(opts?: { tracked?: readonly string[] | null }): string[]

/** Workspace-name imports (`@melite/<name>`) of one bundle package's
 * src — the reverse-embed closure's edges. */
export function bundleImports(pkgDir: string): Set<string>

/** The reads the affected-set derivation rides. */
export interface AffectedBundlesReads {
  /** The bundle roster (repo-relative package dirs). */
  bundles: readonly string[];
  /** Workspace name owning a changed repo-relative path, or null. */
  nameOf: (repoRel: string) => string | null;
  /** Workspace-name imports of one bundle package's src. */
  importsOf: (pkgDir: string) => ReadonlySet<string>;
  /** Shared-preset files whose change dirties every bundle (defaults
   * to the shared client preset pair). */
  sharedPreset?: readonly string[];
}

/** The affected bundles for a changed-file list, sorted: own-src and
 * tsdown-config changes, every importer of a changed workspace name,
 * and — on a shared-preset change — the whole roster. */
export function affectedBundles(changedFiles: readonly string[], reads: AffectedBundlesReads): string[]

/** Byte equality of a fresh emit against seated bytes. */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean
