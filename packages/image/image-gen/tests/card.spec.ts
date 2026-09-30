// @melite/image-image-gen — the card's compose gate arm the
// composition spec does not own: the prompt admission + the happy
// lane against the boarded default family.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
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

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("image-gen")!;
  assert.ok(def, "the composition root serves the image-gen card");
});

describe("the image-gen compose gate", () => {
  it("a missing/blank prompt refuses (what the picture IS)", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose(def.schema({}), model, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the image-gen card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope width refuses loud (declared 256–2048), never composes", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose({ prompt: "a cat", width: 9999 }, model, new GraphBuilder(), "r_oob"),
      /width|9999|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed steps refuses loud (declared number)", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose({ prompt: "a cat", steps: "eight" }, model, new GraphBuilder(), "r_wt"),
      /steps|expected number/i,
    );
  });

  it("THE MODEL CASCADE: an unstated steps arrives from the family DECL default", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g = new GraphBuilder();
    def.compose({ ...model.defaults, prompt: "a cat" }, model, g, "r_def");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["KSampler.0"]?.inputs.steps, 8,
      "the fresh doc composes the family default, not a card-owned duplicate");
  });

  it("the card schema does not duplicate model-backed width, height, or steps defaults", () => {
    const doc = def.schema({ prompt: "a cat" }) as Record<string, unknown>;
    assert.equal(doc.width, undefined);
    assert.equal(doc.height, undefined);
    assert.equal(doc.steps, undefined);
  });

  it("THE SCHEMA GATE: mod-plane keys pass the walk verbatim (no lora-stamp drop)", () => {
    const doc = def.schema({ prompt: "a cat", loras: [{ name: "x.safetensors" }] }) as Record<string, unknown>;
    assert.deepEqual(doc.loras, [{ name: "x.safetensors" }],
      "the gated doc carries the undeclared loras bag through to the composer");
  });
});

// ── GATE S PROOF (2026-09-20, the operator's demand: "when it is
// on 'random seed', the seed isn't randomized when I press run
// again" — UNLESS IT IS PROGRAMMATICALLY PROVEN): the lane's mint
// law, proven at the REAL compose path. Two composes of the SAME
// doc with the sentinel (or no seed at all) MUST mint different
// seeds — run again never repeats; a FIXED seed composes verbatim
// every time (the other half of the law).
describe("GATE S — the seed law on the real compose path", () => {
  const seedOf = (g: { toJSON(): unknown }): unknown =>
    ((g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed);

  it("THE RANDOM ARM: two composes with the sentinel -1 mint DIFFERENT concrete seeds", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g1, "r_rand_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g2, "r_rand_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0,
      `the first compose mints a concrete non-negative int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && Number.isInteger(s2) && s2 >= 0,
      `the second compose mints a concrete non-negative int (got ${String(s2)})`);
    assert.notEqual(s1, s2, "two run-agains under random mint DIFFERENT seeds — the operator's law");
  });

  it("THE UNSTATED ARM: an absent seed walks to the declared default -1 → mints fresh every compose", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose({ prompt: "a cat" }, model, g1, "r_absent_a");
    const g2 = new GraphBuilder();
    def.compose({ prompt: "a cat" }, model, g2, "r_absent_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && s1 >= 0 && typeof s2 === "number" && s2 >= 0,
      "the declared default -1 reaches the lane and mints concrete ints");
    assert.notEqual(s1, s2, "run-again with an unstated seed never repeats either");
  });

  it("THE FIXED ARM: a stated seed composes VERBATIM — the exact seed re-runs", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 1234 }), model, g1, "r_fixed_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 1234 }), model, g2, "r_fixed_b");
    assert.equal(seedOf(g1), 1234);
    assert.equal(seedOf(g2), 1234);
  });

  it("THE BURIED-PIN NEEDLE: a concrete seed RIDING THE STAGE composes that seed — the face where 'run again repeats' is a FIXED stage, not a mint failure", () => {
    // the live receipt (2026-09-20): a bench stage carried
    // seed=2116177065 from an old whole-row load — every run
    // composed it verbatim. The mint law is innocent; the PIN is
    // the disease. This wall pins that reading: a concrete riding
    // seed composes identically twice (so the cure is unpinning
    // the stage to the sentinel, exactly what the operator's dice
    // does).
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 2116177065 }), model, g1, "r_pin_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 2116177065 }), model, g2, "r_pin_b");
    assert.equal(seedOf(g1), 2116177065);
    assert.equal(seedOf(g2), 2116177065);
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 2): the
// route-id binding miss killed here forever. For EVERY facts row
// the image-gen card serves: (1) the row's OWNING FAMILY holds an
// ACTION_BINDINGS row — no address silently rides the legacy lane
// while its siblings compose the declared segment; (2) the row
// composes ITS OWN declared truth — the unet the row spells is the
// unet the graph loads (the wrong-weights half), the latent and
// encoder classes the row spells are the classes the graph builds.
// The row's lane_inputs are the oracle; the graph is the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const imageGenRows = Object.values(facts.models).filter((m) => m.card === "image-gen");
  const rowOf = (id: string) => facts.models[id]!;

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(imageGenRows.length >= 10, `expected the ten served addresses, found ${String(imageGenRows.length)}`);
  });

  for (const row of imageGenRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared weights + classes.
      const g = new GraphBuilder();
      def.compose(def.schema({ ...row.defaults, prompt: "a cat", seed: 5 }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const nodes = Object.values(graph);
      const li = row.lane_inputs as Record<string, unknown>;
      const unet = nodes.find((n) => n.class_type === "UNETLoader")!;
      assert.equal(
        unet.inputs.unet_name, li.unet,
        "the graph loads the row's OWN unet (the raw route's merged view, not the family default)",
      );
      assert.ok(
        nodes.some((n) => n.class_type === li.latent_node),
        `the row's latent class '${String(li.latent_node)}' builds`,
      );
      const encoder = typeof li.text_encode_node === "string" ? li.text_encode_node : "CLIPTextEncode";
      assert.ok(
        nodes.some((n) => n.class_type === encoder),
        `the row's encoder class '${encoder}' builds`,
      );
    });
  }

  it("THE ROUTE SPREAD: route addresses resolve their owning family (the family field rides the derived rows)", () => {
    const raw = rowOf("krea-2-raw");
    assert.equal(raw.family, "krea-2");
    assert.equal(raw.lane_inputs.unet, "krea2_raw_int8_convrot.safetensors",
      "the raw route's derived row carries the merged lane view");
    const bf16 = rowOf("qwen-img-21-bf16");
    assert.equal(bf16.family, "qwen-img-21");
  });
});

