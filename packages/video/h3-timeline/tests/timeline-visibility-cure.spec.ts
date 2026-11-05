// @contract cards-timeline-visibility-cure
//
// THE TIMELINE VISIBILITY WALL (the operator's oldest burn, 2026-11-13:
// "When the AI makes the video timeline card, the parameters it chooses
// IS NOT VISIBLE TO THE UI TIMELINE CARD"). One truth, judged at the
// hops the burn crosses (THE JOURNEY LAW): the agent authors through
// the REAL tool door (melite_construct add_stage) over the REAL bench
// write door (drafts BenchRemoteService, no engine, no live hosts —
// the bench-floor-atomicity rig precedent), the row is read as the
// cards tab serves it (bench/get → row.params), and the studio's OWN
// projection (projectDoc — useShownDoc's hydration input) is diffed
// against the authored bag field for field.
//
// Arms:
//   1. THE TOOL-DOOR FIELDS — calls (text/span/knob/refs), fps, steps,
//      loras survive author → stored → projected verbatim (the burn's
//      minimum: a call's text/span, a knob, fps, lora).
//   2. THE ANCHOR SEAT (the cure) — the doc-level anchor shorthand the
//      compose reads (`p.image ?? p.image_name ?? p.ref_image`) lands
//      VISIBLE on the keyframes lane as the frame-0 pin it already is;
//      toggling the projection cure out reds this arm verbatim.
//   3. ONE SEAT, COMPOSE PRECEDENCE — a frame-0 pin overrides the
//      anchor exactly as the compose's lift does (keyframes[0].image
//      overwrites p.image); the lane never shows a seat the compose
//      would not seat.
//   4. THE UNION'S PRECEDENCE — image > image_name > ref_image, the
//      compose's own admission order over the three guide spellings.
//   5. ROUND-TRIP STABILITY — hydrate∘serialize∘hydrate of the shown
//      lane is the shown lane: the projection adds no state a studio
//      gesture would not materialize identically.
//   6. THE REST OF THE LANE — ref_images/ref_videos/ref_audios and a
//      correctly-shaped audio_clips row surface in Layer A (the
//      authored-bag regression class this wall exists for).
import "../../../../tests/helpers/boot-models.ts"
import { describe, test } from "vitest"
import assert from "node:assert/strict"
import { bootCtx } from "../../../estate/drafts/tests/bench-helpers.ts"
import { BenchRemoteService } from "../../../estate/drafts/src/remote.ts"
import { meliteConstruct } from "../../../harness/melite-tools/src/tools/melite-construct.ts"
import type { Estate } from "../../../harness/melite-tools/src/estate.ts"
import { projectDoc } from "../src/ui/studio/pendingOps.ts"
import { hydrateKeyframes, serializeKeyframes } from "../src/ui/studio/docCalls.ts"
import { h3DefaultLoraEntry } from "@melite/models-h3"

const SESSION = "vis-wall"
const sig: AbortSignal = new AbortController().signal
const exec = { signal: sig } as never

/** The estate face over the in-process bench service — the REAL write
 *  door. runsValidate answers ok so the tool's pre-mint gate lets the
 *  write land (the live estate's add lands the same way; the compose
 *  judge is not the plane this wall judges). */
function estateOver(svc: BenchRemoteService): Estate {
  return {
    benchGet: (session: string, signal: AbortSignal) => svc.get(session, signal),
    benchEnsure: (doc: Record<string, unknown>, signal: AbortSignal) => svc.ensure(doc as never, signal),
    benchVerb: (session: string, verb: string, doc: Record<string, unknown>, signal: AbortSignal) => {
      if (verb === "add_stage") return svc.addStage(session, doc as never, signal)
      throw new Error("benchVerb " + verb + " is not seated in this rig")
    },
    runsValidate: () => Promise.resolve({ ok: true }),
  } as unknown as Estate
}

/** Author one h3-timeline stage through the REAL tool door and return
 *  the stored row's params (the doc the cards tab serves). */
async function authoredParams(extra: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { ctx } = await bootCtx()
  const svc = new BenchRemoteService(ctx)
  const tool = meliteConstruct(estateOver(svc))
  const answer = await tool.execute(
    {
      verb: "add_stage",
      bench: SESSION,
      card: "h3-timeline",
      params: {
        fps: 24,
        steps: 30,
        loras: [h3DefaultLoraEntry()],
        calls: [
          {
            text: "a lighthouse beam sweeping the storm",
            start_frame: 0,
            end_frame: 56,
            knobs: { steps: 12 },
            refs: { images: ["storm-ref.png"] },
          },
          { text: "the storm breaks at dawn", start_frame: 56, end_frame: 107 },
        ],
        ...extra,
      },
    },
    exec,
  ) as Record<string, unknown>
  assert.equal(answer.ok, true, "the tool door must land the stage: " + String(answer.error ?? ""))
  const bench = (await svc.get(SESSION, sig)) as { stages: Array<Record<string, unknown>> }
  const row = bench.stages[0] as Record<string, unknown>
  return row["params"] as Record<string, unknown>
}

