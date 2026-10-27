// @melite/models-h3 — THE ANCHOR CONTRACT WALL (2026-10-26, the
// dropped-anchor audit). One user fact — "the window's reference
// image" — crossed four owners (UI picker, schema derivation, build
// guard, engine enumeration) and only the last one checked anything:
// run-899a8448 wrote `calls[0].image`, the derivation missed the
// `image` spelling, variant fell t4_open, the anchor arm inside
// `if (isT4r)` never ran, and the film rendered text-only under a
// green run. These arms pin the chain end to end, at the real doors
// (the schema walk and the action's own build), never a copy:
//   1. a call's `image` anchor DERIVES the t4r window (every guide
//      spelling counts, not three of four);
//   2. a guide that names a stage instead of media REFUSES at
//      admission, naming the value (the UI's picker once wrote the
//      source stage's name into the anchor seat);
//   3. a guide-bearing doc with a non-t4r variant REFUSES at build
//      (the inverse of the classic guard — the silent-drop hole);
//   4. a lawful single-call guide composes the REFERENCE graph: the
//      bundle node rides, a LoadImage carries the value, and the
//      r2v node's ref_images.ref_image_0 lane is wired.
import { describe, it, expect, vi } from "vitest";
import { film } from "../src/actions.ts";
import { deriveWindowFamily } from "../src/timelineContract.ts";
import { schema as h3schema } from "../src/schema.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_turbo8_v1") };
});

const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
};

const LORA = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];

const walk = (raw: Record<string, unknown>): Record<string, unknown> =>
  h3schema(raw) as Record<string, unknown>

describe("the anchor contract (a window's reference image)", () => {
  it("a call's image anchor derives the t4r window — every guide spelling counts", () => {
    for (const key of ["image", "ref_image", "image_name"] as const) {
      const out = walk({ calls: [{ text: "she waves", start_frame: 0, end_frame: 90, [key]: "refs/anchor.png" }] })
      expect(out.variant, `guide spelling '${key}' must derive t4r`).toBe("t4r")
    }
    expect(walk({ calls: [{ text: "she waves", start_frame: 0, end_frame: 90 }] }).variant).toBe("t4_open")
  })

  it("a guide that names a stage instead of media refuses loud, naming the value (the run-899a8448 shape)", () => {
    expect(() => walk({ calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "image-gen" }] }))
      .toThrow(/calls\[0\]\.image: "image-gen" names no media.*not an image/s)
    expect(() => walk({ calls: [{ text: "she waves", start_frame: 0, end_frame: 90, ref_images: ["image-gen"] }] }))
      .toThrow(/calls\[0\]\.ref_images: "image-gen" names no media/s)
    // lawful spellings still walk: path, engine stem, estate URL, data:, $spell
    for (const v of ["refs/anchor.png", "e2e_anchor.png", "/infer-gallery/artifact?path=x.png", "data:image/png;base64,AA", "$image1"]) {
      expect(() => walk({ calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: v }] }), `lawful media '${v}' must walk`).not.toThrow()
    }
  })

  it("a guide-bearing doc pinned to a non-t4r variant refuses at build — never a silent text-only render", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "she waves", seed: 7, loras: LORA,
        calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "refs/anchor.png" }],
      },
      WINDOW_MODEL, g, "run_anchor_inverse",
    )).toThrow(/guide image \("refs\/anchor\.png"\) rides only the t4r reference lane.*variant is 't4_open'/s)
  })

  it("a lawful single-call guide composes the reference graph: bundle + LoadImage + ref_image_0 wired", () => {
    // THE PRODUCTION ORDER: the schema walk derives the variant (t4r
    // from the guide), THEN the action builds — an unwalked doc at
    // the build door is itself refused (the arm above).
    const walked = walk({ loras: LORA, seed: 7, calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "e2e_anchor.png" }] })
    expect(walked.variant).toBe("t4r")
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_anchor_e2e")
    const json = JSON.stringify(g.toJSON())
    expect(json).toContain("PlagueKindBundleIn")
    expect(json).toContain("LoadImage")
    expect(json).toContain("e2e_anchor.png")
    expect(json).toContain("ref_images.ref_image_0")
  })

  it("THE CONDITIONING LAW (cure 8 RULED CLOSED, operator 2026-11-12): ANY FRAME, ANY TIME — the i2v marker composes and NOTHING consumes it; anchors are references, keyframes are arbitrary AddGuide pins", () => {
    // THE RULING (operator, 2026-11-12, verbatim): "WE DO NOT DO
    // FIRST FRAME LAST FRAME, WE DO ANY FRAME ANY TIME." The
    // keyframe channel is the ARBITRARY pin lane (the keyframe-lane
    // describe beside this arm — the doc's flat keyframes[]
    // list, any frame, any time; interior rows compose AddGuide at
    // their generation-local index, boundary rows fill silent anchor
    // seats, stated seats win, nothing drops), landed slice 2,
    // 2026-11-05. The OLD cure-8 framing ("land the FL2VA keyframe
    // channel or bless the ref-arm-only truth") asked the wrong
    // question — a first/last special-case seat was proposed and
    // REVERTED the same day under this ruling (correction record
    // dev_docs/audits/features/h3-keyframe-channel-correction-2026-11-12.md).
    // This arm pins the law on all edges: the i2v marker EXISTS (a
    // silent removal of the t4r family key reds), it stays ORPHANED
    // (one generation lane, one truth — anything consuming the i2v
    // node reds), and the graph carries NO first/last keyframe
    // conditioning seam (anchors ride the reference bus as
    // references; the only keyframe seats are the arbitrary pins).
    const walked = walk({ loras: LORA, seed: 7, calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "e2e_anchor.png" }] })
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_anchor_orphan")
    const graph = g.toJSON() as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const marker = Object.entries(graph).find(([, n]) => n.class_type === "MiniMaxH3ImageToVideo")
    expect(marker, "the t4r family key composes as the i2v marker").toBeDefined()
    const consumers = Object.entries(graph).filter(([, n]) =>
      Object.values(n.inputs).some((v) =>
        typeof v === "string" && v.startsWith(`${marker![0]}.`)))
    expect(consumers, `the i2v marker is consumed by ${String(consumers.map(([id]) => id))} — the conditioning lane flipped without touching this arm`).toHaveLength(0)
    // and the anchor's lane is the REFERENCE bus (the arm above pins
    // the wiring; this pins the interpretation: first/last frames
    // ride ref_images slots as references, never a keyframes seam —
    // the only keyframe channel is the arbitrary pin lane)
    expect(JSON.stringify(graph)).not.toContain("keyframes")
  })
})

