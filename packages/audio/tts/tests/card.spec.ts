// @melite/audio-tts — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: the words to speak; the lane rides the
// kit against the REAL qwen3-tts facts row (the model's default
// persona fills an unstated voice).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { judgeLaneRelations } from "@melite/contracts/laneRelations";
import { DECL as voicedesignDecl, laneTopologyOf as vdLaneTopologyOf } from "@melite/models-qwen3-tts-voicedesign";
import { laneTopologyOf as ttsLaneTopologyOf } from "@melite/models-qwen3-tts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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

  // THE NONE-VOICE LAW (operator 2026-10-12: "CustomVoice needs nothing
  // but the prompt"). The card's "none" pick is NOT a speaker id — a
  // literal passthrough reached the engine prefill as speaker "none"
  // and died native ("requires speaker or voice reference", lane injury
  // run-d5f94f216419). The cure: "none" OMITS the voice input so the
  // engine node's own default resolution runs (qwen3_tts.py:
  // kwargs.get("voice", <default>)) — the prompt-only compose.
  it("THE NONE-VOICE LAW: voice 'none' composes PROMPT-ONLY — the literal never rides, no refusal fires", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "Hey how is it going?", voice: "none" }), ttsModel, g, "run_none_voice");
    const synth = g.toJSON()["AudiocoreTTS.0"];
    assert.ok(synth, "the synth composes — never a refusal");
    assert.equal(synth.inputs.prompt, "Hey how is it going?", "the prompt rides");
    // The engine pin's own autofill default (object_info voice "") rides —
    // an EMPTY speaker, never the literal "none". Upstream parity
    // (modeling_qwen3_tts.py:2088): speaker ""/None → speaker_embed=None,
    // the model creates the voice from the prompt alone.
    assert.ok(synth.inputs.voice === undefined || synth.inputs.voice === "",
      "no speaker id rides — empty/absent only, the engine's own default");
    assert.equal(JSON.stringify(synth.inputs).includes("none"), false,
      "the literal 'none' never reaches the node (it died native as a speaker id, run-d5f94f216419)");
  });

  it("flow ports and semantic outputs name text and SaveAudio", () => {
    // knob-aligned ports (the flow-contract law): port = `text`.
    // ref_audio joins (the naming-law census, 2026-10-09): the clone
    // slot is a REAL wire seat — a music/sfx stage's audio output
    // can voice it (variant-conditional at compose, loud).
    assert.deepEqual(def.flowKinds.inputs, { text: "text", ref_audio: "audio" });
    // THE VOICES CHANNEL (the optional-channel law, 2026-09-25): the
    // static union declares both; the resolved set per run picks by
    // voice_name (a design run resolves voices, a plain run default).
    assert.deepEqual(def.flowKinds.outputs, { default: "audio", voices: "voice" });
    assert.equal(def.flowOutputBindings?.[0]?.channel, "default");
    assert.equal(def.flowOutputBindings?.[0]?.node, "SaveAudio.0");
    assert.equal(def.flowOutputBindings?.[0]?.nodeClass, "SaveAudio");
    assert.equal(def.flowOutputBindings?.[0]?.when?.({ text: "hello" }), true);
    assert.equal(def.flowOutputBindings?.[0]?.when?.({ voice_name: "saved" }), false);
    const voices = def.flowOutputBindings?.[1];
    assert.equal(voices?.channel, "voices");
    assert.equal(voices?.node, "MeliteQVoiceCopy.0");
    assert.equal(voices?.nodeClass, "MeliteQVoiceCopy");
    assert.equal(voices?.when?.({ voice_name: "saved" }), true);
    assert.equal(voices?.when?.({ text: "hello" }), false);
  });

  it("rejects a qvoice path in the preset speaker row with the lawful seat named", () => {
    assert.throws(
      () => def.compose({ text: "hello", voice: "/voices/old.qvoice" }, ttsModel, new GraphBuilder(), "r_path"),
      /qvoice mod bag/,
    );
  });

  it("an unknown variant id refuses field-named (the lane topology — stroke 1's declared parse owns the lane truth)", () => {
    const model = {
      ...ttsModel,
      defaults: { ...ttsModel.defaults, variant: "yodel" },
    } as ModelFacts;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema({ text: "hello" }), model, g, "r_lane"),
      /qwen3-tts: no lane topology for variant "yodel" — the DECL declares no such lane/,
    );
  });

  it("a design export refuses reference inputs and a saved persona", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "sample",
        voice_name: "Cherry",
        design_prompt: "warm",
        ref_audio: "reference.wav",
      }), designModel, new GraphBuilder(), "r_design_ref"),
      /ref_audio|ref_text/,
    );
    // judged at the FAMILY conflict row (the lying-test re-audit,
    // 2026-10-16): voice_name×qvoice is a DECL-declared conflict, so
    // the throw rides the family relation judgment — the card's own
    // duplicate seat was dead by data flow and is deleted (card.ts
    // carries the proof). This arm names that family door.
    assert.throws(
      () => def.compose(def.schema({
        text: "sample",
        voice_name: "Cherry",
        design_prompt: "warm",
        qvoice: [{ qvoice: "Old.qvoice" }],
      }), designModel, new GraphBuilder(), "r_design_qvoice"),
      /qvoice|persona/,
    );
  });

  // THE EXACT-MISSING VOICE (batch-7 closure, 2026-10-14 — O25n):
  // the together row fires only when a member is stated, so a
  // design compose with NEITHER half is named here, in the lane's
  // own voice — both missing keys spelled, and each single miss
  // named alone. The ref_text twin and the stale pack shape ride
  // the same seat.
  it("a design export names its actually-missing keys (both, either, and the ref_text twin)", () => {
    // the DESIGN lane's own row (the bare -voicedesign id is the
    // customvoice lane — speak, not design)
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    // NEITHER half — the exact-missing voice names both
    assert.throws(
      () => def.compose(def.schema({ text: "sample" }), designModel, new GraphBuilder(), "r_design_none"),
      /required Design param\(s\) 'voice_name' \+ 'design_prompt' missing or empty/,
    );
    // voice_name alone — the family's TOGETHER row speaks first
    // (the judge already spoke: half-stated states are family rows)
    assert.throws(
      () => def.compose(def.schema({ text: "sample", voice_name: "Cherry" }), designModel, new GraphBuilder(), "r_design_v"),
      /ride together on this lane \(state all or none\)/,
    );
    // design_prompt alone — the same together word
    assert.throws(
      () => def.compose(def.schema({ text: "sample", design_prompt: "warm" }), designModel, new GraphBuilder(), "r_design_d"),
      /ride together on this lane \(state all or none\)/,
    );
    // the ref_TEXT twin refuses the same way
    assert.throws(
      () => def.compose(def.schema({
        text: "sample", voice_name: "Cherry", design_prompt: "warm", ref_text: "words",
      }), designModel, new GraphBuilder(), "r_design_reftext"),
      /fire nothing on a Design export/,
    );
    // the stale pack shape names no surface on the design lane
    assert.throws(
      () => def.compose(def.schema({
        text: "sample", voice_name: "Cherry", design_prompt: "warm", qvoice_save: "Old",
      }), designModel, new GraphBuilder(), "r_design_stale"),
      /param 'qvoice_save' names no surface on the tts card/,
    );
  });

  it("THE QVOICE PERSISTENCE LAW: the design lane copies the minted .qvoice into the run tree", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({
      text: "sample",
      voice_name: "harbourmaster",
      design_prompt: "gravelly, warm, unhurried",
    }), designModel, g, "r_qvoice_copy");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown>; class_type: string }>;
    const copies = Object.entries(graph).filter(([, n]) => n.class_type === "MeliteQVoiceCopy");
    assert.equal(copies.length, 1, "exactly one copy node on the design lane");
    const inputs = copies[0]![1].inputs;
    assert.equal(inputs.voice_name, "harbourmaster", "the export's name is the search key");
    assert.equal(inputs.dest_prefix, "r_qvoice_copy/voices", "the copy lands in the run's own tree");
    assert.ok(Array.isArray(inputs.audio), "order rides the studio's audio wire");
  });

  it("the 0.6B CustomVoice lane refuses an instruction control", () => {
    assert.throws(
      () => def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), ttsModel, new GraphBuilder(), "r_small_style"),
      /style_instruction|0\.6B/,
    );
  });

  it("instruction capability follows lane data when model.id names the opposite checkpoint", () => {
    const smallLane = { ...ttsModel, id: "qwen3-tts-voicedesign" };
    assert.throws(
      () => def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), smallLane, new GraphBuilder(), "r_wrong_large_id"),
      /style_instruction|instruction_control/,
    );

    const instructionLane = { ...facts.models["qwen3-tts-voicedesign"]!, id: "qwen3-tts" };
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), instructionLane, g, "r_wrong_small_id");
    assert.equal(g.toJSON()["AudiocoreTTS.0"]?.inputs.instruct, "warmly");
  });
});

