// @melite/audio-tts — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: the words to speak; the lane rides the
// kit against the REAL qwen3-tts facts row (the model's default
// persona fills an unstated voice).
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
let ttsModel: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("tts")!;
  assert.ok(def, "the composition root serves the tts card");
  ttsModel = facts.models["qwen3-tts"]!;
  assert.ok(ttsModel, "the qwen3-tts facts row serves");
});

describe("the tts compose gate", () => {
  it("missing words refuse loud (the words to speak)", () => {
    assert.throws(
      () => def.compose(def.schema({}), ttsModel, new GraphBuilder(), "r1"),
      /required param 'text' missing or empty on the tts card/,
    );
  });

  it("whitespace-only words refuse too", () => {
    assert.throws(
      () => def.compose(def.schema({ text: "   " }), ttsModel, new GraphBuilder(), "r1"),
      /required param 'text' missing or empty on the tts card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope temperature refuses loud (declared 0.05–2), never composes", () => {
    assert.throws(
      () => def.compose({ text: "hello", temperature: 5 }, ttsModel, new GraphBuilder(), "r_oob"),
      /temperature|5|between|range/i,
    );
  });

  it("THE SCHEMA GATE: temperature 0 refuses loud — the engine's positive-sampling minimum is the floor (GPU receipt, hour 15)", () => {
    assert.throws(
      () => def.compose({ text: "hello", temperature: 0 }, ttsModel, new GraphBuilder(), "r_zero"),
      /temperature|0|between|range|smaller/i,
    );
  });

  it("the happy lane speaks with the model's default voice", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the words to speak" }), ttsModel, g, "run_4");
    const graph = g.toJSON();
    const synth = graph["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(synth.inputs.prompt, "the words to speak");
    // The estate layer order: the SCHEMA's declared voice default
    // ("ryan") wins over the model facts row's persona ("vivian")
    // — the model layer only fills a schema-absent voice.
    assert.equal(synth.inputs.voice, "ryan", "schema default voice rides");
    const save = graph["SaveAudio.0"];
    assert.ok(save, "the audio save rides");
    assert.equal(save.inputs.filename_prefix, "run_4/tts");
  });
});

describe("the lane-bespoke leaves (the model guard — CustomVoice knobs never render on the no-persona base lane)", () => {
  it("voice/style_instruction declare model=qwen3-tts; the shared surface stays unguarded", () => {
    // the carrier dance (same as formSchemas: schemaCarrier ?? schema)
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string } } }> } };
    const json = carrier.toJSON();
    const root = Object.values(json.refs).find((n) => n.type === "object" && n.dict !== undefined);
    assert.ok(root, "the schema envelope serves");
    const leaf = (name: string): string | undefined => {
      const refId = root!.dict![name];
      if (refId === undefined) return undefined;
      return json.refs[refId]?.meta?.extra?.visible_when;
    };
    // the CustomVoice-lane knobs (the base family clones — they
    // fire nothing there)
    assert.equal(leaf("voice"), "model=qwen3-tts", "voice declares its family");
    assert.equal(leaf("style_instruction"), "model=qwen3-tts", "style_instruction declares its family");
    // the SHARED surface never hides
    assert.equal(leaf("text"), undefined, "the words ride every lane");
    // synth sampling renders on the synthesis lanes only (design
    // sampling lives in the Design entry — the README stroke)
    assert.equal(leaf("temperature"), "model=qwen3-tts|qwen3-tts-base");
    assert.equal(leaf("seed"), "model=qwen3-tts|qwen3-tts-base");
  });
});

describe("the qvoice USE lane (the voice-lock LOAD half — a stated .qvoice performs the text through the studio's clone pipeline)", () => {
  it("a stated bag fires VoiceStudio generate with the artifact; the persona synth never rides", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "the words to speak",
        qvoice: [{ qvoice: "Cherry.qvoice", voice_strength: 1.4 }],
      }),
      ttsModel,
      g,
      "run_5",
    );
    const graph = g.toJSON();
    const studio = graph["AudiocoreVoiceStudio.0"];
    assert.ok(studio, "the VoiceStudio rides");
    assert.equal(studio.inputs.mode, "generate", "the studio generates with the artifact");
    assert.equal(studio.inputs.qvoice_path, "Cherry.qvoice", "the bag's artifact wires");
    assert.equal(studio.inputs.text, "the words to speak", "the card text is what the persona performs");
    assert.equal(studio.inputs.voice_strength, 1.4, "the identity intensity wires");
    assert.equal(graph["AudiocoreTTS.0"], undefined, "the persona synth never rides on a stated artifact (its embedding path is dead at the C ABI)");
  });
  it("no stated bag keeps the persona synth (the preset timbre)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the words to speak" }), ttsModel, g, "run_6");
    const graph = g.toJSON();
    const synth = graph["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(graph["AudiocoreVoiceStudio.0"], undefined, "the studio never rides without an artifact");
  });
});

