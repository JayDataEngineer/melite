// @melite/models-h3 — the ref-video trim seat (audit 003/V4):
// entry i of ref_video_trims slices guide i through the engine's
// own Video Slice BEFORE GetVideoComponents conditions on it —
// both arms (disk path and spelled tensor) trim the same, the
// slice rides the VIDEO tensor either way. An absent or zero/zero
// entry builds NO node: the pre-trim graph stays byte-stable, and
// a bad entry refuses LOUD (the probe-proven law), never silent.
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
  mods: ["loras"],
} as ModelFacts & { mods: string[] };

const bag = () => ({
  variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const nodes = (g: GraphBuilder) =>
  Object.entries(g.toJSON()) as Array<[string, Node]>;
const ofClass = (g: GraphBuilder, cls: string) =>
  nodes(g).filter(([, n]) => n.class_type === cls);

describe("the h3 ref-video trim seat (003 V4)", () => {
  it("a trimmed guide threads Video Slice between LoadVideo and GetVideoComponents", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { ...bag(), ref_videos: ["/guides/spin.mp4"], ref_video_trims: [{ start_time: 2, duration: 4 }] },
      H3, g, "run_trim_slice",
    );
    const slice = ofClass(g, "Video Slice");
    expect(slice.length).toBe(1);
    const [, sl] = slice[0]!;
    expect(sl.inputs.start_time).toBe(2);
    expect(sl.inputs.duration).toBe(4);
    expect(sl.inputs.strict_duration).toBe(false);
    const load = ofClass(g, "LoadVideo");
    expect(load.length).toBe(1);
    // the slice's video pin is the loader's output link ([key, 0])
    expect(Array.isArray(sl.inputs.video)).toBe(true);
    expect((sl.inputs.video as [string, number])[0]).toBe(load[0]![0]);
    const gvc = ofClass(g, "GetVideoComponents");
    expect(gvc.length).toBe(1);
    // GVC conditions on the slice's OUTPUT — the thread is Load → Slice → GVC
    expect(gvc[0]![1].inputs.video).toStrictEqual([slice[0]![0], 0]);
  });

  it("a spelled motion guide trims the producer's tensor — the slice rides the VIDEO link either way", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { ...bag(), ref_videos: ["$guide"], ref_video_trims: [{ start_time: 0.5, duration: 3 }] },
      H3, g, "run_trim_spell",
    );
    const slice = ofClass(g, "Video Slice");
    expect(slice.length).toBe(1);
    // the spell rides the slice's video pin; the merge replaces it with the producer's tensor
    expect(slice[0]![1].inputs.video).toBe("$guide");
    const gvc = ofClass(g, "GetVideoComponents");
    expect(gvc.length).toBe(1);
    expect(gvc[0]![1].inputs.video).toStrictEqual([slice[0]![0], 0]);
  });

  it("an absent or zero/zero entry builds no slice — the pre-trim graph stays byte-stable", () => {
    for (const trims of [undefined, [{ start_time: 0, duration: 0 }]] as const) {
      const g = new GraphBuilder();
      instantiateAction(
        film,
        { ...bag(), ref_videos: ["/guides/spin.mp4"], ...(trims === undefined ? {} : { ref_video_trims: trims }) },
        H3, g, "run_trim_zero",
      );
      expect(ofClass(g, "Video Slice").length).toBe(0);
      const gvc = ofClass(g, "GetVideoComponents");
      expect(gvc.length).toBe(1);
      // the guide conditions on the loader's own output
      const load = ofClass(g, "LoadVideo")[0]!;
      expect(gvc[0]![1].inputs.video).toStrictEqual([load[0], 0]);
    }
  });

  it("a non-object entry refuses LOUD, and the cap is the video lane's", () => {
    expect(() => {
      const g = new GraphBuilder();
      instantiateAction(
        film,
        { ...bag(), ref_videos: ["/guides/spin.mp4"], ref_video_trims: [{ start_time: 1 }, "2s"] as never },
        H3, g, "run_trim_bad",
      );
    }).toThrow(/ref_video_trims: entry 1 must be an object/);
    expect(() => {
      const g = new GraphBuilder();
      instantiateAction(
        film,
        { ...bag(), ref_videos: ["/guides/spin.mp4"], ref_video_trims: [{ start_time: 1 }, { duration: 1 }, { start_time: 0 }, { duration: 2 }] },
        H3, g, "run_trim_cap",
      );
    }).toThrow(/expected at most 3 entries/);
  });
});
