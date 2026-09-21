// @melite/comfyui-card-kit — THE 2.1 LANE WALLS (the Comfy-Org
// Qwen-Image-2.1 release, operator 2026-09-21). The graph IS the
// unit: the official template topology proven node-by-node on both
// lanes — t2i (ONE TextEncodeQwenImage21 emitting pos+neg from
// outputs 0/1, EmptyLatentImage at card resolution) and edit
// (QwenImage21Cache wrapping the SAME unet, anchors through the
// encoder's image_N autogrow slots, target-resolution latent —
// never the 2511 VAEEncode-of-source). The never-lie guard: a
// stated width/height on the 2511 lane refuses field-named.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { imageT2I, imageEdit, refuseImageEditFiring } from "../src/kit.ts";
import { GraphBuilder } from "../src/graph.ts";

const FACTS_21 = {
  id: "qwen-img-21", card: "image-gen", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: [],
  lane_inputs: {
    unet: "qwen_image_2.1_int8_convrot.safetensors",
    vae: "qwen_image_2.1_vae_bf16.safetensors",
    text_encoder: "qwen3vl_8b_int8_convrot.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptyLatentImage",
    text_encode_node: "TextEncodeQwenImage21",
  },
} as never;

const FACTS_2511 = {
  id: "qwen-img-edit-2511", card: "image-edit", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: [],
  lane_inputs: {
    unet: "qwen_image_edit_2511_int8_convrot.safetensors",
    vae: "qwen_image_vae.safetensors",
    text_encoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptySD3LatentImage",
  },
} as never;

const PARAMS_T2I = {
  prompt: "a quiet hallway", negative_prompt: "blur", width: 1280, height: 768,
  seed: 7, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple",
};

const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the 2.1 t2i lane (imageT2I on a text_encode_node=TextEncodeQwenImage21 model)", () => {
  it("emits the official template graph: ONE 2.1 encoder node carrying pos+neg, target latent, KSampler, decode-save under <run>/gen", () => {
    const g = new GraphBuilder({});
    imageT2I(PARAMS_T2I, FACTS_21, g, "probe21");
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

describe("the 2.1 edit lane (imageEdit on a text_encode_node=TextEncodeQwenImage21 model)", () => {
  it("emits the cached-reference graph: QwenImage21Cache around the SAME unet, anchors through the encoder's image_N slots, target-resolution EmptyLatentImage — and NEVER the 2511 VAEEncode-of-source", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "make it dusk", negative_prompt: "", image1: "in.png", image2: "ref.png", image3: "", width: 1024, height: 1024, seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probeedit21",
    );
    const nodes: Array<{ class_type: string; inputs: Record<string, unknown> }> = Object.values(graphOf(g));
    const byClass = (c: string) => nodes.filter((n) => n.class_type === c);
    // THE CACHE — the 2.1 edit's signature: wraps the loaded unet
    const cache = byClass("QwenImage21Cache");
    assert.equal(cache.length, 1);
    assert.equal(cache[0].inputs.device, "auto");
    assert.equal(cache[0].inputs.dtype, "default");
    const unetId = Object.keys(graphOf(g)).find((id) => graphOf(g)[id]?.class_type === "UNETLoader");
    assert.equal((cache[0].inputs.model as string[])[0], unetId, "the cache wraps the SAME base unet");
    // the sampler rides the CACHED model, never the bare unet
    const sampler = byClass("KSampler")[0];
    const cacheId = Object.keys(graphOf(g)).find((id) => graphOf(g))[0] && Object.keys(graphOf(g)).find((id) => graphOf(g)[id]?.class_type === "QwenImage21Cache");
    assert.equal((sampler.inputs.model as string[])[0], cacheId);
    // the anchors ride the encoder's autogrow slots (image_1, image_2; NO image_3 when blank)
    const enc = byClass("TextEncodeQwenImage21")[0];
    assert.ok(enc.inputs['images.image_1'], "the anchor rides image_1");
    assert.ok(enc.inputs['images.image_2'], "the stated second slot rides image_2");
    assert.equal(enc.inputs['images.image_3'], undefined, "a blank third slot contributes NO input at all (stable)");
    assert.ok(enc.inputs.vae, "the encoder's optional vae rides (reference latents splice)");
    // target-resolution latent, never VAEEncode of the source
    assert.equal(byClass("VAEEncode").length, 0, "the 2.1 edit NEVER VAEEncodes the source (the 2511 lane's move)");
    assert.equal(byClass("EmptyLatentImage")[0].inputs.width, 1024);
    const save = byClass("SaveImage")[0];
    assert.equal(save.inputs.filename_prefix, "probeedit21/edit");
  });
  it("THE NEVER-LIE GUARD: width/height stated on the 2511 lane refuses field-named (they wire to nothing there)", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => imageEdit(
        { prompt: "x", negative_prompt: "", image1: "in.png", width: 1024, height: 768, seed: 1, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" },
        FACTS_2511, g, "probe-never-lie",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'width'/'height' fire on the image-edit card only on the Qwen Image 2.1 lane"),
    );
  });
});