describe("the timeline visibility wall — authored through the tool door is what the studio projects", () => {
  test("ARM 1 — the tool-door fields surface field for field (text/span/knob/refs, fps, steps, lora)", async () => {
    const stored = await authoredParams({})
    const doc = projectDoc(stored)
    assert.equal(doc.calls.length, 2, "both authored calls reach the studio")
    assert.equal(doc.calls[0]?.text, "a lighthouse beam sweeping the storm")
    assert.equal(doc.calls[0]?.start_frame, 0)
    assert.equal(doc.calls[0]?.end_frame, 56)
    assert.equal(doc.calls[0]?.knobs?.steps, 12, "the per-call knob rides the fold")
    assert.equal(doc.calls[0]?.refs?.images, "storm-ref.png", "the per-call ref rides the bus")
    assert.equal(doc.calls[1]?.text, "the storm breaks at dawn")
    assert.equal(doc.layerA.fps, 24, "the authored fps rides the rail")
    assert.equal(doc.layerA.steps, 30, "the authored steps ride the rail")
    assert.deepEqual(doc.layerA.loras, [{ id: "h3_silver_dareties", strength: 0.8, steps: 8 }],
      "the authored lora bag rides the rail verbatim (the fixture states h3DefaultLoraEntry — the silveroxides merge default)")
  })

  test("ARM 2 — the doc-level anchor lands VISIBLE on the keyframes lane (the cure)", async () => {
    const stored = await authoredParams({ image: "anchor-still.png" })
    assert.equal(stored.image, "anchor-still.png", "the bench stores the authored anchor")
    const doc = projectDoc(stored)
    const pin = doc.keyframes.find((k) => k.frame === 0)
    assert.ok(pin !== undefined, "the authored anchor must show on the timeline card — the frame-0 pin it already is")
    assert.equal(pin.image, "anchor-still.png")
  })

  test("ARM 3 — a frame-0 pin overrides the anchor, the compose lift's own precedence", async () => {
    const doc = projectDoc({
      image: "anchor-still.png",
      keyframes: [{ frame: 0, image: "pinned-still.png" }],
    })
    const pin = doc.keyframes.find((k) => k.frame === 0)
    assert.equal(pin?.image, "pinned-still.png",
      "the pin wins the seat — exactly what the compose's lift seats")
    assert.equal(doc.keyframes.filter((k) => k.frame === 0).length, 1, "one seat, one pin")
  })

  test("ARM 4 — the union's precedence: image over image_name over ref_image", async () => {
    const first = projectDoc({ image: "a.png", image_name: "b.png", ref_image: "c.png" })
    assert.equal(first.keyframes[0]?.image, "a.png")
    const second = projectDoc({ image_name: "b.png", ref_image: "c.png" })
    assert.equal(second.keyframes[0]?.image, "b.png")
    const third = projectDoc({ ref_image: "c.png" })
    assert.equal(third.keyframes[0]?.image, "c.png")
  })

  test("ARM 5 — round-trip stability: the shown lane survives hydrate∘serialize∘hydrate byte-for-byte", async () => {
    const doc = projectDoc({
      image: "anchor-still.png",
      keyframes: [{ frame: 56, image: "kf-still.png" }],
    })
    const back = hydrateKeyframes(serializeKeyframes(doc.keyframes))
    assert.deepEqual(back, doc.keyframes,
      "a studio gesture materializes exactly the lane the projection showed")
  })

  test("ARM 6 — the rest of the authored lane surfaces (refs, audio_clips, keyframes rows)", async () => {
    const stored = await authoredParams({
      ref_images: ["style-ref.png"],
      ref_videos: ["motion-ref.mp4"],
      ref_audios: ["voice-ref.wav"],
      audio_clips: [{ id: "line-1", src: "bed.wav", start_frame: 12, dur_frames: 91, text: "line one" }],
      keyframes: [{ frame: 56, image: "kf-still.png" }],
    })
    const doc = projectDoc(stored)
    assert.deepEqual(doc.layerA.ref_images, ["style-ref.png"])
    assert.deepEqual(doc.layerA.ref_videos, ["motion-ref.mp4"])
    assert.deepEqual(doc.layerA.ref_audios, ["voice-ref.wav"])
    assert.equal(doc.layerA.audio_clips?.length, 1, "a correctly-shaped audio row rides the lanes")
    assert.equal(doc.layerA.audio_clips?.[0]?.src, "bed.wav")
    assert.equal(doc.keyframes[0]?.image, "kf-still.png")
    assert.equal(doc.keyframes[0]?.frame, 56)
  })
})
