// @melite/audio-music — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission stays on the card: the structured caption
// is the music (what the song IS); the lane body rides the kit
// against the REAL music3 facts row.
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
let music3: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("music")!;
  assert.ok(def, "the composition root serves the music card");
  music3 = facts.models.music3!;
  assert.ok(music3, "the music3 facts row serves");
});

describe("the music compose gate", () => {
  it("a missing caption refuses loud (the caption IS the song)", () => {
    assert.throws(
      () => def.compose(def.schema({}), music3, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the music card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope duration refuses loud (declared 5–360), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "funk, pop", duration: 900 }, music3, new GraphBuilder(), "r_oob"),
      /duration|900|between|range/i,
    );
  });

  it("THE SCHEMA GATE: an unstated duration arrives as the declared default 30 (the walk fills it)", () => {
    const g = new GraphBuilder();
    def.compose({ prompt: "funk, pop" }, music3, g, "r_def");
    const latent = JSON.stringify(g);
    assert.ok(latent.includes('"seconds":30') || latent.includes('"seconds": 30'),
      "the fresh doc composes the schema-declared default 30, not undefined");
  });

  it("the happy lane encodes the caption and saves mp3", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop, soul, guitar, 105 BPM", lyrics: "[verse]..." }), music3, g, "run_2");
    const graph = g.toJSON();
    const encode = graph["MiniMaxMusic3TextEncode.0"];
    assert.ok(encode, "the structured-caption encoder rides");
    assert.equal(encode.inputs.caption, "funk, pop, soul, guitar, 105 BPM");
    assert.equal(encode.inputs.lyrics, "[verse]...");
    assert.ok(graph["UNETLoader.0"], "the lane loads its unet");
    assert.ok(graph["KSampler.0"], "the flow-matching sampler rides");
    const save = graph["SaveAudioAdvanced.0"];
    assert.ok(save, "the mp3 save rides");
    assert.equal(save.inputs.filename_prefix, "run_2/music");
  });
});
