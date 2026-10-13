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
import { schema as h3schema } from "../src/schema.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_dmad_4step") };
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
