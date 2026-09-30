// @melite/models-qwen-img-21 — THE 2.1 T2I LANE'S LAWS, at their new
// home (the kit-arm retirement, 2026-09-30). The lane is composed by
// this family's declared action, so its walls live here: the official
// template topology (ONE TextEncodeQwenImage21 emitting pos+neg from
// outputs 0/1, EmptyLatentImage at card resolution) and the bare-doc
// arm's empty negative. The graph is pinned to committed goldens in
// action.spec.ts; these cases pin the topology node by node. The edit
// half of the old kit wall lives in
// packages/models/qwen-img-edit-21/tests/lane-laws.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { t2i } from "../src/actions.ts";
import { DECL } from "../src/index.ts";

const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS = {
  id: DECL.id,
  card: "image-gen",
  defaults: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
  lane_inputs: (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs,
} as unknown as ModelFacts;

const PARAMS_T2I = {
  prompt: "a quiet hallway", negative_prompt: "blur", width: 1280, height: 768,
  seed: 7, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple",
};

const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the 2.1 t2i lane (imageT2I on a text_encode_node=TextEncodeQwenImage21 model)", () => {
  it("emits the official template graph: ONE 2.1 encoder node carrying pos+neg, target latent, KSampler, decode-save under <run>/gen", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, PARAMS_T2I, FACTS, g, "probe21");
    const nodes: Array<{ class_type: string; inputs: Record<string, unknown> }> = Object.values(graphOf(g));
    const byClass = (c: string) => nodes.filter((n) => n.class_type === c);
    // the loaders
    assert.equal(byClass("UNETLoader").length, 1);
    assert.equal(byClass("UNETLoader")[0].inputs.unet_name, "qwen_image_2.1_int8_convrot.safetensors");
    assert.equal(byClass("CLIPLoader")[0].inputs.type, "qwen_image");
    // THE 2.1 ENCODER: exactly ONE, with BOTH texts on it (outputs
    // [CONDITIONING, CONDITIONING, LATENT] — the negative rides out 1)
    const enc = byClass("TextEncodeQwenImage21");
    assert.equal(enc.length, 1);
    assert.equal(enc[0].inputs.prompt, "a quiet hallway");
    assert.equal(enc[0].inputs.negative_prompt, "blur");
    assert.equal(enc[0].inputs.resolution, 1024);
    // no legacy CLIPTextEncode pair on this lane
    assert.equal(byClass("CLIPTextEncode").length, 0);
    // the latent + sampler wiring
    const latent = byClass("EmptyLatentImage")[0];
    assert.equal(latent.inputs.width, 1280);
    assert.equal(latent.inputs.height, 768);
    const sampler = byClass("KSampler")[0];
    const encId = Object.keys(graphOf(g)).find((id) => graphOf(g)[id]?.class_type === "TextEncodeQwenImage21");
    assert.equal(Array.isArray(sampler.inputs.positive) && (sampler.inputs.positive as string[])[0], encId);
    assert.equal(Array.isArray(sampler.inputs.negative) && (sampler.inputs.negative as string[])[0], encId);
    assert.equal((sampler.inputs.positive as string[])[1], 0, "positive rides output 0");
    assert.equal((sampler.inputs.negative as string[])[1], 1, "negative rides output 1 — the node's second CONDITIONING");
    assert.equal(sampler.inputs.steps, 25);
    assert.equal(sampler.inputs.cfg, 1);
    // the save prefix
    const save = byClass("SaveImage")[0];
    assert.equal(save.inputs.filename_prefix, "probe21/gen");
  });
});



describe("the 2.1 lanes — bare-doc arms (every ?? fallback walked)", () => {
  it("t2i without negative_prompt: the encoder's negative arm rides empty text", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i,
      { prompt: "bare", width: 512, height: 512, seed: 2, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS, g, "probe21bare",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.equal(enc!.inputs.negative_prompt, "");
  });
});

