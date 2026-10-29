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
// The SD-11 data pin rides the family's OWN table (family-owned rows —
// the 2026-10-15 cure): the row is imported verbatim, never re-typed.
import { QWEN_EDIT_ROWS } from "../../../models/qwen-img-edit-2511/mods/loras.ts";

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

// ── THE P0 WITNESS EXTENSION (purge §7, round 80-81): the alias +
// specialty seats the census left UNWITNESSED. Same law as above —
// every arm composes the REAL door and pins the value AT the
// consumer the card wires (the consumer map probed off live
// composes, never guessed). The two inert knobs get HONESTY pins
// (structural identity — the tooltip's own law), the unbuildable
// one gets its REFUSAL pin: a stated double_reference that silently
// composed a plain edit would be the (f) burn exactly.
describe("P0 witness extension — the edit aliases, mask, and specialty seats", () => {
  /** Compose an arbitrary stated doc on a lane (the door, verbatim). */
  function composeDoc(model: ModelFacts, doc: Record<string, unknown>, runId: string): NodeInputs {
    const g = new GraphBuilder();
    def.compose(def.schema(doc), model, g, runId);
    return g.toJSON() as NodeInputs;
  }

  /** The structural fingerprint: node ids + classes + inputs with the
   *  runId normalized out — two composes that differ ONLY by run
   *  identity are structurally identical (the inertness judge). */
  const fingerprint = (graph: NodeInputs, runId: string): string =>
    JSON.stringify(graph).split(runId).join("<RUN>");

  it("E6 (both): the alias seats ride their encoder slots — image2/image3/reference_images reach LoadImage AND the encoder's numbered arms (the merge order: anchor, numbered, then stack)", () => {
    // 21: five encoder arms — anchor + image2 + image3 + two stack refs.
    const g21 = composeDoc(m21, {
      prompt: "p", image1: "/m/anchor.png",
      image2: "/m/two.png", image3: "/m/three.png",
      reference_images: ["/m/refa.png", "/m/refb.png"],
    }, "r_e6_21");
    const enc21 = g21["TextEncodeQwenImage21.0"]!.inputs;
    const expectSlot = (slot: string, loader: string, path: string, what: string): void => {
      assert.deepEqual(enc21[slot], [loader, 0], `21: ${what} rides the encoder's ${slot} arm off ${loader}`);
      assert.equal((g21[loader] as { inputs: { image: string } }).inputs.image, path, `21: ${what} reaches ${loader}`);
    };
    expectSlot("images.image_2", "LoadImage.1", "/m/two.png", "image2");
    expectSlot("images.image_3", "LoadImage.2", "/m/three.png", "image3");
    expectSlot("images.image_4", "LoadImage.3", "/m/refa.png", "reference_images[0]");
    expectSlot("images.image_5", "LoadImage.4", "/m/refb.png", "reference_images[1]");
    // 2511: the lane caps inputs at 3 (anchor + image2 + one ref) —
    // the merged list fills the encoder's image1/image2/image3.
    const g2511 = composeDoc(m2511, {
      prompt: "p", image1: "/m/anchor.png",
      image2: "/m/two.png", reference_images: ["/m/refa.png"],
    }, "r_e6_2511");
    const enc2511 = g2511["TextEncodeQwenImageEditPlus.0"]!.inputs;
    assert.deepEqual(enc2511.image2, ["LoadImage.1", 0], "2511: image2 rides the encoder's image2 arm");
    assert.equal((g2511["LoadImage.1"] as { inputs: { image: string } }).inputs.image, "/m/two.png", "2511: image2 reaches LoadImage");
    assert.deepEqual(enc2511.image3, ["LoadImage.2", 0], "2511: reference_images[0] rides the encoder's image3 arm (the merge order)");
    assert.equal((g2511["LoadImage.2"] as { inputs: { image: string } }).inputs.image, "/m/refa.png", "2511: reference_images[0] reaches LoadImage");
  });

  it("E7 (operator's region seat): a stated input_mask in auto REFUSES loud on BOTH lanes naming the knob — and under crop_stitch it reaches LoadImageMask + the region detailer (never a silent text-only render)", () => {
    for (const [m, lane] of [[m2511, "2511"], [m21, "21"]] as const) {
      assert.throws(
        () => composeDoc(m, { prompt: "p", image1: "/m/anchor.png", input_mask: "/m/mask.png" }, `r_e7_${lane}`),
        /input_mask.*state mask_mode crop_stitch/,
        `${lane}: a stated input_mask in auto refuses loud naming the knob + the fix`,
      );
    }
    const g2511 = composeDoc(m2511, {
      prompt: "p", image1: "/m/anchor.png", input_mask: "/m/mask.png", mask_mode: "crop_stitch",
    }, "r_e7_2511");
    const mask = g2511["LoadImageMask.0"];
    assert.ok(mask, "2511: the region arm composes LoadImageMask (the mask's consumer)");
    assert.equal(mask.inputs.image, "/m/mask.png", "2511: the stated mask reaches LoadImageMask.image verbatim");
    assert.equal(mask.inputs.channel, "alpha", "2511: the mask rides the alpha channel (the card's documented read)");
    assert.ok(g2511["DetailerForEach.0"], "2511: the region detailer mounts (the masked-region reworker)");
  });

  it("E8 (the resize pole): match_input_resolution ON/OFF compose structurally identical graphs with NO stated size (the edit identity — the toggle alone switches nothing); match OFF + both axes mounts the deliverable resize", () => {
    // ON (default) keeps the source's frame with zero wiring change;
    // OFF with no stated axes composes identical (the firing gate
    // demands the pair when asked to resize, and the absent pair is
    // the byte-stable identity — the edit's own frame). OFF + both
    // axes grows exactly one ImageScale (the deliverable resize).
    const doc = { prompt: "p", image1: "/m/anchor.png", seed: 424243 };
    const on = composeDoc(m2511, { ...doc, match_input_resolution: true }, "r_e8_on");
    const off = composeDoc(m2511, { ...doc, match_input_resolution: false }, "r_e8_off");
    assert.equal(fingerprint(on, "r_e8_on"), fingerprint(off, "r_e8_off"),
      "match OFF with NO stated size switches the graph — the identity broke; land the wiring WITH its own value arm");
    const sized = composeDoc(m2511, { ...doc, match_input_resolution: false, width: 1024, height: 768 }, "r_e8_sized");
    assert.ok(!Object.values(on as object).some((n: { class_type: string }) => n.class_type === "ImageScale"), "ON: no resize — the source's frame delivers");
    assert.ok(Object.values(sized as object).some((n: { class_type: string; inputs: Record<string, unknown> }) => n.class_type === "ImageScale"),
      "OFF + both axes: the deliverable resizes on the 2511 lane too");
  });

  it("E12 (the resize order): the stated deliverable pair lands VERBATIM at the ImageScale consumer on BOTH lanes — never a silent plain-edit", () => {
    // The census hop-[5] witness for width/height (SD-6): the value
    // law re-reads FROM the composed graph AT the consumer. The
    // consumer is the kit's deliverable tail (lanczos, crop
    // disabled), mounted only under match OFF + both axes — the
    // E8 structural arm owns the mounting, this arm owns the
    // VALUES. Distinctive sizes so a truncation/default rides red.
    for (const [lane, m] of [["21", m21], ["2511", m2511]] as const) {
      const graph = composeDoc(m, {
        prompt: "p", image1: "/m/anchor.png", seed: SEED,
        match_input_resolution: false, width: 1344, height: 768,
      }, `r_e12_${lane}`);
      const scales = Object.values(graph as object).filter(
        (n: { class_type: string }) => n.class_type === "ImageScale",
      ) as Array<{ inputs: Record<string, unknown> }>;
      assert.equal(scales.length, 1, `${lane}: exactly one deliverable tail mounts`);
      assert.equal(scales[0]!.inputs.width, 1344, `${lane}: the stated width lands at the ImageScale consumer verbatim`);
      assert.equal(scales[0]!.inputs.height, 768, `${lane}: the stated height lands at the ImageScale consumer verbatim`);
      assert.equal(scales[0]!.inputs.upscale_method, "lanczos", `${lane}: the tail resizes lanczos (quality first)`);
      assert.equal(scales[0]!.inputs.crop, "disabled", `${lane}: the tail never crops the finished edit`);
    }
  });

  it("E9 (single-plane law): use_stock_nodes takes no branch — BOTH values compose the stock graph (the TS plane's only edit graph), pinned so a future non-stock arm lands WITH its witness", () => {
    // The plane builds the stock Qwen-Image-Edit graph only; the knob
    // is retained for the day a DiffSynth arm exists. The pin: both
    // values fingerprint identical — when a second arm lands, this
    // reds and forces the arm's own toggle-proofed value arm.
    const doc = { prompt: "p", image1: "/m/anchor.png", seed: 424243 };
    const on = composeDoc(m2511, { ...doc, use_stock_nodes: true }, "r_e9_on");
    const off = composeDoc(m2511, { ...doc, use_stock_nodes: false }, "r_e9_off");
    assert.equal(fingerprint(on, "r_e9_on"), fingerprint(off, "r_e9_off"),
      "use_stock_nodes branched the graph — a non-stock arm grew behind the knob; land its witness WITH it");
  });

  it("E10 (unbuildable, honest): a stated double_reference=true REFUSES loud naming the knob — never a silent plain-edit", () => {
    // The row's own tooltip (agent-debt F-4): "true fires a LOUD
    // refusal — the TS plane builds the stock plain-edit graph only,
    // never a silent plain-edit." The refusal IS the witness: the
    // burn class is a stated knob that silently composes without it.
    assert.throws(
      () => composeDoc(m2511, { prompt: "p", image1: "/m/anchor.png", double_reference: true }, "r_e10"),
      /double_reference/,
      "the unbuildable double-reference refuses loud naming the knob",
    );
  });

  it("E11 (SD-11, the dead opinions): the lightning lora row's steps:4 is DATA-only — a stated pick mounts its loader and never rewrites the sampler's steps; the blank alias is the DOCUMENTED trim (dropped, the stated neighbors still ride)", () => {
    // (a) the DATA is real: the family-owned row declares the distill
    // pairing (steps 4 + cfg 1 per their model card) — inert until the
    // variant marriage lands, and this pin makes any silent wiring red
    // the day it grows (G6 in reverse).
    const row = QWEN_EDIT_ROWS.find((r) => r.id === "qwen_edit_lightning_4step");
    assert.ok(row, "the lightning distill row serves from the family's own table");
    assert.equal(row.steps, 4, "the row still DECLARES the 4-step pairing (data, not wiring)");
    // (b) the INERTNESS: the stated pick mounts its loader (the witness
    // is not vacuous) while the sampler's steps stay the stated value —
    // the row's opinion never rides the graph silently.
    const doc = { prompt: "p", image1: ANCHOR, seed: SEED, steps: 20, loras: [{ name: row.filename, strength: 1 }] };
    const g = composeDoc(m2511, doc, "r_e11_lora");
    const loader = Object.values(g).find((n) => (n.inputs as Record<string, unknown>).lora_name === row.filename);
    assert.ok(loader, "the stated lora mounts its LoraLoaderModelOnly (the pick rode)");
    assert.equal(g["KSampler.0"]?.inputs.steps, 20, "the sampler's steps stay the stated 20 — the row's steps:4 is DATA-only");
    const gDefault = composeDoc(m2511, { prompt: "p", image1: ANCHOR, seed: SEED }, "r_e11_default");
    const defaultSteps = gDefault["KSampler.0"]?.inputs.steps;
    assert.notEqual(defaultSteps, 4, `the unstated steps ride the recipe default (${String(defaultSteps)}), never the lora row's 4`);
    // (c) the blank alias: the DOCUMENTED trim drops it — never staged
    // as a LoadImage of whitespace, the stated neighbor still rides.
    const gTrim = composeDoc(m2511, { prompt: "p", image1: ANCHOR, image2: "/m/two.png", image3: "   " }, "r_e11_trim");
    assert.equal((gTrim["LoadImage.1"] as { inputs: { image: string } }).inputs.image, "/m/two.png", "the stated neighbor rides its slot");
    const blank = Object.values(gTrim).find((n) => (n.inputs as Record<string, unknown>).image === "   ");
    assert.equal(blank, undefined, "the blank alias is the documented trim — dropped, never a whitespace LoadImage");
  });
});
