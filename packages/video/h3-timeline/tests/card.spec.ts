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

  it("THE MERGED FILM: two calls, one prompt, window scopes, real seam edges (the mergegraph port)", () => {
    // w1: extend default (absent transition) — chains nothing (the
    // opener). w2: cut + 1.5s — opens from w1's decoded VIDEO tail
    // (context_frames/context_audio wired to window1's raw decodes).
    const doc = {
      prompt: "run-level prompt",
      calls: [
        { text: "the lantern lifts off", start_frame: 0, end_frame: 90 },
        { text: "the stall keeper waves", start_frame: 90, end_frame: 180, transition: "cut", first_frame_prev_sec: 1.5 },
      ],
    }
    const out = schema(doc) as Record<string, unknown>
    assert.equal(out.variant, "t4_chain")
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-film-test")
    const graph = def.finalize!(g.toJSON())
    const ids = Object.keys(graph)
    // scoped ids carry GLOBAL per-class counters — look up by prefix
    const findId = (re: RegExp): string => {
      const hit = ids.find((id) => re.test(id))
      assert.ok(hit, `no node matches ${re}`)
      return hit
    }
    assert.ok(ids.some((id) => id.startsWith("window1_")), "window1 scope")
    assert.ok(ids.some((id) => id.startsWith("window2_")), "window2 scope")
    assert.ok(!ids.some((id) => /^UNETLoader/.test(id)), "no unscoped strays")
    // w2 cut+prev_sec: the motion context carries DECODED frames,
    // not the latent — the context_frames arm, audio too
    const mc2 = graph[findId(/^window2_MiniMaxH3MotionContext\./)]
    const cf = mc2.inputs.context_frames as unknown[]
    assert.deepEqual(cf, ["window1_VAEDecode.0", 0])
    const ca = mc2.inputs.context_audio as unknown[]
    assert.deepEqual(ca, ["window1_VAEDecodeAudio.0", 0])
    // 1.5s: picture snaps to 39 (36 -> 39, the nearest legal carry),
    // audio 36 frames (24/s)
    assert.equal(mc2.inputs.context_length, "39")
    assert.equal(mc2.inputs.audio_context_length, 36)
    // per-window films save under their own prefixes
    assert.equal(graph[findId(/^window1_SaveVideo\./)].inputs.filename_prefix, "h3_t4_w1")
    assert.equal(graph[findId(/^window2_SaveVideo\./)].inputs.filename_prefix, "h3_t4_w2")
    // per-window spans ride (90 each — on-grid)
    assert.equal(graph[findId(/^window2_MiniMaxH3ReferenceToVideo\./)].inputs.length, 90)
    // THE FILM RAIL (the engine-side concat — never a harness ffmpeg):
    // one concat butts w1's delivered streams onto w2's, one CreateVideo
    // + SaveVideo emits the film
    const concatId = findId(/^MiniMaxH3FilmConcat\./);
    const concat = graph[concatId];
    // the DELIVERED streams: post-trim, post-sharpen — each window's
    // own final switch outputs (index varies with the knob rails)
    assert.match((concat.inputs.images_a as unknown[])[0] as string, /^window1_/);
    assert.match((concat.inputs.images_b as unknown[])[0] as string, /^window2_/);
    assert.deepEqual(concat.inputs.audio_b, ["window2_MiniMaxH3MotionContextTrim.0", 1]);
    const filmSave = graph[findId(/^SaveVideo\./)];
    assert.equal(filmSave.inputs.filename_prefix, "h3_t4_film");
    // the film's CreateVideo drinks the concat's outputs
    const filmCreate = graph[findId(/^CreateVideo\./)];
    assert.deepEqual(filmCreate.inputs.images, [concatId, 0]);
    assert.deepEqual(filmCreate.inputs.audio, [concatId, 1]);
  });

  it("THE MERGED FILM: extend chains the previous SAMPLER latent (the node's own preferred path)", () => {
    const doc = {
      prompt: "p",
      calls: [
        { text: "a", start_frame: 0, end_frame: 90 },
        { text: "b", start_frame: 90, end_frame: 180, transition: "extend", first_frame_prev_sec: 2 },
      ],
    }
    const out = schema(doc) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-film-extend")
    const graph = def.finalize!(g.toJSON())
    const ids = Object.keys(graph)
    const mc2Id = ids.find((id) => /^window2_MiniMaxH3MotionContext\./.test(id))
    assert.ok(mc2Id, "w2 motion context")
    const mc2 = graph[mc2Id]
    // 2s: picture snaps to 56 (48 -> 56), audio 48
    assert.equal(mc2.inputs.context_length, "56")
    assert.equal(mc2.inputs.audio_context_length, 48)
    // the context_latent wire points at window1's SAMPLER output —
    // sliced straight out, no Save/Load round-trip in the merged film
    const cl = mc2.inputs.context_latent as unknown[]
    assert.equal(cl[0], "window1_SamplerCustomAdvanced.0")
    // the py cross-prompt LoadLatent convention does NOT ride here
    assert.ok(!ids.some((id) => /^window2_MiniMaxH3MotionContextLoadLatent/.test(id)))
  });

  it("THE MERGED FILM: empty call text falls to the run prompt; a call's own guide image makes THAT window t4r", () => {
    const doc = {
      prompt: "the run-level prompt",
      calls: [
        { text: "", start_frame: 0, end_frame: 90 }, // falls to run prompt
        { text: "the map unfurls", start_frame: 90, end_frame: 146, image_name: "/melite-media/guide.png", transition: "cut" },
        { text: "into the alley", start_frame: 146, end_frame: 236, transition: "extend", first_frame_prev_sec: 1 },
      ],
    }
    const out = schema(doc) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-film-mixed")
    const graph = def.finalize!(g.toJSON())
    const ids = Object.keys(graph)
    // w1's text node carries the RUN prompt (the empty call fell back)
    const t1 = graph[ids.find((id) => /^window1_MiniMaxH3ReferenceToVideo\./.test(id))!]
    assert.equal(t1.inputs.prompt, "the run-level prompt")
    // w2 is the guide window: its own image, t4r's loader chain
    const li2 = ids.find((id) => /^window2_LoadImage\./.test(id))
    assert.ok(li2, "w2 loads its own guide")
    assert.equal(graph[li2].inputs.image, "/melite-media/guide.png")
    // w3 chains from w2's SAMPLER latent (1s: 22 carry)
    const mc3 = graph[ids.find((id) => /^window3_MiniMaxH3MotionContext\./.test(id))!]
    assert.equal(mc3.inputs.context_length, "22")
    // w2 is a t4r window (its own loader rail) — the sampler counter
    // is global per class, so w2's sampler id carries the class index
    assert.match((mc3.inputs.context_latent as unknown[])[0] as string, /^window2_SamplerCustomAdvanced\.\d+$/)
  });

  it("THE MERGED FILM: cut without prev-sec is a TRUE fresh window (no motion context at all)", () => {
    const doc = {
      prompt: "p",
      calls: [
        { text: "a", start_frame: 0, end_frame: 90 },
        { text: "b", start_frame: 90, end_frame: 180, transition: "cut" },
      ],
    }
    const out = schema(doc) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-film-cut")
    const graph = def.finalize!(g.toJSON())
    const ids = Object.keys(graph)
    assert.ok(!ids.some((id) => /^window2_MiniMaxH3MotionContext\./.test(id)), "hard cut carries nothing")
    assert.ok(!ids.some((id) => /^window2_MiniMaxH3MotionContextLoadLatent/.test(id)))
    assert.ok(!ids.some((id) => /^window2_MiniMaxH3MotionContextTrim\./.test(id)), "nothing pinned, nothing trimmed")
  });

  it("long windows compose UNGATED — the user's span is the user's span (operator's order 2026-09-17)", () => {
    // boundary knowledge (ledgered, never enforced): 90f and 124f
    // render; 141/158/168/175 died inside SamplerCustomAdvanced. No
    // gate: "if a user wants a long window, they should get a long
    // window" — the engine's verdict is the engine's.
    for (const span of [124, 141, 175]) {
      const doc = schema({ prompt: "x", calls: [{ start_frame: 0, end_frame: span }] }) as Record<string, unknown>
      assert.equal(doc.variant, "t4_open", `span ${span}`)
      assert.equal(doc.length, span, `span ${span} rides explicit via the rider (on-grid)`)
    }
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

describe("the loras mod bag + the per-call reference bundle (2026-09-17)", () => {
  it("p.loras rows build the LTX stack verbatim (the mod plane's resolved wire shape)", () => {
    const out = schema({ prompt: "p", calls: [{ text: "t", start_frame: 0, end_frame: 90 }] }) as Record<string, unknown>
    const withBag = { ...out, loras: [
      { name: "h3/alpha.safetensors", strength: 0.4 },
      { name: "h3/beta.safetensors", strength: 0.6 },
    ] }
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(withBag, model, g, "run-loras")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const ltx = Object.values(graph).find((n) => n.class_type === "LTX_lora_loader")!
    assert.ok(ltx, "the LTX loader mounts")
    assert.deepEqual(JSON.parse(ltx.inputs.stack_data as string), [
      { on: true, lora: "h3/alpha.safetensors", str: 0.4, v: 1, a: 1, t: 1 },
      { on: true, lora: "h3/beta.safetensors", str: 0.6, v: 1, a: 1, t: 1 },
    ])
  })

  it("STEPS APPLIED (2026-09-18): a bag entry's steps beats the steps row; a call knob beats the lora; a stacked pair runs the higher count", () => {
    const schedSteps = (params: Record<string, unknown>): unknown[] => {
      const g = new GraphBuilder(PIN_DEFAULTS)
      def.compose(params, model, g, "run-lora-steps")
      const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
      return Object.values(graph).filter((n) => n.class_type === "BasicScheduler").map((n) => n.inputs.steps)
    }
    const doc = (calls: unknown[]): Record<string, unknown> =>
      schema({ prompt: "p", calls }) as Record<string, unknown>
    const plain = doc([
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180 },
    ])
    // one entry: its steps applies to EVERY window (the row default 12 loses)
    assert.deepEqual(schedSteps({ ...plain, loras: [{ name: "h3/alpha.safetensors", strength: 0.4, steps: 4 }] }), [4, 4])
    // a stacked pair (4 + 8): the higher count (8 steps on a 4-step
    // distill is fine; 4 on an 8-step is undercooked)
    assert.deepEqual(schedSteps({ ...plain, loras: [
      { name: "h3/alpha.safetensors", strength: 0.4, steps: 4 },
      { name: "h3/beta.safetensors", strength: 0.6, steps: 8 },
    ] }), [8, 8])
    // a call's own knob beats the lora (window 2 pins 30; window 1
    // still honors the entry)
    const knobby = doc([
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180, knobs: { steps: 30 } },
    ])
    assert.deepEqual(schedSteps({ ...knobby, loras: [
      { name: "h3/alpha.safetensors", strength: 0.4, steps: 4 },
    ] }), [4, 30])
    // no steps on the entries: the steps row rides (schema default 12)
    assert.deepEqual(schedSteps({ ...plain, loras: [{ name: "h3/alpha.safetensors", strength: 0.4 }] }), [12, 12])
  })

  it("STEPS APPLIED (single-window arm): the film-less shape honors the bag steps the same way", () => {
    const out = schema({ prompt: "p", image: "anchor.png" }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose({ ...out, loras: [{ name: "h3/turbo.safetensors", strength: 0.6, steps: 8 }] }, model, g, "run-one")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const sched = Object.values(graph).find((n) => n.class_type === "BasicScheduler")!
    assert.equal(sched.inputs.steps, 8)
  })

  it("a refs-carrying call is t4r and wires the bundle: anchor input_1, ref images 2-9, video components 10/11, audio 16", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180, image: "anchor.png",
        refs: { images: "ref_a.png, ref_b.png", videos: ["clip.mp4"], audios: "voice.wav" } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-refs")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const ids = Object.keys(graph)
    const findId = (re: RegExp): string => {
      const hit = ids.find((id) => re.test(id))
      assert.ok(hit, `no node matches ${re}`)
      return hit
    }
    // w2 derives t4r (the anchor); w1 stays t4_open (no guide, no refs, the opener)
    assert.ok(findId(/^window2_MiniMaxH3ReferenceToVideo\./))
    const bundle = graph[findId(/^window2_PlagueKindBundleIn\./)]
    const wire = (k: string): string => (bundle.inputs[k] as unknown[])[0] as string
    assert.match(wire("input_1"), /^window2_UnifiedResizeImageMask\.\d+$/, "anchor rides input_1 through the ref resizer")
    assert.match(wire("input_2"), /^window2_UnifiedResizeImageMask\.\d+$/, "ref image A rides input_2")
    assert.match(wire("input_3"), /^window2_UnifiedResizeImageMask\.\d+$/, "ref image B rides input_3")
    assert.equal(wire("input_10"), findId(/^window2_GetVideoComponents\./), "the video's IMAGE stream rides input_10")
    assert.equal(wire("input_11"), findId(/^window2_GetVideoComponents\./), "the video's AUDIO stream rides input_11")
    assert.equal(wire("input_16"), findId(/^window2_LoadAudio\./), "the audio ref rides input_16")
    // the load lanes: 3 images (anchor + 2 refs), 1 video, 1 audio
    assert.equal(ids.filter((id) => /^window2_LoadImage\./.test(id)).length, 3)
    assert.equal(ids.filter((id) => /^window2_LoadVideo\./.test(id)).length, 1)
    assert.equal(ids.filter((id) => /^window2_LoadAudio\./.test(id)).length, 1)
  })

  it("the image bus holds NINE slots: a 9-ref call slices to 8 — input_10 stays the video lane's (2026-09-18 off-by-one fix)", () => {
    const nine = Array.from({ length: 9 }, (_, k) => `r${k}.png`).join(", ")
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180, image: "anchor.png",
        refs: { images: nine, videos: ["clip.mp4"] } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-nine")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const ids = Object.keys(graph)
    const bundleId = ids.find((id) => /^window2_PlagueKindBundleIn\./.test(id))!
    const inputs = graph[bundleId]!.inputs
    // the anchor + EIGHT refs ride input_1..input_9 — the 9-slot image bus
    for (let k = 1; k <= 9; k++) {
      assert.ok(inputs[`input_${k}`], `input_${k} rides the image bus`)
    }
    // the 9th ref is SLICED — input_10 belongs to the video's image
    // stream alone (before the fix the 9th ref landed here and was
    // silently clobbered by the video lane)
    assert.equal(
      (inputs.input_10 as unknown[])[0],
      ids.find((id) => /^window2_GetVideoComponents\./.test(id)),
      "input_10 is the video's image stream, never a sliced ref",
    )
    assert.equal(ids.filter((id) => /^window2_LoadImage\./.test(id)).length, 9, "anchor + 8 refs load (the 9th ref is sliced)")
  })

  it("refs WITHOUT a guide still derive t4r (the bundle IS the r2v input)", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90, refs: { images: "ref_a.png" } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-refs-noguide")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string }>
    // single-window graphs are UNSCOPED (scopes ride the film renderer only)
    assert.ok(Object.keys(graph).some((id) => /^MiniMaxH3ReferenceToVideo\./.test(id)), "refs alone mount the r2v lane")
    assert.ok(Object.keys(graph).some((id) => /^PlagueKindBundleIn\./.test(id)), "the reference bundle mounts")
    // no ANCHOR: input_1 (the anchor slot) stays absent; the one
    // LoadImage that mounts IS the ref image (input_2)
    const bundleId = Object.keys(graph).find((id) => /^PlagueKindBundleIn\./.test(id))!
    const inputs = (graph[bundleId] as unknown as { inputs: Record<string, unknown> }).inputs
    assert.ok(!('input_1' in inputs), "no anchor — input_1 absent")
    assert.ok('input_2' in inputs, "the ref image rides input_2")
  })
})