// ONE TRUTH: DISPATCH AND FAMILY KEY ON THE DOC'S GRAMMAR (the
// operator's live break, 2026-10-27: "when I submit, the timing of
// windows is not respected" + "what is going on with the variant?").
// The live bench doc carries variant:"timeline" — the MODEL-AXIS
// value the add door seeds onto every fresh stage — in a key the
// composer was reading as the WINDOW family: the schema walk threw
// 'unknown window family', the film gate demoted multi-window docs
// to the frozen single window (timing gone), and the single-window
// guards refused guides outright. Three seats, one disease: the
// variant key carries TWO vocabularies. The law these arms pin:
// the window family is DERIVED from the doc's own seats (calls
// length, guides, refs) at every door; an axis-seeded variant
// string is inert metadata no dispatch, guard, or render reads.
describe("one truth: dispatch and family key on the doc's grammar (the variant:'timeline' doc)", () => {
  // the operator's doc shape verbatim (bench-session-2d6af763, rev
  // live): axis-seeded variant/quant/model + a two-window timeline
  // with an anchored second window.
  const OPERATOR_DOC = {
    variant: "timeline", quant: "int8", model: "h3",
    loras: LORA, width: 768, height: 448, seed: 7,
    calls: [
      { text: "She walks forward", start_frame: 0, end_frame: 90 },
      { text: "and turns to face the camera", start_frame: 90, end_frame: 158, image: "refs/turn.png" },
    ],
  }

  it("the schema walk derives the film family over the axis string — variant:'timeline' never throws 'unknown window family'", () => {
    const out = walk(OPERATOR_DOC)
    expect(out.variant, "a multi-call doc's family is t4_chain — derived, never read from the axis key").toBe("t4_chain")
  })

  it("the axis-seeded doc composes the FILM: every window, per-span lengths, the anchor staged (walk → build, the production order)", () => {
    const walked = walk(OPERATOR_DOC)
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_onetruth_walked")
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
    const json = JSON.stringify(graph)
    // THE WINDOW-COUNT JUDGE: the film tail unloads exactly one
    // MeliteUnload per composed window (the merged film's own file
    // boundary) — a demoted doc composes one.
    const windows = Object.values(graph).filter((n) => n.class_type === "MeliteUnload").length
    expect(windows, "two calls compose two windows — the axis string never demotes the film").toBe(2)
    expect(json, "window 1's span length reaches the engine").toContain('"length":90')
    // A carried window's length rides the film's own length math
    // (ComfyMathExpression from the 90→158 span), never a literal
    // — this node exists ONLY on the film's carried-window path,
    // so its presence IS the per-span timing proof.
    expect(json, "window 2's span length reaches the engine through the film's length math").toContain('window2_ComfyMathExpression')
    expect(json, "the anchored window's reference reaches the engine").toContain("refs/turn.png")
    expect(json).toContain("MiniMaxH3ReferenceToVideo")
  })

  it("dispatch alone honors the grammar — the raw doc straight at the action (the carrier-walk path, axis keys riding verbatim)", () => {
    const g = new GraphBuilder()
    instantiateAction(film, OPERATOR_DOC, WINDOW_MODEL, g, "run_onetruth_raw")
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
    const json = JSON.stringify(graph)
    const windows = Object.values(graph).filter((n) => n.class_type === "MeliteUnload").length
    expect(windows, "calls.length>1 with no k composes the film — no variant clause exists").toBe(2)
    expect(json).toContain('"length":90')
    expect(json).toContain('window2_ComfyMathExpression')
    expect(json).toContain("refs/turn.png")
  })
})

