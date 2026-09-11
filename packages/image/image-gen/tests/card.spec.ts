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
});