describe("the lane surface IS the visibility (2026-10-10, the YOU_ARE_A_LIAR fix shape 2: `visible_when: 'model=…'` dies — a variant's declared field set decides what renders)", () => {
  it("no per-model field table: the card declares no visible_when guard on a lane-owned field", () => {
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
    // THE SURFACE OWNS VISIBILITY (operator 2026-10-10): which fields
    // render on a lane is the DECL's variant surface (voice on
    // CustomVoice, style_instruction on the 1.7B CustomVoice,
    // ref_audio/ref_text on Base), not a per-model guard table in the
    // card. These leaves carry no guard — one spelling, the model
    // family's own declaration decides the rest.
    assert.equal(leaf("voice"), undefined, "the persona knob renders by the lane's declared surface, not a card-side guard");
    assert.equal(leaf("style_instruction"), undefined, "the instruction row's lane (1.7B CustomVoice) is declared, not guarded");
    assert.equal(leaf("ref_audio"), undefined, "the clone row's lane (Base) is declared, not guarded");
    assert.equal(leaf("ref_text"), undefined, "the transcript row's lane (Base) is declared, not guarded");
    // the design prompt + the shared sampling ride EVERY lane (family
    // base surface) — still no guard, and now the form shows them
    // because the DECL says so, not because a model list agreed.
    assert.equal(leaf("design_prompt"), undefined, "the persona description pairs with the Design mod's name; the save fires from ANY lane — declared, not guarded");
    assert.equal(leaf("text"), undefined, "the words ride every lane");
    assert.equal(leaf("temperature"), undefined, "sampling knobs are family base — every lane sees them");
    assert.equal(leaf("seed"), undefined);
    assert.equal(leaf("top_p"), undefined);
    assert.equal(leaf("speed"), undefined);
    assert.equal(leaf("repetition_penalty"), undefined);
    assert.equal(leaf("top_k"), undefined);
  });
});

