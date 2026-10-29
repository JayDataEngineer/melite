// @melite/models-h3 — the camera re-shoot chain (feature 024, the
// ComfyUI "Open Source Higgsfield" entry): an armed re-shoot builds
// its depth → reprojection → disocclusion-mask subgraph ONCE per
// compose and every window's sampler renders from the moved camera
// through a Fun ControlNet Union 2.0 apply seat. A disarmed (or
// clip-less) doc composes byte-identical graphs — the re-shoot is
// surface the operator opts into, never a default.
//
// THE FOURTH-MOD-BAG LAW (§8 of the multiwindow unification audit,
// 2026-11-12): the commission rides the `reshoot` bag — ONE entry
// (max_stack 1) carrying source_clip + the camera dials, the same
// arm law as replace/repair/extend. Bag presence IS the arm; an
// absent or EMPTY bag is the unused arm. The clip rides the SHARED
// loader law (chainEdit loadVideo: force-rate-24 VHS seat — the
// same loader the three sibling sources ride), never a private
// LoadVideo→GetVideoComponents pair.
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

describe("the h3 camera re-shoot chain (the fourth mod bag)", () => {
  it("a doc with no reshoot bag composes byte-stable — no depth, no warp, no mask, no apply", () => {
    const g = new GraphBuilder();
    instantiateAction(film, { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42 }, H3, g, "run_rs_off");
    const flat = nodes(g).map(([, n]) => n.class_type);
    expect(flat).not.toContain("LoadVideoDepthAnythingModel");
    expect(flat).not.toContain("CrossViewWarp");
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

  it("an armed re-shoot wires the full chain on the SHARED loader law: VHS frames, depth stack, two aligned warps, magenta mask, union 2.0 patch", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_rs_armed");
    const entries = nodes(g);
    // THE SHARED LOADER LAW: the clip rides the force-rate-24 VHS
    // seat (the sibling sources' own loader), never a private
    // LoadVideo→GetVideoComponents pair.
    expect(entries.filter(([, n]) => n.class_type === "LoadVideo")).toHaveLength(0);
    expect(entries.filter(([, n]) => n.class_type === "GetVideoComponents")).toHaveLength(0);
    const vhs = entries.find(([, n]) => n.class_type === "VHS_LoadVideo")!;
    expect(vhs[1].inputs.video).toBe("sources/take3.mp4");
    expect(vhs[1].inputs.force_rate).toBe(24);
    // VDA-Small, the pack's own flags (the estate's one Apache-2.0 depth weight)
    const load = entries.find(([, n]) => n.class_type === "LoadVideoDepthAnythingModel")!;
    expect(load[1].inputs.model).toBe("video_depth_anything_vits.pth");
    const proc = entries.find(([, n]) => n.class_type === "VideoDepthAnythingProcess")!;
    expect(proc[1].inputs.input_size).toBe(518);
    expect(proc[1].inputs.max_res).toBe(1280);
    expect(proc[1].inputs.precision).toBe("fp16");
    expect(String(proc[1].inputs.vda_model)).toContain("LoadVideoDepthAnythingModel");
    expect(String(proc[1].inputs.images)).toContain("VHS_LoadVideo");
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
    expect(String(warps[1]![1].inputs.frames)).toContain("VHS_LoadVideo");
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

  it("the bag's camera dials plumb: pose onto both warps, strength onto the apply", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        reshoot: [{
          source_clip: "sources/take3.mp4",
          orbit: -30, tilt: 20, dolly: 1.4, zoom: 65, pan: 0.26,
          strength: 2.5, depth_ratio: 8, smooth_depth: true, invert_depth: true,
        }],
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

  it("a non-array bag is DISARMED and the neutral knobs are the identity camera", () => {
    // the card's guard refuses a present non-array bag loud; at the
    // model tier it is simply not an arm (the same absent posture), and
    // the knob reader falls back to the identity camera
    expect(reshootArmed({ reshoot: "clips/take3.mp4" })).toBe(false);
    expect(reshootArmed({ reshoot: [] })).toBe(false);
    expect(readReshootKnobs({ reshoot: "clips/take3.mp4" })).toEqual({
      orbit: 0, tilt: 0, dolly: 1, zoom: 50, pan: 0, strength: 1,
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