// ── THE DECLARED FALLBACK (the interlock): a family the card
// boards but does not bind REFUSES at the dispatch — no address
// silently rides a legacy lane while its siblings compose
// declared segments. The synthetic row is moss-shaped: no family
// field (the identity law: absent ≡ the row id), unbound id.
describe("THE DECLARED FALLBACK — an unbound family refuses loud", () => {
  it("a synthetic unbound row refuses, naming the boarded families", () => {
    const synth = {
      id: "moss-shape",
      card: "image-gen",
      defaults: {},
      lane_inputs: {},
      variants: [],
      variant_groups: [],
      outputs: [],
    };
    assert.ok(!("moss-shape" in ACTION_BINDINGS), "the synthetic row is genuinely unbound");
    assert.throws(
      () => def.compose(def.schema({ prompt: "a cat", seed: 5 }), synth, new GraphBuilder(), "r_fallback"),
      /no declared action for family 'moss-shape' on the image-gen card — every boarded family \(krea-2, z-image, anima, qwen-img-21\)/,
    );
  });
});

// ── THE ACTION ROUTE (the atom vocabulary, stroke-1 pilot): the
// qwen-img-21 family composes through its bound t2i action — the
// atom's own declared segment. The routing oracle is the facts
// door: a drifted text_encode_node REFUSES LOUD (the legacy arm
// silently routed to the stock CLIPTextEncode lane — the defect
// class the pilot kills for bound families). Byte-identity with
// the legacy arm is proven family-side
// (packages/models/qwen-img-21/tests/action.spec.ts).
describe("THE ACTION ROUTE — the bound t2i action on the real compose path", () => {
  const seedOf = (g: { toJSON(): unknown }): unknown =>
    ((g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed);

  it("qwen-img-21 composes the 2.1 encoder graph through the bound action", () => {
    const model = facts.models["qwen-img-21"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({ ...model.defaults, prompt: "a cat", seed: 5 }), model, g, "r_act");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const classes = Object.values(graph).map((n) => n.class_type);
    assert.ok(classes.includes("TextEncodeQwenImage21"), "the 2.1 encoder node builds");
    assert.ok(!classes.includes("CLIPTextEncode"), "no stock pair-lane encoder rides the bound family");
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    assert.equal(enc.inputs.prompt, "a cat");
    assert.equal(seedOf(g), 5, "a stated seed composes verbatim through the action route");
  });

  it("THE ROUTING ORACLE: a drifted text_encode_node refuses at the action's facts door — never the legacy silent stock-lane route", () => {
    const model = facts.models["qwen-img-21"]!;
    const drifted = { ...model, lane_inputs: { ...model.lane_inputs, text_encode_node: "TextEncodeQwenImageEdit" } };
    assert.throws(
      () => def.compose({ prompt: "a cat" }, drifted, new GraphBuilder(), "r_drift"),
      /text_encode_node.*TextEncodeQwenImage21/,
    );
  });

  it("GATE S rides the action route: the sentinel -1 mints DIFFERENT concrete seeds across two composes", () => {
    const model = facts.models["qwen-img-21"]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g1, "r_act_rand_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g2, "r_act_rand_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0,
      `the action route mints a concrete non-negative int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under random on the action route mints fresh");
  });
});
