// @melite/models-h3 — the camera re-shoot chain (feature 024),
// REWORKED 2026-11-13 onto the OFFICIAL implementation: Comfy-Org's
// comfy-reshoot reference app (workflows/generate.api.json at pack
// revision fbb1e93c). An armed re-shoot builds its prepare → MoGe
// metric geometry → warp subgraph ONCE per compose; every window
// renders from the moved camera through THREE seats — the prepared
// clip as r2v's ref_video_0 (appearance), the warp pinned through
// MiniMaxH3AddGuide (geometry), and the CrossView LoRA on the model
// (the trigger word `crossview` leads the prompt). A disarmed (or
// clip-less) doc composes byte-identical graphs — the re-shoot is
// surface the operator opts into, never a default.
//
// THE FOURTH-MOD-BAG LAW (§8 of the multiwindow unification audit,
// 2026-11-12): the commission rides the `reshoot` bag — ONE entry
// (max_stack 1) carrying source_clip + the camera dials, the same
// arm law as replace/repair/extend. Bag presence IS the arm; an
// absent or EMPTY bag is the unused arm.
import { describe, it, expect } from "vitest";
import { film } from "../src/actions.ts";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { readReshootKnobs, reshootArmed } from "../src/reshoot.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

const H3: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: ["loras", "controlnet"],
} as ModelFacts & { mods: string[] };

const bag = () => ({
  variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
  reshoot: [{ source_clip: "sources/take3.mp4" }],
});

const nodes = (g: GraphBuilder) =>
  Object.entries(g.toJSON()) as Array<[string, { class_type: string; inputs: Record<string, unknown> }]>;

const ofClass = (entries: ReturnType<typeof nodes>, cls: string) =>
  entries.filter(([, n]) => n.class_type === cls);

const CHAIN_CLASSES = [
  "CrossViewPrepareClip",
  "LoadMoGeModel",
  "MoGeInference",
  "CrossViewWarp",
] as const;