describe("the wire-form arms (single-call lift, span knobs, seamless chains)", () => {
  it("the single-call lift reads the anchor from every guide spelling and the knobs ride the stanza", () => {
    const out = schema({ prompt: "p", calls: [
      // fps_seconds: the knob the t4r length walk actually reads
      // (the frozen golden pins r2v.length ← ComfyMath(seconds × 24)
      // — the 17k+5 grid rider; a knobs.length override is honored on
      // the t4_open/chain spans, not this branch)
      { text: "t", start_frame: 0, end_frame: 90, image_name: "anchor.png", knobs: { fps_seconds: 5 } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-lift")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    // image_name anchor → t4r lane + the i2v dead branch mounts
    assert.ok(Object.keys(graph).some((id) => /^MiniMaxH3ImageToVideo\./.test(id)), "the anchor drives t4r")
    // the knob-pinned length rides the r2v window through the grid
    // walk's ComfyMath expression (the frozen family shape computes
    // length, never a bare literal)
    const r2v = graph[Object.keys(graph).find((id) => /^MiniMaxH3ReferenceToVideo\./.test(id))!]
    const lenIn = r2v.inputs.length as unknown
    assert.ok(Array.isArray(lenIn), "the length input rides a computed wire")
    const mathNode = graph[(lenIn as unknown[])[0] as string] as { inputs: Record<string, unknown> }
    const prim = mathNode.inputs["values.a"] as unknown[]
    const primNode = graph[prim[0] as string] as { inputs: Record<string, unknown> }
    assert.equal(primNode.inputs.value, 5, "the grid walk seeds from the knob-pinned seconds")
  })

  it("an extend call with NO prev-sec chains with the default carry (the seam arm without motion-context seconds)", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180, transition: "extend" },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-extend-nosecs")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    // w2 chains (extend ⇒ chainLike) with NO motion_context_length —
    // the latent seam rides the default carry
    const mc2 = graph[Object.keys(graph).find((id) => /^window2_MiniMaxH3MotionContext\./.test(id))!]
    assert.ok(mc2, "the motion context mounts for the seamless chain")
    assert.equal(mc2.inputs.context_latent !== undefined || mc2.inputs.context_frames !== undefined, true,
      "the seam rides a context wire")
  })

  it("a videos-only reference bundle pins the i2v geometry literals (no image lane mounts)", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90, refs: { videos: ["clip.mp4"] } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-videorefs")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    const i2v = graph[Object.keys(graph).find((id) => /^MiniMaxH3ImageToVideo\./.test(id))!]
    assert.equal(i2v.inputs.width, 768.0, "the geometry literals pin when no image feeds the resizer")
    assert.equal(i2v.inputs.height, 1344.0)
    assert.ok(!Object.keys(graph).some((id) => /^LoadImage\./.test(id)), "no image lane")
  })

  it("empty-string ref entries ride as absent (the wire tolerates trailing commas)", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90, refs: { images: " , ,", videos: [] } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-emptyrefs")
    // empty refs imply nothing: the window stays t4_open — the family
    // marker is the i2v dead branch / the bundle (r2v itself mounts on
    // every family; the frozen goldens pin that shape)
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string }>
    assert.ok(!Object.keys(graph).some((id) => /^MiniMaxH3ImageToVideo\./.test(id)), "no anchor, no i2v dead branch")
    assert.ok(!Object.keys(graph).some((id) => /^PlagueKindBundleIn\./.test(id)), "no refs, no bundle")
  })
})

