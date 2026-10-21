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
//
// THE WIRING GATE (SD-6, the purge audit's hop-5 bypass): the goldens
// drove instantiateAction DIRECTLY — the byte compare judged shape,
// never keys, so a typo'd NEW input key rode the driver past every
// gate (and a refresh would have recorded it). The estate's own
// wiring wall now judges every driven graph FIRST, in both compare
// and refresh mode: the card is derived from the family path, the
// roster from the recorded engine build (tests/walls/fixtures/
// object_info.boot.json) through the same deriveWiringDoc the live
// compose door reads — one truth, every driver.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { deriveWiringDoc } from '../../packages/engines/comfyui-cordis/src/wiringWall.ts'
import { ComposeRefusal } from '../../packages/engines/comfyui-card-kit/src/errors.ts'
import { assertWiringProvisioned, type WiringCensus } from './provisioner-law.ts'
import type { WiringInputSpec } from '../../packages/engines/comfyui-cordis/src/wiringWall.ts'

/** The recorded engine build's wiring census, read once per process
 *  (the same tracked boot fixture the liveness wall's key judge
 *  unions over). */
let goldenWiring: WiringCensus | null = null
function wiringCensus(): WiringCensus {
  if (goldenWiring === null) {
    goldenWiring = deriveWiringDoc(
      JSON.parse(readFileSync(join(import.meta.dirname, '..', 'walls', 'fixtures', 'object_info.boot.json'), 'utf8')) as Record<string, unknown>,
    )
  }
  return goldenWiring
}

/** Compare a composed graph against its committed golden.
 *  @param path the golden's absolute path (the spec owns its layout;
 *    the wiring gate derives the card id from its models family)
 *  @param graph the serialized PromptGraph the action composed
 *  @param what the case name, named in the failure message */
export function assertGraphGolden(path: string, graph: unknown, what: string): void {
  // THE GATE (SD-6): the wire answers to the estate's wiring wall
  // before any byte moves — a refusal here is the same refusal the
  // live compose door would raise, at the same judge.
  const family = /[/\\]models[/\\]([^/\\]+)[/\\]/.exec(path)?.[1]
  if (family === undefined) {
    throw new ComposeRefusal('malformed-graph',
      `the golden ${path} names no models family — the golden driver's wiring gate derives the card from the family path`)
  }
  const census = wiringCensus()
  // THE PROVISIONER LAW rides here too (one home, two runners): a
  // DECL-declared filename the folder enum lacks is neutralized in
  // the judgment copy — the golden bytes still pin the DECL spell,
  // and every other node, edge, and value is still judged.
  assertWiringProvisioned(census, family, graph)
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
