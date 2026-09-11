// Multi-edit condensation (2026-08-12/13) — the PURE segmentation pass.
//
// Tracker: "show N img-edit calls at different angles as one visual block".
// 2026-08-13: the same condensation now covers the upscale pass ("we have a
// bunch of upscaling actions. They need to go under the chain card like the
// img edit one"). segmentFlow projects maximal consecutive runs of
// same-family stages (length ≥ 2) into ONE chain segment — view-layer only:
// the stages array, wiring, execution order and run status are untouched.
// What is proven here:
//   • maximal runs group, a non-matching stage BREAKS a run;
//   • a lone stage stays a single (no grouping at length 1);
//   • condensationKey is FAMILY-SCOPED — an edit run followed by an upscale
//     run is TWO chains (never one 17-member blob);
//   • the key covers BOTH stage service forms for BOTH families — the raw
//     YAML family ids ("edit_image" / "upscale_image", chain-loaded bricks)
//     and the catalog route keys ("qwen-img-edit-2511", "qwen-img-edit-2511-int8",
//     "pixel_upscale" / "seedvr2_ema" — agent/user-authored
//     cards);
//   • segmentId is stable and unique per segment;
//   • segments are pure projections — stage object identity is preserved.
import { describe, it, expect, vi } from "vitest"
import {
  segmentFlow,
  segmentId,
  isImageEditStage,
  condensationKey,
} from "@/surfaces/flow/multiEditGroup"
import type { CardStage } from "@melite/contracts"
// Deterministic catalog stub — the route-key branch of condensationKey
// (familyOf(service) → "qwen-img-edit-2511" / "seedvr2_upscale" / "pixel_upscale")
// must hold without loading the real catalog. The raw family-id branches
// ("edit_image" / "upscale_image") need no catalog at all.
vi.mock("@melite/catalog/modelCatalog", () => ({
  studioOf: vi.fn(() => undefined),
  familyOf: (key: string) =>
    key === "qwen-img-edit-2511" || key === "qwen-img-edit-2511-int8"
      ? "qwen-img-edit-2511"
      : key === "pixel_upscale"
        ? "pixel_upscale"
        : key === "seedvr2_ema"
          ? "seedvr2_upscale"
          : undefined,
}))

