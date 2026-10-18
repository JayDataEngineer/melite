// P2 VALUE law at the image-edit consumer (operator catch f, the
// generic class: a stated value that never reaches the graph IS the
// silent-drop class, and the anchor image is its sharpest member —
// a stated image1 that composes into nothing is the (f) burn
// exactly). EVERY served knob re-read FROM the composed graph AT its
// consumer input, on BOTH lanes: TextEncodeQwenImage21 (21) /
// TextEncodeQwenImageEditPlus (2511) for the text pair, KSampler for
// the numerics + solver, LoadImage for the anchor. Stated values are
// LONG + distinctive so a truncation/default rides red.
//
// THE TOGGLE (E5) corrupts THROUGH the compose door (ACTION_BINDINGS
// row swap, in-file, restored in finally): the wall must red while
// the corruption rides and green after the restore. A green that
// survives the swap is a wall judging a copy, not the graph.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { ACTION_BINDINGS } from "../src/card.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

// THE LONG PROMPT (the music precedent: length IS the probe — a
// truncation burn rides red here, not in production).
const PROMPT = "turn this sunlit courtyard photograph into a rain-soaked midnight scene with neon reflections ZZQ-PROMPT-7XKQ";
const NEGATIVE = "blurry cartoon watermark ZZQ-NEG-4PDV";
const SEED = 424243;
const STEPS = 20;
const CFG = 2.5;
const SAMPLER = "euler_ancestral";
const SCHEDULER = "simple";
const ANCHOR = "/m/anchor.png";

let def: CardDefinition;
let m21: ModelFacts;
let m2511: ModelFacts;

function statedDoc() {
  return {
    prompt: PROMPT,
    negative_prompt: NEGATIVE,
    image1: ANCHOR,
    seed: SEED,
    steps: STEPS,
    cfg: CFG,
    sampler: SAMPLER,
    scheduler: SCHEDULER,
  };
}

type NodeInputs = Record<string, { inputs: Record<string, unknown> }>;

function composeLane(model: ModelFacts, runId: string): NodeInputs {
  const g = new GraphBuilder();
  def.compose(def.schema(statedDoc()), model, g, runId);
  return g.toJSON() as NodeInputs;
}

beforeAll(async () => {
  def = (await loadCardDefs()).get("image-edit")!;
  assert.ok(def, "the composition root serves the image-edit card");
  m21 = facts.models["qwen-img-edit-21"]!;
  m2511 = facts.models["qwen-img-edit-2511"]!;
  assert.ok(m21, "the qwen-img-edit-21 facts row serves");
  assert.ok(m2511, "the qwen-img-edit-2511 facts row serves");
});

describe("P2 VALUE law at the image-edit consumer", () => {
  it("E1 (21): the LONG prompt + negative ride verbatim into TextEncodeQwenImage21", () => {
    const graph = composeLane(m21, "r_e1");
    assert.equal(graph["TextEncodeQwenImage21.0"]?.inputs.prompt, PROMPT, "the stated prompt reaches the 21 encoder");
    assert.equal(graph["TextEncodeQwenImage21.0"]?.inputs.negative_prompt, NEGATIVE, "the stated negative reaches the 21 encoder");
  });

  it("E2 (2511): the LONG prompt + negative ride verbatim into the EditPlus pair", () => {
    const graph = composeLane(m2511, "r_e2");
    assert.equal(graph["TextEncodeQwenImageEditPlus.0"]?.inputs.prompt, PROMPT, "the stated prompt reaches the 2511 positive encoder");
    assert.equal(graph["TextEncodeQwenImageEditPlus.1"]?.inputs.prompt, NEGATIVE, "the stated negative reaches the 2511 negative encoder");
  });

  it("E3 (both): seed/steps/cfg + the stated solver ride verbatim into KSampler", () => {
    for (const [lane, model] of [["21", m21], ["2511", m2511]] as const) {
      const graph = composeLane(model, `r_e3_${lane}`);
      assert.equal(graph["KSampler.0"]?.inputs.seed, SEED, `${lane}: seed reaches KSampler`);
      assert.equal(graph["KSampler.0"]?.inputs.steps, STEPS, `${lane}: steps reaches KSampler`);
      assert.equal(graph["KSampler.0"]?.inputs.cfg, CFG, `${lane}: cfg reaches KSampler`);
      assert.equal(graph["KSampler.0"]?.inputs.sampler_name, SAMPLER, `${lane}: the stated sampler reaches KSampler`);
      assert.equal(graph["KSampler.0"]?.inputs.scheduler, SCHEDULER, `${lane}: the stated scheduler reaches KSampler`);
    }
  });

  it("E4 (both, operator f): the stated anchor image1 lands in the graph, never into nothing", () => {
    for (const [lane, model] of [["21", m21], ["2511", m2511]] as const) {
      const graph = composeLane(model, `r_e4_${lane}`);
      assert.equal(graph["LoadImage.0"]?.inputs.image, ANCHOR, `${lane}: the anchor reaches LoadImage`);
    }
    const graph21 = composeLane(m21, "r_e4_21keys");
    assert.deepEqual(
      graph21["TextEncodeQwenImage21.0"]?.inputs["images.image_1"],
      ["LoadImage.0", 0],
      "21: the encoder's images.image_1 arm reads the anchored LoadImage output (the reference vision tokens)",
    );
  });

  it("E5 THE TOGGLE: corruption through the compose door reds E1, restore greens it", () => {
    const KEY = "qwen-img-edit-21";
    const bound = ACTION_BINDINGS[KEY];
    assert.ok(bound, "the 21 binding the toggle corrupts exists");
    ACTION_BINDINGS[KEY] = ((p, model, g, runId) =>
      bound({ ...p, prompt: "" }, model, g, runId));
    let red: unknown;
    try {
      const g = new GraphBuilder();
      def.compose(def.schema(statedDoc()), m21, g, "r_e5_toggle");
      const corrupted = (g.toJSON() as NodeInputs)["TextEncodeQwenImage21.0"]?.inputs.prompt;
      assert.equal(corrupted, PROMPT, "the stated prompt reaches the encoder");
    } catch (e) {
      red = e;
    } finally {
      ACTION_BINDINGS[KEY] = bound;
    }
    assert.ok(red, "the corrupted door reds: the smuggled empty prompt never reaches the graph as stated");
    const graph = composeLane(m21, "r_e5_restored");
    assert.equal(graph["TextEncodeQwenImage21.0"]?.inputs.prompt, PROMPT, "restored: the stated prompt reaches the encoder again");
  });
});
