// @contract cards-h3-refine-carry-standdown
// @melite/video-h3-timeline — THE REFINE CARRY, RE-ARMED (F3-14
// engine cure, operator order 2026-11-15: "THIS APP CANNOT EVER GO
// ALL GREEN WHILE THIS IS STILL BROKEN"). History: the carried
// refine died MID-BILL at MinimaxH3LatentUpscaler3DRefineHandoff —
//   ValueError: Drift-Control AV packed mask does not match its audio stream
// (the timeline-director's Drift-Control mask state is seeded from
// the streams arriving at the install site, and every sampling step
// splits the packed denoise mask into exactly prod(video_shape[1:])
// video elements plus prod(audio_shape); the refinement's enlarged
// grid no longer splits that way). The door stood the carry down
// while the engine was lethal. The cure (the roadmap's own named
// route): the vendored handoff CLONE-STRIPS any foreign dynamic
// denoise-mask patch before its guider samples — the estate python
// wall tests/test_h3_refine_handoff_strip.py judges that cure live,
// pins the burn's verbatim ValueError, and reds if the strip leaves
// the pass. THIS wall pins the door: the carried bag and the carried
// auto-tile COMPOSE through the film's own continuation
// (MiniMaxH3FiniteLatentContinuation, one per join, over the
// predecessor's joint target — the round-27 "ZERO DIFFERENCE" seat),
// the hard cut still serves, the off-grid carry still hears the grid
// refusal, the choke point is the family carrier, and the engine rig
// rides green beside the door that arms it.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ENGINE_RIG = join(ROOT, "tests", "test_h3_refine_handoff_strip.py");
/** The walls tier runs on boxes whose python may lack pytest (CI runs
 * the rig in its own pytest seat); locally and on the battery the
 * exec arm judges it live. */
const PYTEST_PRESENT = (() => {
  try {
    return spawnSync("python3", ["-m", "pytest", "--version"], { encoding: "utf8" }).status === 0;
  } catch {
    return false;
  }
})();

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

