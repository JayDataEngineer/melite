// @melite/models-h3 — the camera re-shoot chain (feature 024, the
// ComfyUI "Open Source Higgsfield" entry): an armed re-shoot builds
// its depth → reprojection → disocclusion-mask subgraph ONCE per
// compose and every window's sampler renders from the moved camera
// through a Fun ControlNet Union 2.0 apply seat. A disarmed (or
// clip-less) doc composes byte-identical graphs — the re-shoot is
// surface the operator opts into, never a default.
import { describe, it, expect } from "vitest";
import { film } from "../src/actions.ts";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
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
  reshoot_enabled: true, reshoot_clip: "sources/take3.mp4",
});

const nodes = (g: GraphBuilder) =>
  Object.entries(g.toJSON()) as Array<[string, { class_type: string; inputs: Record<string, unknown> }]>;

const ofClass = (entries: ReturnType<typeof nodes>, cls: string) =>
  entries.filter(([, n]) => n.class_type === cls);

describe("the h3 camera re-shoot chain (feature 024)", () => {
  it("a disarmed doc composes byte-stable — no depth, no warp, no mask, no apply", () => {
    const g = new GraphBuilder();
    instantiateAction(film, { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42 }, H3, g, "run_rs_off");
    const flat = nodes(g).map(([, n]) => n.class_type);
    expect(flat).not.toContain("LoadVideoDepthAnythingModel");
    expect(flat).not.toContain("CrossViewWarp");
    expect(flat).not.toContain("ColorToMask");
    expect(flat).not.toContain("MiniMaxH3FunControlNetApply");
    expect(flat).not.toContain("ModelPatchLoader");
  });

  it("a seated clip without the master switch stays disarmed (the switch is the arm, the clip alone is not)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, reshoot_clip: "sources/take3.mp4" },
      H3, g, "run_rs_cliponly",
    );
    expect(ofClass(nodes(g), "CrossViewWarp")).toHaveLength(0);
  });

  it("an armed re-shoot wires the full chain: depth stack, two aligned warps, magenta mask, union 2.0 patch", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_rs_armed");
    const entries = nodes(g);
    // the source clip's frames
    expect(entries.find(([, n]) => n.class_type === "LoadVideo")![1].inputs.file).toBe("sources/take3.mp4");
    // VDA-Small, the pack's own flags (the estate's one Apache-2.0 depth weight)
    const load = entries.find(([, n]) => n.class_type === "LoadVideoDepthAnythingModel")!;
    expect(load[1].inputs.model).toBe("video_depth_anything_vits.pth");
    const proc = entries.find(([, n]) => n.class_type === "VideoDepthAnythingProcess")!;
    expect(proc[1].inputs.input_size).toBe(518);
    expect(proc[1].inputs.max_res).toBe(1280);
    expect(proc[1].inputs.precision).toBe("fp16");
    expect(String(proc[1].inputs.vda_model)).toContain("LoadVideoDepthAnythingModel");
    expect(String(proc[1].inputs.images)).toContain("GetVideoComponents");
    expect(entries.find(([, n]) => n.class_type === "VideoDepthAnythingOutput")![1].inputs.colormap).toBe("gray");
    // exactly two warps, the same identity pose, both reading the same geometry
    const warps = ofClass(entries, "CrossViewWarp");
    expect(warps).toHaveLength(2);
    for (const [id, w] of warps) {
      expect(w.inputs.azimuth, `${id} pose`).toBe(0);
      expect(w.inputs.elevation).toBe(0);
      expect(w.inputs.distance).toBe(1.0);
      expect(w.inputs.hfov).toBe(50);
      expect(w.inputs.vertical_shift).toBe(0);
      expect(w.inputs.depth_ratio).toBe(6);
      expect(w.inputs.smooth_depth).toBe(false);
      expect(w.inputs.invert_depth).toBe(false);
      expect(String(w.inputs.depth)).toContain("VideoDepthAnythingOutput");
    }
    // warp 1 reprojects the depth stack itself (the DEPTH conditioning);
    // warp 2 reprojects the RGB frames (the color anchor + hole source)
    expect(String(warps[0]![1].inputs.frames)).toContain("VideoDepthAnythingOutput");
    expect(String(warps[1]![1].inputs.frames)).toContain("GetVideoComponents");
    // the disocclusion mask: the pack's magenta, 1 = regenerate
    const mask = entries.find(([, n]) => n.class_type === "ColorToMask")!;
    expect(mask[1].inputs.red).toBe(255);
    expect(mask[1].inputs.green).toBe(0);
    expect(mask[1].inputs.blue).toBe(255);
    expect(mask[1].inputs.threshold).toBe(10);
    expect(mask[1].inputs.invert).toBe(false);
    expect(String(mask[1].inputs.images)).toContain("CrossViewWarp");
    // the union 2.0 patch, the model_patches shelf spelling
    expect(entries.find(([, n]) => n.class_type === "ModelPatchLoader")![1].inputs.name)
      .toBe("h3-fun-controlnet/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors");
  });

  it("the window's apply seat rides the chain: warped depth conditions, the mask fences, the guider renders patched", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_rs_apply");
    const entries = nodes(g);
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply")!;
    // the dial reads below — the node face carries no top-level strength
    expect(Object.hasOwn(apply[1], "strength")).toBe(false);
    expect(apply[1].inputs.strength).toBe(1);
    expect(apply[1].inputs.start_percent).toBe(0);
    expect(apply[1].inputs.end_percent).toBe(1);
    expect(String(apply[1].inputs.control_video)).toContain("CrossViewWarp");
    expect(String(apply[1].inputs.mask)).toContain("ColorToMask");
    expect(String(apply[1].inputs.source_video)).toContain("CrossViewWarp");
    expect(String(apply[1].inputs.model_patch)).toContain("ModelPatchLoader");
    // the sampler chain renders from the patched model
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider")!;
    expect(String(guider[1].inputs.model)).toContain("MiniMaxH3FunControlNetApply");
  });

  it("the camera knobs plumb: pose onto both warps, strength onto the apply", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        reshoot_orbit: -30, reshoot_tilt: 20, reshoot_dolly: 1.4,
        reshoot_zoom: 65, reshoot_pan: 0.26, reshoot_strength: 2.5,
        reshoot_depth_ratio: 8, reshoot_smooth_depth: true, reshoot_invert_depth: true,
      },
      H3, g, "run_rs_knobs",
    );
    const entries = nodes(g);
    for (const [, w] of ofClass(entries, "CrossViewWarp")) {
      expect(w.inputs.azimuth).toBe(-30);
      expect(w.inputs.elevation).toBe(20);
      expect(w.inputs.distance).toBe(1.4);
      expect(w.inputs.hfov).toBe(65);
      expect(w.inputs.vertical_shift).toBe(0.26);
      expect(w.inputs.depth_ratio).toBe(8);
      expect(w.inputs.smooth_depth).toBe(true);
      expect(w.inputs.invert_depth).toBe(true);
    }
    expect(entries.find(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply")![1].inputs.strength).toBe(2.5);
  });

  it("an armed re-shoot with no source clip refuses loud (never a silent half-chain)", () => {
    const g = new GraphBuilder();
    expect(() =>
      instantiateAction(
        film,
        { ...bag(), reshoot_clip: "   " },
        H3, g, "run_rs_noclip",
      )
    ).toThrow(/names no source clip/);
  });

  it("a two-shot film builds the chain ONCE and stamps an apply seat into every window", () => {
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
    // pays for depth + reprojection once, not per window
    expect(ofClass(entries, "LoadVideoDepthAnythingModel")).toHaveLength(1);
    expect(ofClass(entries, "VideoDepthAnythingProcess")).toHaveLength(1);
    expect(ofClass(entries, "CrossViewWarp")).toHaveLength(2);
    expect(ofClass(entries, "ColorToMask")).toHaveLength(1);
    expect(ofClass(entries, "ModelPatchLoader")).toHaveLength(1);
    // every window renders from the moved camera through its own seat
    const applies = ofClass(entries, "MiniMaxH3FunControlNetApply");
    expect(applies).toHaveLength(2);
    for (const [id, a] of applies) {
      expect(id.startsWith("window"), `${id} seats inside its window's scope`);
      expect(String(a.inputs.control_video)).toContain("CrossViewWarp");
      expect(String(a.inputs.mask)).toContain("ColorToMask");
    }
  });

  it("the re-shoot seats AHEAD of file-based picks — the camera spine first, the picks refine on top", () => {
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
    const applies = ofClass(entries, "MiniMaxH3FunControlNetApply");
    expect(applies).toHaveLength(2);
    const [spine, pick] = applies;
    // the spine's model rides the raw sigma chain; the pick wraps the spine
    expect(String(spine![1].inputs.model)).not.toContain("MiniMaxH3FunControlNetApply");
    expect(String(pick![1].inputs.model)).toContain("MiniMaxH3FunControlNetApply");
    expect(String(spine![1].inputs.control_video)).toContain("CrossViewWarp");
  });
});
