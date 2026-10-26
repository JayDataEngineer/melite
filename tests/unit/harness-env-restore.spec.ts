// @contract infra-harness-env-restore
/**
 * harness-env-restore.spec.ts — the sandbox mint's env capture law
 * (the flake-and-typed-seam audit's A1.3 residue, cured 2026-11-12):
 * mintSandbox's dispose RESTORES every environment seam it touched —
 * including INFERENCE_TEST_SANDBOX, which rode delete-only and
 * destroyed a machine-set gate (an operator sandboxing the whole
 * suite run) on the first dispose. The seam's two siblings
 * (MELITE_REPO_ROOT, COMFYUI_ENDPOINT_CONFIG) always rode capture;
 * the gate joins them.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mintSandbox } from '../harness.ts'

const KEYS = ['INFERENCE_TEST_SANDBOX', 'MELITE_REPO_ROOT', 'COMFYUI_ENDPOINT_CONFIG'] as const

afterEach(() => {
  for (const k of KEYS) delete process.env[k]
})

describe('mintSandbox disposes every env seam it touched (A1.3)', () => {
  it('a machine-set sandbox gate SURVIVES a mint+dispose — restored verbatim', () => {
    process.env.INFERENCE_TEST_SANDBOX = 'operator-set'
    const box = mintSandbox('env-restore-')
    expect(process.env.INFERENCE_TEST_SANDBOX).toBe('1')
    box.dispose()
    expect(process.env.INFERENCE_TEST_SANDBOX).toBe('operator-set')
  })

  it('an unset gate STAYS unset after dispose (never a leak in the other direction)', () => {
    delete process.env.INFERENCE_TEST_SANDBOX
    const box = mintSandbox('env-restore-')
    expect(process.env.INFERENCE_TEST_SANDBOX).toBe('1')
    box.dispose()
    expect(process.env.INFERENCE_TEST_SANDBOX).toBeUndefined()
  })

  it('the twin law holds for the two captured siblings (the pattern the gate joined)', () => {
    process.env.MELITE_REPO_ROOT = '/machine/root'
    process.env.COMFYUI_ENDPOINT_CONFIG = '/machine/endpoint.json'
    const box = mintSandbox('env-restore-')
    expect(process.env.MELITE_REPO_ROOT).toBeUndefined()
    box.dispose()
    expect(process.env.MELITE_REPO_ROOT).toBe('/machine/root')
    expect(process.env.COMFYUI_ENDPOINT_CONFIG).toBe('/machine/endpoint.json')
  })
})
