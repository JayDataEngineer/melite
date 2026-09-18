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

  it("THE SCHEMA GATE: an unstated steps arrives as the declared default 8 (the walk fills it)", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g = new GraphBuilder();
    def.compose({ prompt: "a cat" }, model, g, "r_def");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["KSampler.0"]?.inputs.steps, 8,
      "the fresh doc composes the schema-declared default 8, not undefined");
  });

  it("THE SCHEMA GATE: mod-plane keys pass the walk verbatim (no lora-stamp drop)", () => {
    const doc = def.schema({ prompt: "a cat", loras: [{ name: "x.safetensors" }] }) as Record<string, unknown>;
    assert.deepEqual(doc.loras, [{ name: "x.safetensors" }],
      "the gated doc carries the undeclared loras bag through to the composer");
  });
});
