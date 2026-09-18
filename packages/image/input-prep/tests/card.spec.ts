import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
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
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("input-prep")!;
  assert.ok(def, "the composition root serves the input-prep card");
});

describe("the input-prep compose gate", () => {
  it("a missing source refuses (staged source is the lane's whole input)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
    assert.throws(
      () => def.compose(def.schema({ source: "  " }), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed source refuses loud (declared a string path)", () => {
    assert.throws(
      () => def.compose({ source: 42 }, DUMMY, new GraphBuilder(), "r_type"),
      /source/,
    );
  });

  it("THE SCHEMA GATE: the admits overlay rides the gated doc inert (a crop row still crops)", () => {
    const g = new GraphBuilder();
    def.compose(
      { source: "upload.png", crop: { x: 0, y: 0, width: 64, height: 64 } },
      DUMMY, g, "run_crop",
    );
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((n) => n.class_type === "ImageCrop"), "the crop row survives the gate");
  });

  it("the happy lane stages the source for the chain", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png" }), DUMMY, g, "run_1");
    const graph = g.toJSON();
    // the staged-source restage lane: load + save with the run prefix
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage");
    assert.ok(save, "the restage saves");
    assert.match(String(save!.inputs.filename_prefix), /run_1/);
  });
});
