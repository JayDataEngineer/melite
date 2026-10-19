import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Shared source-mode test machinery, ported from DSH's
 * references/deepseek-harness/vitest.shared.ts (the one file every
 * other vitest config imports): standard-decorator lowering before
 * Vite's parser sees the file, worker argv that keeps process-wide
 * Web Storage from shadowing jsdom storage, and the resolution
 * facade every config spreads (see SOURCE_PLANE_ALIAS).
 */

// Typescript reaches this root only through a workspace package's
// declared devDep: the root cannot gain the dep today because this
// sandbox's pnpm store is broken (ERR_SQLITE_ERROR, ledger TEST-4),
// and a failed `pnpm add` leaves a lockfile side-effect without the
// node_modules link. melite-tools pins typescript 5.9.3 — the same
// pin the estate remotes build with. Migrate to a root devDep +
// plain `import` when the store unlocks (same migration note as
// vite-tsconfig-paths).
const require = createRequire(path.join(import.meta.dirname, 'packages/harness/melite-tools/package.json'))

/** The narrow transpiler surface the decorator plugin uses; structural so the root needs no typescript types. */
interface Transpiler {
  transpileModule(source: string, options: {
    fileName: string
    compilerOptions: { target: number; module: number; jsx?: number; sourceMap?: boolean }
  }): { outputText: string; sourceMapText?: string }
  ScriptTarget: Record<'ES2024', number>
  ModuleKind: Record<'ESNext', number>
  JsxEmit: Record<'ReactJSX', number>
}

const ts = require('typescript') as Transpiler

const decoratorSyntax = /^\s*@[A-Za-z_$][\w$]*/m

/**
 * Worker arguments that keep process-wide Web Storage from shadowing jsdom storage.
 * Node lists the positive spelling in `allowedNodeEnvironmentFlags` for this negatable flag.
 */
export const vitestExecArgv: string[] = process.allowedNodeEnvironmentFlags.has('--webstorage') ? ['--no-webstorage'] : []

/**
 * Transform standard TypeScript decorators before Vite's default parser sees source files.
 * The estate Typert remotes' `@Remote` adapters are this flavor (their built lib carries
 * `__esDecorate`, never legacy `__decorate`), so this port lowers them without flag changes.
 * @returns a pre-transform Vite plugin shared by source-mode test configurations.
 */
export function standardDecoratorPlugin() {
  return {
    name: 'melite-standard-decorators',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const file = id.split('?', 1)[0]!
      if (!/\.[cm]?tsx?$/.test(file) || !decoratorSyntax.test(code)) return
      const result = ts.transpileModule(code, {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2024,
          module: ts.ModuleKind.ESNext,
          jsx: file.endsWith('x') ? ts.JsxEmit.ReactJSX : undefined,
          sourceMap: true,
        },
      })
      return {
        code: result.outputText
          .replace(
            /^(\s*)(__esDecorate\()/gmu,
            '$1/* v8 ignore next -- compiler-synthetic decorator accessors have no source behavior */ $2',
          )
          .replace(/\n?\/\/# sourceMappingURL=.*$/u, '\n'),
        map: result.sourceMapText,
      }
    },
  }
}

/** The proxy-scrubbing setup file every config declares; exported so the wiring test names it once.
 * CONFIG-ROOT-ABSOLUTE (2026-09-29, the per-package run fix — the TMP_SWEEP
 * class): a './'-relative specifier resolves against the INVOKING cwd, so a
 * package-cwd vitest run hunted <pkg>/scripts/test-proxy-environment.ts and
 * loaded nothing. Resolved against this file, found from any cwd. */
export const PROXY_SETUP = path.join(import.meta.dirname, 'scripts/test-proxy-environment.ts')

/**
 * Source-plane resolution facade: the workspace packages whose `exports`/mains point at built
 * lib/ resolve to src in every vitest config, so tests never load a second (stale) copy of a
 * module singleton. Kit packages already point mains at src; these five do not. The alias
 * table is the same mechanism as DSH's tsconfig-paths facade (one table, spread everywhere);
 * migrate to vite-tsconfig-paths when the pnpm store unlocks.
 */