describe("the refine carry, re-armed (F3-14 engine cure)", () => {
  it("ARM 1 — a carried two-entry bag COMPOSES: one continuation over the predecessor's joint target, saves, and the one terminal film", () => {
    const g = new GraphBuilder();
    def.compose(def.schema(body([
      REFINE_ENTRY(),
      { ...REFINE_ENTRY(), start_seconds: 34 / 24 },
    ])) as Record<string, unknown>, model, g, "run_carry_bag2");
    const out = graphOf(g);
    // The stand-down is LIFTED: this compose used to refuse before a
    // single node. If the refusal ever returns, this census reds.
    const conts = ofClass(out, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 1, "one continuation per carried join — the carry is live");
    const targets = ofClass(out, "MiniMaxH3ContexMaskedTarget");
    assert.equal(targets.length, 2, "one joint target per window");
    const prevRef = Array.isArray(conts[0]![1].inputs.previous_latent)
      ? String((conts[0]![1].inputs.previous_latent as unknown[])[0])
      : String(conts[0]![1].inputs.previous_latent);
    assert.equal(out[prevRef]!.class_type, "MiniMaxH3ContexMaskedTarget",
      "the carried join rides the predecessor's joint target");
    assert.equal(ofClass(out, "VHS_LoadVideo").length, 2, "two windows, two loaders");
    assert.deepEqual(
      ofClass(out, "SaveVideo").map(([, n]) => String(n.inputs["filename_prefix"])).sort(),
      ["run_carry_bag2/refine", "run_carry_bag2/refine_w0", "run_carry_bag2/refine_w1"].sort(),
      "two members + the one terminal film",
    );
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 1,
      "the plain file concat assembles the carried film");
  });

  it("ARM 2 — the auto-tile's carried loop COMPOSES with its own arithmetic (window 0 fresh, every k≥1 window carrying the loop's overlap)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema(body([{ ...REFINE_ENTRY(), windows: 2 }])) as Record<string, unknown>,
      model, g, "run_carry_tile2");
    const out = graphOf(g);
    const conts = ofClass(out, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 1, "a 2-window loop at a 22 f overlap mounts one carried join");
    assert.equal(Number(conts[0]![1].inputs.overlap_frames), 22,
      "the continuation carries the loop's own overlap (the film's seam)");
    assert.equal(ofClass(out, "VHS_LoadVideo").length, 2, "two windows, two loaders");
    const skips = ofClass(out, "VHS_LoadVideo").map(([, n]) => n.inputs.skip_first_frames);
    assert.deepEqual(skips, [0, 34], "window 1 starts one step in (56 − 22 = 34 f)");
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 1, "the carried film assembles");
  });

  it("ARM 3 — THE HARD CUT STILL SERVES: abutting entries (carry 0) and a zero-overlap loop compose with no continuation", () => {
    // 56 f windows (the 2.33 s design default); the second starts at
    // frame 56 — 0 + 56 − 56 = 0 f carry, the plain concat of two
    // independent windows.
    const bagG = new GraphBuilder();
    def.compose(def.schema(body([
      REFINE_ENTRY(),
      { ...REFINE_ENTRY(), start_seconds: 56 / 24 },
    ])) as Record<string, unknown>, model, bagG, "run_carry_abut");
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
      ["run_carry_abut/refine", "run_carry_abut/refine_w0", "run_carry_abut/refine_w1"].sort(),
      "two members + the one terminal film",
    );

    const loopG = new GraphBuilder();
    def.compose(def.schema(body([{ ...REFINE_ENTRY(), windows: 2, overlap_frames: 0 }])) as Record<string, unknown>,
      model, loopG, "run_carry_tile0");
    const loop = graphOf(loopG);
    assert.equal(ofClass(loop, "MiniMaxH3FiniteLatentContinuation").length, 0,
      "the zero-overlap auto-tile never mounts the carry");
    assert.equal(ofClass(loop, "MeliteConcatVideos").length, 1, "it joins through the plain concat");
  });

  it("ARM 4 — THE GRID JUDGMENT KEEPS ITS OWN VOICE: an off-grid carry still hears the token-grid refusal", () => {
    // start 1.5 s = 36 f → carry 56 − 36 = 20 f, off the 5/22/39/56
    // token grid — the off-grid arm owns it, cured engine or not.
    assert.throws(
      () => def.compose(def.schema(body([
        REFINE_ENTRY(),
        { ...REFINE_ENTRY(), start_seconds: 1.5 },
      ])) as Record<string, unknown>, model, new GraphBuilder(), "run_carry_offgrid"),
      /not token-exact/,
      "the grid judgment keeps its own voice — the ghost is never a fallback",
    );
  });

  it("ARM 5 — the CHOKE POINT is the family carrier, not a card-only patch: a direct carried bag composes the same continuation", () => {
    const carrierFacts = {
      unet: "minimax_h3_t2v_bf16.safetensors",
      clip: "clip.safetensors",
      vae_video: "vae_video.safetensors",
      vae_audio: "vae_audio.safetensors",
    };
    const g = new GraphBuilder();
    renderH3RefineBag(
      [REFINE_ENTRY(), { ...REFINE_ENTRY(), start_seconds: 34 / 24 }],
      {}, carrierFacts, g, "run_carry_carrier",
    );
    assert.equal(ofClass(graphOf(g), "MiniMaxH3FiniteLatentContinuation").length, 1,
      "every caller of the carrier composes the carried join");
  });

  it.skipIf(!PYTEST_PRESENT)(
    "ARM 6 — THE ENGINE RIG RIDES GREEN BESIDE THE DOOR THAT ARMS IT: the handoff strip wall passes (the estate never arms a carry its engine cannot survive)",
    () => {
      const r = spawnSync(
        "python3", ["-m", "pytest", ENGINE_RIG, "-q"],
        { encoding: "utf8", cwd: ROOT, timeout: 300_000 },
      );
      assert.equal(r.status, 0,
        `the engine handoff rig must be green for the door to arm the carry:\n${r.stdout ?? ""}${r.stderr ?? ""}`);
    },
  );
});
