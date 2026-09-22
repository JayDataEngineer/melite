/**
 * headless-resume.spec.ts — repository script spec (DSH tier 1 covers
 * scripts/**.spec.ts): the quota-stop wrapper wall (roadmap §25).
 * The wrapper's classifier is proven against stub dsh binaries (node
 * one-liners — the wrapper invokes via node, as the recipe does):
 * quota-death exits 75 WITH a resume token; success exits 0; any
 * other failure passes through loud with NO token. Hermetic and
 * instant (no dsh, no network, no engine).
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'scripts', 'headless-resume.sh')

const STUBS: Record<string, { code: number, out: string, err: string }> = {
  quota: { code: 1, out: 'my last words\n', err: 'quota 429 RESOURCE_EXHAUSTED reset 2026-09-23 08:26:21\ntool melite_discover\n' },
  ok: { code: 0, out: 'ok\n', err: '' },
  boom: { code: 2, out: '', err: 'engine exploded\n' },
}

function stage(name: 'quota' | 'ok' | 'boom'): { dir: string, stub: string, brief: string, prefix: string } {
  const dir = mkdtempSync(join(tmpdir(), 'hr-spec-'))
  const s = STUBS[name]!
  const stub = join(dir, 'stub.js')
  writeFileSync(stub,
    'process.stdout.write(' + JSON.stringify(s.out) + ');'
    + 'process.stderr.write(' + JSON.stringify(s.err) + ');'
    + 'process.exit(' + String(s.code) + ');\n')
  const brief = join(dir, 'brief.md')
  writeFileSync(brief, 'make a film\n')
  return { dir, stub, brief, prefix: join(dir, 'chat') }
}

function run(stub: string, brief: string, prefix: string): number {
  try {
    execFileSync('bash', [SCRIPT, brief, prefix, '60'], {
      env: { ...process.env, HEADLESS_DSH_BIN: stub },
      timeout: 25_000,
      stdio: 'pipe',
    })
    return 0
  } catch (e) {
    assert.ok(e !== null && typeof e === 'object' && 'status' in e, 'an exec failure, got ' + String(e))
    return (e as { status: number | null }).status ?? -1
  }
}

describe('headless-resume.sh — the quota-stop wrapper (§25)', () => {
  it('quota-death exits 75 with a token naming brief, transcript, reset, and resume', () => {
    const { stub, brief, prefix } = stage('quota')
    assert.equal(run(stub, brief, prefix), 75)
    const token = join(prefix + '-resume.token.md')
    assert.ok(existsSync(token), 'the resume token exists')
    const body = readFileSync(token, 'utf8')
    assert.ok(body.includes('- brief: ' + brief), body)
    assert.ok(body.includes('1 tool-call lines'), body)
    assert.ok(body.includes('reset 2026-09-23 08:26:21'), body)
    assert.ok(body.includes('my last words'), body)
    assert.ok(body.includes('Re-invoke this same script'), body)
  }, 30_000)

  it('success exits 0 with no token', () => {
    const { stub, brief, prefix } = stage('ok')
    assert.equal(run(stub, brief, prefix), 0)
    assert.equal(existsSync(prefix + '-resume.token.md'), false)
    assert.equal(readFileSync(prefix + '-out.txt', 'utf8'), 'ok\n')
  }, 30_000)

  it('a non-quota failure passes through loud with no token', () => {
    const { stub, brief, prefix } = stage('boom')
    assert.equal(run(stub, brief, prefix), 2)
    assert.equal(existsSync(prefix + '-resume.token.md'), false)
  }, 30_000)
})