describe("the h3 camera re-shoot chain (the fourth mod bag, official rework)", () => {
  it("a doc with no reshoot bag composes byte-stable — no loader, no prepare, no geometry, no warp, no LoRA seat", () => {
    const g = new GraphBuilder();
    instantiateAction(film, { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42 }, H3, g, "run_rs_off");
    const flat = nodes(g).map(([, n]) => n.class_type);
    for (const cls of CHAIN_CLASSES) {
      expect(flat, cls).not.toContain(cls);
    }
    expect(flat).not.toContain("LoadVideo");
    expect(flat).not.toContain("LoraLoaderModelOnly");
    // the retired first-cut chain stays dead: no VDA depth, no
    // magenta mask, no Fun ControlNet apply, no union patch
    expect(flat).not.toContain("LoadVideoDepthAnythingModel");
    expect(flat).not.toContain("ColorToMask");
    expect(flat).not.toContain("MiniMaxH3FunControlNetApply");
    expect(flat).not.toContain("ModelPatchLoader");
  });

  it("an EMPTY reshoot bag stays disarmed (the present-but-empty bag is the unused arm)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, reshoot: [] },
      H3, g, "run_rs_empty",
    );
    expect(ofClass(nodes(g), "CrossViewWarp")).toHaveLength(0);
  });

  it("an armed re-shoot wires the OFFICIAL chain verbatim: core LoadVideo → prepare → MoGe metric geometry → ONE warp", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_rs_armed");
    const entries = nodes(g);
    // THE OFFICIAL LOADER: core LoadVideo (the VIDEO type the
    // prepare node demands), the staged leaf by name
    const load = entries.find(([, n]) => n.class_type === "LoadVideo")!;
    expect(load[1].inputs.file).toBe("sources/take3.mp4");
    // stage 1 — the clip normalization, the official literals
    const prep = entries.find(([, n]) => n.class_type === "CrossViewPrepareClip")!;
    expect(prep[1].inputs.duration).toBe(5.0);
    expect(prep[1].inputs.aspect_ratio).toBe("source");
    expect(prep[1].inputs.megapixels).toBe(0.5);
    expect(prep[1].inputs.multiple).toBe(32);
    expect(String(prep[1].inputs.video)).toContain("LoadVideo");
    // stage 2 — MoGe-2 metric geometry (the official checkpoint +
    // flags; brightness depth died with the first cut)
    const moge = entries.find(([, n]) => n.class_type === "LoadMoGeModel")!;
    expect(moge[1].inputs.model_name).toBe("moge_2_vitl_normal_fp16.safetensors");
    const infer = entries.find(([, n]) => n.class_type === "MoGeInference")!;
    expect(infer[1].inputs.resolution_level).toBe(2);
    expect(infer[1].inputs.fov_x_degrees).toBe(0);
    expect(infer[1].inputs.batch_size).toBe(4);
    expect(infer[1].inputs.force_projection).toBe(true);
    expect(infer[1].inputs.apply_mask).toBe(true);
    expect(infer[1].inputs.refine_steps).toBe(3);
    expect(String(infer[1].inputs.moge_model)).toContain("LoadMoGeModel");
    expect(String(infer[1].inputs.image)).toContain("CrossViewPrepareClip");
    // stage 3 — exactly ONE warp on the METRIC seat (moge_geometry,
    // never a brightness depth input), the official posture literals
    const warps = ofClass(entries, "CrossViewWarp");
    expect(warps).toHaveLength(1);
    const [, w] = warps[0]!;
    expect(String(w.inputs.frames)).toContain("CrossViewPrepareClip");
    expect(String(w.inputs.moge_geometry)).toContain("MoGeInference");
    expect(w.inputs.depth).toBeUndefined();
    expect(w.inputs.keep_source_aim).toBe(true);
    expect(w.inputs.roll_lock).toBe(false);
    expect(w.inputs.use_keyframes).toBe(false);
    expect(w.inputs.interpolation).toBe("linear");
    // the pack default for pivot_override is true (fbb1e93) — the
    // official posture forces it OFF so px/py/pz never go live
    expect(w.inputs.pivot_override).toBe(false);
    expect(w.inputs.pivot_z).toBe(1.05);
    // the metric seat's two behavior flags ride the official
    // posture: no smoothing, no inversion of the MoGe depth
    expect(w.inputs.smooth_depth).toBe(false);
    expect(w.inputs.invert_depth).toBe(false);
    // the first cut's seats stay dead: no VDA, no resize hack, no
    // magenta mask, no union patch, no Fun ControlNet apply
    expect(ofClass(entries, "LoadVideoDepthAnythingModel")).toHaveLength(0);
    expect(ofClass(entries, "ImageResizeKJ")).toHaveLength(0);
    expect(ofClass(entries, "ColorToMask")).toHaveLength(0);
    expect(ofClass(entries, "ModelPatchLoader")).toHaveLength(0);
    expect(ofClass(entries, "MiniMaxH3FunControlNetApply")).toHaveLength(0);
  });

  it("the appearance + guide + LoRA seats: the prepared clip IS ref_video_0, the warp pins at row 0, the CrossView LoRA loads at 0.8", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_rs_seats");
    const entries = nodes(g);
    // the r2v conditioning: trigger-led prompt, the prepared clip as
    // the appearance reference, NO ref video audio on the slot (the
    // official graph wires none — an absent lane, never mismatched)
    const r2v = entries.find(([, n]) => n.class_type === "MiniMaxH3ReferenceToVideo")!;
    expect(r2v[1].inputs.prompt).toBe("crossview. a slow push in");
    expect(String(r2v[1].inputs["ref_videos.ref_video_0"])).toContain("CrossViewPrepareClip");
    expect(r2v[1].inputs["ref_video_audios.ref_video_audio_0"]).toBeUndefined();
    // the guide pin: the warp into the window's own latent at row 0
    const guide = ofClass(entries, "MiniMaxH3AddGuide")
      .filter(([, n]) => String(n.inputs.image).includes("CrossViewWarp"));
    expect(guide).toHaveLength(1);
    expect(guide[0]![1].inputs.frame_idx).toBe(0);
    expect(String(guide[0]![1].inputs.positive)).toContain("MiniMaxH3ReferenceToVideo");
    // the model seat: the CrossView LoRA, the official default 0.8
    const lora = ofClass(entries, "LoraLoaderModelOnly");
    expect(lora).toHaveLength(1);
    expect(lora[0]![1].inputs.lora_name).toBe("h3/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors");
    expect(lora[0]![1].inputs.strength_model).toBe(0.8);
    // the sampler renders from the LoRA-loaded model and the
    // guide-wrapped conditioning
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider")!;
    expect(String(guider[1].inputs.model)).toContain("LoraLoaderModelOnly");
    expect(String(guider[1].inputs.conditioning)).toContain("MiniMaxH3AddGuide");
  });

  it("the bag's camera dials plumb: pose onto the warp, strength onto the CrossView LoRA", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        reshoot: [{
          source_clip: "sources/take3.mp4",
          orbit: -30, tilt: 20, dolly: 1.4, zoom: 65, pan: 0.26,
          strength: 1, depth_ratio: 8, smooth_depth: true, invert_depth: true,
        }],
      },
      H3, g, "run_rs_knobs",
    );
    const entries = nodes(g);
    const [, w] = ofClass(entries, "CrossViewWarp")[0]!;
    expect(w.inputs.azimuth).toBe(-30);
    expect(w.inputs.elevation).toBe(20);
    expect(w.inputs.distance).toBe(1.4);
    expect(w.inputs.hfov).toBe(65);
    expect(w.inputs.vertical_shift).toBe(0.26);
    expect(w.inputs.depth_ratio).toBe(8);
    expect(w.inputs.smooth_depth).toBe(true);
    expect(w.inputs.invert_depth).toBe(true);
    expect(ofClass(entries, "LoraLoaderModelOnly")[0]![1].inputs.strength_model).toBe(1);
  });

  it("the strength dial is the LoRA band 0.5–1 — the old Fun-ControlNet-era 2.5 refuses loud ahead of the engine", () => {
    const g = new GraphBuilder();
    expect(() =>
      instantiateAction(
        film,
        { ...bag(), reshoot: [{ source_clip: "sources/take3.mp4", strength: 2.5 }] },
        H3, g, "run_rs_band",
      )
    ).toThrow(/strength dial is 2.5 — outside the camera band \[0.5, 1\]/);
  });

  it("an armed bag whose entry names no source clip refuses loud (never a silent half-chain)", () => {
    const g = new GraphBuilder();
    expect(() =>
      instantiateAction(
        film,
        { ...bag(), reshoot: [{ source_clip: "   " }] },
        H3, g, "run_rs_noclip",
      )
    ).toThrow(/names no source clip/);
  });

  it("a non-array bag is DISARMED and the neutral knobs are the identity camera at the LoRA's own 0.8", () => {
    // the card's guard refuses a present non-array bag loud; at the
    // model tier it is simply not an arm (the same absent posture), and
    // the knob reader falls back to the identity camera
    expect(reshootArmed({ reshoot: "clips/take3.mp4" })).toBe(false);
    expect(reshootArmed({ reshoot: [] })).toBe(false);
    expect(readReshootKnobs({ reshoot: "clips/take3.mp4" })).toEqual({
      orbit: 0, tilt: 0, dolly: 1, zoom: 50, pan: 0, strength: 0.8,
      depthRatio: 6, smoothDepth: false, invertDepth: false,
    });
  });

  it("a NON-OBJECT entry stays ARMED and refuses at the chain build (the presence predicate, never a silent disarm)", () => {
    // the card's guard allows a non-empty array of any entry shape; the
    // arm predicate is PRESENCE, so the entry reaches the build and the
    // clip refusal fires — the same loud posture as [source_clip: ""]
    const armedEntry = { ...bag(), reshoot: [42] };
    expect(reshootArmed(armedEntry)).toBe(true);
    const g = new GraphBuilder();
    expect(() => instantiateAction(film, armedEntry, H3, g, "run_rs_bad_entry"))
      .toThrow(/carries an entry but names no source clip/);
  });

  it("a two-shot film builds the chain ONCE and stamps the LoRA + guide seats into every window", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        calls: [
          { text: "She walks forward", start_frame: 0, end_frame: 90 },
          { text: "and turns to face the camera", start_frame: 90, end_frame: 158 },
        ],
      },
      H3, g, "run_rs_film",
    );
    const entries = nodes(g);
    const windows = ofClass(entries, "MeliteUnload").length;
    expect(windows).toBe(2);
    // the heavy subgraph exists exactly once — a multi-window film
    // pays for prepare + geometry + warp once, not per window
    expect(ofClass(entries, "LoadVideo")).toHaveLength(1);
    expect(ofClass(entries, "CrossViewPrepareClip")).toHaveLength(1);
    expect(ofClass(entries, "LoadMoGeModel")).toHaveLength(1);
    expect(ofClass(entries, "MoGeInference")).toHaveLength(1);
    expect(ofClass(entries, "CrossViewWarp")).toHaveLength(1);
    // every window renders from the moved camera through its own
    // LoRA seat and its own guide pin
    const loras = ofClass(entries, "LoraLoaderModelOnly");
    expect(loras).toHaveLength(2);
    const guides = ofClass(entries, "MiniMaxH3AddGuide")
      .filter(([, n]) => String(n.inputs.image).includes("CrossViewWarp"));
    expect(guides).toHaveLength(2);
    for (const [id, l] of loras) {
      expect(id.startsWith("window"), `${id} seats inside its window's scope`);
    }
  });

  it("the re-shoot LoRA seats AHEAD of file-based picks — the camera spine first, the picks refine on top", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        controlnets: [{ type: "depth", model: "h3-fun-controlnet/MiniMax-H3-Fun-ControlNet.safetensors", image_b64: "depth.png", strength: 1 }],
      },
      H3, g, "run_rs_order",
    );
    const entries = nodes(g);
    const lora = ofClass(entries, "LoraLoaderModelOnly");
    expect(lora).toHaveLength(1);
    // the spine's model rides the raw sigma chain, never another
    // Fun ControlNet apply — and the pick wraps the spine
    expect(String(lora[0]![1].inputs.model)).not.toContain("MiniMaxH3FunControlNetApply");
    const applies = ofClass(entries, "MiniMaxH3FunControlNetApply");
    expect(applies).toHaveLength(1);
    expect(String(applies[0]![1].inputs.model)).toContain("LoraLoaderModelOnly");
  });
});
