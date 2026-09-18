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
  def = (await loadCardDefs()).get("tagger")!;
  assert.ok(def, "the composition root serves the tagger card");
});

const wd14 = facts.models["wd14"]!;

describe("the tagger compose gate", () => {
  it("a missing/blank input_image refuses (nothing to tag is a refusal)", () => {
    assert.throws(
      () => def.compose(def.schema({}), wd14, new GraphBuilder(), "r1"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: " " }), wd14, new GraphBuilder(), "r1"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
    // a NON-string input meets the schema walk first — the gate
    // refuses the wrong type LOUD (same refusal class, earlier voice;
    // the door overlays explicit params verbatim, so raw composes
    // with non-strings arrive here ungated no longer).
    assert.throws(
      () => def.compose({ input_image: 5 }, wd14, new GraphBuilder(), "r1"),
      /input_image|expected string/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope threshold refuses loud (declared 0–1), never composes", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", threshold: 5 }, wd14, new GraphBuilder(), "r_oob"),
      /threshold|5|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed threshold refuses loud (declared number)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", threshold: "high" }, wd14, new GraphBuilder(), "r_wt"),
      /threshold|expected number/i,
    );
  });

  it("THE SCHEMA GATE: unstated thresholds arrive as the declared defaults 0.35/0.85 (the walk fills them)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png" }, wd14, g, "r_def");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const tagger = Object.values(graph).find((n) => n.class_type?.startsWith("WD14"));
    assert.ok(tagger, "the wd14 tagger rides the fresh doc");
    assert.equal(tagger.inputs.threshold, 0.35,
      "the fresh doc composes the schema-declared default threshold 0.35, not undefined");
    assert.equal(tagger.inputs.character_threshold, 0.85,
      "the fresh doc composes the schema-declared default character_threshold 0.85, not undefined");
  });

  it("the happy lane loads and tags (wd14)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png" }), wd14, g, "run_1");
    const graph = g.toJSON();
    assert.ok(graph["LoadImage.0"], "the image loads");
    assert.ok(Object.values(graph).some((n) => n.class_type.startsWith("WD14")), "the wd14 tagger rides");
  });
});
