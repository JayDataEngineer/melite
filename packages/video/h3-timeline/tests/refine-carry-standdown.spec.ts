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
// the pass. THIS wall pins the ENGINE carry at its true home: the
// carried bag COMPOSES through the film's own continuation
// (MiniMaxH3FiniteLatentContinuation, one per join, over the
// predecessor's joint target — the round-27 "ZERO DIFFERENCE" seat),
// the off-grid carry still hears the grid refusal, the choke point is
// the family carrier, and the engine rig rides green. Since THE
// COLLAPSE (slice 4) the CARD door arms ONE window per doc: the
// multi-entry tiling and the auto-tile seat refuse loud, which the
// first arms below now judge (the tiling resolves into the edit bag's
// one cell; the carry is not a card surface).
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

describe("the refine carry after the collapse (the card is one window; the engine keeps the carry)", () => {
  it("ARM 1 — the CARD door refuses a multi-entry refine bag: one window per doc, the tiling names the edit bag", () => {
    assert.throws(
      () => def.compose(def.schema(body([
        REFINE_ENTRY(),
        { ...REFINE_ENTRY(), start_seconds: 34 / 24 },
      ])) as Record<string, unknown>, model, new GraphBuilder(), "run_carry_bag2"),
      /refine carries 2 entries — the bag N-entry tiling is not a dial cell/,
      "the retired tiling refuses loud and names the one-window law",
    );
  });

  it("ARM 2 — the CARD door refuses the auto-tile seat: windows rides no edit dial", () => {
    assert.throws(
      () => def.compose(def.schema(body([{ ...REFINE_ENTRY(), windows: 2 }])) as Record<string, unknown>,
        model, new GraphBuilder(), "run_carry_tile2"),
      /refine arm's 'windows' seat rides no edit dial/,
      "the auto-tile is not a dial the one bag carries",
    );
  });

  it("ARM 3 — a ONE-window legacy refine doc composes through the one door: the learned handoff, no carry", () => {
    const g = new GraphBuilder();
    def.compose(def.schema(body([REFINE_ENTRY()])) as Record<string, unknown>, model, g, "run_carry_one");
    const out = graphOf(g);
    assert.equal(ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 1,
      "the learned handoff serves the one-window cell");
    assert.equal(ofClass(out, "MiniMaxH3FiniteLatentContinuation").length, 0,
      "one window has no join, so no carried continuation rides");
  });

  it("ARM 4 — THE GRID JUDGMENT KEEPS ITS OWN VOICE at the engine carrier: an off-grid carry still refuses", () => {
    const carrierFacts = {
      unet: "minimax_h3_t2v_bf16.safetensors",
      clip: "clip.safetensors",
      vae_video: "vae_video.safetensors",
      vae_audio: "vae_audio.safetensors",
    };
    assert.throws(
      () => renderH3RefineBag(
        [REFINE_ENTRY(), { ...REFINE_ENTRY(), start_seconds: 1.5 }],
        {}, carrierFacts, new GraphBuilder(), "run_carry_offgrid",
      ),
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
