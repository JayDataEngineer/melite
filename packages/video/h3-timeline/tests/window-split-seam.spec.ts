// @melite/video-h3-timeline — the window-split cut seam (§0.5, 2026-11-16).
// @contract cards-window-split-cut-seam
//
// THE INVARIANT: a split births exactly one new seam and that seam is
// a CUT — `transition:"cut"` on the right half. At the compose door a
// cut seam means overlap 0: NO MiniMaxH3FiniteLatentContinuation
// mounts on the right half; the halves join only at the film tail
// (MeliteConcatVideos). The old splice wrote a transition-less half —
// absent reads extend, the continuation mounted, and the "split"
// silently chained motion across a seam the operator never authored.
//
// JOURNEY: the doc is built through the REAL gesture (useCallMutations
// → addCallAt), serialized through the write channel (serializeCalls),
// composed through the real card door (def.compose over def.schema) —
// never a hand-typed calls array, so the wall fires at the hop where
// the burn is felt (the split's own write → run params → compose).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
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
import { useCallMutations } from "../src/ui/studio/useCallMutations.ts"
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

/** The split doc, built by the gesture the strip's split seat rides. */
function splitByGesture(): DocCall[] {
  const A: DocCall = { text: "a", start_frame: 0, end_frame: 56 }
  const B: DocCall = { text: "b", start_frame: 56, end_frame: 124 }
  const { result } = renderHook(() => {
    const [calls, setCalls] = useState<DocCall[]>([A, B])
    return { calls, ...useCallMutations(setCalls, 24) }
  })
  act(() => { result.current.addCallAt(24) })
  return result.current.calls
}

describe("THE SPLIT'S CUT SEAM (§0.5 — the halves never chain)", () => {
  it("the gesture-built split composes with ZERO continuation at the new seam", () => {
    const calls = splitByGesture()
    // the gesture really split (the arm judges a 3-window doc)
    assert.equal(calls.length, 3)
    assert.equal(calls[1]!.transition, "cut")
    const g = new GraphBuilder()
    def.compose(
      def.schema({ calls: serializeCalls(calls) }),
      model, g, "run_split_cut_seam",
    )
    const out = graphOf(g)
    // THE INVARIANT: the cut seam mounts NO drift-control continuation
    assert.equal(
      scoped(out, "window2_", "MiniMaxH3FiniteLatentContinuation").length, 0,
      "a split seam states cut — nothing carries across the halves",
    )
    // the third window's OWN seam (extend) still carries — the split
    // must not infect the seams it did not birth
    assert.equal(
      scoped(out, "window3_", "MiniMaxH3FiniteLatentContinuation").length, 1,
      "the untouched downstream seam keeps its drift-control carry",
    )
    // the halves still join — the film's tail concat owns the butt
    assert.ok(
      Object.values(out).some((n) => n.class_type === "MeliteConcatVideos"),
      "the film tail concatenation joins the windows",
    )
  })

  it("CONTROL (the compose door's own law): an authored cut composes chainless, an extend chains", () => {
    // a cut window authors 22+17k (90 here) — the same arithmetic the
    // split's right half lands
    const cut: DocCall[] = [
      { text: "a", start_frame: 0, end_frame: 56 },
      { text: "a", start_frame: 56, end_frame: 146, transition: "cut" },
    ]
    const g1 = new GraphBuilder()
    def.compose(def.schema({ calls: serializeCalls(cut) }), model, g1, "run_control_cut")
    assert.equal(scoped(graphOf(g1), "window2_", "MiniMaxH3FiniteLatentContinuation").length, 0)
    // the same span un-cut is off-grid for extend — the control rides
    // the legal carried spelling (17k authored)
    const extend: DocCall[] = [
      { text: "a", start_frame: 0, end_frame: 56 },
      { text: "a", start_frame: 56, end_frame: 124 },
    ]
    const g2 = new GraphBuilder()
    def.compose(def.schema({ calls: serializeCalls(extend) }), model, g2, "run_control_extend")
    assert.equal(scoped(graphOf(g2), "window2_", "MiniMaxH3FiniteLatentContinuation").length, 1)
  })
})
