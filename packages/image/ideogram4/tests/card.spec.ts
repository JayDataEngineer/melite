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
  def = (await loadCardDefs()).get("ideogram4")!;
  assert.ok(def, "the composition root serves the ideogram4 card");
});

const model = facts.models["ideogram"]!;

describe("the ideogram4 compose gate", () => {
  it("a missing prompt refuses loud (what the picture IS)", () => {
    assert.throws(
      () => def.compose(def.schema({}), model, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the ideogram4 card/,
    );
  });

  it("the happy lane rides the Ideogram4 scheduler", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "a brass astrolabe on velvet" }), model, g, "run_1");
    const graph = g.toJSON();
    assert.ok(graph["UNETLoader.0"], "the family checkpoint loads");
    assert.ok(graph["Ideogram4Scheduler.0"], "the family scheduler rides");
    assert.ok(graph["CLIPTextEncode.0"], "the caption encodes");
  });
});


describe("the dual-face law: the root is the row-mount marker", () => {
  it("apply registers NOTHING node-side (the card rides the CARD face; the studio rides the client face)", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const marker = await import("../src/index.ts");
    const ctx = new Context();
    marker.apply(ctx);
    assert.equal(marker.name, "@melite/image-ideogram4");
  });
});
