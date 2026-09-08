/**
 * Anchor GPU/artifact output to THE generated-state root: datafolder/outputs/test/.
 *
 * Real-GPU e2e tests write screenshots and media here (data/README.md is
 * the map). These paths were historically resolved from process.cwd(),
 * which dumped junk at whatever directory Playwright was invoked from.
 * Resolve from the module's own directory instead so output always lands
 * in datafolder/outputs/test/editor-e2e/ regardless of the working directory.
 *
 * ESM note: this package is "type": "module", so Playwright transpiles the
 * specs to ESM and __dirname does NOT exist (ReferenceError at call time —
 * the 2026-08-08 live run). import.meta.url is the ESM-correct anchor.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Absolute path under datafolder/outputs/test/editor-e2e (created on first use). */
export function artifactRoot(...parts: string[]): string {
  // FIVE ups to the REPO root (helpers/ is one deeper than the config —
  // four landed in packages/, the misplaced-litter bug swept 2026-09-04).
  const dir = path.join(HERE, '..', '..', '..', '..', '..', 'data', 'test-output', 'editor-e2e', ...parts)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
