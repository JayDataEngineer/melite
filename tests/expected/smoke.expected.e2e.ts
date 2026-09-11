/**
 * smoke.expected.e2e.ts — Owner-local expected output (DSH tier 4):
 * keyless assembled CLI/process expectations without a recorded-session
 * round trip. CI runs built exports; package/script expectations use
 * `test`, browser expectations use `test:web`.
 *
 * Verify the world, not the self-report: the assertion re-reads the
 * file externally (and would re-run the command); a keyword probe on
 * the agent's own output would let a cheating agent pass. The test owns
 * its resources: minted in the test, disposed in afterEach (even on
 * failure/retry/timeout).
 */
import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let roots: string[] = []

afterEach(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true })
  roots = []
})

describe('owner-local expected output (smoke)', () => {
  it('assembled estate-call error shape renders the expected text', async () => {
    const root = mkdtempSync(join(tmpdir(), 'expected-smoke-'))
    roots.push(root)
    // The assembled artifact: the GatewayError voice the tools serve.
    // Import through the source plane (unit-owned); the built-export
    // variant rides the same assertion via the dual-mode launcher.
    const { GatewayError } = await import('../../packages/harness/estate-call/src/estateCall.ts')
    const err = new GatewayError(422, 'bad field', 'runs/bad-envelope')
    const outPath = join(root, 'refusal.txt')
    writeFileSync(outPath, `gateway ${err.status}: ${err.named}\n`)
    // Re-read externally — the world, not the self-report.
    const back = readFileSync(outPath, 'utf8')
    assert.equal(back, 'gateway 422: runs/bad-envelope\n')
  })

  it('dual-mode launcher: lib mode runs built output under plain node', async () => {
    const { launchSync } = await import('../helpers/launch.ts')
    const r = launchSync('lib', {
      libEntry: 'tests/helpers/launch-probe.mjs',
      env: { MELITE_PROBE: 'expected' },
    })
    assert.equal(r.status, 0)
    assert.match(String(r.stdout ?? ''), /probe:expected/)
  })
})
