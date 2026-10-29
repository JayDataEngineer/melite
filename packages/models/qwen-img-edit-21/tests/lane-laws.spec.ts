// @melite/models-qwen-img-edit-21 — THE 2.1 EDIT LANE'S LAWS, at
// their new home (the kit-arm retirement, 2026-09-30). The lane is
// composed by this family's declared action, so its walls live here
// and not in the card kit: the cached-reference topology (never the
// 2511 VAEEncode-of-source), the autogrow image_N slots, the unified
// reference order, the declared ceiling, the never-lie guard, the
// unstated-solver defaults and the region rules. The graph
// itself is pinned to committed goldens in action.spec.ts; these cases
// pin the LAWS that shape it. (The t2i half of the old kit wall and
// editImageCap's own law stay kit-side: the t2i lane is not retired
// yet and the cap reader is kit admission, not lane.)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { refuseImageEditFiring, editImageCap, editRefs, orderedInputImages, instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { edit } from "../src/actions.ts";
import { DECL } from "../src/index.ts";

// THE DECL's own lane_inputs are the row the door hands compose (the
// registry owns lane truth — a hand-copied row here would be a second
// truth the moment a weight is renamed).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS_21 = {
  id: DECL.id,
  card: "image-edit",
  defaults: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
  lane_inputs: (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs,
} as unknown as ModelFacts;

const FACTS_2511 = {
  id: "qwen-img-edit-2511", card: "image-edit", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: [],
  lane_inputs: {
    unet: "qwen_image_edit_2511_int8_convrot.safetensors",
    vae: "qwen_image_vae.safetensors",
    text_encoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptySD3LatentImage",
    max_images: 3,
  },
} as unknown as ModelFacts;

const PARAMS_T2I = {
  prompt: "a quiet hallway", negative_prompt: "blur",
  seed: 7, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple",
};

const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the 2.1 edit lane (imageEdit on a text_encode_node=TextEncodeQwenImage21 model)", () => {
  it("emits the cached-reference graph: QwenImage21Cache around the SAME unet, anchors through the encoder's image_N slots, KSampler on the ENCODER'S OWN latent — and NEVER the 2511 VAEEncode-of-source", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "make it dusk", negative_prompt: "", image1: "in.png", image2: "ref.png", image3: "", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
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
    const cacheId = Object.keys(graphOf(g)).find((id) => graphOf(g)[id]?.class_type === "QwenImage21Cache");
    assert.equal((sampler.inputs.model as string[])[0], cacheId);
    // the anchors ride the encoder's autogrow slots (image_1, image_2; NO image_3 when blank)
    const enc = byClass("TextEncodeQwenImage21")[0];
    assert.ok(enc.inputs['images.image_1'], "the anchor rides image_1");
    assert.ok(enc.inputs['images.image_2'], "the stated second slot rides image_2");
    assert.equal(enc.inputs['images.image_3'], undefined, "a blank third slot contributes NO input at all (stable)");
    assert.ok(enc.inputs.vae, "the encoder's optional vae rides (reference latents splice)");
    // the encoder's own latent, never VAEEncode of the source and
    // never a stated-size EmptyLatentImage (the latent law)
    assert.equal(byClass("VAEEncode").length, 0, "the 2.1 edit NEVER VAEEncodes the source (the 2511 lane's move)");
    assert.equal(byClass("EmptyLatentImage").length, 0, "no stated-size latent — KSampler rides the encoder's third output");
    assert.equal((sampler.inputs.latent_image as string[])[0],
      Object.keys(graphOf(g)).find((id) => graphOf(g)[id]?.class_type === "TextEncodeQwenImage21"),
      "the latent wire is the encoder's");
    const save = byClass("SaveImage")[0];
    assert.equal(save.inputs.filename_prefix, "probeedit21/edit");
  });
});


describe("the 2.1 edit lane — full autogrow coverage (both optional slots stated)", () => {
  it("image2 AND image3 stated: both ride the encoder's image_2/image_3 slots", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "swap the sky", negative_prompt: "artifacts", image1: "in.png", image2: "ref2.png", image3: "ref3.png", seed: 9, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probe21both",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the 2.1 encoder renders");
    assert.ok(enc!.inputs['images.image_1'], "anchor on image_1");
    assert.ok(enc!.inputs['images.image_2'], "second slot on image_2");
    assert.ok(enc!.inputs['images.image_3'], "third slot on image_3");
    assert.equal(enc!.inputs.negative_prompt, "artifacts");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.match(String(sampler!.inputs?.latent_image), /^TextEncodeQwenImage21/,
      "the latent is the encoder's own — stated sizes refuse (the never-lie arms), the clean compose never carries one");
  });
});


