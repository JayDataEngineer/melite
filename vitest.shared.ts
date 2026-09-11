import { createRequire } from 'node:module'
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

/** The proxy-scrubbing setup file every config declares; exported so the wiring test names it once. */
export const PROXY_SETUP = './scripts/test-proxy-environment.ts'

/**
 * Source-plane resolution facade: the workspace packages whose `exports`/mains point at built
 * lib/ resolve to src in every vitest config, so tests never load a second (stale) copy of a
 * module singleton. Kit packages already point mains at src; these five do not. The alias
 * table is the same mechanism as DSH's tsconfig-paths facade (one table, spread everywhere);
 * migrate to vite-tsconfig-paths when the pnpm store unlocks.
 */
export const SOURCE_PLANE_ALIAS: Record<string, string> = {
  '@melite-plugin/dsh-tools': path.join(import.meta.dirname, 'packages/harness/melite-tools/src/index.ts'),
  '@melite/estate-drafts': path.join(import.meta.dirname, 'packages/estate/drafts/src/index.ts'),
  '@melite/estate-manage': path.join(import.meta.dirname, 'packages/estate/manage/src/index.ts'),
  '@melite/estate-media': path.join(import.meta.dirname, 'packages/estate/media/src/index.ts'),
  '@melite/estate-runs': path.join(import.meta.dirname, 'packages/estate/runs/src/index.ts'),
}

/** Resolve a repository-relative path from the root, for config-local alias groups. */
export function rootPath(p: string): string {
  return path.join(import.meta.dirname, p)
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
