// @melite/video-h3-timeline — the third carry mode's own wall (§0.9).
// @contract cards-window-keyframe-carry
//
// THE INVARIANT: a 'carry+keyframe' seam is extend PLUS a pin — the
// drift-control continuation STILL mounts (the latent carries at the
// proven 22-frame overlap) AND the previous window's decoded FINAL
// FRAME is pinned as this window's first-frame guide: ImageFromBatch
// at the family's clamp index over the PREVIOUS window's decode,
// feeding an AddGuide at frame_idx 0 chained into this window's
// conditioning. More consistent shots, one derivation, no new chain.
//
// JOURNEY: the doc states the mode on the calls channel (the wire
// gate admits 'carry+keyframe'), the compose door derives t4r for
// the pin (an image guide rides the reference arm), the graph mounts
// the pin BESIDE the continuation — judged on the real card door,
// never a hand-typed stanza.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph"
import { loadCardDefs } from "@melite/comfyui-cordis"
import { loadFacts } from "@melite/comfyui-card-kit/facts"
import type { ModelFacts } from "@melite/comfyui-card-kit/facts"
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition"
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { LAST_FRAME_BATCH_INDEX } from "@melite/models-h3/timelineContract"
import { serializeCalls } from "../src/ui/studio/docCalls.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!
  assert.ok(def, "the composition root serves the h3-timeline card")
  model = facts.models["h3-timeline"]!
  assert.ok(model, "the h3-timeline family facts row serves")
})

type Node = { class_type: string; inputs: Record<string, unknown> }
const graphOf = (g: GraphBuilder): Record<string, Node> => g.toJSON() as Record<string, Node>
const scoped = (out: Record<string, Node>, scope: string, cls: string): [string, Node][] =>
  Object.entries(out).filter(([id, n]) => id.startsWith(scope) && n.class_type === cls)

/** The carried-spelling two-window doc; the second window states the
 *  third mode. 17k authored on window 2 (56→124), the legal carried
 *  span — the mode changes the SEAM, never the grid. */
const DOC = (): DocCall[] => [
  { text: "a", start_frame: 0, end_frame: 56 },
  { text: "b", start_frame: 56, end_frame: 124, transition: "carry+keyframe" },
]

const compose = (calls: DocCall[]): Record<string, Node> => {
  const g = new GraphBuilder()
  def.compose(def.schema({ calls: serializeCalls(calls) }), model, g, "run_kf_carry")
  return graphOf(g)
}

describe("THE THIRD CARRY MODE — carry+keyframe (§0.9)", () => {
  it("the seam pins the previous window's FINAL FRAME as this window's first-frame guide, BESIDE the latent carry", () => {
    const out = compose(DOC())
    // the wire gate carried the mode (a dropped value would compose
    // plain extend and the pin arm below would red)
    // 1. THE CARRY STILL RIDES: the continuation mounts (extend PLUS)
    assert.equal(scoped(out, "window2_", "MiniMaxH3FiniteLatentContinuation").length, 1,
      "the keyframe carry never replaces the latent carry — extend PLUS")
    // 2. THE PIN: the previous window's decode → ImageFromBatch at
    // the clamp index, length 1 (its FINAL row)
    const picks = scoped(out, "window2_", "ImageFromBatch")
    assert.equal(picks.length, 1, "exactly one final-frame pick serves the seam pin")
    const pick = picks[0]![1].inputs
    assert.equal(pick.batch_index, LAST_FRAME_BATCH_INDEX, "the pick rides the family's clamp index")
    assert.equal(pick.length, 1, "the pick takes one row — the final frame")
    // the pick reads the PREVIOUS window's decode (the cross-window
    // wire — a same-window pick would be a closed loop)
    const src = String(pick.image)
    assert.match(src, /^window1_/, `the pin's image source is the previous window's decode (${src})`)
    // 3. THE GUIDE: the picked frame lands at frame_idx 0 — this
    // window's FIRST frame
    const guides = scoped(out, "window2_", "MiniMaxH3AddGuide")
    assert.equal(guides.length, 1, "exactly one image guide serves the seam")
    assert.equal(guides[0]![1].inputs.frame_idx, 0, "the pin lands on this window's first frame")
    assert.equal(String(guides[0]![1].inputs.image).split(",")[0], picks[0]![0],
      "the guide pins the picked final frame")
  })

  it("CONTROL — the mode's siblings mount no pin: plain carry (extend) and stock (cut) stay pinless", () => {
    const carry = compose([
      { text: "a", start_frame: 0, end_frame: 56 },
      { text: "b", start_frame: 56, end_frame: 124 },
    ])
    assert.equal(scoped(carry, "window2_", "MiniMaxH3FiniteLatentContinuation").length, 1,
      "plain carry still chains")
    assert.equal(scoped(carry, "window2_", "ImageFromBatch").length, 0,
      "plain carry pins no final frame")
    const stock = compose([
      { text: "a", start_frame: 0, end_frame: 56 },
      { text: "b", start_frame: 56, end_frame: 146, transition: "cut" },
    ])
    assert.equal(scoped(stock, "window2_", "MiniMaxH3FiniteLatentContinuation").length, 0,
      "stock never chains")
    assert.equal(scoped(stock, "window2_", "ImageFromBatch").length, 0,
      "stock pins no final frame")
  })

  it("the wire round-trips the third mode (serialize, byte-stable)", () => {
    const rows = serializeCalls(DOC())
    assert.equal(rows[1]!.transition, "carry+keyframe",
      "the wire states the third mode verbatim")
  })
})