export const SOURCE_PLANE_ALIAS: Record<string, string> = {
  // THE ONE-ROW LAW (/client door): card-base's exports['./client']
  // default points at the BUILT browser row (lib/client.js — the
  // module-table registration the shell serves); the row's `types`
  // condition already resolves typecheck to src. Vitest resolves
  // defaults, so every test-plane import of the /client specifier
  // maps to the package's src client face — the same file the types
  // condition names, so typecheck and runtime resolve ONE graph, and
  // the row's own sink wiring executes under test.
  '@melite/card-base/client': path.join(import.meta.dirname, 'packages/web/card-base/src/client/index.ts'),
  // THE ONE-ROW LAW FOR 3D: the three graph row's /client door
  // points at the BUILT browser row (lib/client.js — the module-
  // table registration the shell serves); tests resolve the src
  // client face instead, the same file the types condition names,
  // so typecheck and runtime share ONE graph and three's instance
  // guard never races a factory bundle under jsdom (the bundle
  // opens with window.__ModuleLoader__.load — undefined there).
  '@melite/three-client/client': path.join(import.meta.dirname, 'packages/web/three-client/src/client/index.ts'),
  '@melite/harness-tools': path.join(import.meta.dirname, 'packages/harness/melite-tools/src/index.ts'),
  '@melite-plugin/melite-run-wire': path.join(import.meta.dirname, 'packages/web/melite-run-wire/src/index.ts'),
  // the drafts REMOTE subpath — MUST sit BEFORE the parent row
  // (rollup alias matches boundary-prefixes in iteration order; the
  // parent would swallow the subpath into src/index.ts/remote):
  // the generated Typert client, built from src/remote.ts's @Remote
  // adapters — no src-plane file exports TYPERT_REMOTE. Aliased to
  // the package's own built truth, the same artifact its exports
  // map serves at runtime.
  // the drafts TRAIL subpath — the same boundary-prefix law as the
  // remote row below (MUST precede the parent or it is swallowed):
  // the pure trail-laws module (canonical urls, one-row-per-run
  // dedupe), the exact file the exports map and the paths maps name.
  '@melite/estate-drafts/trail': path.join(import.meta.dirname, 'packages/estate/drafts/src/trail.ts'),
  '@melite/estate-drafts/remote': path.join(import.meta.dirname, 'packages/estate/drafts/lib/typert.remote-client.js'),
  '@melite/estate-drafts': path.join(import.meta.dirname, 'packages/estate/drafts/src/index.ts'),
  '@melite/estate-manage/remote': path.join(import.meta.dirname, 'packages/estate/manage/lib/typert.remote-client.js'),
  '@melite/estate-manage': path.join(import.meta.dirname, 'packages/estate/manage/src/index.ts'),
  // the media + runs REMOTE subpaths — the same built-truth law as
  // the drafts row above (the generated Typert clients; each MUST
  // sit BEFORE its parent row or the parent swallows the subpath).
  '@melite/estate-media/remote': path.join(import.meta.dirname, 'packages/estate/media/lib/typert.remote-client.js'),
  '@melite/estate-media': path.join(import.meta.dirname, 'packages/estate/media/src/index.ts'),
  '@melite/estate-runs/remote': path.join(import.meta.dirname, 'packages/estate/runs/lib/typert.remote-client.js'),
  '@melite/estate-runs': path.join(import.meta.dirname, 'packages/estate/runs/src/index.ts'),
  '@melite/infer-gallery': path.join(import.meta.dirname, 'packages/web/infer-gallery/src/index.ts'),
}

/** Resolve a repository-relative path from the root, for config-local alias groups. */
export function rootPath(p: string): string {
  return path.join(import.meta.dirname, p)
}

