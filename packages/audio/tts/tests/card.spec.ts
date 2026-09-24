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

describe("the lane-bespoke leaves (the model guard — the persona knobs render on the CustomVoice variant only; instruction control differs per variant, never one shared knob)", () => {
  it("voice/style_instruction declare model+variant; the shared surface stays unguarded", () => {
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
    // THE 1:1 VISIBILITY LAW (operator 2026-09-23): a flavor's
    // inputs key on the VARIANT (the lane), never the family — the
    // same flavor at either size takes the same inputs.
    // CustomVoice instruction control = STYLE over the persona —
    // upstream reserves it for the 1.7B CustomVoice (the 0.6B row
    // has no instruction control; the Base variant clones: no
    // persona, no instruction).
    assert.equal(leaf("voice"), "variant=customvoice", "voice declares its variant (either size — the lane owns the input)");
    assert.equal(leaf("style_instruction"), "model=qwen3-tts-voicedesign&variant=customvoice", "the Emotion & Delivery Style row declares the 1.7B CustomVoice lane (upstream's capability table)");
    // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
    // 2026-09-23, the full law): the persona description pairs with
    // the Design mod's name (voice_name) to fire the studio exporter
    // from ANY lane — the row shows on every address; the compose
    // walls own the pairing (voice_name without design_prompt, or
    // the reverse, refuses loud).
    assert.equal(leaf("design_prompt"), "model=qwen3-tts-voicedesign|qwen3-tts|qwen3-tts-base", "the Voice Persona & Timbre row shows on every qwen3-tts address — the save fires from any lane; the lane's own prompt, never the pack's");
    // the SHARED surface never hides
    assert.equal(leaf("text"), undefined, "the words ride every lane");
    // synth sampling renders on the synthesis lanes only (design
    // sampling lives in the Design entry — the README stroke)
    assert.equal(leaf("temperature"), "variant=customvoice|base", "temperature declares the synthesis lanes");
    assert.equal(leaf("seed"), "variant=customvoice|base", "seed declares the synthesis lanes");
    // THE GENERATE KWARGS (1:1 capabilities — the node serves them,
    // the card declares them, absent rows ride the engine pin)
    assert.equal(leaf("top_p"), "variant=customvoice|base");
    assert.equal(leaf("speed"), "variant=customvoice|base");
    assert.equal(leaf("repetition_penalty"), "variant=customvoice|base");
    assert.equal(leaf("top_k"), "variant=customvoice|base");
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

  // THE LOCK SEED (operator catch f, 2026-09-22): "voice does not
  // appear to lock" — the use lane minted a FRESH random seed every
  // render, so the same persona drifted line to line. An unstated
  // seed now derives from the artifact path (same voice ⇒ same
  // seed); a stated seed still wins.
  it("the lock seed: same artifact composes the SAME seed twice; a stated seed overrides; different voices differ", () => {
    const seedOf = (doc: Record<string, unknown>): unknown => {
      const g = new GraphBuilder();
      def.compose(def.schema(doc), ttsModel, g, "run_lock");
      return g.toJSON()["AudiocoreVoiceStudio.0"]?.inputs.seed;
    };
    const docA = { text: "one line", qvoice: [{ qvoice: "Cherry.qvoice" }] };
    const s1 = seedOf(docA);
    const s2 = seedOf(docA);
    assert.equal(s1, s2, "same artifact, unstated seed ⇒ the SAME derived seed every compose (the lock)");
    assert.ok(typeof s1 === "number" && s1 >= 0, `a real engine seed (≥0), got ${String(s1)}`);
    const sOther = seedOf({ text: "one line", qvoice: [{ qvoice: "Cola.qvoice" }] });
    assert.notEqual(s1, sOther, "a different voice derives a different seed");
    const sStated = seedOf({ ...docA, seed: 4242 });
    assert.equal(sStated, 4242, "a stated seed wins — explicit intent is never overridden");
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
  it("the cloner declares its inputs on the Base variant only; synth sampling skips the design lane", () => {
    assert.equal(leaf("ref_audio"), "variant=base", "reference audio is a Base-variant input (either size)");
    assert.equal(leaf("ref_text"), "variant=base", "reference transcript is a Base-variant input (either size)");
    assert.equal(leaf("temperature"), "variant=customvoice|base", "synth sampling never renders on design");
    assert.equal(leaf("seed"), "variant=customvoice|base", "seed never renders on design");
    assert.equal(leaf("text"), undefined, "the words ride every lane (the design sample on VoiceDesign)");
  });
  it("the card offers BOTH SIZES + THE BASE ROUTE, LARGE-FIRST (boarded[0] is the default everywhere — the operator's large-model default; the base compose address rides the offer, qvoice across ALL qwen3-tts, operator 2026-09-23)", () => {
    assert.equal(def.boarded[0], "qwen3-tts-voicedesign");
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
    // THE MIGRATION PROOF: the variant route composes the dead
    // family's graph byte-identical — same checkpoint address. The
    // variant now STEERS (extras carry the stamp — the variant-stamp
    // law: the resolved variant must reach every layer that keys on
    // it, the form's visible_when rows included)
    const loader = g.toJSON()["LoadAudiocoreModel.0"];
    assert.ok(loader, "the loader rides");
    // THE HF-TREE ADDRESS (transcript-014, stage 3): the bare container dir
    // held only hf/ — the engine's C++ load gate refused it live. The clone
    // lane names the loadable weights, one level down.
    assert.equal(loader.inputs.model_path, "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base", "the clone checkpoint address — the real 0.6B Base weights inside the hf tree");
    assert.equal(loader.inputs.extras, JSON.stringify({ variant: "base" }), "the .6 base lane steers its stamped variant (the missing-audio-input fix: an unstamped lane rendered no reference rows)");
  });
  it("a missing reference refuses loud (clone needs its 3 seconds)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words" }), baseModel, new GraphBuilder(), "r_noref"),
      /ref_audio|ref_text|reference/i,
    );
  });
  it("INSTRUCTION CONTROL DIFFERS PER VARIANT: style text on the cloner refuses loud (style styles the persona — the Base variant has none)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words", ref_audio: "ref.wav", ref_text: "the transcript", style_instruction: "warmly" }), baseModel, new GraphBuilder(), "r_styleclone"),
      /style_instruction|Base|instruction/i,
    );
  });
  it("THE CARRY: a stated embedding on the cloner performs through the studio (upstream's design-then-clone flow — the exported voice IS the clone prompt)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    const g = new GraphBuilder();
    def.compose(
      def.schema({ text: "the words", qvoice: [{ qvoice: "Cherry.qvoice" }] }),
      baseModel,
      g,
      "r_useclone",
    );
    // the studio's generate node rides, the bare AudiocoreTTS cloner does not
    const graph = g.toJSON();
    const studio = Object.values(graph).find((n) => n.class_type === "AudiocoreVoiceStudio");
    const bare = Object.values(graph).find((n) => n.class_type === "AudiocoreTTS");
    assert.ok(studio, "the VoiceStudio generate node wires (qvoice across ALL qwen3-tts)");
    assert.equal(studio.inputs.qvoice_path, "Cherry.qvoice", "the artifact path rides the studio");
    assert.equal(studio.inputs.mode, "generate", "the studio performs");
    assert.equal(bare, undefined, "no bare cloner node beside it");
  });
  it("neither reference stated on the cloner refuses loud (the clone lane needs a source)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words" }), baseModel, new GraphBuilder(), "r_bareclone"),
      /ref_audio|ref_text|reference|Voice Embedding/i,
    );
  });
  it("clone inputs on the speak lane refuse loud (reference audio only fires on the Base variant)", () => {
    assert.throws(
      () => def.compose(def.schema({ text: "the words", ref_audio: "ref.wav", ref_text: "the transcript" }), ttsModel, new GraphBuilder(), "r_refspeak"),
      /ref_audio|ref_text|Base/i,
    );
  });
});

