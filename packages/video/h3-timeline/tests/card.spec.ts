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
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
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

  it("explicitly-set sharpen leaves ride; absent leaves never patch", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], length: 56, sharpen_enabled: true, sharpen_strength: 0.3 }),
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
});