/**
 * Runtime-library anchors for the DSH npm packages the walls suites
 * exercise beside the estate remotes. These are external lib packages
 * (no src plane in this repository — DSH's own source-plane law covers
 * their workspace packages, not ours), so the anchor pins each name to
 * the exact copy the estate packages resolve: the drafts-anchored
 * cordis/storage/typert-protocol builds and the estate-queue-anchored
 * timer, keeping the suites' Cordis context on the same module instance
 * the remotes use. Specs then import bare names instead of reaching
 * through packages' private node_modules.
 */
const DRAFTS_DEPS = path.join(import.meta.dirname, 'packages/estate/drafts/node_modules/@deepseek-ai')
const QUEUE_DEPS = path.join(import.meta.dirname, 'packages/harness/estate-queue/node_modules/@deepseek-ai')

export const RUNTIME_LIB_ALIAS: Record<string, string> = {
  '@deepseek-ai/cordis': path.join(DRAFTS_DEPS, 'cordis/lib/index.js'),
  '@deepseek-ai/dsh-storage': path.join(DRAFTS_DEPS, 'dsh-storage/lib/index.js'),
  '@deepseek-ai/dsh-storage-json': path.join(DRAFTS_DEPS, 'dsh-storage-json/lib/index.js'),
  '@deepseek-ai/dsh-storage-domain': path.join(DRAFTS_DEPS, 'dsh-storage-domain/lib/index.js'),
  '@deepseek-ai/dsh-typert-protocol': path.join(DRAFTS_DEPS, 'dsh-typert-protocol/lib/index.js'),
  '@deepseek-ai/cordis-plugin-timer': path.join(QUEUE_DEPS, 'cordis-plugin-timer/lib/index.js'),
  // THE PHANTOM-KEY WALL's comparison primitive: the card-base-anchored
  // copy — the exact deepEqualJson own-key-count semantics the recipe
  // seam runs (card-base hosts the kit and the counting seam).
  '@deepseek-ai/dsh-util-values': path.join(import.meta.dirname, 'packages/web/card-base/node_modules/@deepseek-ai/dsh-util-values/lib/index.js'),
}

/**
 * The complete resolution facade every vitest config spreads: workspace
 * packages ride src — the GENERATED table (tools/facade-rows.json, from
 * `node tools/build-plane.mjs paths`, one truth with the tsconfig faces)
 * plus the hand law rows above (subpathOnly /client doors, remotes,
 * built-truth exceptions) — external DSH runtime libraries ride their
 * estate-anchored copies (RUNTIME_LIB_ALIAS). Keys are re-emitted
 * longest-first: rollup alias matches boundary-prefixes in iteration
 * order, so '@melite/estate-drafts/remote' must precede its parent or
 * the parent swallows the subpath.
 */
export function resolutionFacade(): Record<string, string> {
  const generated = JSON.parse(readFileSync(path.join(import.meta.dirname, 'tools/facade-rows.json'), 'utf8')) as Record<string, string[]>
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries(generated)) merged[k] = path.join(import.meta.dirname, v[0])
  Object.assign(merged, SOURCE_PLANE_ALIAS, RUNTIME_LIB_ALIAS)
  const ordered: Record<string, string> = {}
  for (const k of Object.keys(merged).sort((a, b) => b.length - a.length)) ordered[k] = merged[k]
  return ordered
}

/**
 * Load the gitignored root `.env` when present; any other failure surfaces.
 * The environment may already carry the variables.
 */
export function tryLoadEnvFile(): void {
  try {
    process.loadEnvFile(path.join(import.meta.dirname, '.env'))
  } catch {
    // No .env — fine, the environment may already carry the variables.
  }
}

/**
 * Read a positive-integer environment knob; unset or empty falls back, anything
 * non-positive is a misconfiguration that fails loud, not a silent no-op.
 * @param name - environment variable name.
 * @param fallback - value used when unset or empty.
 * @returns the parsed value or the fallback.
 */
export function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`)
  }
  return value
}