describe("the design lane (the SAVE half — the lane owns the task-named prompt row, the Design mod carries the export name)", () => {
  // THE LANE'S OWN SURFACE (operator 2026-09-23, "three variants
  // three inputs — they are SPECIFIC TASKS, not INSTRUCT"): the
  // design prompt rides the CARD as design_prompt (the
  // "Voice Persona & Timbre" row, visible on the VoiceDesign
  // variant only); the pack carries the export name + design
  // sampling — never the prompt (one knob, one owner).
  it("a stated flat Design entry fires VoiceStudio export_lite on the 1.7B checkpoint", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.ok(designModel, "the design facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "the sample to voice",
        voice_name: "Cherry",
        design_prompt: "a warm voice",
        top_p: 0.9,
        speed: 1,
        repetition_penalty: 1.05,
        seed: 7,
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
    assert.equal(studio.inputs.instruct, "a warm voice", "the persona description wires as the design prompt");
    assert.equal(studio.inputs.sample_text, "the sample to voice", "the card text voices the sample");
    assert.equal(studio.inputs.seed, 7, "the entry's seed wires");
    const loader = graph["LoadAudiocoreModel.0"];
    assert.ok(loader, "the loader rides");
    // THE HEAD FLIP (first-self-route-wins, transcript-014): the head serves
    // the family DEFAULT (customvoice/speak) — the save still fires from any
    // lane (the studio's exporter loads its own variants); the loader stamps
    // the lane it rides.
    assert.equal(loader.inputs.extras, JSON.stringify({ variant: "customvoice" }), "the loader declares the lane it rides (the head's default variant — the export is lane-legal anywhere)");
  });
  it("a lonely persona description refuses loud (the export needs BOTH halves — the head flip made bare text a lawful perform)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words", design_prompt: "a warm voice" }), designModel, new GraphBuilder(), "r_nodesign"),
      /design_prompt|voice_name/i,
    );
    // and the flip's own law: bare text at the head COMPOSES (the family
    // default is the everyday CustomVoice perform lane — the operator's
    // large-model default, never a forced design)
    const g2 = new GraphBuilder();
    def.compose(def.schema({ text: "the words" }), designModel, g2, "r_perform");
    assert.ok(g2.toJSON()["AudiocoreTTS.0"], "bare text performs on the default lane");
  });
  it("a stale style_instruction on the design lane refuses loud (emotion styling rides the CustomVoice lane — never one knob)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample",
        voice_name: "Cherry",
        design_prompt: "a warm voice",
        style_instruction: "excited",
      }), designModel, new GraphBuilder(), "r_stalestyle"),
      /style_instruction|CustomVoice/i,
    );
  });
  it("the stale bag shape refuses loud (it names no surface — the flat params are the contract)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample to voice",
        voice_name: "Cherry",
        design_prompt: "a warm voice",
        qvoice_save: [{ voice_name: "Cherry", design_prompt: "a warm voice" }],
      }), designModel, new GraphBuilder(), "r_stalebag"),
      /qvoice_save/i,
    );
  });
  it("a saved persona on the designer refuses loud (design exports a new voice — it performs none)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample to voice",
        voice_name: "Cherry",
        style_instruction: "a warm voice",
        qvoice: [{ qvoice: "Old.qvoice" }],
      }), designModel, new GraphBuilder(), "r_usedesign"),
      /qvoice|VoiceDesign|persona/i,
    );
  });
});
