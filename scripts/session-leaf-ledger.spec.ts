// THE SESSION LEAF LEDGER (§36.6's zstd tooling — 2026-09-24): the
// commission brief demands an ordered tool-call receipt and the raw
// session log is zstd-compressed with double-encoded invoke_tool
// arguments. The script walks it in ONE call: tool/call records in
// seq order, envelopes expanded to leaf rows, failures marked from
// tool/result records, digests capped at 160 chars.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = dirname(here)
const script = join(repo, 'scripts', 'session-leaf-ledger.mjs')

const zstdWrite = (path: string, lines: unknown[]): void => {
  const payload = lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
  // stdin pipe: no shell quoting games, the fixture is ours
  execFileSync('sh', ['-c', 'zstd -q -o "$1" -', 'zstd', path], { input: payload })
}

const call = (seq: number, callId: string, name: string, args: unknown): unknown => ({
  type: 'tool/call', seq, time: 1, data: { turn: 1, step: seq, callId, name, arguments: args },
})
const result = (callId: string, isError: boolean, text: string): unknown => ({
  type: 'tool/result', seq: 999, time: 2, data: { callId, isError, content: text },
})

describe('scripts/session-leaf-ledger.mjs — the one-call forensic sidecar', () => {
  test('expands invoke_tool envelopes to LEAF rows and counts them separately', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    try {
      const log = join(dir, 'session.v3.jsonl.zstd')
      // one native call, one invoke_tool envelope (double-encoded
      // arguments: the outer string wraps an inner JSON string)
      const inner = JSON.stringify({ name: 'melite_flow', arguments: JSON.stringify({ model: 'h3-timeline', seed: 42 }) })
      zstdWrite(log, [
        call(1, 'c1', 'read', { file_path: '/x', offset: 1, limit: 40 }),
        call(2, 'c2', 'invoke_tool', inner),
        result('c1', false, 'ok'),
      ])
      const out = join(dir, 'sidecar.txt')
      const stdout = execFileSync('node', [script, log, out]).toString('utf8')
      assert.match(stdout, /leaves: 2 · envelopes: 1/)
      const body = readFileSync(out, 'utf8')
      // the leaf row names the INNER tool, not invoke_tool
      assert.match(body, /2\. melite_flow {"model":"h3-timeline","seed":42}/)
      // the native row rides verbatim
      assert.match(body, /1\. read {"file_path":"\/x","offset":1,"limit":40}/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('a failed call marks its row with the error digest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    try {
      const log = join(dir, 'session.v3.jsonl.zstd')
      zstdWrite(log, [
        call(1, 'c1', 'bash', { command: 'ls /nope' }),
        result('c1', true, 'Error: invalid arguments: "offset" must be a number'),
      ])
      const out = join(dir, 'sidecar.txt')
      execFileSync('node', [script, log, out])
      const body = readFileSync(out, 'utf8')
      assert.match(body, /1\. bash {"command":"ls \/nope"}  ! Error: invalid arguments/)
      assert.match(body, /failures: 1/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('long argument values are DIGESTED (160 chars), never dumped whole', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    try {
      const log = join(dir, 'session.v3.jsonl.zstd')
      const big = 'x'.repeat(500)
      zstdWrite(log, [call(1, 'c1', 'write', { file_path: '/a', content: big })])
      const out = join(dir, 'sidecar.txt')
      execFileSync('node', [script, log, out])
      const body = readFileSync(out, 'utf8')
      assert.ok(!body.includes('x'.repeat(200)), 'the digest caps at 160')
      assert.match(body, /"content":"x{5,}/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
