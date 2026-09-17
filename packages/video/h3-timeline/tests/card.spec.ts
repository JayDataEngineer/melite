// @melite/video-h3-timeline — the card's compose gate (TEST-2
// breadth, 2026-09-12). The card body is the h3_window renderer
// port; the frozen goldens (tests/golden_cordis/video_h3-*.json,
// cut by the record battery) pin the three window families
// BYTE-LEVEL — this spec replays them through the same pipeline
// (schema normalizer → compose → finalize strip) and then drives
// the schema's own gates (shot laws, variant derivation,
// family-conditional admission) the goldens' happy shapes don't.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder, deriveDefaults } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import { schema, carrier } from "../src/card.ts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const GOLDEN_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "tests", "golden_cordis",
);
const FACTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data",
);
const FACTS_PATH = join(FACTS_DIR, "model-facts.json");
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

interface Case { card: string; model: string; run_id: string; params: Record<string, unknown> }

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline facts row serves");
});

// The DOOR's pipeline mirrored (service.ts composeGraph): the
// builder carries the live pin defaults (object_info snapshot →
// deriveDefaults — CreateVideo's color_space autofills), and the
// params ride the carrier's defaults with the explicit overlay
// LAST (the compose cascade's order; schema() gates are driven below —
// the frozen cases carry renderer-vocabulary keys like length 90
// that the 12-knob walk would refuse, the img-to-mesh precedent).
const PIN_DEFAULTS = deriveDefaults(
  JSON.parse(readFileSync(join(FACTS_DIR, "object_info.json"), "utf8")),
) as ConstructorParameters<typeof GraphBuilder>[0];

function replay(name: string): void {
  const c = JSON.parse(readFileSync(join(GOLDEN_DIR, `${name}.case.json`), "utf8")) as Case;
  const golden = JSON.parse(readFileSync(join(GOLDEN_DIR, `${name}.json`), "utf8"));
  // carrier's own declared default for interpolate_enabled is the
  // WIRE-STRING "false" — self-refusing on its boolean walk (the
  // pre-fill rationale in schema()); pre-fill the runtime boolean
  // before walking, exactly as the normalizer does.
  const merged: Record<string, unknown> = {
    ...carrier({ interpolate_enabled: false }),
    // schema()'s own null-normalization for an omitted shift_video
    // (the family literal resolves in-body; JSON-structural parity).
    shift_video: null,
    ...c.params,
  };
  const g = new GraphBuilder(PIN_DEFAULTS);
  def.compose(merged, model, g, c.run_id);
  const out = def.finalize!(g.toJSON());
  assert.deepEqual(out, golden);
}

describe("the frozen goldens replay byte-level (the three families)", () => {
  it("t4r — the image-anchored opener (switch-picked lora, dead i2v branch)", () => {
    replay("video_h3-timeline_t4r");
  });

  it("t4_open — the text-only single window", () => {
    replay("video_h3-timeline_t4_open");
  });

  it("t4_chain — the chained window (context load/trim rail)", () => {
    replay("video_h3-timeline_t4_chain");
  });

  it("t4_chain w2 — the same-prompt seam (k=2 links the prior save)", () => {
    replay("video_h3-timeline_t4_chain_w2");
  });
});