// THE NO-DROP LAW (2026-10-26, the operator's standing order: "if a
// user inputs anything, it must be proven that it goes inside of
// ComfyUI — there can be no silent changing of types"). The anchor
// arms above pin the single guide seat; this tier pins EVERY media
// seat the card declares, at the composed graph itself — the object
// ComfyUI executes. Two laws, mechanically judged:
//   A. VALUE PRESENCE — every media string the doc carries appears
//      in the composed graph JSON (a value absent from the graph
//      was dropped before the engine ever saw it);
//   B. TYPE STABILITY — a doc carrying ANY media never composes the
//      text-only shape: the reference-to-video node and the bundle
//      node ride (an image input NEVER falls back to text).
describe("the no-drop law (every fed input reaches the ComfyUI graph)", () => {
  const build = (raw: Record<string, unknown>): string => {
    const walked = walk(raw)
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_nodrop")
    return JSON.stringify(g.toJSON())
  }

  it("every media seat's value appears in the composed graph — image, last_frame, ref bus, video, audio", () => {
    const json = build({
      loras: LORA, seed: 7,
      calls: [{
        text: "she waves", start_frame: 0, end_frame: 90,
        image: "nd_anchor.png",
        last_frame: "nd_end.png",
        ref_images: ["nd_bus_a.png", "nd_bus_b.png"],
        ref_videos: ["nd_clip_a.mp4"],
        ref_audios: ["nd_track_a.mp3"],
      }],
    })
    // LAW A — value presence, seat by seat
    for (const v of ["nd_anchor.png", "nd_end.png", "nd_bus_a.png", "nd_bus_b.png", "nd_clip_a.mp4", "nd_track_a.mp3"]) {
      expect(json, `fed media '${v}' must appear in the graph ComfyUI executes`).toContain(v)
    }
    // LAW B — type stability: reference node + bundle ride, never the text-only shape
    expect(json).toContain("MiniMaxH3ReferenceToVideo")
    expect(json).toContain("PlagueKindBundleIn")
  })

  it("the reference bus is count-exact: three fed images load three bundle inputs — none dropped, none invented", () => {
    const walked = walk({ loras: LORA, seed: 7, calls: [{ text: "she waves", start_frame: 0, end_frame: 90, ref_images: ["c1.png", "c2.png", "c3.png"] }] })
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_nodrop_count")
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
    const bundle = Object.values(graph).find((n) => n.class_type === "PlagueKindBundleIn")
    expect(bundle, "the bundle node rides for a fed bus").toBeDefined()
    const loaded = Object.keys(bundle!.inputs).filter((k) => k.startsWith("input_")).sort()
    // no anchor, no end frame: the 3 refs ride input_2..4 (the slot map)
    expect(loaded, "three fed images load exactly three bundle inputs").toEqual(["input_2", "input_3", "input_4"])
    for (const v of ["c1.png", "c2.png", "c3.png"]) {
      expect(JSON.stringify(graph), `fed image '${v}' reaches the graph`).toContain(v)
    }
  })

  it("a multi-call film carries EVERY window's guide into its own window — per-window value presence", () => {
    const json = build({
      loras: LORA, seed: 7,
      calls: [
        { text: "first", start_frame: 0, end_frame: 39, image: "w1_anchor.png" },
        { text: "second", start_frame: 39, end_frame: 56, image: "w2_anchor.png" },
      ],
    })
    expect(json, "window 1's guide reaches the graph").toContain("w1_anchor.png")
    expect(json, "window 2's guide reaches the graph").toContain("w2_anchor.png")
    expect(json).toContain("MiniMaxH3ReferenceToVideo")
  })

  it("a LATER window's per-call bus lanes reach the graph — the stanza seat-union's own firing arm", () => {
    // The all-seats arm rides the SOLE-CALL lift; without this arm a
    // multi-call doc's row-level lanes had no judge and the stanza
    // carry could be toggled out green (found by the T1 toggle
    // 2026-10-26 — the wall must fire on its own cure).
    const json = build({
      loras: LORA, seed: 7,
      calls: [
        { text: "first", start_frame: 0, end_frame: 39, image: "w1_anchor.png" },
        { text: "second", start_frame: 39, end_frame: 56, ref_images: ["m2_bus.png"], last_frame: "m2_end.png", ref_videos: ["m2_clip.mp4"], ref_audios: ["m2_track.mp3"] },
      ],
    })
    for (const v of ["m2_bus.png", "m2_end.png", "m2_clip.mp4", "m2_track.mp3"]) {
      expect(json, `window 2's fed media '${v}' must reach the graph`).toContain(v)
    }
  })

  it("a media-free doc is the ONLY shape that may compose text-only (the fallback door stays lawful for text)", () => {
    const json = build({ loras: LORA, seed: 7, calls: [{ text: "plain text", start_frame: 0, end_frame: 90 }] })
    expect(json).not.toContain("PlagueKindBundleIn")
  })
})

