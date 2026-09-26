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
import { imageT2I, imageEdit, refuseImageEditFiring, editImageCap, editRefs, orderedInputImages } from "../src/kit.ts";
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
    // THE DECLARED CAP (the max_images law): the lane rides this,
    // never a hardcoded 16.
    max_images: 16,
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
    // THE DECLARED CAP (the max_images law): the stock node takes
    // image1/2/3 — 3 total. The lane rides this, never a hardcoded 2.
    max_images: 3,
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
  it("THE UNIFIED ORDER: legacy named slots merge FIRST, then the stack — refs ride image_2+ contiguously, no gaps, no second concept", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "stacked edit", negative_prompt: "", image1: "in.png", image2: "r2.png", image3: "", reference_images: ["s1.png", "s2.png"], ...SOLVER },
      FACTS_21, g, "probestack",
    );
    const { graph, enc } = encOf(g);
    const loadId = (file: string) => Object.keys(graph).find((id) => graph[id]?.class_type === "LoadImage" && graph[id]?.inputs.image === file);
    assert.ok(enc.inputs["images.image_1"], "anchor on image_1");
    assert.equal((enc.inputs["images.image_2"] as string[])[0], loadId("r2.png"), "the legacy named slot keeps image_2 (named-first merge)");
    assert.equal((enc.inputs["images.image_3"] as string[])[0], loadId("s1.png"), "a blank image3 leaves NO gap — the first stack entry shifts to image_3");
    assert.equal((enc.inputs["images.image_4"] as string[])[0], loadId("s2.png"), "second stack entry on image_4");
    assert.equal(enc.inputs["images.image_5"], undefined, "nothing past the stated order");
    assert.equal(Object.values(graph).filter((n) => n.class_type === "LoadImage").length, 4, "anchor + named + two stack entries load");
  });
  it("stack-only refs start at image_2 (the unified order needs no legacy slot)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "stack only", image1: "in.png", reference_images: ["s1.png", "s2.png"], ...SOLVER },
      FACTS_21, g, "probestackonly",
    );
    const { graph, enc } = encOf(g);
    const loadId = (file: string) => Object.keys(graph).find((id) => graph[id]?.class_type === "LoadImage" && graph[id]?.inputs.image === file);
    assert.equal((enc.inputs["images.image_2"] as string[])[0], loadId("s1.png"), "first stack entry on image_2");
    assert.equal((enc.inputs["images.image_3"] as string[])[0], loadId("s2.png"), "second stack entry on image_3");
  });
  it("blank stack entries contribute no input (the blank() law)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "blank stack", image1: "in.png", reference_images: ["", "  ", "s3.png"], ...SOLVER },
      FACTS_21, g, "probeblank",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_2"], "the first stated entry rides image_2");
    assert.equal(enc.inputs["images.image_3"], undefined, "blanks shift nothing after them");
  });
  it("THE CEILING: more than the node's 16 image inputs refuses field-named (agents bypass the form cap)", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => imageEdit(
        { prompt: "too many", image1: "in.png", image2: "r2.png", image3: "r3.png", reference_images: Array.from({ length: 14 }, (_, i) => `s${i}.png`), ...SOLVER },
        FACTS_21, g, "probeceiling",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'input_images'") && err.message.includes("17"),
    );
  });
  it("THE CEILING counts the whole list (a 16-entry list plus the anchor refuses — 17 past 16)", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => imageEdit(
        { prompt: "stack too tall", input_images: ["in.png", ...Array.from({ length: 16 }, (_, i) => `s${i}.png`)], ...SOLVER },
        FACTS_21, g, "probeceilingstack",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'input_images'") && err.message.includes("17"),
    );
  });
  it("THE MERGE (2026-10-10): input_images IS the list — anchor position 0, refs contiguous from image_2, same graph as the legacy spelling", () => {
    const canonical = new GraphBuilder({});
    imageEdit(
      { prompt: "one list", input_images: ["in.png", "r2.png", "r3.png", "s4.png"], ...SOLVER },
      FACTS_21, canonical, "probemerge",
    );
    const legacy = new GraphBuilder({});
    imageEdit(
      { prompt: "one list", image1: "in.png", image2: "r2.png", image3: "r3.png", reference_images: ["s4.png"], ...SOLVER },
      FACTS_21, legacy, "probemerge",
    );
    const c = encOf(canonical).enc.inputs;
    const l = encOf(legacy).enc.inputs;
    for (const k of ["images.image_1", "images.image_2", "images.image_3", "images.image_4"]) {
      assert.ok(c[k], `canonical rides ${k}`);
      assert.deepEqual(c[k], l[k], `canonical and legacy agree on ${k} — ONE list, two spellings`);
    }
  });
  it("THE MIGRATION LAW: a stated input_images WINS over legacy keys still riding an old draft", () => {
    // The refusal was the wrong law — it fired on the operator's
    // own drafts (image1 hidden under the new face, input_images
    // added on top). The one list wins; legacy folds away.
    const folded = orderedInputImages({ input_images: ["in.png"], reference_images: ["r.png"], image1: "stale.png" });
    assert.deepEqual(folded, ["in.png"], "canonical wins — legacy keys fold away, never co-serve");
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "both spellings", input_images: ["in.png", "r.png"], image1: "stale.png", ...SOLVER },
      FACTS_21, g, "probemix",
    );
    const pure = new GraphBuilder({});
    imageEdit(
      { prompt: "both spellings", input_images: ["in.png", "r.png"], ...SOLVER },
      FACTS_21, pure, "probemix",
    );
    assert.deepEqual(
      Object.keys(encOf(g).enc.inputs).filter((k) => k.startsWith("images.")),
      Object.keys(encOf(pure).enc.inputs).filter((k) => k.startsWith("images.")),
      "the mixed row composes the exact canonical graph — the stale anchor never reaches a slot",
    );
    assert.deepEqual(orderedInputImages({ input_images: ["in.png", "  ", "r.png"] }), ["in.png", "r.png"], "blanks drop quietly from the canonical list");
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
  it("a 15-entry stack alone fills the ceiling exactly (anchor + 15 = 16)", () => {
    const g = new GraphBuilder({});
    imageEdit(
      { prompt: "full stack", image1: "in.png", reference_images: Array.from({ length: 15 }, (_, i) => `s${i}.png`), ...SOLVER },
      FACTS_21, g, "probefullstack",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_16"], "the fifteenth stack entry rides image_16");
    assert.equal(enc.inputs["images.image_17"], undefined, "nothing past the ceiling");
  });
});