describe("schema() gates (the py model_validator port)", () => {
  it("ABSENT calls composes the fresh-press starter (one full t4_open window)", () => {
    // the operator's 2026-09-17 instant-fail cure: a fresh card holds
    // params {} — the gate composes the builder's starter VERBATIM
    // (ONE window 0→175, ≈7.3s @ 24fps on the render grid — what the
    // studio readout shows AND what renders)
    // instead of refusing before the studio persists.
    const out = schema({ prompt: "x" }) as Record<string, unknown>
    assert.deepEqual(out.calls, [{ start_frame: 0, end_frame: 90 }])
    assert.equal(out.variant, "t4_open")
    // the span rides as an EXPLICIT length — the compose door's
    // cascade re-boards the schema default 56 over nulls, and the
    // fresh press rendered 2.33s while promising 3.75s (live receipt
    // 2026-09-17). Explicit survives the cascade.
    assert.equal(out.length, 90)
  });

  it("an EXPLICIT empty calls array keeps the py refusal verbatim", () => {
    assert.throws(() => schema({ prompt: "x", calls: [] }), /h3-timeline: no calls to compose/);
  });

  it("a single window wider than 124 refuses at the gate; 124 itself passes (the receipted edge)", () => {
    // boundary pinned live 2026-09-17: 90f and 124f RENDER (124 = the
    // py production window, run 500b613ee1b2); 141/158/168/175 all
    // died inside SamplerCustomAdvanced. The first cut capped at 90
    // and would have refused the lawful 124f window — the operator
    // caught the extrapolation. The gate refuses LOUD beyond the edge.
    const production = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 124 }] }) as Record<string, unknown>
    assert.equal(production.variant, "t4_open")
    assert.equal(production.length, 124) // the span rider serializes it explicit
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 141 }] }),
      /single window spans at most 124 frames .* split the timeline into windows/,
    );
  });

  it("an unknown variant refuses with the known families", () => {
    assert.throws(
      () => schema({ variant: "t9", prompt: "x" } as Record<string, unknown>),
      /unknown window family 't9' \(known: t4_chain, t4_open, t4r\)/,
    );
  });

  it("length: omitted on a single-call doc serializes the span (the 2026-09-17 rider); multi-call keeps null (walk-shadow fix)", () => {
    // t4_open's body literal is 90 — the walk must NOT materialize the
    // declared 56 over it. Explicit keys ride untouched (the goldens
    // carry length 90 explicitly and stay byte-identical). The
    // 2026-09-17 rider: a single-call doc's span rides as an EXPLICIT
    // length (the compose door's cascade re-boards 56 over nulls —
    // the said-3.75s-got-2.33s live receipt); chains keep null so
    // their windows render at the family budgets / preset f values.
    const omitted = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 90 }] });
    assert.equal(omitted.variant, "t4_open");
    assert.equal(omitted.length, 90);
    // (90: on both the 17k+5 frame grid and the declared step grid —
    // the step(5) vs 17k+5 incoherence is ledgered separately)
    const explicit = schema({ prompt: "x", length: 90, calls: [{ start_frame: 0, end_frame: 90 }] });
    assert.equal(explicit.length, 90);
  });

  it("variant derivation: guide image → t4r, single text call → t4_open, many → t4_chain", () => {
    const withGuide = schema({ prompt: "x", calls: [{ image_name: "/m/g.png", start_frame: 0, end_frame: 56 }] });
    assert.equal(withGuide.variant, "t4r");
    const single = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(single.variant, "t4_open");
    const many = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }, { start_frame: 56, end_frame: 124 }] });
    assert.equal(many.variant, "t4_chain");
  });

  it("interpolate_enabled: the seeded WIRE STRING coerces to the runtime boolean (the add-door law)", () => {
    // a fresh stage from the bench add-door rides the served wire
    // literal ("false"/"true" — byte-frozen in the goldens) as an
    // EXPLICIT key; the normalizer coerces it so the boolean walk
    // never refuses (`expected boolean but got false` on the lane).
    const off = schema({ prompt: "x", interpolate_enabled: "false", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(off.interpolate_enabled, false);
    const on = schema({ prompt: "x", interpolate_enabled: "true", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(on.interpolate_enabled, true);
    // omitted → the pre-filled runtime boolean; explicit booleans
    // ride untouched.
    const omitted = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(omitted.interpolate_enabled, false);
    const explicit = schema({ prompt: "x", interpolate_enabled: true, calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(explicit.interpolate_enabled, true);
  });

  it("the shot laws: seam_carry is bounded lane physics (0 = hard cut)", () => {
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56, seam_carry: 0.5 }] }),
      /seam_carry 0.5 outside \[1, 64\]/,
    );
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56, seam_carry: 65 }] }),
      /seam_carry 65 outside/,
    );
    // 0 is the hard cut; 1..64 are legal lane physics. The lenient
    // walk passes unknown keys through untouched — calls rides
    // VERBATIM (the renderer-vocabulary law: the schema admits what
    // it does not declare).
    for (const seam_carry of [0, 1, 64]) {
      const out = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56, seam_carry }] });
      assert.deepEqual(out.calls, [{ start_frame: 0, end_frame: 56, seam_carry }]);
    }
  });

  it("the shot laws: frames are required ints, spans must advance", () => {
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 0 }] }),
      /calls\[0\]: end_frame is required/,
    );
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56.5 }] }),
      /end_frame is required \(int frames/,
    );
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 56, end_frame: 56 }] }),
      /end_frame 56 <= start_frame 56/,
    );
    assert.throws(
      () => schema({ prompt: "x", calls: [{ start_frame: 56, end_frame: 0 }] }),
      /end_frame 0 <= start_frame 56/,
    );
  });

  it("family-conditional admission: t4r rejects the post-ladder leaves", () => {
    assert.throws(
      () => schema({ variant: "t4r", prompt: "x", sr_switch: true } as Record<string, unknown>),
      /h3_window\(t4r\): unsanctioned inject keys: sr_switch/,
    );
    assert.throws(
      () => schema({ variant: "t4r", prompt: "x", interp_multiplier: 4, sharpen_radius: 2 } as Record<string, unknown>),
      /unsanctioned inject keys: interp_multiplier, sharpen_radius/,
    );
  });

  it("family-conditional admission: non-chain windows reject the chaining rail", () => {
    assert.throws(
      () => schema({ variant: "t4_open", prompt: "x", ctx_load_latent_path: "/m/prev.latent" } as Record<string, unknown>),
      /h3_window\(t4_open\): unsanctioned inject keys: ctx_load_latent_path/,
    );
  });

  it("interpolate_enabled pre-fills the runtime boolean (the wire-string parity)", () => {
    const out = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(out.interpolate_enabled, false);
    const explicit = schema({ prompt: "x", interpolate_enabled: true, calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(explicit.interpolate_enabled, true);
  });

  it("an omitted shift_video normalizes to null (the family literal resolves in-body)", () => {
    const out = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(out.shift_video, null);
    const set = schema({ prompt: "x", shift_video: 12, calls: [{ start_frame: 0, end_frame: 56 }] });
    assert.equal(set.shift_video, 12);
  });
});