describe("the remaining wire arms (span rider override, t4r guard refusal)", () => {
  it("a call whose knobs pin length skips the span rider (the studio preset shape)", () => {
    const out = schema({ prompt: "p", calls: [
      { text: "t", start_frame: 0, end_frame: 90 },
      { text: "t2", start_frame: 90, end_frame: 180, knobs: { length: 56 } },
    ] }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-lenknob")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string, inputs: Record<string, unknown> }>
    // w2 rides the knob-pinned 56 directly (no span walk), w1 snaps its span
    for (const [id, n] of Object.entries(graph)) {
      if (/^window2_MiniMaxH3ReferenceToVideo\.|^window2_MiniMaxH3TextToVideo\./.test(id) && typeof n.inputs.length === "number") {
        assert.equal(n.inputs.length, 56, `w2 length pinned on ${id}`)
      }
    }
  })

  it("a hand-forced t4r variant with neither anchor nor refs refuses LOUD", () => {
    const out = schema({ prompt: "p", variant: "t4r" }) as Record<string, unknown>
    assert.throws(
      () => {
        const g = new GraphBuilder(PIN_DEFAULTS)
        def.compose(out, model, g, "run-badt4r")
      },
      /image-anchored window without a staged guide image/,
    )
  })

  it("ABSENT calls + an ABSENT single doc still walks the fresh-press starter (the undefined-film arm)", () => {
    const out = schema({ prompt: "p" }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-fresh")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string }>
    assert.ok(Object.keys(graph).some((id) => /^SaveVideo\./.test(id)), "the starter window saves a film")
  })
})

describe("the guard's refs admission (hand-authored t4r + refs)", () => {
  it("an explicit t4r window with refs and NO anchor passes the guard (the bundle IS the r2v input)", () => {
    const out = schema({ prompt: "p", variant: "t4r", refs: { images: "ref_a.png" } }) as Record<string, unknown>
    const g = new GraphBuilder(PIN_DEFAULTS)
    def.compose(out, model, g, "run-t4r-refs")
    const graph = def.finalize!(g.toJSON()) as Record<string, { class_type: string }>
    assert.ok(Object.keys(graph).some((id) => /^PlagueKindBundleIn\./.test(id)), "the reference bundle mounts")
  })
})