function makeStage(id: string, service: string, title = id): CardStage {
  return {
    id,
    title,
    kind: "generation",
    service,
    params: { prompt: "Turn the person in Picture 1 to match the angle shown in Picture 2" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
  }
}

/** The multi-angle pattern from character_cards.yaml — chain-loaded bricks
 *  carry the raw family id. */
const edit = (id: string) => makeStage(id, "edit_image", id)
/** Agent/user-authored cards carry the catalog route key. */
const route = (id: string) => makeStage(id, "qwen-img-edit-2511-int8", id)
/** The Nomos upscale pass — raw family id (chain-loaded bricks). */
const up = (id: string) => makeStage(id, "upscale_image", id)
/** Agent/user-authored upscale cards carry the model route key. */
const upRoute = (id: string) => makeStage(id, "pixel_upscale", id)
const other = (id: string) => makeStage(id, "krea-2", id)

describe("segmentFlow — the condensation projection (2026-08-12)", () => {
  it("groups a maximal run of ≥2 consecutive edit stages into ONE chain", () => {
    const stages = [edit("Back"), edit("Left"), edit("Right"), edit("Front-right"), edit("Back-right")]
    const segs = segmentFlow(stages, isImageEditStage)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("chain")
    expect((segs[0] as unknown as { stages: CardStage[] }).stages.map((s) => s.id)).toEqual(
      ["Back", "Left", "Right", "Front-right", "Back-right"],
    )
  })

  it("a lone edit stage stays a single — no grouping at length 1", () => {
    const stages = [edit("Only")]
    const segs = segmentFlow(stages, isImageEditStage)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("single")
  })

  it("a non-edit stage BREAKS the run — two chains around the gap, the gap passes through", () => {
    const stages = [edit("a"), edit("b"), other("krea"), edit("c"), edit("d"), edit("e")]
    const segs = segmentFlow(stages, isImageEditStage)
    expect(segs.map(segmentId)).toEqual(["chain:a|b", "krea", "chain:c|d|e"])
    const chains = segs.filter((s) => s.kind === "chain")
    expect(chains).toHaveLength(2)
    const single = segs.find((s) => s.kind === "single") as unknown as { stage: CardStage }
    expect(single.stage.id).toBe("krea")
  })

  it("mix of both stage forms groups together (chain-loaded + authored cards)", () => {
    const stages = [route("r1"), edit("e1"), route("r2")]
    const segs = segmentFlow(stages, isImageEditStage)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("chain")
    expect((segs[0] as unknown as { stages: CardStage[] }).stages.map((s) => s.id)).toEqual(["r1", "e1", "r2"])
  })

  it("chain member order = source order; stage identity is preserved (pure projection)", () => {
    const stages = [edit("a"), other("krea"), edit("b"), edit("c")]
    const chain = segmentFlow(stages, isImageEditStage).find((s) => s.kind === "chain")!
    const members = (chain as unknown as { stages: CardStage[] }).stages
    expect(members[0]).toBe(stages[2])
    expect(members[1]).toBe(stages[3])
    // No new stage objects anywhere in the projection.
    const all = [
      ...segmentFlow(stages, isImageEditStage).flatMap((s) =>
        s.kind === "chain" ? s.stages : [s.stage]),
    ]
    expect(all).toEqual(stages)
  })
})

describe("segmentId — stable, unique per segment (2026-08-12)", () => {
  it("singles id by stage id; chains by the 'chain:'-joined member ids", () => {
    const stages = [edit("a"), edit("b"), other("krea"), edit("c"), edit("d")]
    const segs = segmentFlow(stages, isImageEditStage)
    expect(segmentId(segs[0])).toBe("chain:a|b")
    expect(segmentId(segs[1])).toBe("krea")
    expect(segmentId(segs[2])).toBe("chain:c|d")
    // Deterministic: same input → same ids.
    expect(segmentFlow(stages, isImageEditStage).map(segmentId)).toEqual(
      ["chain:a|b", "krea", "chain:c|d"],
    )
    // Two distinct chains never collide (the | join is unambiguous).
    const ids = new Set(segmentFlow(stages, isImageEditStage).map(segmentId))
    expect(ids.size).toBe(3)
  })
})

describe("isImageEditStage — both stage service forms (2026-08-12)", () => {
  it("raw YAML family id 'edit_image' is an edit stage (chain-loaded bricks)", () => {
    expect(isImageEditStage(edit("x"))).toBe(true)
  })

  it("catalog route keys resolve through familyOf — 'qwen-img-edit-2511-int8' is an edit stage", () => {
    expect(isImageEditStage(route("x"))).toBe(true)
  })

  it("non-edit services are not edit stages", () => {
    expect(isImageEditStage(other("x"))).toBe(false)
  })
})

describe("condensationKey — family-scoped (2026-08-13)", () => {
  it("raw family ids map to their canonical keys — edit_image + upscale_image", () => {
    expect(condensationKey(edit("x"))).toBe("qwen-img-edit-2511")
    expect(condensationKey(up("x"))).toBe("upscale")
  })

  it("catalog route keys resolve through familyOf for BOTH families", () => {
    expect(condensationKey(route("x"))).toBe("qwen-img-edit-2511")
    expect(condensationKey(upRoute("x"))).toBe("upscale")
    // seedvr2 route keys (the diffusion upscaler) land in the SAME key as
    // pixel Nomos — a mixed upscale run still condenses.
    expect(condensationKey(makeStage("s", "seedvr2_ema"))).toBe("upscale")
  })

  it("non-condensable services are null", () => {
    expect(condensationKey(other("x"))).toBe(null)
  })
})

describe("segmentFlow with condensationKey — the user scenario (2026-08-13)", () => {
  it("an edit pass followed by an upscale pass is TWO chains, never one blob", () => {
    // character_cards.yaml GROUP C (edit ×8) + GROUP D (upscale ×9) —
    // adjacent in the stage array. A combined boolean predicate would merge
    // all 17 into ONE chain; the family-scoped key keeps them apart.
    const stages = [
      edit("a"), edit("b"), edit("c"), edit("d"),
      edit("e"), edit("f"), edit("g"), edit("h"),
      up("i"), up("j"), up("k"), up("l"),
      up("m"), up("n"), up("o"), up("p"), up("q"),
    ]
    const segs = segmentFlow(stages, condensationKey)
    expect(segs).toHaveLength(2)
    expect(segs.map(segmentId)).toEqual([
      "chain:a|b|c|d|e|f|g|h",
      "chain:i|j|k|l|m|n|o|p|q",
    ])
    expect(segs.every((s) => s.kind === "chain")).toBe(true)
  })

  it("a lone upscale stage stays a single — no grouping at length 1", () => {
    const segs = segmentFlow([up("Only")], condensationKey)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("single")
  })

  it("a non-condensable stage BREAKS an upscale run — chains around the gap", () => {
    const stages = [up("a"), up("b"), other("krea"), up("c"), up("d")]
    const segs = segmentFlow(stages, condensationKey)
    expect(segs.map(segmentId)).toEqual(["chain:a|b", "krea", "chain:c|d"])
  })

  it("mixed upscale stage forms group together (chain-loaded + authored cards)", () => {
    const stages = [up("a"), upRoute("r1"), up("b")]
    const segs = segmentFlow(stages, condensationKey)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("chain")
    expect((segs[0] as unknown as { stages: CardStage[] }).stages.map((s) => s.id)).toEqual(
      ["a", "r1", "b"],
    )
  })
})
