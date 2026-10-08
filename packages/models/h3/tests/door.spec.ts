// @melite/models-h3 — the film action's facts door: the resolved
// lane_inputs parse into the closed engine shape, and drift (a
// missing lane file, a blank string, a non-string) refuses loud at
// instantiate — never a silent route to a stock lane.
import { describe, it, expect, vi } from "vitest";
import { film, parseH3Facts } from "../src/actions.ts";
import { schema as h3schema } from "../src/schema.ts";
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

describe("the refmod seat (audit 010/R1, 2026-10-18)", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];

  it("ref_mods compose the loader→apply chain, stems out, wired into the guider's conditioning", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["refmods/vanellope_example.safetensors"],
      },
      WINDOW_MODEL, g, "run_refmod",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loader = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(loader, "the loader composes").toBeDefined();
    expect(apply, "the apply composes").toBeDefined();
    expect(guider).toBeDefined();
    // stems out: the combo eats models/refmods/ stems, '(none)' fills
    expect(loader![1].inputs.mod_1).toBe("vanellope_example");
    expect(loader![1].inputs.mod_2).toBe("(none)");
    expect(loader![1].inputs.mod_8).toBe("(none)");
    expect(loader![1].inputs.show_info).toBe(false);
    // paper parity: every filled slot rides strength 1 / copies 1
    expect(loader![1].inputs.strength_1).toBe(1);
    expect(loader![1].inputs.copies_1).toBe(1);
    expect(apply![1].inputs.retention).toBe(1);
    expect(apply![1].inputs.curve_direction).toBe("constant");
    // the wiring: loader.out(0) → apply.mods; apply.out(0) → the
    // guider's conditioning — the seat is IN the sampled chain, not
    // an orphan (the I2V marker law: orphans serialize, this runs)
    expect(apply![1].inputs.mods).toEqual([loader![0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([apply![0], 0]);
  });

  it("a non-safetensors entry refuses loud, naming the entry", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["vanellope.png"],
      },
      WINDOW_MODEL, g, "run_refmod_bad",
    )).toThrow(/ref_mods entries are \.safetensors mods under models\/refmods\/ \(saw 'vanellope\.png'\)/);
  });

  it("more than the loader's 8 slots refuses loud, naming the cap", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: Array.from({ length: 9 }, (_, i) => `mod_${String(i)}.safetensors`),
      },
      WINDOW_MODEL, g, "run_refmod_over",
    )).toThrow(/ref_mods exceeds the loader's 8 slots \(saw 9\)/);
  });

  it("backslash, padded, and query-suffixed paths still arrive as clean stems", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: [
          "nested\\vanellope_example.safetensors",
          "  refmods/padded_example.safetensors  ",
          "refmods/queried_example.safetensors?v=2",
        ],
      },
      WINDOW_MODEL, g, "run_refmod_paths",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loader = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    expect(loader, "the loader composes").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("vanellope_example");
    expect(loader![1].inputs.mod_2).toBe("padded_example");
    expect(loader![1].inputs.mod_3).toBe("queried_example");
  });

  it("a mod-only film stays open: ref_mods never fires the refs-imply-r2v law", () => {
    // The schema's variant derivation (schema.ts:425): a mod spends
    // no bundle-bus slot, so ref_mods rides OUTSIDE the hasGuide
    // OR-chain — a mod-only doc derives t4_open where a
    // picture-reference doc derives t4r.
    const modOnly = h3schema({ prompt: "a slow push in", ref_mods: ["refmods/vanellope_example.safetensors"] });
    expect(modOnly.variant).toBe("t4_open");
    const picRef = h3schema({ prompt: "a slow push in", ref_images: ["ref1.png"] });
    expect(picRef.variant).toBe("t4r");
  });
});