// THE KEYFRAME LANE — PLAN GATE + COMPOSE (slice 1 2026-11-05, slice 2
// same day). The doc's `keyframes` pins are FILM-absolute image pins.
// The compose door judges PLACEMENT (every pin's frame inside some
// call's [start_frame, end_frame), a gap refuses loud — the same plan
// door that refuses a textless call) and SHAPE (a pin carries an
// image that names media). The MAPPING then lands the rides: an
// endpoint pin rides the window's EXISTING anchor/end-anchor seats
// (no graph change — the design's probe: a boundary-pin doc composes
// byte-identically to the same doc stating the seats), an interior
// pin composes the MiniMaxH3AddGuide IMAGE arm chained on cond AFTER
// the audio pins (the dialogue-measured order), at its generation-
// local frame on the window's own 17k+5 grid. Hybrid law: a pinned
// window's reference arm rides verbatim — pins compose WITH the
// reference lanes, never instead of them.
describe("the keyframe lane (placement refuses; endpoints ride the seats, interior pins chain)", () => {
  const buildJson = (raw: Record<string, unknown>): string => {
    const g = new GraphBuilder()
    instantiateAction(film, walk(raw), WINDOW_MODEL, g, "run_kf_gate")
    return JSON.stringify(g.toJSON())
  }
  const buildGraph = (raw: Record<string, unknown>): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
    const g = new GraphBuilder()
    instantiateAction(film, walk(raw), WINDOW_MODEL, g, "run_kf_gate")
    return g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
  }

  // Grid-lawful spans (the 17k+5 law): the opener 90 = 22+17·4; the
  // carried window's authored span 85 = 17·5.
  const FILM_DOC = {
    loras: LORA, seed: 7,
    calls: [
      { text: "first", start_frame: 0, end_frame: 90 },
      { text: "second", start_frame: 90, end_frame: 175 },
    ],
  }

  it("a pin before the first window's start refuses loud, naming the row and the plan", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "a.png", frame: 10 }] }))
      .not.toThrow() // frame 10 IS inside [0, 90) — the lawful control first
    expect(() => buildJson({ ...FILM_DOC, calls: [
      { text: "first", start_frame: 40, end_frame: 96 },
      { text: "second", start_frame: 96, end_frame: 181 },
    ], keyframes: [{ image: "early.png", frame: 10 }] }))
      .toThrow(/keyframes\[0\]: frame 10 falls outside every window — the plan covers \[40, 181\)/s)
  })

  it("a pin at or beyond the last window's end refuses loud — the gap has no window to ride", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "late.png", frame: 175 }] }))
      .toThrow(/keyframes\[0\]: frame 175 falls outside every window — the plan covers \[0, 175\).*no window to ride/s)
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "far.png", frame: 999 }] }))
      .toThrow(/keyframes\[0\]: frame 999 falls outside every window/s)
  })

  it("the offending row index is named, not guessed (a lawful pin never masks a gapped one)", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "ok.png", frame: 45 }, { image: "gap.png", frame: 250 }] }))
      .toThrow(/keyframes\[1\]: frame 250 falls outside every window/s)
  })

  it("a row without a finite frame refuses loud — a row without a frame is not a pin", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "no-frame" }] }))
      .toThrow(/keyframes\[0\]: frame is required/s)
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "nan", frame: "12" }] }))
      .toThrow(/keyframes\[0\]: frame is required/s)
  })

  it("a row without an image refuses loud — a pin without a source anchors nothing (slice 2's shape arm)", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ frame: 45 }] }))
      .toThrow(/keyframes\[0\]: image is required.*a row without a source anchors nothing/s)
  })

  it("a stage-named pin refuses at admission — the guide media gate's own law on the pin channel (slice 2)", () => {
    expect(() => buildJson({ ...FILM_DOC, keyframes: [{ image: "image-gen", frame: 45 }] }))
      .toThrow(/keyframes\[0\]: "image-gen" names no media.*a label never does/s)
  })

  it("keyframes on a windowless doc refuse — outside every window includes 'no windows'", () => {
    // RAW at the action (the schema walk fills the fresh-card starter
    // calls — a walked doc always has windows): a doc that reaches the
    // gate with no calls rows has no plan to ride, so any pin is a gap.
    const g = new GraphBuilder()
    expect(() => instantiateAction(
      film,
      { loras: LORA, seed: 7, prompt: "solo", length: 90, keyframes: [{ image: "a.png", frame: 10 }] },
      WINDOW_MODEL, g, "run_kf_gate_windowless",
    )).toThrow(/falls outside every window.*no windows at all/s)
  })

  it("a boundary keyframe graph is BYTE-IDENTICAL to the doc stating the seats (the design's no-graph-change probe)", () => {
    // start pin ≡ the call's image anchor (input_1); end pin ≡ the
    // call's last_frame (input_2) — on both windows, the second of
    // which is CARRIED (its seats ride the stanza seat-union).
    const pins = { ...FILM_DOC, keyframes: [
      { image: "a.png", frame: 0 }, { image: "b.png", frame: 89 }, { image: "c.png", frame: 174 },
    ] }
    const seats = { ...FILM_DOC, calls: [
      { text: "first", start_frame: 0, end_frame: 90, image: "a.png", last_frame: "b.png" },
      { text: "second", start_frame: 90, end_frame: 175, last_frame: "c.png" },
    ] }
    expect(buildJson(pins)).toBe(buildJson(seats))
  })

  it("the endpoint probe holds on the frozen single-window shape (the mapped seats lift through the unpack)", () => {
    const pins = { loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "a.png", frame: 0 }, { image: "b.png", frame: 89 }] }
    const seats = { loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90, image: "a.png", last_frame: "b.png" }] }
    expect(buildJson(pins)).toBe(buildJson(seats))
  })

  it("an interior pin composes the AddGuide IMAGE arm at its GENERATION-LOCAL frame (the carry subtracted)", () => {
    // window 1 generates from 0 → pin 45 rides frame_idx 45; window 2
    // is carried (genStart 90−22=68) → pin 130 rides frame_idx 62.
    const doc = { ...FILM_DOC, keyframes: [{ image: "mid1.png", frame: 45 }, { image: "mid2.png", frame: 130 }] }
    const graph = buildGraph(doc)
    const guides = Object.values(graph).filter((n) => n.class_type === "MiniMaxH3AddGuide" && n.inputs.image !== undefined)
    expect(guides, "one image pin per interior keyframe").toHaveLength(2)
    expect(guides.map((n) => n.inputs.frame_idx).sort((a, b) => (a as number) - (b as number)))
      .toEqual([45, 62])
    // the pin images reach the graph through LoadImage (the seat grammar)
    const json = JSON.stringify(graph)
    expect(json).toContain("mid1.png")
    expect(json).toContain("mid2.png")
  })

  it("the image pin chains AFTER the audio pins — the dialogue-measured order is wiring, visible in the graph", () => {
    const doc = { ...FILM_DOC,
      audio_clips: [{ src: "/a/line.flac", start_frame: 10, dur_frames: 40, text: "Run." }],
      keyframes: [{ image: "mid.png", frame: 45 }] }
    const graph = buildGraph(doc)
    const guides = Object.entries(graph).filter(([, n]) => n.class_type === "MiniMaxH3AddGuide")
    const audioGuide = guides.find(([, n]) => n.inputs.audio !== undefined)
    const imageGuide = guides.find(([, n]) => n.inputs.image !== undefined)
    expect(audioGuide, "the dialogue pin rides").toBeDefined()
    expect(imageGuide, "the image pin rides").toBeDefined()
    // the image guide's positive IS the audio guide's output — the
    // image conditions through the audio pin, never beside it
    expect((imageGuide![1].inputs.positive as [string, number])[0]).toBe(audioGuide![0])
  })

  it("hybrid: a pinned window keeps its reference arm verbatim — refs still on the bus", () => {
    const doc = { ...FILM_DOC, calls: [
      { text: "first", start_frame: 0, end_frame: 90, ref_images: ["bus1.png"] },
      { text: "second", start_frame: 90, end_frame: 175 },
    ], keyframes: [{ image: "mid.png", frame: 45 }] }
    const graph = buildGraph(doc)
    const json = JSON.stringify(graph)
    expect(json, "the reference bus rides unchanged").toContain("bus1.png")
    expect(json, "the r2v ref lane stays wired").toContain("ref_images.ref_image_0")
    const bundle = Object.values(graph).find((n) => n.class_type === "PlagueKindBundleIn")
    expect(bundle, "the bundle node rides for the fed bus").toBeDefined()
    expect(Object.keys(bundle!.inputs), "the ref lands its bus slot").toContain("input_2")
    expect(json, "the pin rides the same window's chain").toContain("mid.png")
  })

  it("multiple interior pins chain in FRAME order, never authored order", () => {
    const doc = { ...FILM_DOC, keyframes: [{ image: "late.png", frame: 60 }, { image: "early.png", frame: 30 }] }
    const graph = buildGraph(doc)
    const guides = Object.entries(graph).filter(([, n]) => n.class_type === "MiniMaxH3AddGuide" && n.inputs.image !== undefined)
    expect(guides).toHaveLength(2)
    const earlyName = guides.find(([, n]) => n.inputs.frame_idx === 30)![0]
    const late = guides.find(([, n]) => n.inputs.frame_idx === 60)![1]
    // the later pin's positive IS the earlier pin's output — the chain
    // flows through frame order
    expect((late.inputs.positive as [string, number])[0]).toBe(earlyName)
  })

  it("the 17k+5 snap: a pin past a short knob-pinned window's tail rides the nearest lawful row", () => {
    // knob length 39 (22+17·1, on-grid) is shorter than the authored
    // 124-span → the latent renders 39 rows; a pin at frame 100 rides
    // raw index 100 → snapped to the window's last row (38).
    const doc = { loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 124, knobs: { length: 39 } }],
      keyframes: [{ image: "late.png", frame: 100 }] }
    const graph = buildGraph(doc)
    const guides = Object.values(graph).filter((n) => n.class_type === "MiniMaxH3AddGuide" && n.inputs.image !== undefined)
    expect(guides, "the pin rides one guide").toHaveLength(1)
    expect(guides[0]!.inputs.frame_idx, "snapped to the generated tail, never off the window's grid").toBe(38)
  })

  it("a pin-only single-call doc composes the REFERENCE lane — the pin never renders text-only", () => {
    const raw = { loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "mid.png", frame: 45 }] }
    expect(walk(raw).variant, "the derivation knows the pin channel").toBe("t4r")
    const json = buildJson(raw)
    expect(json).toContain("MiniMaxH3ReferenceToVideo")
    expect(json).toContain("MiniMaxH3AddGuide")
    expect(json).toContain("mid.png")
  })

  it("a second pin on an already-claimed boundary seat rides the interior arm — no pin vanishes", () => {
    // the first pin at the start claims the anchor seat; the second
    // rides AddGuide at row 0 — both images reach the graph
    const doc = { loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "a.png", frame: 0 }, { image: "b.png", frame: 0 }] }
    const graph = buildGraph(doc)
    const json = JSON.stringify(graph)
    expect(json, "the seat claim rides the anchor").toContain("a.png")
    const guides = Object.values(graph).filter((n) => n.class_type === "MiniMaxH3AddGuide" && n.inputs.image !== undefined)
    expect(guides, "the second pin rides the guide chain at row 0").toHaveLength(1)
    expect(guides[0]!.inputs.frame_idx).toBe(0)
  })

  it("a stated non-t4r family over a pin-carrying doc refuses at build — the conflict guard's pin arm", () => {
    // an explicit t4_open pin over a pinned doc is the same contract
    // conflict the guide arms refuse — named, never silently overridden
    expect(() => buildJson({ variant: "t4_open", loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "mid.png", frame: 45 }] }))
      .toThrow(/keyframe pins ride only the t4r reference lane.*variant is 't4_open'.*State no variant/s)
  })

  it("a stated t4r doc whose guides ride the pin channel alone composes — the inverse guard admits pins", () => {
    // an interior pin is an image guide: the window is not anchorless,
    // so the t4r-without-anchor guard admits it (the compose proves it)
    const raw = { variant: "t4r", loras: LORA, seed: 7,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "mid.png", frame: 45 }] }
    expect(() => buildJson(raw)).not.toThrow()
    expect(buildJson(raw)).toContain("MiniMaxH3AddGuide")
  })

  it("a RAW pin doc composes the reference lane at dispatch too — the window family's own pin arm", () => {
    // the carrier-walk path (the one-truth arm's raw dispatch): no
    // walk, no variant anywhere — the window family derives from the
    // pin seat itself, or the pin renders text-only
    const g = new GraphBuilder()
    instantiateAction(film, {
      loras: LORA, seed: 7, length: 90,
      calls: [{ text: "solo", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "mid.png", frame: 45 }],
    }, WINDOW_MODEL, g, "run_kf_raw")
    const json = JSON.stringify(g.toJSON())
    expect(json).toContain("MiniMaxH3ReferenceToVideo")
    expect(json).toContain("MiniMaxH3AddGuide")
  })
})

