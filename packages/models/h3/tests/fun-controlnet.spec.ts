// @melite/models-h3 — the fun-controlnet lane (007 L7): the family
// owns its apply chain. Every pick composes ModelPatchLoader →
// MiniMaxH3FunControlNetApply ONCE post-join (the sigma chain the
// guider reads), conditioning on a still image, a video's frames,
// or a still + mask — the H3 node's own dials (strength to 10,
// start/end windows) riding the row's stamped capability. The
// boarding gate is the pack's own (unboarded + non-empty refuses).
import { describe, it, expect } from "vitest";
import { film } from "../src/actions.ts";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

// The window driver's model row — here BOARDING the controlnet pack
// (the family's own DECL shape once its boarding rows land; the
// lane below is the family's, exercised ahead of that operator row).
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

const UNION = "h3-fun-controlnet/MiniMax-H3-Fun-ControlNet.safetensors";

const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];
const bag = () => ({ variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, loras: BAG });

const nodes = (g: GraphBuilder) =>
  Object.entries(g.toJSON()) as Array<[string, { class_type: string; inputs: Record<string, unknown> }]>;

describe("the h3 fun-controlnet lane (007 L7)", () => {
  it("no picks = the plain sigma chain, byte-stable (no lane nodes compose)", () => {
    const g = new GraphBuilder();
    instantiateAction(film, bag(), H3, g, "run_fc_plain");
    const flat = nodes(g).map(([, n]) => n.class_type);
    expect(flat).not.toContain("MiniMaxH3FunControlNetApply");
    expect(flat).not.toContain("ModelPatchLoader");
    expect(flat).not.toContain("GetVideoComponents");
  });

  it("a still-map pick composes the apply ONCE post-join, wired into the guider's model", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { ...bag(), controlnets: [{ type: "pose", model: UNION, image_b64: "pose_map.png", strength: 1.0 }] },
      H3, g, "run_fc_still",
    );
    const entries = nodes(g);
    const apply = entries.filter(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply");
    expect(apply.length).toBe(1);
    const loader = entries.find(([, n]) => n.class_type === "ModelPatchLoader");
    expect(loader![1].inputs.name).toBe(UNION);
    const img = entries.find(([, n]) => n.class_type === "LoadImage");
    expect(img![1].inputs.image).toBe("pose_map.png");
    // the dials ride the pick; the defaults stamp the window
    expect(apply[0]![1].inputs.strength).toBe(1.0);
    expect(apply[0]![1].inputs.start_percent).toBe(0);
    expect(apply[0]![1].inputs.end_percent).toBe(1);
    // the control rides control_video (the H3 node's own slot)
    expect(String(apply[0]![1].inputs.control_video)).toContain("LoadImage");
    // wired into the guider: its model input names the apply node
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(String(guider![1].inputs.model)).toContain("MiniMaxH3FunControlNetApply");
  });

  it("a clip pick conditions on the video's frames (GetVideoComponents feeds the same slot)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        controlnets: [{ type: "motion", model: UNION, image_b64: "", clip: "pose_ref.mp4", strength: 0.8, start_percent: 0.2, end_percent: 0.9, schedule: "ranged", strength_max: 10 }],
      },
      H3, g, "run_fc_clip",
    );
    const entries = nodes(g);
    const video = entries.find(([, n]) => n.class_type === "LoadVideo");
    expect(video![1].inputs.file).toBe("pose_ref.mp4");
    const comps = entries.find(([, n]) => n.class_type === "GetVideoComponents");
    expect(comps).toBeDefined();
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply")!;
    // the row's window rides verbatim (H3's node carries the dials)
    expect(apply[1].inputs.start_percent).toBe(0.2);
    expect(apply[1].inputs.end_percent).toBe(0.9);
    expect(String(apply[1].inputs.control_video)).toContain("GetVideoComponents");
    // no still loader composed for a clip-only pick
    expect(entries.find(([, n]) => n.class_type === "LoadImage")).toBeUndefined();
  });

  it("a mask rides the alpha channel beside the still map", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        controlnets: [{ type: "depth", model: UNION, image_b64: "depth.png", mask: "regions.png", strength: 1.5, strength_max: 10 }],
      },
      H3, g, "run_fc_mask",
    );
    const entries = nodes(g);
    const maskLoader = entries.find(([, n]) => n.class_type === "LoadImageMask");
    expect(maskLoader![1].inputs.image).toBe("regions.png");
    expect(maskLoader![1].inputs.channel).toBe("alpha");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply")!;
    expect(String(apply[1].inputs.mask)).toContain("LoadImageMask");
    // H3's dial runs past 1: the row's stamped ceiling carries it
    expect(apply[1].inputs.strength).toBe(1.5);
  });

  it("two picks chain through the model input (apply order = array order)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        ...bag(),
        controlnets: [
          { type: "depth", model: UNION, image_b64: "d.png", strength: 1 },
          { type: "pose", model: UNION, image_b64: "p.png", strength: 0.8 },
        ],
      },
      H3, g, "run_fc_chain",
    );
    const applies = nodes(g).filter(([, n]) => n.class_type === "MiniMaxH3FunControlNetApply");
    expect(applies.length).toBe(2);
    // the second wraps the first
    expect(String(applies[1]![1].inputs.model)).toContain("MiniMaxH3FunControlNetApply");
  });

  it("an unboarded family refuses at the pack's own gate (never a silent skip)", () => {
    const g = new GraphBuilder();
    const UNBOARDED = { ...H3, mods: ["loras"] } as ModelFacts & { mods: string[] };
    expect(() =>
      instantiateAction(
        film,
        { ...bag(), controlnets: [{ type: "pose", model: UNION, image_b64: "m.png", strength: 1 }] },
        UNBOARDED, g, "run_fc_unboarded",
      )
    ).toThrow(/does not board the 'controlnet' pack/);
  });
});
