// @contract models-h3-insertions-vs-references
//
// @melite/models-h3 — THE TWO-MECHANISM WALL (operator 2026-11-26,
// verbatim: "Keyframes != Reference images. They do not. That has
// always been the case" + "we don't use first frame, nor last frame
// explicitly, we use the same frame insertion throughout").
//
// THE LAW THESE ARMS PIN: the card owns TWO mechanisms and they never
// share a seat —
//   1. FRAME INSERTIONS (the `keyframes` lane + the `image` frame-0
//      shorthand): an image that must OCCUPY a frame, inserted through
//      MiniMaxH3AddGuide at its generation-local frame_idx — ONE
//      mechanism for every frame, 0 and n-1 included.
//   2. REFERENCES (`ref_images`): loose conditioning on the r2v image
//      bus (bundle inputs 1..9), never an insertion, never a frame.
//
// The burned merge (this wall's red arms): `applyKeyframeCompose`
// rewrote a row at the window's first frame into `w.row.image` and a
// row at its last row into `w.row.last_frame`, and `renderH3Window`
// wired `p.image` (the frame-0 SHORTHAND of the insertion rail) to
// `bundleInputs.input_1` — the reference bus. A frame insertion at 0
// therefore became reference picture #1, the opening was generated
// from it, and `last_frame` became reference picture #2. The card's
// own schema denied it in the same breath ("An image pin at the
// film's opening"), so the face promised an insertion and the graph
// delivered a reference.
import { describe, it, expect, vi } from "vitest";
import { film } from "../src/actions.ts";
import { schema as h3schema } from "../src/schema.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_silver_dareties") };
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

type Node = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, Node>;

const build = (raw: Record<string, unknown>): Graph => {
  const g = new GraphBuilder();
  instantiateAction(film, h3schema(raw) as Record<string, unknown>, WINDOW_MODEL, g, "run_two_mechanism");
  return g.toJSON() as Graph;
};

/** Every LoadImage in the graph, id → the file it loads. */
function loaders(graph: Graph): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, node] of Object.entries(graph)) {
    if (node.class_type === "LoadImage") out.set(id, String(node.inputs.image));
  }
  return out;
}

/** The frame insertions the graph actually builds: one entry per
 *  MiniMaxH3AddGuide that carries an image, with the file it inserts
 *  and the frame it inserts it at. */
function insertions(graph: Graph): Array<{ image: string; frame_idx: number }> {
  const byId = loaders(graph);
  const out: Array<{ image: string; frame_idx: number }> = [];
  for (const node of Object.values(graph)) {
    if (node.class_type !== "MiniMaxH3AddGuide") continue;
    const src = node.inputs.image;
    if (!Array.isArray(src)) continue
    const file = byId.get(String(src[0]));
    if (file === undefined) continue
    out.push({ image: file, frame_idx: Number(node.inputs.frame_idx) });
  }
  return out;
}

/** The reference bus as fed: every PlagueKindBundleIn slot, resolved
 *  one resize hop into the file it carries. A file that appears here
 *  is a REFERENCE — the model's <Picture n>. */
function busFeeds(graph: Graph): Array<{ slot: string; image: string }> {
  const byId = loaders(graph);
  const out: Array<{ slot: string; image: string }> = [];
  for (const node of Object.values(graph)) {
    if (node.class_type !== "PlagueKindBundleIn") continue;
    for (const [slot, value] of Object.entries(node.inputs)) {
      if (!Array.isArray(value)) continue
      const feeder = graph[String(value[0])];
      if (feeder === undefined) continue
      // the bus takes a UnifiedResizeImageMask hop; its own `image` is
      // the LoadImage handle (or a $spell wire, which names no file).
      const inner = feeder.class_type === "UnifiedResizeImageMask" ? feeder.inputs.image : value;
      if (!Array.isArray(inner)) continue
      const file = byId.get(String(inner[0]));
      if (file !== undefined) out.push({ slot, image: file });
    }
  }
  return out;
}

/** A grid-lawful two-window film: 90 = 22 + 17·4 (opener), 85 = 17·5
 *  (carried). */
