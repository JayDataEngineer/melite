// @melite/video-h3-timeline — the card's compose arms (TEST-2
// breadth, closing the branch debt census of 2026-09-19). The
// studio DOM specs own the doc/state planes; THIS file drives the
// module-private renderers (renderH3Film/renderH3Window) the only
// honest way they can be reached — through the registered card's
// compose door, GraphBuilder truth, real family facts.
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3"]!;
  assert.ok(model, "the h3 family facts row serves (survivor-id correction 2026-09-22: the checkpoint id, was h3-timeline)");
});

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

describe("the h3-timeline compose gate", () => {
  it("a fresh press (params {}) composes the card's own one-shot document", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({}), model, g, "run_fresh");
    const out = g.toJSON() as Record<string, { class_type: string }>;
    assert.ok(Object.keys(out).length > 0, "the fresh-card document composes real nodes");
  });

  it("one text call composes the film rail (t4_open derivation)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], length: 56 }),
      model, g, "run_open",
    );
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(out).length > 0, "the single-call film composes");
  });

  it("an image-anchored opener rides t4r (the marker node exists)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ ref_image: "/m/ref.png" })], length: 56 }),
      model, g, "run_t4r",
    );
    const out = g.toJSON() as Record<string, { class_type: string }>;
    const classes = Object.values(out).map((n) => n.class_type);
    assert.ok(
      classes.some((c) => c.startsWith("MiniMaxH3")),
      "the image-anchored family marker composes",
    );
  });

  it("multiple calls chain (t4_chain): each call is a window on one rail", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        length: 124,
      }),
      model, g, "run_chain",
    );
    const out = g.toJSON() as Record<string, unknown>;
    assert.ok(Object.keys(out).length > 0, "the chain composes");
  });

  it("THE SECOND-PASS MASTER (2026-09-22, operator: \"it is very unclear if it is on or off\"): off renders the plain pass even when leaves are set; on arms the chain", () => {
    const leaves = { sharpen_enabled: true, interpolate_enabled: true, sr_switch: true } as Record<string, unknown>;
    const switchesOf = (master: boolean) => {
      const g = new GraphBuilder();
      def.compose(def.schema({ calls: [SHOT()], length: 56, second_pass_enabled: master, ...leaves }), model, g, `run_master_${master}`);
      const out = Object.entries(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
        .filter(([, n]) => n.class_type === "ComfySwitchNode") as [string, { class_type: string; inputs: Record<string, unknown> }][];
      return new Map(out.map(([id, n]) => [id, n.inputs["switch"] === true]));
    };
    const off = switchesOf(false);
    const on = switchesOf(true);
    // the master flips EXACTLY the post trio (sharpen/interp/VSR) —
    // every other switch (the r2vBool lane pick, etc.) is untouched
    const flipped = [...off.keys()].filter((id) => off.get(id) === false && on.get(id) === true);
    assert.equal(flipped.length, 3, "master on arms exactly the three post switches");
    for (const id of off.keys()) {
      if (!flipped.includes(id)) assert.equal(on.get(id), off.get(id), `non-post switch ${id} is master-blind`);
    }
    // master off: legacy leaves cannot force a pass
    for (const id of flipped) assert.equal(off.get(id), false, "master off routes the plain path for every post switch");
  });

  it("explicitly-set sharpen leaves ride; absent leaves never patch", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], length: 56, second_pass_enabled: true, sharpen_enabled: true, sharpen_strength: 0.3 }),
      model, g, "run_sharp",
    );
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const sharpen = Object.values(out).find((n) => n.class_type === "ImageSharpenKJ");
    assert.ok(sharpen, "sharpen_enabled composes the RCAS node");
    const grouped = sharpen.inputs["method"] as Record<string, unknown>;
    assert.equal(grouped["strength"], 0.3, "the explicit leaf patches the grouped dict");
  });

  it("schema: variant derivation voices every family arm", () => {
    assert.equal(def.schema({}).variant, "t4_open");
    assert.equal(def.schema({ calls: [SHOT({ ref_image: "/m/r.png" })] }).variant, "t4r");
    const chained = def.schema({
      calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
    });
    assert.ok(["t4_chain", "t4r"].includes(String(chained.variant)), "chains derive a family");
  });

  it("THE DISK-STITCH VALVE (agent-debt F-6c, 2026-09-22, the operator's \"dump to tmp file\"): a multi-window film with NO positioned clips emits windows only — no film node, no accumulation (each window frees after its own SaveVideo; the estate's filmMux owns the film from disk); clips or a single window keep the in-graph stitch", () => {
    const nodeRows = (params: Record<string, unknown>) => {
      const g = new GraphBuilder();
      def.compose(def.schema(params), model, g, "run_valve");
      return Object.entries(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>);
    };
    const savePrefixes = (rows: [string, { class_type: string; inputs: Record<string, unknown> }][]) =>
      rows.filter(([, n]) => n.class_type === "SaveVideo").map(([, n]) => String(n.inputs["filename_prefix"]));
    const windowsDoc = {
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      length: 124,
    };
    // 1. the valve OPEN: no audio_clips → no film SaveVideo, no
    //    accumulation, windows still save
    const openRows = nodeRows(windowsDoc);
    assert.ok(!savePrefixes(openRows).includes("h3_t4_film"), "no film file — the estate mux leads from the window files");
    assert.deepEqual(
      savePrefixes(openRows).filter((p) => p.startsWith("h3_t4_w")).sort(),
      ["h3_t4_w1", "h3_t4_w2"],
      "both windows save their own files",
    );
    assert.ok(
      !openRows.some(([, n]) => n.class_type === "MiniMaxH3FiniteSegmentFinalize" && "accumulated_images" in n.inputs),
      "no accumulation node — nothing holds window 1's tensors while window 2 samples (a per-window finalize without accumulated_images may remain — that one is window-local)",
    );
    // 2. the valve CLOSED: positioned clips → the film-level mix rides
    //    in-graph (film SaveVideo + accumulation back)
    const closedRows = nodeRows({
      ...windowsDoc,
      audio_clips: [{ src: "/assets/line.flac", start_frame: 10, dur_frames: 40, text: "hello" }],
    });
    assert.ok(savePrefixes(closedRows).includes("h3_t4_film"), "a positioned clip keeps the in-graph film stitch");
    assert.ok(
      closedRows.some(([, n]) => n.class_type === "MiniMaxH3FiniteSegmentFinalize" && "accumulated_images" in n.inputs),
      "the film accumulation composes for the film-level mix",
    );
    // 3. single window: the compose dispatch (card.ts: the film arm
    //    requires >1 calls) routes it to the frozen window shape —
    //    one artifact (h3_t4_w1), never a mux of one, never a film file
    const singleRows = nodeRows({ calls: [SHOT()], length: 56 });
    assert.deepEqual(savePrefixes(singleRows), ["h3_t4_w1"], "a single-window doc saves exactly one window file — the film arm is multi-call");
  });

  it("THE ONE-MODEL LAW (roadmap §8): the card boards ONE family; the dead families' addresses ride the tool enum as variant routes", async () => {
    const { BOARDED, VARIANT_ADDRESSES } = await import("../src/card.ts");
    assert.deepEqual(BOARDED, ["h3"], "one H3 row in the Model dropdown — the checkpoint id, never a lane (survivor-id correction 2026-09-22: anima isn't anima-generate)");
    assert.deepEqual(
      [...VARIANT_ADDRESSES].sort(),
      ["h3-fl2va", "h3-keyframe", "h3-ref2va", "h3-timeline", "h3-timeline-ref"],
      "every historical address stays agent-reachable (the pre-correction family id h3-timeline rides as the timeline lane's route; h3-fl2va replaces the dead-family route h3)",
    );
  });
});
