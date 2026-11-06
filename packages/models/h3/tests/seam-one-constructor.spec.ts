// @melite/models-h3 — THE ONE-CONSTRUCTOR SEAM (the timeline
// rework's stage 1, 2026-11-15; operator order: "do the rework of
// the timeline mods according to your judgment"). Before the
// rework, FOUR seats hand-rolled the same source→nested-AV pair —
// swap, repair, extend (inline in their chain bodies) and refine
// (its joint AV target) — four copies of
// MiniMaxH3FantasticVideoEditLatent (grow 0, the plane's VAEs,
// mask over frames) → MiniMaxH3ContexMaskedTarget (white =
// generate, the keepAudio dial's audio_mode, H3 exact conversion)
// differing only in mask source, keepAudio, and upstream reference
// seats. The rework's cure: the pair is spelled ONCE
// (`contexMaskedTarget` in chainEdit.ts) and every rider routes
// through it — the stage-2 video-edit bag composes there too,
// never beside it. THE EMISSIONS DID NOT MOVE: the 366-test h3
// suite and the 1224-test h3-timeline card suite pin the graphs
// byte-stable across the rewiring (the suites are the proof); this
// wall pins the STRUCTURE — a hand-rolled pair regrowing beside
// the constructor is the old disease (the audits' "one mechanism,
// seven names" root) firing red the moment it appears.
// No @contract marker: package-local law, prose header (the
// registry row owns the seam law, models tier).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { contexMaskedTarget } from "../src/chainEdit.js";
import { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { GraphBuilder } from "@melite/comfyui-card-kit/graph";

const SRC_DIR = join(import.meta.dirname, "..", "src")

/** Comment-stripped source: comments may NAME the nodes (this
 * header does); only CODE is judged — the house pattern
 * (studio-no-mirrors). */
const codeOf = (file: string): string =>
  readFileSync(join(SRC_DIR, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

const SRC_FILES = readdirSync(SRC_DIR).filter((f) => f.endsWith(".ts"))

/** A recording graph stub: every g.node call lands in the tape with
 * its type and full seat values, and its .out(slot) hands back a
 * REAL OutputHandle — the dial law asserts real seats and real
 * wires, never re-derived literals. */
type TapeRow = { type: string; seats: Record<string, unknown> }
const tape: TapeRow[] = []
let nextNodeId = 0
const stubBuilder = {
  node: (type: string, seats: Record<string, unknown>) => {
    const nodeId = `stub-${String(nextNodeId++)}`
    tape.push({ type, seats })
    return { out: (slot: number) => new OutputHandle(nodeId, slot) }
  },
} as unknown as GraphBuilder

describe("the source→nested-AV pair is spelled once and every rider routes through it (stage 1)", () => {
  it("the node literals live in chainEdit.ts ALONE — a hand-rolled pair beside the constructor reds", () => {
    const offenders: string[] = []
    for (const f of SRC_FILES) {
      const code = codeOf(f)
      const pairSpelled =
        code.includes("'MiniMaxH3FantasticVideoEditLatent'") ||
        code.includes("'MiniMaxH3ContexMaskedTarget'")
      if (pairSpelled && f !== "chainEdit.ts") offenders.push(f)
    }
    assert.deepEqual(
      offenders,
      [],
      `the edit+target pair regrew outside the one constructor: ${offenders.join(", ")} — route the seat through contexMaskedTarget (chainEdit.ts), never hand-roll the pair beside it`,
    )
  })

  it("chainEdit.ts spells each node exactly once — the constructor is the single spelling", () => {
    const code = codeOf("chainEdit.ts")
    assert.equal(
      (code.match(/'MiniMaxH3FantasticVideoEditLatent'/g) ?? []).length,
      1,
      "the edit node is spelled more than once in the constructor's own file",
    )
    assert.equal(
      (code.match(/'MiniMaxH3ContexMaskedTarget'/g) ?? []).length,
      1,
      "the target node is spelled more than once in the constructor's own file",
    )
  })

  it("the rider census is exactly {edit, swap, repair, extend, refine} — a seat leaving the seam reds", () => {
    const riders = SRC_FILES.filter((f) => {
      const code = codeOf(f)
      // the definition itself (`export const contexMaskedTarget =`)
      // is not a call — only call-shaped uses count.
      const calls = code.match(/(?<!export const )contexMaskedTarget\(/g) ?? []
      return f !== "chainEdit.ts" && calls.length > 0
    }).sort()
    assert.deepEqual(
      riders,
      ["edit.ts", "extend.ts", "refine.ts", "repair.ts", "swap.ts"],
      "a masked-edit seat stopped routing through the one constructor (or a new rider arrived without joining the census) — every source→nested-AV target composes at contexMaskedTarget",
    )
  })

  it("the constructor's own dial law fires on its own path — keepAudio spells both audio seats", () => {
    tape.length = 0
    nextNodeId = 0
    const mask = new OutputHandle("stub-mask", 0)
    const target = contexMaskedTarget(
      stubBuilder,
      { vaeVideo: new OutputHandle("stub-vaeV", 0), vaeAudio: new OutputHandle("stub-vaeA", 0) },
      { frames: new OutputHandle("stub-frames", 0), audio: new OutputHandle("stub-audio", 0), mask, keepAudio: true },
    )
    assert.equal(tape.length, 2, "the constructor emits exactly the edit+target pair, nothing more")
    const [edit, tgt] = tape
    assert.equal(edit.type, "MiniMaxH3FantasticVideoEditLatent")
    assert.equal(edit.seats.grow, 0, "grow stays pinned 0 — the pair never grows the canvas")
    assert.equal(edit.seats.megapixels, 0, "megapixels stays pinned 0")
    assert.equal(edit.seats.keep_audio, true)
    assert.equal(edit.seats.mask, mask, "the caller's mask rides the edit seat")
    assert.equal(tgt.type, "MiniMaxH3ContexMaskedTarget")
    assert.equal(tgt.seats.mask_meaning, "white = generate")
    assert.equal(tgt.seats.audio_mode, "preserve source audio")
    assert.equal(tgt.seats.mask_conversion, "H3 exact (causal/token max)")
    assert.equal(tgt.seats.mask, mask, "the same mask rides the target seat — one mask, both seats")
    assert.deepEqual(
      [target.nodeId, target.slotIndex],
      ["stub-1", 0],
      "the constructor returns the TARGET latent",
    )
    // the false dial: generated audio spells both seats
    tape.length = 0
    nextNodeId = 0
    contexMaskedTarget(
      stubBuilder,
      { vaeVideo: new OutputHandle("stub-vaeV", 0), vaeAudio: new OutputHandle("stub-vaeA", 0) },
      { frames: new OutputHandle("stub-frames", 0), audio: new OutputHandle("stub-audio", 0), mask, keepAudio: false },
    )
    const [edit2, tgt2] = tape
    assert.equal(edit2.seats.keep_audio, false)
    assert.equal(tgt2.seats.audio_mode, "generate all audio")
  })
})