const FILM_DOC = {
  loras: LORA, seed: 7,
  calls: [
    { text: "first", start_frame: 0, end_frame: 90 },
    { text: "second", start_frame: 90, end_frame: 175 },
  ],
};

describe("frame insertions and reference images are two mechanisms", () => {
  it("a frame-0 insertion INSERTS at frame 0 — it is never fed to the reference bus", () => {
    // The operator's burn in one doc: the still is inserted at the
    // film's opening. The graph must carry it as an AddGuide pin at
    // generation-local frame 0 — not as <Picture 1> of the r2v bus.
    const graph = build({ ...FILM_DOC, keyframes: [{ image: "open.png", frame: 0 }] })
    expect(insertions(graph), "the frame-0 insertion never reached the insertion arm").toContainEqual({ image: "open.png", frame_idx: 0 })
    expect(busFeeds(graph), "the frame insertion was mirrored onto the reference bus").not.toContainEqual(expect.objectContaining({ image: "open.png" }))
  });

  it("a last-row insertion INSERTS at the last generated row — the end-anchor seat is not a seat", () => {
    // "we don't use ... last frame explicitly": frame ef-1 is an
    // ordinary insertion. Before the cure it filled `w.row.last_frame`
    // and rode bundle input_2 as reference picture #2.
    const graph = build({ ...FILM_DOC, keyframes: [{ image: "close.png", frame: 89 }] })
    expect(insertions(graph), "the last-row insertion never reached the insertion arm").toContainEqual({ image: "close.png", frame_idx: 89 })
    expect(busFeeds(graph), "the last-row insertion was mirrored onto the reference bus").not.toContainEqual(expect.objectContaining({ image: "close.png" }))
  });

  it("the `image` frame-0 shorthand is the SAME insertion, not a reference", () => {
    // schema.ts, verbatim: "An image pin at the film's opening — the
    // frame-0 shorthand (pin any other frame on the timeline's
    // keyframes)". One rail, one mechanism.
    const graph = build({ ...FILM_DOC, image: "open.png" })
    expect(insertions(graph), "the frame-0 shorthand was not seated as the insertion it names").toContainEqual({ image: "open.png", frame_idx: 0 })
    expect(busFeeds(graph), "the frame-0 shorthand was fed to the reference bus").not.toContainEqual(expect.objectContaining({ image: "open.png" }))
  });

  it("references own their bus from slot 1 with no reserved anchor seat", () => {
    // No anchor exists in the two-mechanism model, so the reference
    // bus starts at input_1 and runs to the 9-slot cap. Before the
    // cure refs started at input_2 (a phantom anchor hole), which the
    // r2v node's ordinal compaction silently promoted to <Picture 1>.
    const graph = build({ ...FILM_DOC, ref_images: ["a.png", "b.png"] })
    const fed = busFeeds(graph)
    expect(fed).toContainEqual({ slot: "input_1", image: "a.png" })
    expect(fed).toContainEqual({ slot: "input_2", image: "b.png" })
    expect(fed.some((f) => f.slot === "input_10"), "a reference landed on the video lane").toBe(false)
    // and references never become insertions
    expect(insertions(graph), "a reference was seated as a frame insertion").toHaveLength(0)
  });

  it("the bus-full guard refuses LOUD — no reference ever lands on the video lane", () => {
    // The door's own `ref_images` array caps at 8, but the CALL row's
    // legacy `refs.images` bag is validated at compose (wireList), so
    // a hand-authored doc can still hand the bus 9. A 10th ref would
    // land on `input_10` — the first video's image stream — and be
    // silently clobbered; the compose refuses instead, naming the count
    // and the bus. (Insertions own no slot: the same doc with nine
    // refs AND pins refuses only on the refs.)
    const nine = Array.from({ length: 9 }, (_, i) => `r${String(i)}.png`)
    const doc = {
      ...FILM_DOC,
      calls: [
        { ...FILM_DOC.calls[0], refs: { images: nine } },
        FILM_DOC.calls[1],
      ],
    }
    expect(() => build(doc), "the bus-full guard let a 9th reference board").toThrow(/image bus is full: 9 references exceed the 9-slot bus/)
  });
});