describe("the 2.1 edit lane — full autogrow coverage (both optional slots stated)", () => {
  it("image2 AND image3 stated: both ride the encoder's image_2/image_3 slots", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "swap the sky", negative_prompt: "artifacts", image1: "in.png", image2: "ref2.png", image3: "ref3.png", width: 768, height: 1280, seed: 9, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probe21both",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the 2.1 encoder renders");
    assert.ok(enc!.inputs['images.image_1'], "anchor on image_1");
    assert.ok(enc!.inputs['images.image_2'], "second slot on image_2");
    assert.ok(enc!.inputs['images.image_3'], "third slot on image_3");
    assert.equal(enc!.inputs.negative_prompt, "artifacts");
    const latent = Object.values(graph).find((n) => n.class_type === "EmptyLatentImage");
    assert.equal(latent!.inputs.width, 768);
    assert.equal(latent!.inputs.height, 1280);
  });
});

describe("the 2.1 lanes — bare-doc arms (every ?? fallback walked)", () => {
  it("t2i without negative_prompt: the encoder's negative arm rides empty text", () => {
    const g = new GraphBuilder({});
    imageT2I(
      { prompt: "bare", width: 512, height: 512, seed: 2, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probe21bare",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.equal(enc!.inputs.negative_prompt, "");
  });
  it("edit without width/height/negative_prompt: target latent falls to 1024 square, negative empty", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "bare edit", image1: "in.png", seed: 4, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probeeditbare",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.equal(enc!.inputs.negative_prompt, "");
    const latent = Object.values(graph).find((n) => n.class_type === "EmptyLatentImage");
    assert.equal(latent!.inputs.width, 1024);
    assert.equal(latent!.inputs.height, 1024);
  });
});

describe("the 2.1 edit lane — unstated solver arms (the || lane defaults)", () => {
  it("sampler/scheduler absent: the lane defaults euler/simple ride (never empty strings)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "no solver stated", image1: "in.png", width: 640, height: 640, seed: 5, steps: 25, cfg: 1 },
      FACTS_21, g, "probe21nosolver",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.equal(sampler!.inputs.sampler_name, "euler");
    assert.equal(sampler!.inputs.scheduler, "simple");
  });
});