describe("compose admissions (the card's own gate)", () => {
  it("a t4r window without a staged guide image refuses", () => {
    // explicit variant: derivation skipped, admissions clean, no guide.
    const p = schema({ variant: "t4r", prompt: "x" } as Record<string, unknown>);
    assert.throws(
      () => def.compose(p, model, new GraphBuilder(), "r1"),
      /image-anchored window without a staged guide image/,
    );
  });

  it("the image_name alias stages the guide too (renderer alias second)", () => {
    const p = schema({ variant: "t4r", prompt: "x", image_name: "/m/guide.png" } as Record<string, unknown>);
    const g = new GraphBuilder();
    def.compose(p, model, g, "r1");
    const load = g.toJSON()["LoadImage.0"];
    assert.ok(load, "the guide loads");
    assert.equal(load!.inputs.image, "/m/guide.png");
  });

  it("unknown families refuse at the renderer door too", () => {
    assert.throws(
      () => def.compose({ prompt: "x", variant: "t9" }, model, new GraphBuilder(), "r1"),
      /unknown window family 't9'/,
    );
  });
});

describe("the renderer-vocabulary overlay arms (explicit beats default)", () => {
  it("every optional rides EXPLICITLY on a chain window (switch, context rail, leaves)", () => {
    const g = new GraphBuilder(PIN_DEFAULTS);
    def.compose({
      variant: "t4_chain", k: 2,
      prompt: "turns the corner", width: 1344, height: 768, steps: 12,
      shift_audio: 5, seed: 42,
      sla_switch: true, length: 124,
      noise_seed: 7, sampler_name: "euler", sched_name: "simple", denoise: 0.9,
      ctx_load_latent_path: "/m/prev.latent", ctx_load_clip_index: 2,
      motion_context_length: "51", motion_audio_context_length: 32,
      sharpen_switch: true, sharpen_method: "rcas_fast", sharpen_strength: 0.5,
      sharpen_radius: 2, sharpen_threshold: 0.1, sharpen_iterations: 5,
      interp_switch: true, interp_multiplier: 3, interp_model: "film_net_v2.safetensors",
      sr_switch: true, sr_model: "seedvr2_big.safetensors", sr_resolution: 1440,
      ctx_save_prefix: "runs/r9/h3_context/clip", ctx_save_clip_index: 4,
    }, model, g, "r9");
    const graph = g.toJSON();
    // the switch arms pick the explicit leaves
    const load = graph["MiniMaxH3MotionContextLoadLatent.0"];
    assert.equal(load.inputs.latent_path, "/m/prev.latent", "an explicit path beats the same-prompt seam");
    assert.equal(load.inputs.clip_index, 2);
    const mc = graph["MiniMaxH3MotionContext.0"];
    assert.equal(mc.inputs.context_length, "51");
    assert.equal(mc.inputs.audio_context_length, 32);
    assert.equal(graph["RandomNoise.0"].inputs.noise_seed, 7, "noise_seed beats seed");
    assert.equal(graph["BasicScheduler.0"].inputs.denoise, 0.9);
    const sharpen = graph["ImageSharpenKJ.0"].inputs.method as Record<string, unknown>;
    assert.equal(sharpen.method, "rcas_fast", "explicit leaves patch the grouped dict");
    assert.equal(sharpen.iterations, 5);
    assert.equal(graph["FrameInterpolationModelLoader.0"].inputs.model_name, "film_net_v2.safetensors");
    assert.equal(graph["FrameInterpolate.0"].inputs.multiplier, 3);
    assert.equal(graph["SeedVR2LoadDiTModel.0"].inputs.model, "seedvr2_big.safetensors");
    assert.equal(graph["SeedVR2VideoUpscaler.0"].inputs.resolution, 1440);
    assert.equal(graph["MiniMaxH3MotionContextSaveLatent.0"].inputs.clip_index, 4);
  });

  it("the void walk composes the fresh-press starter; a null row refuses at the shot laws", () => {
    // the void walk (schema(undefined)) rides the same starter as any
    // absent-calls doc — the fresh card's own first compose (90f).
    const voidOut = schema(undefined) as Record<string, unknown>
    assert.deepEqual(voidOut.calls, [{ start_frame: 0, end_frame: 90 }])
    assert.equal(voidOut.length, 90)
    // every row pins its own span — a null row is not a shot.
    assert.throws(
      () => schema({ prompt: "x", calls: [null, { start_frame: 0, end_frame: 56 }] as unknown[] }),
      /calls\[0\]: start_frame is required/,
    );
  });

  it("variant: a non-string variant is the derivation arm (not an error)", () => {
    const out = schema({ variant: 5, prompt: "x", calls: [{ start_frame: 0, end_frame: 56 }] } as Record<string, unknown>);
    assert.equal(out.variant, "t4_open");
  });

  it("ref_images guides the t4r derivation too (the calls row's own guide keys)", () => {
    const out = schema({ prompt: "x", calls: [{ ref_images: ["/m/a.png"], start_frame: 0, end_frame: 56 }] });
    assert.equal(out.variant, "t4r");
    const out2 = schema({ prompt: "x", calls: [{ ref_image: "/m/a.png", start_frame: 0, end_frame: 56 }] });
    assert.equal(out2.variant, "t4r");
  });

  it("a chain window with an ABSENT length takes the family default", () => {
    const g = new GraphBuilder(PIN_DEFAULTS);
    def.compose({ variant: "t4_chain", prompt: "waits", width: 1344, height: 768, steps: 12, shift_audio: 5 }, model, g, "r1");
    assert.equal(g.toJSON()["MiniMaxH3ReferenceToVideo.0"].inputs.length, 56, "chain default 56");
  });

  it("a t4r window with an EXPLICIT sla_switch injects the scalar (no bool node)", () => {
    const g = new GraphBuilder(PIN_DEFAULTS);
    def.compose({
      variant: "t4r", prompt: "sprints", image_name: "/m/guide.png",
      width: 1344, height: 768, steps: 12, shift_audio: 5,
      sla_switch: true, fps_seconds: 8,
    }, model, g, "r1");
    const graph = g.toJSON();
    assert.equal(graph["ComfySwitchNode.0"].inputs.switch, true, "the injected scalar replaces the bool node");
    // the only PrimitiveBoolean left is the dead-branch r2vBool
    // (value true) — the sla bool node (value false) never spawns.
    const bools = Object.values(graph).filter((n) => n.class_type === "PrimitiveBoolean");
    assert.equal(bools.length, 1);
    assert.equal(bools[0].inputs.value, true, "only the r2v dead-branch bool rides");
    const seconds = graph["PrimitiveFloat.1"];
    assert.equal(seconds.inputs.value, 8, "fps_seconds overrides the 10.0 default");
  });

  it("a prompt-less window composes with the empty-string normalize", () => {
    // renderer-vocabulary overlay: prompt is the py-required bare
    // key — the body normalizes absent to '' (the goldens' dead
    // branches carry literal prompt text; an overlay-less window
    // composes '' rather than crashing).
    const g = new GraphBuilder(PIN_DEFAULTS);
    def.compose({ variant: "t4_open", width: 1344, height: 768, steps: 12, shift_audio: 5 }, model, g, "r1");
    assert.equal(g.toJSON()["MiniMaxH3ReferenceToVideo.0"].inputs.prompt, "");
  });
});
