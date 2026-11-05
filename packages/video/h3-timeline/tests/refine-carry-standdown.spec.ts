// @contract cards-h3-refine-carry-standdown
// @melite/video-h3-timeline — THE REFINE CARRY STAND-DOWN (F3-14,
// operator burn 2026-11-05). The compose mounts the film's own
// continuation across refine window joins correctly
// (renderH3RefineCarry is the round-27 "ZERO DIFFERENCE" seat), but
// the engine path that carries it DIES: the carried window's handoff
// raises
//   ValueError: Drift-Control AV packed mask does not match its audio stream
// at MinimaxH3LatentUpscaler3DRefineHandoff — the timeline-director's
// Drift-Control mask state is seeded from the streams arriving at the
// install site (drift_control_av.py:262-264) and every sampling step
// splits the packed denoise mask into exactly prod(video_shape[1:])
// video elements plus prod(audio_shape) (drift_control_av.py:159); a
// continuation-carried latent carries a video AND an audio prefix, so
// the split no longer lands. Window 0 renders (90 f, 2560×1472, a
// true 2×) and BILLS before window 1 dies — so this wall pins the
// door's stand-down: the carried shape REFUSES in words, before a
// single node is emitted, and the zero-carry hard cut (the press that
// works today) still composes. The refusal sentence names the exact
// engine failure and the cure; the carried refine is owed the engine
// fix (ROADMAP F3-14), and the carrier's own shape stays tested where
// it is reachable (packages/models/h3 refine-bag ARM B11/B12).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { renderH3RefineBag } from "../../../models/h3/src/refine.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> => g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const REFINE_ENTRY = (): Record<string, unknown> => ({
  source_clip: "swap_film_v1.mp4",
  refine_prompt: "the same scene, sharper fabric weave and cleaner edges",
});

const body = (refine: Array<Record<string, unknown>>): Record<string, unknown> => ({
  calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }], length: 56,
  refine,
});

/** The exact engine failure every carried press would hit at window 1. */
const ENGINE_FAILURE = /ValueError: Drift-Control AV packed mask does not match its audio stream/;

describe("the refine carry stand-down (F3-14)", () => {
  it("ARM 1 — a carried two-entry bag REFUSES at the card door, naming the exact engine failure and the cure, before any node", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema(body([
        REFINE_ENTRY(),
        { ...REFINE_ENTRY(), start_seconds: 68 / 24 },
      ])) as Record<string, unknown>, model, g, "run_standdown_bag2"),
      (e: unknown) => {
        const message = String((e as Error).message);
        assert.match(message, ENGINE_FAILURE,
          "the refusal quotes the engine's exact ValueError");
        assert.match(message, /MinimaxH3LatentUpscaler3DRefineHandoff/,
          "the refusal names the node that dies");
        assert.match(message, /drift_control_av\.py:159/,
          "the refusal names the split seat");
        assert.match(message, /F3-14/, "the refusal carries the finding id");
        assert.match(message, /overlap_frames 0/, "the refusal names the hard-cut cure");
        assert.match(message, /ROADMAP F3-14/, "the refusal names where the engine cure is owed");
        assert.match(message, /window 0→1 carries 22 f/,
          "the refusal names the derived carry (0 + 90 − 68 = 22 f)");
        return true;
      },
      "the carried bag refuses in words",
    );
    assert.deepEqual(graphOf(g), {},
      "zero nodes emitted — the refusal precedes every save, so nothing can bill");
  });

  it("ARM 2 — the auto-tile's carried loop REFUSES with its own seats (windows, overlap, join count)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema(body([{ ...REFINE_ENTRY(), windows: 2 }])) as Record<string, unknown>,
        model, g, "run_standdown_tile2"),
      (e: unknown) => {
        const message = String((e as Error).message);
        assert.match(message, /a 2-window loop at a 22 f overlap \(1 carried join\)/,
          "the loop's own arithmetic is named");
        assert.match(message, ENGINE_FAILURE);
        assert.match(message, /F3-14/);
        return true;
      },
      "the carried auto-tile refuses",
    );
    assert.deepEqual(graphOf(g), {}, "zero nodes emitted");
  });

  it("ARM 3 — THE HARD-CUT CURE SERVES TODAY: abutting entries (carry 0) and a zero-overlap loop compose with no continuation", () => {
    // 90 f windows; the second starts at frame 90 — 0 + 90 − 90 = 0 f
    // carry, the plain concat of two independent windows.
    const bagG = new GraphBuilder();
    def.compose(def.schema(body([
      REFINE_ENTRY(),
      { ...REFINE_ENTRY(), start_seconds: 90 / 24 },
    ])) as Record<string, unknown>, model, bagG, "run_standdown_abut");
    const bag = graphOf(bagG);
    assert.equal(ofClass(bag, "MiniMaxH3FiniteLatentContinuation").length, 0,
      "a zero carry mounts no continuation");
    assert.equal(ofClass(bag, "MiniMaxH3FiniteSegmentFinalize").length, 0,
      "nothing carried, nothing trimmed");
    assert.equal(ofClass(bag, "VHS_LoadVideo").length, 2, "two independent windows");
    assert.equal(ofClass(bag, "MeliteConcatVideos").length, 1,
      "the plain file concat joins the abutting windows");
    assert.deepEqual(
      ofClass(bag, "SaveVideo").map(([, n]) => String(n.inputs["filename_prefix"])).sort(),
      ["run_standdown_abut/refine", "run_standdown_abut/refine_w0", "run_standdown_abut/refine_w1"].sort(),
      "two members + the one terminal film",
    );

    const loopG = new GraphBuilder();
    def.compose(def.schema(body([{ ...REFINE_ENTRY(), windows: 2, overlap_frames: 0 }])) as Record<string, unknown>,
      model, loopG, "run_standdown_tile0");
    const loop = graphOf(loopG);
    assert.equal(ofClass(loop, "MiniMaxH3FiniteLatentContinuation").length, 0,
      "the zero-overlap auto-tile never mounts the carry");
    assert.equal(ofClass(loop, "MeliteConcatVideos").length, 1, "it joins through the plain concat");
  });

  it("ARM 4 — THE STAND-DOWN IS THE LAST JUDGMENT: an off-grid carry still hears the grid refusal (its own better voice), never the stand-down", () => {
    // start 1.5 s = 36 f → carry 90 − 36 = 54 f… off the 5/22/39/56 grid?
    // 54 lands between 39 and 56 — the off-grid arm owns it.
    assert.throws(
      () => def.compose(def.schema(body([
        REFINE_ENTRY(),
        { ...REFINE_ENTRY(), start_seconds: 1.5 },
      ])) as Record<string, unknown>, model, new GraphBuilder(), "run_standdown_offgrid"),
      /not token-exact/,
      "the grid judgment keeps its own voice — the stand-down never swallows a better refusal",
    );
  });

  it("ARM 5 — the CHOKE POINT is the family carrier, not a card-only patch: a direct carried bag refuses with the same sentence", () => {
    const carrierFacts = {
      unet: "minimax_h3_t2v_bf16.safetensors",
      clip: "clip.safetensors",
      vae_video: "vae_video.safetensors",
      vae_audio: "vae_audio.safetensors",
    };
    assert.throws(
      () => renderH3RefineBag(
        [REFINE_ENTRY(), { ...REFINE_ENTRY(), start_seconds: 68 / 24 }],
        {}, carrierFacts, new GraphBuilder(), "run_standdown_carrier",
      ),
      ENGINE_FAILURE,
      "every caller of the carrier hears the stand-down",
    );
  });
});
