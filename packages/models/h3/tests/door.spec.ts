// @melite/models-h3 — the film action's facts door: the resolved
// lane_inputs parse into the closed engine shape, and drift (a
// missing lane file, a blank string, a non-string) refuses loud at
// instantiate — never a silent route to a stock lane.
import { describe, it, expect, vi } from "vitest";
import { film, parseH3Facts } from "../src/actions.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

// THE TURBO-LESS CATALOG (the absent-bag default's load refusal):
// the default stack derives from the family's own lora catalog, so
// a catalog that lost the turbo row must refuse loud. The filter
// keeps every other row — only the default's source is gone.
vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_lightx2v_turbo") };
});

// The window driver's model row — the interpreter's own contract
// (facts door + seed mint + segment factory, the production path).
// No variants/groups/outputs: the film window routes by lane_inputs
// alone, and the interpreter reads no variant cell on this path.
const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
};

const LANE = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
};

describe("the h3 film action's facts door", () => {
  it("parses the row's unet + the package const's three lane files into the closed engine shape", () => {
    const facts = parseH3Facts(LANE);
    expect(facts).toEqual({
      unet: LANE.unet,
      clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
      vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
    });
  });

  it("a missing unet refuses loud, naming the key", () => {
    expect(() => parseH3Facts({ ...LANE, unet: undefined }))
      .toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("a blank lane filename refuses loud (an empty weight is no weight)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: "   " })).toThrow(/lane_inputs\.unet = "   ".*non-empty string/);
  });

  it("a non-string lane value refuses loud (never coerced)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: 42 })).toThrow(/lane_inputs\.unet = 42.*non-empty string/);
  });

  it("an absent lane row refuses loud (a family that ships no lane_inputs parses no facts)", () => {
    expect(() => parseH3Facts(undefined)).toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("the film action declares the seed sentinel (GATE S) and the video output", () => {
    expect(film.id).toBe("film");
    expect(film.inputs).toEqual([]);
    expect(film.outputs).toEqual([{ name: "video", kind: "VIDEO" }]);
    // THE DECLARED SURFACE (phase 2): the full write plane — the
    // seed row keeps the sentinel rule, the timeline's own JSON row
    // params stay off it (their validators own them).
    const seedRow = film.params.find((row) => row.name === "seed");
    expect(seedRow).toEqual({ name: "seed", type: "number", rule: "seed-sentinel" });
    expect(film.params.length).toBeGreaterThan(40);
    expect(film.params.find((row) => row.name === "steps")).toEqual({ name: "steps", type: "number", bounds: [4, 30] });
    expect(film.params.find((row) => row.name === "sla_enabled")).toEqual({ name: "sla_enabled", type: "boolean" });
    expect(film.facts).toBe(parseH3Facts);
  });
});

describe("the film build's single-window arms (no calls wrapper)", () => {
  it("an empty bag with no turbo catalog row refuses loud (the absent-bag default has no source)", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, loras: [] },
      WINDOW_MODEL, g, "run_no_turbo",
    )).toThrow(/the lora catalog has no 'h3_lightx2v_turbo' row/);
  });

  it("a calls-less window marries the bag's steps (no call knobs to consult, the doc face reads the bag)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }],
      },
      WINDOW_MODEL, g, "run_nocalls_steps",
    );
    const schedulers = Object.entries(g.toJSON()).filter(([, n]) => n.class_type === "BasicScheduler");
    expect(schedulers.length).toBeGreaterThan(0);
    expect(schedulers[0]![1].inputs.steps).toBe(8);
  });
});