describe("the 2.1 edit lane — the reference stack (upstream: the node opens image inputs as filled, up to 16)", () => {
  const SOLVER = { width: 1024, height: 1024, seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" };
  const encOf = (g: GraphBuilder) => {
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the 2.1 encoder renders");
    return { graph, enc: enc! };
  };
  it("reference_images ride the encoder's image_4+ slots in order, after the named slots", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "stacked edit", negative_prompt: "", image1: "in.png", image2: "r2.png", image3: "", reference_images: ["s1.png", "s2.png"], ...SOLVER },
      FACTS_21, g, "probestack",
    );
    const { graph, enc } = encOf(g);
    const loadId = (file: string) => Object.keys(graph).find((id) => graph[id]?.class_type === "LoadImage" && graph[id]?.inputs.image === file);
    assert.ok(enc.inputs["images.image_1"], "anchor on image_1");
    assert.equal((enc.inputs["images.image_2"] as string[])[0], loadId("r2.png"), "the named second slot keeps image_2 (byte-stable)");
    assert.equal(enc.inputs["images.image_3"], undefined, "blank image3 still contributes nothing");
    assert.equal((enc.inputs["images.image_4"] as string[])[0], loadId("s1.png"), "first stack entry on image_4");
    assert.equal((enc.inputs["images.image_5"] as string[])[0], loadId("s2.png"), "second stack entry on image_5");
    assert.equal(Object.values(graph).filter((n) => n.class_type === "LoadImage").length, 4, "anchor + named + two stack entries load");
  });
  it("blank stack entries contribute no input (the blank() law)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "blank stack", image1: "in.png", reference_images: ["", "  ", "s3.png"], ...SOLVER },
      FACTS_21, g, "probeblank",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_4"], "the first stated entry rides image_4");
    assert.equal(enc.inputs["images.image_5"], undefined, "blanks shift nothing after them");
  });
  it("THE CEILING: more than the node's 16 image inputs refuses field-named (agents bypass the form cap)", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => imageEdit(
        { prompt: "too many", image1: "in.png", image2: "r2.png", image3: "r3.png", reference_images: Array.from({ length: 14 }, (_, i) => `s${i}.png`), ...SOLVER },
        FACTS_21, g, "probeceiling",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'reference_images'") && err.message.includes("16"),
    );
  });
  it("exactly 16 total composes (the boundary rides)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "full house", image1: "in.png", image2: "r2.png", image3: "r3.png", reference_images: Array.from({ length: 13 }, (_, i) => `s${i}.png`), ...SOLVER },
      FACTS_21, g, "probefull",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_16"], "the thirteenth stack entry rides image_16");
    assert.equal(enc.inputs["images.image_17"], undefined, "nothing past the ceiling");
  });
});

// ── THE LANPAINT NEVER-LIE GAP (roadmap §10, the second wave) ──
// the lanpaint arm rides the 2511 lane only; the 2.1 lane's early
// return would silently plain-edit a stated region — the exact
// lying-stack crime the firing law bans. A stated input_mask (or a
// single-entry mask bag) on the 2.1 lane REFUSES field-named.
describe("the 2.1 edit lane — the lanpaint region never lies", () => {
  const SOLVER21 = { width: 1024, height: 1024, seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" };
  const SOLVER2511 = { seed: 3, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" };
  it("input_mask stated on the 2.1 lane refuses field-named (no lanpaint sampler on this base — never a silent plain edit)", () => {
    const g = new GraphBuilder({});
    const params21 = { prompt: "fix the badge", image1: "in.png", input_mask: "mask.png", ...SOLVER21 };
    // the card's own composition: the firing gate runs PRE-compose
    assert.throws(
      () => refuseImageEditFiring(params21, FACTS_21),
      (err: unknown): boolean =>
        err instanceof Error
        && err.message.includes("'input_mask' fires on the image-edit card")
        && err.message.includes("2511"),
    );
  });
  it("a single-entry mask bag refuses the same (the bag's region counts as stated)", () => {
    const g = new GraphBuilder({});
    const paramsBag = { prompt: "fix the badge", image1: "in.png", mask: [{ input_mask: "mask.png" }], ...SOLVER21 };
    assert.throws(
      () => refuseImageEditFiring(paramsBag, FACTS_21),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'input_mask'"),
    );
  });
  it("the same mask on the 2511 lane still fires the lanpaint arm (the refusal is lane-scoped, never global)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "fix the badge", image1: "in.png", input_mask: "mask.png", ...SOLVER2511 },
      FACTS_2511, g, "probe-mask-2511",
    );
    const nodes: Array<{ class_type: string }> = Object.values(graphOf(g));
    assert.ok(nodes.some((n) => n.class_type.startsWith("LanPaint")), "the 2511 lane builds the lanpaint sampler");
  });
});
