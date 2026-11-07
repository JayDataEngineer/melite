// @melite/video-h3-timeline — the refine stack-guard's own arm.
// Drives the registered card's compose door: a present-but-non-array
// refine bag refuses LOUD naming the entry law (the oneEntryBag
// siblings' precedent for replace/repair/extend, now the refine
// stack guard's own). Every row asserts served truth or refusal text.
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
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

describe("the refine stack guard's own arm (card.ts refineStackBag)", () => {
  it("a present-but-non-array refine bag refuses loud — the bag is window entries or nothing", () => {
    const walked = def.schema({
      calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }],
      length: 56,
      refine: {},
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_rfmod_nonarray"),
      /refine bag is present but carries no entry — state exactly one refine entry/,
      "the refine stack guard refuses a non-array bag naming the window-entries law (the replace/repair/extend precedent, now the refine guard's own firing arm)",
    );
  });
});
