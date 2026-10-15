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

// THE DMAD-LESS CATALOG (the absent-bag default's load refusal):
// the default stack derives from the family's own lora catalog, so
// a catalog that lost the DMAD row must refuse loud. The filter
// keeps every other row — only the default's source is gone.
vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_dmad_4step") };
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
  it("an empty bag with no DMAD catalog row refuses loud (the absent-bag default has no source)", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, loras: [] },
      WINDOW_MODEL, g, "run_no_turbo",
    )).toThrow(/the lora catalog has no 'h3_dmad_4step' row/);
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

  it("ANY MEDIA composes the creator chain — the system bakes the pack (operator, 2026-11-06)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: ["/melite-media/runs/hero/vanellope.png", "/melite-media/runs/hero/turn.mp4"],
      },
      WINDOW_MODEL, g, "run_refmod_media",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(extract, "the creator node composes").toBeDefined();
    expect(apply, "the apply composes").toBeDefined();
    // no .safetensors stem in the list ⇒ no loader at all
    expect(entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader")).toBeUndefined();
    // name from the first visual ref's basename; save rides true so
    // the baked pack lands in the loader dropdown for reuse
    expect(extract![1].inputs.name).toBe("vanellope");
    expect(extract![1].inputs.save).toBe(true);
    // the still rides LoadImage → ref_image_1; the video rides
    // LoadVideo → GetVideoComponents → ref_video_1 (frame batch)
    const loadImg = entries.find(([, n]) => n.class_type === "LoadImage")!;
    expect(loadImg![1].inputs.image).toBe("/melite-media/runs/hero/vanellope.png");
    expect(extract![1].inputs.ref_image_1).toEqual([loadImg![0], 0]);
    const comps = entries.find(([, n]) => n.class_type === "GetVideoComponents")!;
    const loadVid = entries.find(([, n]) => n.class_type === "LoadVideo")!;
    expect(loadVid![1].inputs.file).toBe("/melite-media/runs/hero/turn.mp4");
    expect(comps![1].inputs.video).toEqual([loadVid![0], 0]);
    expect(extract![1].inputs.ref_video_1).toEqual([comps![0], 0]);
    // the wiring: extract.mods → apply → the guider's conditioning
    expect(apply![1].inputs.mods).toEqual([extract![0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([apply![0], 0]);
  });

  it("audio media rides its own extractor (MiniMaxH3RefModAudioExtract) on the audio VAE", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["/melite-media/runs/voice/kid.wav"],
      },
      WINDOW_MODEL, g, "run_refmod_audio",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const audioExtract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModAudioExtract");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    expect(audioExtract, "the audio extractor composes").toBeDefined();
    expect(audioExtract![1].inputs.name).toBe("kid");
    expect(audioExtract![1].inputs.save).toBe(true);
    const loadAudio = entries.find(([, n]) => n.class_type === "LoadAudio")!;
    expect(loadAudio![1].inputs.audio).toBe("/melite-media/runs/voice/kid.wav");
    expect(audioExtract![1].inputs.audio).toEqual([loadAudio![0], 0]);
    // the extractor rides the graph's OWN audio VAE — the VAELoader
    // pinned to the family's vae_audio lane (video VAE is the twin)
    const vaeLoaders = entries.filter(([, n]) => n.class_type === "VAELoader");
    const audioVae = vaeLoaders.find(([, n]) => n.inputs.vae_name === "minimax_h3_audio_vae_fp32.safetensors")!;
    expect(audioVae, "the audio VAE loader composes").toBeDefined();
    expect(audioExtract![1].inputs.audio_vae).toEqual([audioVae![0], 0]);
    expect(apply![1].inputs.mods).toEqual([audioExtract![0], 0]);
  });

  it("mixed currency chains: stems (loader) then media (creator) through two Applies", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: ["refmods/vanellope_example.safetensors", "/melite-media/runs/hero/sheet.png"],
      },
      WINDOW_MODEL, g, "run_refmod_mixed",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loaders = entries.filter(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    const applies = entries.filter(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(loaders.length).toBe(1);
    expect(loaders[0][1].inputs.mod_1).toBe("vanellope_example");
    expect(applies.length).toBe(2);
    // both Applies wire mods from their own source; the SECOND rides
    // the first's conditioning; the guider eats the chain's tail
    expect(applies[0][1].inputs.mods).toEqual([loaders[0][0], 0]);
    expect(applies[1][1].inputs.mods).toEqual([extract![0], 0]);
    expect(applies[1][1].inputs.conditioning).toEqual([applies[0][0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([applies[1][0], 0]);
  });

  it("a non-media, non-safetensors entry refuses loud, naming the entry", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["vanellope.xyz"],
      },
      WINDOW_MODEL, g, "run_refmod_bad",
    )).toThrow(/ref_mods entries are ANY media \(image\/video\/audio — the system bakes the pack\) or pre-baked \.safetensors stems under models\/refmods\/ \(saw 'vanellope\.xyz'\)/);
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

describe("the per-call mods seat (the operator's compound report, 2026-10-24)", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];
  const loaderOf = (g: GraphBuilder) => {
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    return entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
  };

  it("a mods-only call carries its bag: the loader wires even with zero run-level ref_mods (the bag gate)", () => {
    // THE BAG GATE: stanza.refs rides when ANY lane rides — mods
    // included. Pre-fix this stanza lost its whole bag (hasRefs
    // counted only bus lanes), the packs silently died, and the
    // operator saw "the reference seat ignored".
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_only",
    );
    const loader = loaderOf(g);
    expect(loader, "the per-call mod reaches the loader").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("the canon's replace arm: a stated call lane rides INSTEAD of the declared lane; absent inherits", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: ["refmods/run_level.safetensors"],
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_replace",
    );
    const loader = loaderOf(g);
    expect(loader, "the loader composes").toBeDefined();
    // REPLACE: the call's lane rides, run_level does NOT append
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("the canon's replace arm, images lane: a stated call lane rides INSTEAD of the declared lane (film path)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain", prompt: "a courier crosses the city", seed: 42, loras: BAG,
        ref_images: ["declared_one.png"],
        calls: [
          { text: "she steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { images: "call_one.png" } },
          { text: "the crowd closes behind her", start_frame: 90, end_frame: 175 },
        ],
      },
      WINDOW_MODEL, g, "run_call_images_replace",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loads = entries.filter(([, n]) => n.class_type === "LoadImage");
    const stems = loads.map(([, n]) => String(n.inputs.image));
    // window 1: the call's lane REPLACES — call_one rides, declared_one does not.
    // window 2: no call lane stated — the declared lane INHERITS.
    // One load each, per-window truth.
    expect(stems.filter((s) => s.includes("call_one"))).toHaveLength(1);
    expect(stems.filter((s) => s.includes("declared_one"))).toHaveLength(1);
  });

  it("the sole-call unpack: a single-call doc's row seats reach the window (the split-brain twin)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, image: "anchor_one.png", refs: { images: "call_one.png", mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_sole_call_unpack",
    );
    const graph = JSON.stringify(g.toJSON());
    // text, anchor, and both refs lanes ride the single window
    expect(graph.includes("anchor_one")).toBe(true);
    expect(graph.includes("call_one")).toBe(true);
    const loader = loaderOf(g);
    expect(loader, "the sole call's mods reach the loader").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
  });

  it("the bag gate on the FILM path: a multi-call doc's mods-only window carries its bag (the sole-call unpack cannot mask it)", () => {
    // THE GATE'S OWN RED PROOF: narrowing the film loop's gate back
    // to bus-lanes-only (hasRefs) is invisible to single-call docs —
    // the sole-call unpack sets p.refs unconditionally. This wall is
    // the one that goes red when the gate narrows again.
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain", prompt: "a courier crosses the city", seed: 42, loras: BAG,
        calls: [
          { text: "she steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } },
          { text: "the crowd closes behind her", start_frame: 90, end_frame: 175 },
        ],
      },
      WINDOW_MODEL, g, "run_film_gate_mods",
    );
    const loaders = Object.values(g.toJSON()).filter((n) => n.class_type === "MiniMaxH3RefModsLoader");
    expect(loaders).toHaveLength(1);
    expect((loaders[0]!.inputs as Record<string, unknown>).mod_1).toBe("call_pack");
  });

  it("the canon's inherit arm: a call stating no mods lane inherits the declared ref_mods", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: ["refmods/run_level.safetensors"],
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90 }],
      },
      WINDOW_MODEL, g, "run_call_mods_inherit",
    );
    const loader = loaderOf(g);
    expect(loader).toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("run_level");
  });

  it("the cap guards the EFFECTIVE list: 9 stated call mods refuse loud; 8 declared + 1 call mod do not (replace)", () => {
    const over = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: Array.from({ length: 9 }, (_, i) => `call_${String(i)}.safetensors`).join(", ") } }],
      },
      WINDOW_MODEL, over, "run_call_mods_over",
    )).toThrow(/ref_mods exceeds the loader's 8 slots \(saw 9\)/);

    // REPLACE, not merge: the call's one mod rides INSTEAD of the
    // declared eight — the effective list is one, the door stays open.
    const inherit = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: Array.from({ length: 8 }, (_, i) => `run_${String(i)}.safetensors`),
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, inherit, "run_call_mods_replace_under_cap",
    );
    const loader = loaderOf(inherit);
    expect(loader).toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("per-call ANY MEDIA boards: the bag seat carries media through the creator chain too", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_sheet.png" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_media",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    expect(extract, "the per-call bag's media composes the creator").toBeDefined();
    expect(extract![1].inputs.name).toBe("call_sheet");
    expect(entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader")).toBeUndefined();
  });

  it("a non-media per-call entry refuses loud, naming the entry", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.xyz" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_bad",
    )).toThrow(/ref_mods entries are ANY media \(image\/video\/audio — the system bakes the pack\) or pre-baked \.safetensors stems under models\/refmods\/ \(saw 'refmods\/call_pack\.xyz'\)/);
  });

  it("per-call mods never flip the arm: a mods-only call derives t4_open (no bundle-bus slot spent)", () => {
    // The derivation's own tier law: the schema reads the per-call
    // GUIDE aliases and the DECLARED surface — never the refs bag
    // (the compose owns each window's family). Mods ride the bag's
    // conditioning lane, so they flip nothing here either.
    const doc = h3schema({
      prompt: "a slow push in",
      calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
    });
    expect(doc.variant).toBe("t4_open");
    const bagImages = h3schema({
      prompt: "a slow push in",
      calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { images: "ref1.png" } }],
    });
    expect(bagImages.variant).toBe("t4_open");
  });
});