describe("the three-lane surfaces (the README stroke 2026-09-21 — each model renders only its own inputs, never the same form)", () => {
  const leaf = (name: string): string | undefined => {
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string } } }> } };
    const json = carrier.toJSON();
    const root = Object.values(json.refs).find((n) => n.type === "object" && n.dict !== undefined);
    assert.ok(root, "the schema envelope serves");
    const refId = root!.dict![name];
    if (refId === undefined) return undefined;
    return json.refs[refId]?.meta?.extra?.visible_when;
  };
  it("the cloner declares its inputs on base only; synth sampling skips the design lane", () => {
    assert.equal(leaf("ref_audio"), "model=qwen3-tts-base", "reference audio is a base-lane input");
    assert.equal(leaf("ref_text"), "model=qwen3-tts-base", "reference transcript is a base-lane input");
    assert.equal(leaf("temperature"), "model=qwen3-tts|qwen3-tts-base", "synth sampling never renders on design");
    assert.equal(leaf("seed"), "model=qwen3-tts|qwen3-tts-base", "seed never renders on design");
    assert.equal(leaf("text"), undefined, "the words ride every lane (the design sample on VoiceDesign)");
  });
  it("the card boards all three Qwen families (the voice-lock card is dead — design lives here)", () => {
    assert.deepEqual([...def.boarded].sort(), ["qwen3-tts", "qwen3-tts-base", "qwen3-tts-voicedesign"]);
  });
});

describe("the base clone lane (reference in, the speaker's voice out — no persona, no embeddings)", () => {
  it("wires reference_audio + reference_text and omits voice/instruct/load", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.ok(baseModel, "the base facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({ text: "the words to speak", ref_audio: "ref.wav", ref_text: "the transcript" }),
      baseModel,
      g,
      "run_clone",
    );
    const synth = g.toJSON()["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(synth.inputs.reference_audio, "ref.wav", "the reference wires");
    assert.equal(synth.inputs.reference_text, "the transcript", "the transcript wires");
    assert.ok(!("voice" in synth.inputs) || synth.inputs.voice === "", "no persona on the cloner");
    assert.ok(!("instruct" in synth.inputs) || synth.inputs.instruct === "", "no instruct on the cloner");
    assert.ok(!("voice_file" in synth.inputs) || synth.inputs.voice_file === "", "no embedding load on the cloner");
  });
  it("a missing reference refuses loud (clone needs its 3 seconds)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words" }), baseModel, new GraphBuilder(), "r_noref"),
      /ref_audio|ref_text|reference/i,
    );
  });
});

describe("the design lane (the SAVE half — the Design mod carries name + prompt, the lane exports)", () => {
  it("a stated save bag fires VoiceStudio export_lite on the 1.7B checkpoint", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.ok(designModel, "the design facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "the sample to voice",
        qvoice_save: [{ voice_name: "Cherry", style_instruction: "a warm voice", temperature: 0.7, top_p: 0.9, speed: 1, repetition_penalty: 1.05, seed: 7 }],
      }),
      designModel,
      g,
      "run_design",
    );
    const graph = g.toJSON();
    const studio = graph["AudiocoreVoiceStudio.0"];
    assert.ok(studio, "the VoiceStudio rides");
    assert.equal(studio.inputs.mode, "export_lite", "design exports lite");
    assert.equal(studio.inputs.name, "Cherry", "the entry's name wires");
    assert.equal(studio.inputs.instruct, "a warm voice", "the entry's prompt wires");
    assert.equal(studio.inputs.sample_text, "the sample to voice", "the card text voices the sample");
    assert.equal(studio.inputs.temperature, 0.7, "the entry's sampling wires");
    assert.equal(studio.inputs.seed, 7, "the entry's seed wires");
    // the loader steers the C++ session task off extras.variant
    // (the engine's own vocabulary: vdes = VoiceDesign — the C++
    // refuses a VoiceDesign checkpoint under task tts, loudly)
    const loader = graph["LoadAudiocoreModel.0"];
    assert.ok(loader, "the loader rides");
    assert.equal(loader.inputs.extras, JSON.stringify({ variant: "voicedesign" }), "design declares its variant");
  });
  it("no stated Design entry refuses loud (design without a prompt is meaningless)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words" }), designModel, new GraphBuilder(), "r_nodesign"),
      /qvoice_save|Design/i,
    );
  });
});
