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
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface Sandbox {
  /** Fresh temp state root (named per-seat as config call data —
   *  the MELITE_STATE_ROOT env seam is retired, J12). */
  root: string
  /** Restore ambient env + remove the temp root. */
  dispose: () => void
}

/** Mint a fresh sandbox: a fresh temp root (named per-seat as
 * config call data — the retired env seam never carries it, J12),
 * stripped ambient estate env, hermetic engine pin. Never touches
 * the real tree, the live engine, or PROD :3080.
 *
 * The engine pin is REAL, not ambient: the sandbox gate
 * (INFERENCE_TEST_SANDBOX) refuses implicit repo-config reads, so
 * the pin must be explicit — a temp endpoint config naming the
 * engine the suite drives (MELITE_E2E_COMFYUI_HOST/PORT, defaults
 * 127.0.0.1:8188 — the same seam the specs probe for liveness).
 * Compose arms resolve a real endpoint; nothing leaks in from the
 * machine's own config. */
export function mintSandbox(prefix = 'melite-test-'): Sandbox {
  const root = mkdtempSync(join(tmpdir(), prefix))
  const savedRepoRoot = process.env.MELITE_REPO_ROOT
  const savedEndpointConfig = process.env.COMFYUI_ENDPOINT_CONFIG
  // A1.3 residue (the flake-and-typed-seam audit, cured 2026-11-12):
  // the sandbox gate rode delete-only in dispose — a machine-set gate
  // (an operator sandboxing the whole suite run) was destroyed by the
  // FIRST dispose. Captured like its two siblings now.
  const savedSandboxGate = process.env.INFERENCE_TEST_SANDBOX
  const host = process.env.MELITE_E2E_COMFYUI_HOST ?? '127.0.0.1'
  const port = process.env.MELITE_E2E_COMFYUI_PORT ?? '8188'
  const endpointConfig = join(root, 'endpoint.json')
  writeFileSync(endpointConfig, JSON.stringify({ url: `http://${host}:${port}` }) + '\n')
  delete process.env.MELITE_REPO_ROOT
  process.env.COMFYUI_ENDPOINT_CONFIG = endpointConfig
  process.env.INFERENCE_TEST_SANDBOX = '1'
  let disposed = false
  return {
    root,
    dispose(): void {
      if (disposed) return
      disposed = true
      if (savedRepoRoot === undefined) delete process.env.MELITE_REPO_ROOT
      else process.env.MELITE_REPO_ROOT = savedRepoRoot
      if (savedEndpointConfig === undefined) delete process.env.COMFYUI_ENDPOINT_CONFIG
      else process.env.COMFYUI_ENDPOINT_CONFIG = savedEndpointConfig
      if (savedSandboxGate === undefined) delete process.env.INFERENCE_TEST_SANDBOX
      else process.env.INFERENCE_TEST_SANDBOX = savedSandboxGate
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