describe("the qvoice USE lane (the voice-lock LOAD half — a stated .qvoice performs the text through the studio's clone pipeline)", () => {
  it("restores the singleton transport wrapper and keeps the saved media path", () => {
    const model = facts.models["qwen3-tts-voicedesign"]!;
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "The last light is ours.",
        voice: "none",
        style_instruction: "quietly affectionate",
        qvoice: { item: { qvoice: "lastlight-keeper-v1.qvoice", voice_strength: "1" } },
      }),
      model,
      g,
      "run_wrapped",
    );
    const graph = g.toJSON();
    const studio = graph["AudiocoreVoiceStudio.0"];
    assert.ok(studio, "the wrapped qvoice reaches VoiceStudio");
    assert.equal(studio.inputs.qvoice_path, "lastlight-keeper-v1.qvoice");
    assert.equal(studio.inputs.voice_strength, 1);
    assert.equal(studio.inputs.instruct, "quietly affectionate");
    assert.equal(graph["AudiocoreTTS.0"], undefined, "the dead persona synth never replaces the saved voice");
  });

  it("keeps a flat qvoice path's top-level strength", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ text: "the words", qvoice: "Cherry.qvoice", voice_strength: 1.4 }),
      ttsModel,
      g,
      "run_flat_strength",
    );
    assert.equal(g.toJSON()["AudiocoreVoiceStudio.0"]?.inputs.voice_strength, 1.4);
  });

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
  it("the card carries NO per-lane guard table — the DECL's variant surfaces own which fields render (2026-10-10)", () => {
    // the per-lane VISIBILITY now rides the declaration: ref_audio +
    // ref_text on the Base variants, voice on CustomVoice,
    // style_instruction on the 1.7B CustomVoice, sampling on the
    // family base. Those surfaces are pinned where they are authored
    // (the model DECLs + the lane-law wall). The card's ONE job is
    // to carry the fields, unguarded.
    assert.equal(leaf("ref_audio"), undefined, "the cloner rows render by the Base variant's declared surface, not a card guard");
    assert.equal(leaf("ref_text"), undefined, "the transcript row likewise");
    assert.equal(leaf("temperature"), undefined, "synth sampling is family base — it renders where the DECL declares it");
    assert.equal(leaf("seed"), undefined);
    assert.equal(leaf("text"), undefined, "the words ride every lane (the design sample on VoiceDesign)");
  });
  it("the card offers BOTH SIZES + THE BASE ROUTE, LARGE-FIRST (boarded[0] is the default everywhere — the operator's large-model default; the base compose address rides the offer, qvoice across ALL qwen3-tts, operator 2026-09-23)", () => {
    assert.equal(def.boarded[0], "qwen3-tts-voicedesign");
    // +qwen3-tts-voicedesign-design: the design lane's own route (transcript-015)
    assert.deepEqual([...def.boarded].sort(), ["qwen3-tts", "qwen3-tts-base", "qwen3-tts-voicedesign", "qwen3-tts-voicedesign-design"]);
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
  it("THE ONE JUDGE AT COMPOSE (the DECL audit's row 4, 2026-10-10): a half-stated export pair refuses in the DECL's voice — the SAME sentence the bench speaks", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    // The compose seat routes the family relation rows through
    // judgeLaneRelations — the one implementation. The half-stated
    // export pair (either half alone) is the together row's state,
    // and the refusal is the row's cure text, byte-for-byte the
    // voice the bench-write door speaks (the parity is the kill:
    // the imperative copy could drift, and its blank law already
    // had — the design audit's Q4).
    const halfStated = (): void => {
      def.compose(def.schema({
        text: "the sample",
        design_prompt: "a warm voice",
      }), designModel, new GraphBuilder(), "r_noname");
    };
    assert.throws(halfStated, /ride together on this lane/);
    assert.throws(halfStated, /persona export needs both halves/);
    // THE PARITY PIN: the bench-write door judges the identical
    // body by calling THIS SAME judge (judgeLaneRelations — see
    // cardsRegistry's relation seat) over the family's DECL rows.
    // If compose ever hand-rolls the sentence again, the equality
    // breaks: one law, one voice, two seats.
    const decl = voicedesignDecl.relations;
    assert.ok(decl !== undefined, 'the voicedesign family declares rows');
    const benchViol = judgeLaneRelations([decl], {
      text: "the sample",
      design_prompt: "a warm voice",
    });
    assert.ok(benchViol.length > 0, 'the bench judge refuses the identical body');
    let composeMsg = '';
    try { halfStated(); assert.fail('must refuse'); } catch (e) { composeMsg = (e as Error).message; }
    assert.equal(composeMsg, benchViol[0]!.message, 'compose and bench speak the identical sentence');
  });

  it("A NEITHER-STATED ROW COMPOSES THE SYNTH LANE (the preset-voice sample — the old gates never refused it either)", () => {
    // the together row fires only when a member is STATED (the
    // blank tolerance); a bare {text} row is a legal synth compose
    // with the family's preset voice — pre-kill and post-kill
    // alike. The pin holds the boundary: the kill refused NOTHING
    // that used to compose.
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the sample" }), designModel, g, "r_neither");
    assert.ok(Object.keys(g.toJSON()).length > 0, 'the synth lane composes');
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the tts card serves: (1) the row's OWNING FAMILY
// holds an ACTION_BINDINGS row — no address silently rides the
// legacy lane while its siblings compose the declared segment; (2)
// the row composes ITS OWN declared segment — the words (or the
// export pair) save under the run-scoped prefix. The lane's branch
// DATA (synth_lane) picks the segment, never a family-id switch.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "tts");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 2, `expected the served tts addresses, found ${String(rows.length)}`);
  });

  // THE LANE PARAMS per resolved lane topology: the clone lane needs
  // its reference pair; the design lane needs its export pair; the
  // speak lane needs only the words (admission on the card holds).
  const laneOf = (row: ModelFacts): string =>
    (row.family === voicedesignDecl.id ? vdLaneTopologyOf : ttsLaneTopologyOf)(row).synth_lane;
  const laneParams = (row: ModelFacts): Record<string, unknown> => {
    const lane = laneOf(row);
    if (lane === "clone") {
      return { text: "wall probe", ref_audio: "/m/ref.wav", ref_text: "the reference words" };
    }
    if (lane === "design") {
      return { text: "wall probe", voice_name: "wall-host", design_prompt: "a wall probe voice" };
    }
    return { text: "wall probe" };
  };

  for (const row of rows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared segment (the design
      // lane saves under its own /design prefix — the export's
      // artifact pair, not the speak lane's /tts).
      const g = new GraphBuilder();
      def.compose(def.schema(laneParams(row)), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const save = Object.values(graph).find((n) => n.class_type === "SaveAudio")!;
      assert.ok(save, "the declared segment saves the render");
      const suffix = laneOf(row) === "design" ? "design" : "tts";
      assert.equal(save.inputs.filename_prefix, `wall_${row.id}/${suffix}`, "compose stamps the run prefix");
      if (laneOf(row) === "design") {
        const copy = Object.values(graph).find((n) => n.class_type === "MeliteQVoiceCopy")!;
        assert.ok(copy, "the design lane exports the .qvoice artifact");
        assert.equal(copy.inputs.dest_prefix, `wall_${row.id}/voices`, "the export persists into the run's own tree");
      }
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape): the dispatch refuses loud rather than riding a legacy
    // lane in the open (the interlock).
    const row = { ...rows[0]!, id: "synthetic-tts", family: undefined, lane_inputs: rows[0]!.lane_inputs };
    assert.throws(
      () => def.compose(def.schema({ text: "fallback probe" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-tts' on the tts card — every boarded family \(qwen3-tts, qwen3-tts-voicedesign\)/,
    );
  });

  it("THE OTHER BINDING SEAT: the 0.6B family's save fires too (a stated Design pair on the CustomVoice row exports)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "sample", voice_name: "wall-host", design_prompt: "a wall probe voice" }), ttsModel, g, "wall_save_060");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const studio = Object.values(graph).find((n) => n.class_type === "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the save binding routes to the export segment");
    const copy = Object.values(graph).find((n) => n.class_type === "MeliteQVoiceCopy")!;
    assert.equal(copy.inputs.dest_prefix, "wall_save_060/voices", "the export persists into the run's own tree");
  });

  it("THE DECLARED DESIGN ADMISSIONS: the export branch's own refusals fire from any stated voice_name (the save intent)", () => {
    // The export branch's refusals are lane-level seats reached
    // through the save intent (a stated voice_name fires the
    // exporter from ANY lane, per the full qvoice law) — driven
    // here on the real 0.6B row, the lane every address can reach.
    // The together/conflict halves speak in the RELATIONS judge's
    // voice (the one implementation); the stale param name is the
    // save intent's own seat.
    const model = ttsModel;
    // the half-stated export: the together row judges it first (the
    // one implementation — the judge owns the both-halves law).
    assert.throws(
      () => def.compose(def.schema({ text: "sample", voice_name: "host" }), model, new GraphBuilder(), "wall_design_missing"),
      /fields 'voice_name' \+ 'design_prompt' ride together on this lane/,
    );
    // the export's off-surface reference: the conflict row judges it.
    assert.throws(
      () => def.compose(def.schema({ text: "sample", voice_name: "host", design_prompt: "warm", ref_audio: "/m/r.wav" }), model, new GraphBuilder(), "wall_design_ref"),
      /fields 'voice_name' \+ 'ref_audio' conflict on this lane/,
    );
    // the stale 'qvoice_save' param names no surface — the save
    // intent's own refusal (the Design entry is FLAT).
    assert.throws(
      () => def.compose(def.schema({ text: "sample", voice_name: "host", design_prompt: "warm", qvoice_save: true }), model, new GraphBuilder(), "wall_design_stale"),
      /param 'qvoice_save' names no surface on the tts card/,
    );
  });
});