describe("editImageCap (the max_images law — the lane rides the DECL, never a hardcoded count)", () => {
  it("a declared cap wins on every lane", () => {
    assert.equal(editImageCap(FACTS_21), 16, "2.1 declares 16");
    assert.equal(editImageCap(FACTS_2511), 3, "2511 declares 3");
  });
  it("lanes that never declared capacity ride the narrow end (loud-safe: over-refusal names the lane, never a silent drop)", () => {
    const noCap21 = { lane_inputs: { text_encode_node: "TextEncodeQwenImage21" } };
    const noCapStock = { lane_inputs: { text_encode_node: "SomethingElse" } };
    assert.equal(editImageCap(noCap21 as never), 3, "an undeclared lane gets the narrow end even when 2.1-shaped");
    assert.equal(editImageCap(noCapStock as never), 3, "an undeclared stock-shaped lane opens 3");
    assert.equal(editImageCap(undefined), 3, "an absent model falls back to the narrow end");
    assert.equal(editImageCap({} as never), 3, "malformed facts (no lane_inputs) fall back instead of crashing");
  });
  it("garbage caps fall back instead of breaking the ceiling", () => {
    for (const bad of ["16", 0, -4, NaN, null]) {
      assert.equal(editImageCap({ lane_inputs: { max_images: bad } } as never), 3, `max_images ${String(bad)} falls back`);
    }
    assert.equal(editImageCap({ lane_inputs: { max_images: 16.9 } } as never), 16, "a fractional cap floors");
  });

  it("garbage refs refuse LOUD (the never-drop law covers direct lane callers)", () => {
    assert.throws(() => editRefs({ image2: 42 }), /'image2' fires .*expected an image path string/,
      "a non-string named slot refuses instead of dropping");
    assert.throws(() => editRefs({ reference_images: "s1.png" as never }), /'reference_images' fires .*expected a list/,
      "a non-list stack refuses instead of ignoring");
    assert.throws(() => editRefs({ reference_images: ["s1.png", 7] as never }), /'reference_images' fires .*expected an image path string/,
      "a non-string stack entry refuses instead of dropping");
    assert.deepEqual(editRefs({ image2: "", image3: "  ", reference_images: [] }), [], "blanks still drop quietly");
  });

  it("the gate holds the absent-model law (any stated REFERENCE refuses with no model pinned — the anchor alone is lane-agnostic)", () => {
    assert.throws(() => refuseImageEditFiring({ input_images: ["/m/in.png", "/m/a.png"] }),
      /'input_images' fires .*no model pinned/, "anchor + one ref with no model refuses");
    assert.throws(() => refuseImageEditFiring({ image1: "/m/in.png", image2: "/m/garment.png" }),
      /'input_images' fires .*no model pinned/, "anchor + one legacy named ref with no model refuses");
    refuseImageEditFiring({ input_images: ["/m/in.png"] });
    refuseImageEditFiring({ image1: "/m/in.png" });
    refuseImageEditFiring({ mask: [{ input_mask: "m.png" }] });
  });
});

