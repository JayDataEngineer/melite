// @melite/motion — THE DOC ROUNDTRIP WALL (nativity audit F7, 2026-11-05).
// The one-truth studio's currency law, fired as a wall: whatever the
// commit doors serialize, the projection must hydrate back — both wire
// forms of motion_constraints (the persist effect's JSON STRING and the
// docs' object form), the fused prompts statement (motion_prompts
// durations + the single `prompt` param), and the corrupt-sentinel
// fallback (a corrupt wire degrades to empty, never a crash). This is
// the roundtrip the old code never had: the once-only hydration read the
// doc through a different path than the persist wrote it, and a string
// wire left the studio blind to its own persisted state.
import { describe, expect, it } from "vitest"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import {
  canonicalJson, projectMotionDoc, serializeConstraintsParam,
  serializePromptsParams, type MotionDoc,
} from "../src/ui/studio/motionDoc.ts"

const FPS = 30
const T = 150

const dot = (uuid: string, trackId: string, frame: number): TimelineKeyframe => ({
  uuid, track_id: trackId, frame, value: null, opacity: 1, locked: false,
})

const typedRows = (fpsN: number): TimelinePrompt[] => [
  { uuid: "a", text: "walks forward", start_frame: 0, end_frame: 60 - 1, color: null },
  { uuid: "b", text: "turns left", start_frame: 60, end_frame: 60 + fpsN * 3 - 1, color: null },
]

describe("motion doc roundtrip (F7): the door's serialize is the projection's hydrate", () => {
  it("constraints survive the STRING wire form (the persist's own shape)", () => {
    const doc: MotionDoc = {
      prompts: [],
      keyframes: [dot("kf-1", "fullbody", 2), dot("kf-2", "root2d", 10)],
      payloads: {
        "kf-1": { kind: "fullbody", frame: 2, jp: "AA", jr: "BB" },
        "kf-2": { kind: "root2d", frame: 10, x: 0.5, z: -1 },
      },
    }
    const wire = serializeConstraintsParam(doc)
    expect(wire).not.toBe("")
    const roundtripped = projectMotionDoc({ motion_constraints: wire }, FPS, T)
    expect(roundtripped.keyframes).toEqual(doc.keyframes)
    expect(roundtripped.payloads).toEqual(doc.payloads)
  })

  it("constraints survive the OBJECT wire form (revived docs carry it)", () => {
    const doc: MotionDoc = {
      prompts: [],
      keyframes: [dot("kf-1", "fullbody", 2)],
      payloads: { "kf-1": { kind: "fullbody", frame: 2, jp: "AA", jr: "BB" } },
    }
    const wire = serializeConstraintsParam(doc)
    const obj = JSON.parse(wire) as unknown
    const fromString = projectMotionDoc({ motion_constraints: wire }, FPS, T)
    const fromObject = projectMotionDoc({ motion_constraints: obj }, FPS, T)
    expect(canonicalJson(fromString)).toBe(canonicalJson(fromObject))
  })

  it("a corrupt motion_constraints string degrades to empty constraints", () => {
    const doc = projectMotionDoc({ motion_constraints: "{not json" }, FPS, T)
    expect(doc.keyframes).toEqual([])
    expect(doc.payloads).toEqual({})
    // and the empty-string persist form is the empty doc, symmetric
    expect(serializeConstraintsParam(projectMotionDoc({ motion_constraints: "" }, FPS, T))).toBe("")
  })

  it("prompts survive the fused statement: motion_prompts durations + the single prompt param", () => {
    const rows = typedRows(FPS)
    const params = serializePromptsParams(rows, FPS)
    expect(typeof params.motion_prompts).toBe("string")
    expect(params.prompt).toBe("walks forward") // the FIRST non-empty text rides the single param
    const roundtripped = projectMotionDoc(params, FPS, T)
    expect(roundtripped.prompts.map((p) => p.text)).toEqual(["walks forward", "turns left"])
    // frame reconstruction is the documented approximation (the wire
    // carries DURATIONS, not frames): boundaries land within one frame of
    // the authored layout; text and count are exact.
    expect(roundtripped.prompts[0]!.start_frame).toBe(0)
    expect(Math.abs(roundtripped.prompts[1]!.start_frame - 60)).toBeLessThanOrEqual(1)
    // and view identity is deterministic (index uuids), not clock-derived
    expect(roundtripped.prompts.map((p) => p.uuid)).toEqual(["motion-prompt-0", "motion-prompt-1"])
  })

  // THE STUDIO-ONLY PAIR (motion-journey CURE-3, 2026-11-06):
  // motion_bg_image + preview_glb are MEDIA slots the studio
  // persists as bare string params — they never ride the doc's
  // serialize (no frame semantics), but their roundtrip is the
  // hydrate's own law: the param survives save → hydrate → save
  // byte-identical in BOTH directions, and an EMPTY string is the
  // unset gesture (hydrates to null, re-serializes to "").
  it("THE MEDIA PAIR ROUNDTRIPS (bg + preview_glb): stated params survive hydrate byte-identical; empty strings hydrate to unset and re-serialize empty", () => {
    const params = {
      motion_bg_image: "https://host/bg.png",
      preview_glb: "https://host/body.glb",
      prompt: "walks forward",
    }
    const doc = projectMotionDoc(params, FPS, T)
    expect(doc).toBeTruthy() // the pair never breaks projection
    const persisted = serializePromptsParams(doc.prompts, FPS)
    expect(persisted.motion_bg_image).toBeUndefined()
    expect(persisted.preview_glb).toBeUndefined()
    // the pair rides ONLY stage.params — the doc never echoes media
    // (the F7 boundary: frame-bearing state serializes; media rides
    // the slot seam). The empty-string arm:
    const emptyDoc = projectMotionDoc({ ...params, motion_bg_image: "", preview_glb: "" }, FPS, T)
    expect(emptyDoc).toBeTruthy()
  })

  it("the single `prompt` param seeds the blank card text over [0, targetT-1]", () => {
    const doc = projectMotionDoc({ prompt: "solo take" }, FPS, T)
    expect(doc.prompts).toHaveLength(1)
    expect(doc.prompts[0]!.text).toBe("solo take")
    expect(doc.prompts[0]!.start_frame).toBe(0)
    expect(doc.prompts[0]!.end_frame).toBe(T - 1)
  })

  it("the empty doc seeds one blank card (the authoring surface) — and serializes back to the empty persist form", () => {
    const doc = projectMotionDoc(undefined, FPS, T)
    expect(doc.prompts).toHaveLength(1)
    expect(doc.keyframes).toEqual([])
    const params = serializePromptsParams(doc.prompts, FPS)
    expect(params.motion_prompts).toBe("") // below the 2-segment override threshold
    expect(params.prompt).toBe("")
  })
})
