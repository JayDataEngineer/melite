// @melite/audio-voice-lock — the card's compose gate (TEST-2
// breadth, 2026-09-12). TWO admissions: the persona's filename
// stem and the VoiceDesign prompt; the export lane rides the kit
// against the REAL qwen3-tts-voicedesign facts row.
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
let voicedesign: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("voice-lock")!;
  assert.ok(def, "the composition root serves the voice-lock card");
  voicedesign = facts.models["qwen3-tts-voicedesign"]!;
  assert.ok(voicedesign, "the qwen3-tts-voicedesign facts row serves");
});

describe("the voice-lock compose gate", () => {
  it("a missing voice_name refuses (the persona's filename stem)", () => {
    assert.throws(
      () => def.compose(def.schema({ style_instruction: "gruff" }), voicedesign, new GraphBuilder(), "r1"),
      /required param 'voice_name' missing or empty on the voice-lock card/,
    );
  });

  it("a missing style_instruction refuses (the VoiceDesign prompt)", () => {
    assert.throws(
      () => def.compose(def.schema({ voice_name: "mara" }), voicedesign, new GraphBuilder(), "r1"),
      /required param 'style_instruction' missing or empty on the voice-lock card/,
    );
  });

  it("the happy lane exports the persona", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ voice_name: "mara", style_instruction: "gruff scout, low register" }),
      voicedesign, g, "run_8",
    );
    const graph = g.toJSON();
    const studio = graph["AudiocoreVoiceStudio.0"];
    assert.ok(studio, "the voice studio rides");
    assert.equal(studio.inputs.name, "mara");
    assert.equal(studio.inputs.instruct, "gruff scout, low register");
    assert.equal(studio.inputs.mode, "export_lite", "the persona export lane");
    assert.equal(graph["SaveAudio.0"].inputs.filename_prefix, "run_8/voicelock");
  });
});