// THE DOC-LEVEL GUIDE TIER (2026-10-20, the operator's chained-image
// burn — session bench-session-1e767d50, the verbatim wound: "The AI
// doesn't understand the concept of how image input is put in the
// video card. It tried to type the prompt into the text prompt,
// because it didn't see that I had run the generation needed" +
// "The Agent CANNOT chain images from cards that have not been
// run"). The agent wired the guide the way the bench teaches —
// doc-level `image: "$image"` with an inputs binding to the image
// stage — and the schema stamped the doc t4_open (deriveWindowFamily
// counted only per-call guides, keyframes, the declared refs surface
// and last_frame), the walk then read the doc-level guide and
// REFUSED its own stamp: "a guide image rides only the t4r reference
// lane — this doc's variant is 't4_open'. State no variant (the walk
// derives t4r from the guide)" — a cure sentence that lied, because
// stating no variant derived t4_open again. Three refusals later the
// agent dropped the guide and typed the prompt text-only: the exact
// brain-twister the operator named. The derivation's own law (its
// comment: "Reads exactly the seats the walk reads — a private
// spelling elsewhere is the run-899a8448 disease: one seat missed,
// the family lies") demands the DOC-LEVEL spellings the walk
// (actions.ts guideImage: image ?? image_name) and the render
// (guide0: image, image_name, ref_image) both read.
describe("the doc-level guide (the chained-image burn: every spelling the walk and render read)", () => {
  const textCall = { text: "she waves", start_frame: 0, end_frame: 90 }

  it("a DOC-LEVEL guide derives t4r — image, image_name and ref_image, the walk/render union", () => {
    for (const key of ["image", "image_name", "ref_image"] as const) {
      const out = walk({ loras: LORA, seed: 7, [key]: "refs/anchor.png", calls: [textCall] })
      expect(out.variant, `doc-level guide spelling '${key}' must derive t4r`).toBe("t4r")
    }
    // the operator's exact wiring: a $spell guide (the bench input
    // binding) derives the reference lane exactly as a media path —
    // the derivation judges the SEAT, never the value's dialect.
    expect(deriveWindowFamily({ image: "$image", calls: [textCall] })).toBe("t4r")
    expect(deriveWindowFamily({ ref_image: "$guide0", calls: [textCall] })).toBe("t4r")
    // and the text-only pole holds: no guide seat anywhere is t4_open
    expect(deriveWindowFamily({ calls: [textCall] })).toBe("t4_open")
  })

  it("the operator's chain end to end: the doc-level guide's OWN schema stamp composes — never the self-refusal loop", () => {
    // production order: the schema walk stamps the variant FIRST
    // (schema.ts derives it through deriveWindowFamily), then the
    // compose walks the stamped doc. Pre-cure the stamp said
    // t4_open and the compose refused the doc's own guide.
    const walked = walk({ loras: LORA, seed: 7, image: "e2e_anchor.png", calls: [textCall] })
    expect(walked.variant).toBe("t4r")
    const g = new GraphBuilder()
    // THE RED: pre-cure this exact call threw the guard's
    // "rides only the t4r reference lane" refusal.
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_doc_guide_chain")
    const json = JSON.stringify(g.toJSON())
    expect(json, "the reference bundle rides").toContain("PlagueKindBundleIn")
    expect(json, "the doc-level guide value reaches the engine").toContain("e2e_anchor.png")
    expect(json, "the anchor lands on the r2v reference slot").toContain("ref_images.ref_image_0")
  })

  it("THE BREAD AND BUTTER (the operator's two-clip image-to-video): a film's doc-level guide seats on the OPENING window only — never refused with a lying cure, never re-anchored later", () => {
    // THE BURN (transcript, 2026-11-12, session 384a13cd): "Turn this
    // image into the video ... two short clips combined" — a doc-level
    // guide on a TWO-CALL film. Pre-cure the film loop never seated
    // the doc-level guide (it reads call.image only), and the conflict
    // guard then refused the write: "a guide image rides only the t4r
    // reference lane — this doc's variant is 't4_chain'. State no
    // variant (the walk derives t4r from the guide)". The cure was
    // already true — the walk derives t4_chain from the film's shape —
    // so three refusals later the agent dropped the image and typed
    // the prompt text-only. THE LAW: a doc-level guide is the film's
    // opening frame; it seats on window 1 and only window 1, and the
    // write composes the reference arm with no refusal.
    const filmDoc = {
      loras: LORA, seed: 7, image: "e2e_anchor.png",
      calls: [
        { text: "first", start_frame: 0, end_frame: 90 },
        { text: "second", start_frame: 90, end_frame: 175 },
      ],
    }
    const walked = walk(filmDoc)
    expect(walked.variant, "a film's shape derives the chained family").toBe("t4_chain")
    const g = new GraphBuilder()
    // THE RED: pre-cure this exact call threw the lying refusal.
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_film_opener")
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
    const json = JSON.stringify(graph)
    expect(json, "the opener's anchor reaches the engine").toContain("e2e_anchor.png")
    // ONE LoadImage: the anchor is a single opener seat. A second
    // LoadImage (or the same value wired into both windows' reference
    // slots) is the re-anchor disease — window 2 must continue from
    // the generation head, not re-open on the still.
    const loaders = Object.values(graph).filter((n) => n.class_type === "LoadImage")
    expect(loaders.length, "the opener anchor loads exactly once").toBe(1)
    const windows = Object.values(graph).filter((n) => n.class_type === "MiniMaxH3ReferenceToVideo")
    expect(windows.length, "both windows compose the reference arm").toBe(2)
    const anchored = Object.entries(graph).filter(([, n]) =>
      n.class_type === "MiniMaxH3ReferenceToVideo" && Object.keys(n.inputs).some((k) => k.startsWith("ref_images")))
    expect(anchored.length, "only the opening window carries the doc-level anchor").toBe(1)
    expect(anchored[0][0].startsWith("window1_"), "the anchor seats on the opener").toBe(true)
    expect(json, "the continuation seam rides for window 2").toContain("MiniMaxH3FiniteLatentContinuation")
  })

  it("a call's OWN guide beats the film's doc-level opener (the seat union, never two anchors)", () => {
    const walked = walk({
      loras: LORA, seed: 7, image: "doc_anchor.png",
      calls: [
        { text: "first", start_frame: 0, end_frame: 90, image: "call_anchor.png" },
        { text: "second", start_frame: 90, end_frame: 175 },
      ],
    })
    const g = new GraphBuilder()
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_film_call_wins")
    const json = JSON.stringify(g.toJSON())
    expect(json).toContain("call_anchor.png")
    expect(json, "the doc-level opener never doubles a stated call guide").not.toContain("doc_anchor.png")
  })

  it("the guard's cure sentence is TRUE: a doc-level guide with NO stated variant walks clean (never the three-refusal loop)", () => {
    // the guard's own voice promises this arm: "State no variant
    // (the walk derives t4r from the guide)". Pre-cure that state
    // re-derived t4_open and refused again — the lie the agent rode
    // into text-only. No variant key at all, the guide at doc level.
    const walked = walk({ loras: LORA, seed: 7, image: "refs/anchor.png", calls: [textCall] })
    expect(walked.variant).toBe("t4r")
    const g = new GraphBuilder()
    expect(() => instantiateAction(film, walked, WINDOW_MODEL, g, "run_doc_guide_unstated"), "unstated variant + doc-level guide composes").not.toThrow()
    expect(JSON.stringify(g.toJSON())).toContain("refs/anchor.png")
  })
})
