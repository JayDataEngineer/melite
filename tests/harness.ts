/**
 * tests/harness.ts — shared fixtures for every tier (DSH testing.md:
 * "shared fixtures live in a plain tests/harness.ts, never another
 * *.e2e.ts (importing a spec re-registers its describe and duplicates
 * real API calls)").
 *
 * Own each acquired resource through its teardown: every helper that
 * mints a temp dir / env overlay returns a disposer, and callers run
 * it in afterEach (even on failure/retry/timeout).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface Sandbox {
  /** Fresh temp state root (MELITE_STATE_ROOT). */
  root: string
  /** Restore ambient env + remove the temp root. */
  dispose: () => void
}

/** Mint a fresh sandbox: temp MELITE_STATE_ROOT, stripped ambient
 * estate env, hermetic engine pin. Never touches the real tree, the
 * live engine, or PROD :3080. */
export function mintSandbox(prefix = 'melite-test-'): Sandbox {
  const root = mkdtempSync(join(tmpdir(), prefix))
  const savedStateRoot = process.env.MELITE_STATE_ROOT
  const savedRepoRoot = process.env.MELITE_REPO_ROOT
  process.env.MELITE_STATE_ROOT = root
  delete process.env.MELITE_REPO_ROOT
  process.env.INFERENCE_TEST_SANDBOX = '1'
  let disposed = false
  return {
    root,
    dispose(): void {
      if (disposed) return
      disposed = true
      if (savedStateRoot === undefined) delete process.env.MELITE_STATE_ROOT
      else process.env.MELITE_STATE_ROOT = savedStateRoot
      if (savedRepoRoot === undefined) delete process.env.MELITE_REPO_ROOT
      else process.env.MELITE_REPO_ROOT = savedRepoRoot
      delete process.env.INFERENCE_TEST_SANDBOX
      rmSync(root, { recursive: true, force: true })
    },
  }
}

/** Skip helper for with-key suites: returns true when the suite must
 * self-skip (no key), so keyless CI stays green. Self-skip is not a
 * cost signal — with-key runs prove the agent works against a real
 * model; no-key runs prove plumbing only. */
export function missingKey(name: string): boolean {
  const v = process.env[name]
  return v === undefined || v === ''
}
