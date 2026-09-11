// @melite/image-edit — the card's compose gate (TEST-2 breadth,
// 2026-09-12). TWO admissions (prompt + the anchor image1) plus the
// FIRING REFUSALS (refuseImageEditFiring — every knob whose graph
// this plane does not build refuses loud instead of silently
// plain-editing).
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

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("image-edit")!;
  assert.ok(def, "the composition root serves the image-edit card");
  model = facts.models["qwen-img-edit-2511"]!;
  assert.ok(model, "the qwen-img-edit-2511 facts row serves");
});

describe("the image-edit compose gate", () => {
  it("a missing prompt refuses (WHAT to change, not the whole image)", () => {
    assert.throws(
      () => def.compose(def.schema({ image1: "/m/i.png" }), model, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the image-edit card/,
    );
  });

  it("a missing anchor image1 refuses", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "make it night" }), model, new GraphBuilder(), "r1"),
      /required param 'image1' missing on the image-edit card/,
    );
  });

  it("the firing refusals name the unbuildable graph (no silent plain-edit)", () => {
    const arms: Array<[Record<string, unknown>, RegExp]> = [
      [{ reference_images: ["/m/a.png"] }, /'reference_images' fires .*\(multi-image lists/],
      [{ double_reference: true }, /'double_reference' fires .*\(the second encode/],
      [{ lanpaint_enabled: true }, /'lanpaint_enabled' fires/],
      [{ lanpaint_num_steps: 30 }, /'lanpaint_num_steps' fires .*off its lane promise/],
      [{ lanpaint_step_size: 2 }, /'lanpaint_step_size' fires .*off its lane promise/],
      [{ lanpaint_lambda: 0.9 }, /'lanpaint_lambda' fires .*off its lane promise/],
      [{ lanpaint_beta: 0.9 }, /'lanpaint_beta' fires .*off its lane promise/],
      [{ lanpaint_friction: 0.9 }, /'lanpaint_friction' fires .*off its lane promise/],
      [{ lanpaint_prompt_mode: "positive" }, /'lanpaint_prompt_mode' fires .*off its lane promise/],
      [{ outpaint_top: 64 }, /'outpaint_top' fires .*\(canvas expansion/],
      [{ outpaint_overlap: 32 }, /'outpaint_overlap' fires .*off its lane promise/],
      [{ mask: "/m/mask.png" }, /'mask' fires .*\(the mask flow/],
      [{ input_mask: "/m/m.png" }, /'input_mask' fires .*\(the attached region/],
      [{ mask_mode: "hard" }, /'mask_mode' fires .*off its lane promise/],
      [{ mask_context_pad: 128 }, /'mask_context_pad' fires .*off its lane promise/],
      [{ mask_grow: 16 }, /'mask_grow' fires .*off its lane promise/],
      [{ mask_feather: 16 }, /'mask_feather' fires .*off its lane promise/],
      [{ mask_threshold: 0.5 }, /'mask_threshold' fires .*off its lane promise/],
      [{ mask_invert: true }, /'mask_invert' fires .*off its lane promise/],
    ];
    for (const [over, voice] of arms) {
      assert.throws(
        () => def.compose(def.schema({ prompt: "x", image1: "/m/i.png", ...over }), model, new GraphBuilder(), "r1"),
        voice,
      );
    }
  });

  it("the firing refusals pass the DEFAULT lanes (the blank() law)", () => {
    // the lanpaint/outpaint/mask knobs at their declared defaults
    // do NOT fire — the plain-edit graph builds.
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "make it night", image1: "/m/i.png", lanpaint_num_steps: 20, outpaint_overlap: 16, mask_grow: 8 }),
      model, g, "run_1",
    );
    const graph = g.toJSON();
    assert.ok(graph["TextEncodeQwenImageEditPlus.0"], "the family edit encoder rides");
    assert.ok(graph["LoadImage.0"], "the anchor loads");
  });
});