// ── THE LANPAINT NEVER-LIE GAP (roadmap §10, the second wave;
// re-scoped 2026-09-22) ── the lanpaint INLINE-INPAINT arm rides the
// 2511 lane only; auto+mask on 2.1 refuses field-named (the voice
// teaches crop_stitch). The REGION DETAILER (crop_stitch) itself now
// rides BOTH lanes — the operator's call: 2.1 is the edit model.
describe("the 2.1 edit lane — the lanpaint region never lies", () => {
  const SOLVER21 = { width: 1024, height: 1024, seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" };
  const SOLVER2511 = { seed: 3, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" };
  it("full_frame and auto share the 2.1 whole-image graph", () => {
    const auto = new GraphBuilder({});
    const fullFrame = new GraphBuilder({});
    const params = { prompt: "fix the badge", image1: "in.png", ...SOLVER21 };
    refuseImageEditFiring({ ...params, mask_mode: "auto" }, FACTS_21);
    refuseImageEditFiring({ ...params, mask_mode: "full_frame" }, FACTS_21);
    imageEdit({ ...params, mask_mode: "auto" }, FACTS_21, auto, "probe-alias-21");
    imageEdit({ ...params, mask_mode: "full_frame" }, FACTS_21, fullFrame, "probe-alias-21");
    assert.deepEqual(graphOf(auto), graphOf(fullFrame));
    assert.ok(Object.values(graphOf(fullFrame)).some((node) => node.class_type === "KSampler"));
    assert.ok(!Object.values(graphOf(fullFrame)).some((node) => node.class_type === "DetailerForEach"));
  });
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
  it("crop_stitch on the 2.1 lane BUILDS the region detailer on the cache model (the operator's lane, 2026-09-22: '2511 is the legacy model… 2.1 is the new Qwen edit model')", () => {
    const g = new GraphBuilder({});
    // NO width/height: the detailer path builds no target latent (the
    // gate refuses them field-named — see the next row).
    imageEdit(
      { prompt: "new jacket", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", mask_mode: "crop_stitch", mask_detector: "person" },
      FACTS_21, g, "probe-crop-21",
    );
    const graph = graphOf(g) as Record<string, { class_type?: string, inputs?: Record<string, unknown> }>;
    const byClass = (c: string) => Object.values(graph).filter((n) => n.class_type === c);
    assert.equal(byClass("QwenImage21Cache").length, 1, "the unet rides the cache wrapper");
    assert.equal(byClass("TextEncodeQwenImage21").length, 1, "the 2.1 encoder conditions the crops");
    assert.equal(byClass("UltralyticsDetectorProvider").length, 1, "the detector weights load");
    assert.equal(byClass("SegmDetectorSEGS").length, 1, "person rides the segm detector");
    const detail = byClass("DetailerForEach")[0]!;
    const cacheId = Object.keys(graph).find((id) => graph[id]?.class_type === "QwenImage21Cache")!;
    const encId = Object.keys(graph).find((id) => graph[id]?.class_type === "TextEncodeQwenImage21")!;
    assert.equal((detail.inputs!.model as string[])[0], cacheId, "the detailer samples the CACHE-WRAPPED model");
    assert.equal((detail.inputs!.positive as string[])[0], encId, "positive rides the encoder");
    assert.equal((detail.inputs!.positive as string[])[1], 0, "positive rides out 0");
    assert.equal((detail.inputs!.negative as string[])[1], 1, "negative rides the encoder's out 1");
    assert.deepEqual(byClass("SaveImage")[0]!.inputs!.images, [Object.keys(graph).find((id) => graph[id]?.class_type === "DetailerForEach"), 0], "the IMAGE output saves directly — no decode");
    assert.equal(byClass("EmptyLatentImage").length, 0, "the detailer path builds no target latent");
    assert.equal(byClass("KSampler").length, 0, "no plain sampler beside the arm");
    assert.equal(byClass("VAEEncode").length, 0, "this lane never encodes the source");
    assert.equal(byClass("VAEDecode").length, 0, "no decode under an IMAGE output");
  });
  it("width/height on a 2.1 crop_stitch run refuse field-named (the detailer owns the crop size — a stated value would wire to nothing)", () => {
    assert.throws(
      () => refuseImageEditFiring(
        { prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", mask_mode: "crop_stitch", mask_detector: "face", width: 1024, height: 1024 },
        FACTS_21,
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'width' fires") && err.message.includes("clear them"),
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