describe("the 2.1 edit lane — the bare-doc arm (every ?? fallback walked)", () => {
  it("edit with no negative_prompt: the encoder's latent samples, negative empty", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "bare edit", image1: "in.png", seed: 4, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS_21, g, "probeeditbare",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.equal(enc!.inputs.negative_prompt, "");
    assert.equal(enc!.inputs.resolution, 0, "the reference budget is 0 — native reference size");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.match(String(sampler!.inputs?.latent_image), /^TextEncodeQwenImage21/, "the encoder's own latent rides");
  });
});

describe("the 2.1 edit lane — unstated solver arms (the || lane defaults)", () => {
  it("sampler/scheduler absent: the lane defaults euler/simple ride (never empty strings)", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "no solver stated", image1: "in.png", seed: 5, steps: 25, cfg: 1 },
      FACTS_21, g, "probe21nosolver",
    );
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.equal(sampler!.inputs.sampler_name, "euler");
    assert.equal(sampler!.inputs.scheduler, "simple");
  });
});


describe("the 2.1 edit lane — the reference stack (upstream: the node opens image inputs as filled, up to 16)", () => {
  const SOLVER = { seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" };
  const encOf = (g: GraphBuilder) => {
    const graph = graphOf(g) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the 2.1 encoder renders");
    return { graph, enc: enc! };
  };
  it("THE UNIFIED ORDER: legacy named slots merge FIRST, then the stack — refs ride image_2+ contiguously, no gaps, no second concept", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
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
    instantiateAction(edit,
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
    instantiateAction(edit,
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
      () => instantiateAction(edit,
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
      () => instantiateAction(edit,
        { prompt: "stack too tall", input_images: ["in.png", ...Array.from({ length: 16 }, (_, i) => `s${i}.png`)], ...SOLVER },
        FACTS_21, g, "probeceilingstack",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'input_images'") && err.message.includes("17"),
    );
  });
  it("THE MERGE (2026-10-10): input_images IS the list — anchor position 0, refs contiguous from image_2, same graph as the legacy spelling", () => {
    const canonical = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "one list", input_images: ["in.png", "r2.png", "r3.png", "s4.png"], ...SOLVER },
      FACTS_21, canonical, "probemerge",
    );
    const legacy = new GraphBuilder({});
    instantiateAction(edit,
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
    instantiateAction(edit,
      { prompt: "both spellings", input_images: ["in.png", "r.png"], image1: "stale.png", ...SOLVER },
      FACTS_21, g, "probemix",
    );
    const pure = new GraphBuilder({});
    instantiateAction(edit,
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
    instantiateAction(edit,
      { prompt: "full house", image1: "in.png", image2: "r2.png", image3: "r3.png", reference_images: Array.from({ length: 13 }, (_, i) => `s${i}.png`), ...SOLVER },
      FACTS_21, g, "probefull",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_16"], "the thirteenth stack entry rides image_16");
    assert.equal(enc.inputs["images.image_17"], undefined, "nothing past the ceiling");
  });
  it("a 15-entry stack alone fills the ceiling exactly (anchor + 15 = 16)", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "full stack", image1: "in.png", reference_images: Array.from({ length: 15 }, (_, i) => `s${i}.png`), ...SOLVER },
      FACTS_21, g, "probefullstack",
    );
    const { enc } = encOf(g);
    assert.ok(enc.inputs["images.image_16"], "the fifteenth stack entry rides image_16");
    assert.equal(enc.inputs["images.image_17"], undefined, "nothing past the ceiling");
  });
});


describe("the 2.1 edit lane — the region never lies", () => {
  const SOLVER21 = { seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple" };
  const SOLVER2511 = { seed: 3, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" };
  it("full_frame and auto share the 2.1 whole-image graph", () => {
    const auto = new GraphBuilder({});
    const fullFrame = new GraphBuilder({});
    const params = { prompt: "fix the badge", image1: "in.png", ...SOLVER21 };
    refuseImageEditFiring({ ...params, mask_mode: "auto" }, FACTS_21);
    refuseImageEditFiring({ ...params, mask_mode: "full_frame" }, FACTS_21);
    instantiateAction(edit, { ...params, mask_mode: "auto" }, FACTS_21, auto, "probe-alias-21");
    instantiateAction(edit, { ...params, mask_mode: "full_frame" }, FACTS_21, fullFrame, "probe-alias-21");
    assert.deepEqual(graphOf(auto), graphOf(fullFrame));
    assert.ok(Object.values(graphOf(fullFrame)).some((node) => node.class_type === "KSampler"));
    assert.ok(!Object.values(graphOf(fullFrame)).some((node) => node.class_type === "DetailerForEach"));
  });
  it("input_mask stated on the 2.1 lane refuses field-named (no lane inpaints in place — state crop_stitch there, never a silent plain edit)", () => {
    const g = new GraphBuilder({});
    const params21 = { prompt: "fix the badge", image1: "in.png", input_mask: "mask.png", ...SOLVER21 };
    // the card's own composition: the firing gate runs PRE-compose
    assert.throws(
      () => refuseImageEditFiring(params21, FACTS_21),
      (err: unknown): boolean =>
        err instanceof Error
        && err.message.includes("'input_mask' fires on the image-edit card")
        && err.message.includes("state mask_mode crop_stitch"),
    );
  });
  it("an absent or non-string text_encode_node reads as NO 2.1 lane pin (F7: the typed reader judges garbage like absence — auto+mask still refuses, exactly as on the 2511 lane)", () => {
    // the facts door's laneStringOf: absent, non-string, or empty
    // text_encode_node is undefined — never 'TextEncodeQwenImage21'
    // — so the firing gate treats a malformed pin like a 2511
    // model: input_mask + auto refuses the region-law refusal rather
    // than firing a lane-scoped arm. The 2.1-pin refusal is the :288 row above.
    const garbage = {
      id: DECL.id, card: "image-edit", defaults: {}, card_knobs: [], variants: [],
      variant_groups: [], outputs: [], mods: [],
      lane_inputs: { text_encode_node: 21, unet: "u.safetensors" },
    } as unknown as ModelFacts;
    const missing = {
      id: DECL.id, card: "image-edit", defaults: {}, card_knobs: [], variants: [],
      variant_groups: [], outputs: [], mods: [],
      lane_inputs: { unet: "u.safetensors" },
    } as unknown as ModelFacts;
    const empty = {
      id: DECL.id, card: "image-edit", defaults: {}, card_knobs: [], variants: [],
      variant_groups: [], outputs: [], mods: [],
      lane_inputs: { text_encode_node: "", unet: "u.safetensors" },
    } as unknown as ModelFacts;
    for (const facts of [garbage, missing, empty, FACTS_2511]) {
      assert.throws(() =>
        refuseImageEditFiring(
          { prompt: "fix the badge", image1: "in.png", input_mask: "mask.png", ...SOLVER21 },
          facts,
        ),
        /no edit lane inpaints in place.*state mask_mode crop_stitch/,
      );
    }
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
    instantiateAction(edit,
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
  it("stated sizes ride the deliverable, never the latent (the resize order): match ON refuses with the flip in the voice; match OFF + both axes passes the firing gate (refusals own the malformed pairs)", () => {
    // match ON (the default face) + stated refuses — the flip is in
    // the voice.
    assert.throws(
      () => refuseImageEditFiring(
        { prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", mask_mode: "crop_stitch", mask_detector: "face", width: 1024, height: 1024 },
        FACTS_21,
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'width' fires") && err.message.includes("match_input_resolution is ON"),
    );
    // the plain arm refuses the same way — the gate's law is
    // mode-universal, not a detailer-scoped special case
    assert.throws(
      () => refuseImageEditFiring(
        { prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", width: 1024, height: 1024 },
        FACTS_21,
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'width' fires") && err.message.includes("match_input_resolution is ON"),
    );
    // match OFF + both axes passes (the resize rides the
    // deliverable tail — the firing gate's only remaining refusals
    // own malformed pairs). match OFF with NEITHER axis passes too
    // (the flip-then-type identity — the card stays runnable while
    // the numbers are empty; the deliverable keeps the source frame).
    refuseImageEditFiring(
      { prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", match_input_resolution: false, width: 1024, height: 768 },
      FACTS_21,
    );
    refuseImageEditFiring(
      { prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", match_input_resolution: false },
      FACTS_21,
    );
    // the malformed pairs still refuse field-named
    for (const [name, doc] of [
      ["half", { match_input_resolution: false, width: 1024 }],
      ["fractional", { match_input_resolution: false, width: 1024.5, height: 768 }],
      ["blank", { match_input_resolution: false, width: 12, height: 12 }],
    ] as const) {
      assert.throws(
        () => refuseImageEditFiring({ prompt: "x", image1: "in.png", seed: 3, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple", ...doc }, FACTS_21),
        (err: unknown): boolean => err instanceof Error && err.message.includes("'width' fires"),
        `${name} still refuses — the gate owns malformed deliverables`,
      );
    }
  });
});
