// @melite/image-image-gen — the card's compose gate arm the
// composition spec does not own: the prompt admission + the happy
// lane against the boarded default family.
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
