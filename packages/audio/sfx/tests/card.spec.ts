// @melite/audio-sfx — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: describe the SOUND, not the scene; the
// lane rides the kit against the REAL moss-sfx facts row.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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
let moss: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("sfx")!;
  assert.ok(def, "the composition root serves the sfx card");
  moss = facts.models["moss-sfx"]!;
  assert.ok(moss, "the moss-sfx facts row serves");
});

describe("the sfx compose gate", () => {
  it("a missing prompt refuses loud (describe the SOUND)", () => {
    assert.throws(
      () => def.compose(def.schema({}), moss, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the sfx card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope duration refuses loud (declared 0.5–300), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "clang", duration: 9999 }, moss, new GraphBuilder(), "r_oob"),
      /duration|9999|between|range/i,
    );
  });

  it("the happy lane synthesizes the effect", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "sword unsheathe, metallic ring" }), moss, g, "run_6");
    const graph = g.toJSON();
    const synth = graph["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(synth.inputs.prompt, "sword unsheathe, metallic ring");
    assert.equal(synth.inputs.mode, "tts", "the sfx lane's own mode");
    assert.equal(graph["SaveAudio.0"].inputs.filename_prefix, "run_6/sfx");
  });
});
