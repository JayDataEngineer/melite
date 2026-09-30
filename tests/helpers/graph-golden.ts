// THE GRAPH GOLDEN (the kit-arm retirement, 2026-09-30): a family's
// declared action composes its own lane, and the kit arm it was
// ported from is deleted — so the wire is pinned to a COMMITTED
// golden, not to a live twin. A golden is the compatibility contract:
// the flat wire format stays byte-identical unless someone refreshes
// the file on purpose.
//
// The goldens were recorded while the twin still existed and the
// oracle still compared the two arms byte-for-byte; the proof
// transferred with the bytes, so a golden is the proven wire, not a
// snapshot of whatever the code happens to emit today.
//
// Refresh: DSH_SNAPSHOT=refresh node node_modules/vitest/vitest.mjs
// run <the family's action spec> — the same spelling the contract
// weld uses.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Compare a composed graph against its committed golden.
 *  @param path the golden's absolute path (the spec owns its layout)
 *  @param graph the serialized PromptGraph the action composed
 *  @param what the case name, named in the failure message */
export function assertGraphGolden(path: string, graph: unknown, what: string): void {
  const serialized = `${JSON.stringify(graph, null, 2)}\n`
  if (process.env.DSH_SNAPSHOT === 'refresh') {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, serialized)
    return
  }
  assert.ok(existsSync(path), `the golden ${path} is missing (record it: DSH_SNAPSHOT=refresh)`)
  assert.equal(
    serialized,
    readFileSync(path, 'utf8'),
    `the composed graph drifted from its golden (${what}) — the lane's wire is the contract; refresh deliberately with DSH_SNAPSHOT=refresh`,
  )
}
