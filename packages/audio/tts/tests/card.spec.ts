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
import { DECL as qwenDecl, laneTopologyOf as ttsLaneTopologyOf } from "@melite/models-qwen3-tts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
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

  it("fresh cards seat the NO-PRESET encoding, never a persona (the no-voice ruling)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the words to speak" }), ttsModel, g, "run_4");
    const graph = g.toJSON();
    const synth = graph["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(synth.inputs.prompt, "the words to speak");
    // THE NO-NON-SPEAKER REST (operator 2026-11-12, told ten times:
    // "Custom Voice has no non-speaker, yet it defaults on none" —
    // supersedes the 2026-11-10 no-voice ruling's picker half): the
    // customvoice lane's resolver stamp seats 'ryan' for an UNSTATED
    // voice, and the facts fold serves it as the lane's default —
    // the fresh compose rides a REAL speaker. The 11-10 wall's
    // "prompt-only parity" narrative was a scoped proof sold whole:
    // the engine's own _custom_voice REFUSES an empty speaker
    // ("needs a stated speaker preset or a .qvoice"), so an
    // unstated run was a REFUSED run, never a working prompt-only
    // one. The 11-10 half that still holds — the FAMILY defaults
    // row seeds no persona — is walled at no-default-voice.spec
    // ARM A (the family DECL defaults carry no voice key).
    assert.equal(synth.inputs.voice, "ryan", "the lane's rest rides — 'none'/blank was a refused run, never a working one");
    const save = graph["SaveAudio.0"];
    assert.ok(save, "the audio save rides");
    assert.equal(save.inputs.filename_prefix, "run_4/tts");
  });

  // THE NO-NON-SPEAKER LAW (operator 2026-11-12, told ten times:
  // "Custom Voice has no non-speaker, yet it defaults on none").
  // The old "none" pick fired NOTHING on any path — bare it refused
  // at the engine ("needs a stated speaker preset or a .qvoice",
  // run-d5f94f216419's literal-passthrough injury was the first
  // face), and a loaded .qvoice takes the qvoice branch before the
  // speaker row is ever read. This ruling supersedes the picker half
  // of the no-default-voice law (2026-11-10 killed the SILENT
  // vivian seed; 2026-11-12 seats a REAL speaker — the fresh press
  // must work, never rest on a dead 'none'). The family DECL
  // defaults still carry no voice (that wall holds its own row).
  it("THE NO-NON-SPEAKER LAW: 'none' is not a pick — the fresh card rests on a real speaker", () => {
    // the dead literal refuses at the parse — never again a selectable
    // option that produces a refused run
    assert.throws(
      () => def.schema({ text: "Hey how is it going?", voice: "none" }),
      /voice/,
      "the vocabulary no longer carries 'none' — CustomVoice has no non-speaker",
    );
    // the fresh card: the SCHEMA seeds nothing (the lane's own
    // stamp owns the rest — the customvoice variant's
    // resolver_defaults seats 'ryan' for an unstated voice at the
    // estate's stamp gate, while design/base null-stamps keep
    // their lanes unseeded; the schema default itself would seed
    // EVERY lane and re-break the frictionless-authoring law)
    const fresh = def.schema({ text: "Hey how is it going?" }) as Record<string, unknown>;
    assert.ok(fresh["voice"] === undefined || fresh["voice"] === "",
      `the schema seeds no voice (the lane stamp owns the rest), got ${JSON.stringify(fresh["voice"])}`);
    // and a stated pick still rides verbatim (the choice is alive)
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "Hey how is it going?", voice: "ryan" }), ttsModel, g, "run_stated_voice");
    const synth = g.toJSON()["AudiocoreTTS.0"];
    assert.ok(synth, "the synth composes — never a refusal");
    assert.equal(synth.inputs.voice, "ryan", "the stated speaker rides verbatim");
  });

  it("flow ports and semantic outputs name text and SaveAudio", () => {
    // knob-aligned ports (the flow-contract law): port = `text`.
    // ref_audio joins (the naming-law census, 2026-10-09): the clone
    // slot is a REAL wire seat — a music/sfx stage's audio output
    // can voice it (variant-conditional at compose, loud).
    assert.deepEqual(def.flowKinds.inputs, { text: "text", ref_audio: "audio" });
    // THE VOICES CHANNEL (the optional-channel law, 2026-09-25): the
    // static union declares both; the resolved set per run picks by
    // the SAVE QVOICE boolean (the qvoice boolean law, operator
    // 2026-10-22: a save-on run resolves voices, a plain run default).
    assert.deepEqual(def.flowKinds.outputs, { default: "audio", voices: "voice" });
    assert.equal(def.flowOutputBindings?.[0]?.channel, "default");
    assert.equal(def.flowOutputBindings?.[0]?.node, "SaveAudio.0");
    assert.equal(def.flowOutputBindings?.[0]?.nodeClass, "SaveAudio");
    assert.equal(def.flowOutputBindings?.[0]?.when?.({ text: "hello" }), true);
    assert.equal(def.flowOutputBindings?.[0]?.when?.({ save_qvoice: true }), false);
    const voices = def.flowOutputBindings?.[1];
    assert.equal(voices?.channel, "voices");
    assert.equal(voices?.node, "MeliteQVoiceCopy.0");
    assert.equal(voices?.nodeClass, "MeliteQVoiceCopy");
    assert.equal(voices?.when?.({ save_qvoice: true }), true);
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

  it("a Design save refuses reference inputs and a saved persona (the boolean law: save_qvoice is the save signal)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "sample",
        save_qvoice: true,
        design_prompt: "warm",
        ref_audio: "reference.wav",
      }), designModel, new GraphBuilder(), "r_design_ref"),
      /ref_audio|ref_text/,
    );
    // judged at the card's own surface seat (the qvoice boolean law,
    // operator 2026-10-22): the family conflict row that owned this
    // word died with voice_name — a lane's own surface fact (a
    // saved persona performs nothing beside a design) refuses loud
    // here, never silently skips.
    assert.throws(
      () => def.compose(def.schema({
        text: "sample",
        save_qvoice: true,
        design_prompt: "warm",
        qvoice: [{ qvoice: "Old.qvoice" }],
      }), designModel, new GraphBuilder(), "r_design_qvoice"),
      /qvoice.*fires nothing beside the save/,
    );
  });

  // THE PRESET-SAVE LANE (operator 2026-10-22, hour 19 of the
  // qvoice burn: "I DON'T NEED A VOICE REFERENCE FOR CUSTOM MODEL")
  // — the third source of the one-source law: a stated preset
  // speaker saves ITS OWN voice (no reference, no design word).
  // The wall judges the full journey hop: doc → card judge →
  // serialized graph (the studio node carries `speaker`).
  it("a preset save composes from the speaker alone and refuses the other sources", () => {
    const model = ttsModel;
    // COMPOSES GREEN: speaker alone — no design word, no reference.
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "sample", save_qvoice: true, voice: "vivian" }), model, g, "r_preset");
    const studio = Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
      .find((n) => n.class_type === "AudiocoreVoiceStudio");
    assert.ok(studio, "the studio fires on a preset save");
    assert.equal((studio!.inputs as Record<string, unknown>).speaker, "vivian",
      "the speaker rides the serialized graph (the preset arm's own wire)");
    assert.ok(Object.values(g.toJSON() as Record<string, { class_type: string }>).some((n) => n.class_type === "MeliteQVoiceCopy"),
      "the preset save persists (the copy node rides)");
    // ONE-OF-THREE: preset + design refuses
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true, voice: "vivian", design_prompt: "warm" }), model, new GraphBuilder(), "r_preset_design"),
      /'design_prompt' and 'voice' fire together/,
    );
    // ONE-OF-THREE: preset + reference refuses
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true, voice: "vivian", ref_audio: "/m/r.wav" }), model, new GraphBuilder(), "r_preset_ref"),
      /'voice' and 'ref_audio' fire together/,
    );
    // NO SOURCE: the refusal names the run's own law
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true }), model, new GraphBuilder(), "r_preset_none"),
      /state a Preset Speaker, a reference clip, or describe who speaks/,
    );
    // THE OPERATOR'S EXACT PRESS (hour ~20 of the qvoice burn): CV
    // lane + preset + STYLE + save — style conditions the render and
    // never refuses the save (the save adds persistence, never
    // demands different params — operator law 2026-10-22).
    const gStyle = new GraphBuilder();
    def.compose(def.schema({ text: "sample", save_qvoice: true, voice: "ryan", style_instruction: "excited" }), model, gStyle, "r_preset_style");
    const studioStyle = Object.values(gStyle.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
      .find((n) => n.class_type === "AudiocoreVoiceStudio");
    assert.ok(studioStyle, "the style save composes");
    assert.equal((studioStyle!.inputs as Record<string, unknown>).style_instruction, "excited",
      "the style rides the serialized graph (it conditions the render, never refuses the save)");
  });

  // THE QVOICE BOOLEAN LAW (operator 2026-10-22): the export pair is
  // dead — no together row, no exact-missing voice, no name. The
  // card compose's design arms: a plain design run previews (the
  // studio designs, the flac lands, NOTHING persists); the save
  // branch's own refusals (missing persona, reference twin, stale
  // pack shape) fire from the boolean.
  it("a design compose under the boolean law: plain run PREVIEWS, save run demands the persona, and the off-surface twins refuse", () => {
    // the DESIGN lane's own row (the bare -voicedesign id is the
    // customvoice lane — speak, not design)
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    // PLAIN RUN (no boolean): the preview composes — studio + flac,
    // NO copy node (the persona's blankness is the variant's own
    // required word, judged at the bench and run seats, never here)
    const plain = new GraphBuilder();
    def.compose(def.schema({ text: "sample", design_prompt: "warm" }), designModel, plain, "r_plain");
    const plainNodes = Object.values(plain.toJSON() as Record<string, { class_type: string }>).map((n) => n.class_type);
    assert.ok(plainNodes.includes("AudiocoreVoiceStudio"), "the studio designs");
    assert.ok(!plainNodes.includes("MeliteQVoiceCopy"), "a plain design run persists NOTHING (the boolean is the save)");
    // SAVE WITHOUT THE PERSONA — the save branch's own word
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true }), designModel, new GraphBuilder(), "r_design_none"),
      /required Design param\(s\) 'design_prompt' missing or empty/,
    );
    // the ref_TEXT twin refuses the same way
    assert.throws(
      () => def.compose(def.schema({
        text: "sample", save_qvoice: true, design_prompt: "warm", ref_text: "words",
      }), designModel, new GraphBuilder(), "r_design_reftext"),
      /ref_text.*rides only with 'ref_audio'/,
    );
    // the stale pack shape names no surface on the design lane
    assert.throws(
      () => def.compose(def.schema({
        text: "sample", save_qvoice: true, design_prompt: "warm", qvoice_save: "Old",
      }), designModel, new GraphBuilder(), "r_design_stale"),
      /param 'qvoice_save' names no surface on the tts card/,
    );
  });

  it("THE QVOICE PERSISTENCE LAW: the SAVE QVOICE boolean copies the minted .qvoice into the run tree (the mint names itself)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({
      text: "sample",
      save_qvoice: true,
      design_prompt: "gravelly, warm, unhurried",
    }), designModel, g, "r_qvoice_copy");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown>; class_type: string }>;
    const copies = Object.entries(graph).filter(([, n]) => n.class_type === "MeliteQVoiceCopy");
    assert.equal(copies.length, 1, "exactly one copy node on the save path");
    const inputs = copies[0]![1].inputs;
    assert.equal(inputs.voice_name, "voice-r_qvoice_copy", "the build MINTS the name (voice-<runId> — no typed name anywhere)");
    assert.equal(inputs.dest_prefix, "r_qvoice_copy/voices", "the copy lands in the run's own tree");
    assert.ok(Array.isArray(inputs.audio), "order rides the studio's audio wire");
  });

  it("the 0.6B CustomVoice lane refuses an instruction control", () => {
    assert.throws(
      () => def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), ttsModel, new GraphBuilder(), "r_small_style"),
      /style_instruction|0\.6B/,
    );
  });

  it("instruction capability follows the selected size cell, not the variant alone", () => {
    // The 1.7B CustomVoice address carries the instruction cell, so
    // the same style composes there and wires the synth's instruct.
    const largeLane = facts.models["qwen3-tts-voicedesign"]!;
    assert.equal(largeLane.lane_inputs.model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), largeLane, g, "r_large_cell_style");
    assert.equal(g.toJSON()["AudiocoreTTS.0"]?.inputs.instruct, "warmly");

    // The retained small-family address is the 0.6B CustomVoice cell,
    // so the same stated style refuses field-named.
    assert.equal(ttsModel.lane_inputs.model_path, "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.throws(
      () => def.compose(def.schema({ text: "hello", style_instruction: "warmly" }), ttsModel, new GraphBuilder(), "r_small_cell_style"),
      /style_instruction|instruction_control/,
    );
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
    // render on a LANE is the DECL's variant surface (voice on
    // CustomVoice, style_instruction on the 1.7B CustomVoice cell,
    // ref_audio/ref_text on Base), not a per-model guard table in the
    // card. ONE exception rides a VALUE guard (operator 2026-10-12):
    // the transcript row keys on its own audio riding — a sibling-
    // field dependency (the rig precedent, mode=copy), never a lane
    // table.
    assert.equal(leaf("voice"), undefined, "the persona knob renders by the lane's declared surface, not a card-side guard");
    assert.equal(leaf("style_instruction"), undefined, "the instruction row's lane (1.7B CustomVoice) is declared, not guarded");
    assert.equal(leaf("ref_audio"), undefined, "the clone row's lane (Base) is declared, not guarded — the gate field stays always-visible so the pair flow can start");
    assert.equal(leaf("ref_text"), "ref_audio!=null", "the transcript row appears only once its audio rides (ONE source; a transcript with no clip is noise — operator 2026-10-12)");
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

  it("THE NAME LEAF IS DEAD (the qvoice boolean law, operator 2026-10-22: \"Qvoice. Is a mod. It is not BAKED INTO THE DEFAULT CARD\"): voice_name is NO schema leaf — the save is the mod's boolean, never a base-lane field", () => {
    // the burn this law closed: the DECL's required-together row
    // named voice_name + design_prompt, the form demanded the pair,
    // and the requirement itself injured the operator — a typed
    // export name was never a base-lane fact. The leaf must be GONE
    // (a dead field that lingers renders a box no law demands).
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { wtype?: string; tooltip?: string } } }> } };
    const json = carrier.toJSON();
    const root = Object.values(json.refs).find((n) => n.type === "object" && n.dict !== undefined);
    assert.ok(root, "the schema envelope serves");
    assert.equal(root!.dict!["voice_name"], undefined, "voice_name is NOT a declared schema leaf (the name is the mod's mint, never a card field)");
    const promptId = root!.dict!["design_prompt"];
    assert.notEqual(promptId, undefined, "design_prompt stays the design lane's own leaf");
    const meta = json.refs[promptId!]?.meta?.extra;
    assert.ok(typeof meta?.wtype === "string" && meta.wtype !== "", "design_prompt carries its widget type");
    assert.ok(typeof meta?.tooltip === "string" && !meta.tooltip.includes("voice_name"), "the persona tooltip names no pair");
  });
});

describe("the qvoice USE lane (the voice-lock LOAD half — a stated .qvoice performs the text through the studio's clone pipeline)", () => {
  it("restores the singleton transport wrapper and keeps the saved media path", () => {
    const model = facts.models["qwen3-tts-voicedesign"]!;
    assert.equal(model.defaults.variant, "customvoice", "the large CustomVoice cell performs a saved persona");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "The last light is ours.",
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
    // style_instruction on the 1.7B CustomVoice cell, sampling on the
    // family base. Those surfaces are pinned where they are authored
    // (the model DECLs + the lane-law wall). The card's ONE job is
    // to carry the fields, unguarded — save the transcript's VALUE
    // guard (ref_audio!=null, the pair-dependency ruling 2026-10-12).
    assert.equal(leaf("ref_audio"), undefined, "the cloner rows render by the Base variant's declared surface, not a card guard");
    assert.equal(leaf("ref_text"), "ref_audio!=null", "the transcript row follows its audio (one source — the value-guard ruling, not a lane guard)");
    assert.equal(leaf("temperature"), undefined, "synth sampling is family base — it renders where the DECL declares it");
    assert.equal(leaf("seed"), undefined);
    assert.equal(leaf("text"), undefined, "the words ride every lane (the design sample on VoiceDesign)");
  });
  it("the card offers ONE MODEL + ITS FLAVOR/SIZE ROUTES, LARGE-FIRST (boarded[0] is the default everywhere — the operator's size-at-quant ruling; the flavor/size compose addresses ride the offer)", () => {
    assert.equal(def.boarded[0], "qwen3-tts");
    // The retained small-CustomVoice route is BOARDED[0] itself; the
    // large-CustomVoice, design, and both clone-size routes join it.
    assert.deepEqual([...def.boarded].sort(), ["qwen3-tts", "qwen3-tts-base", "qwen3-tts-voicedesign", "qwen3-tts-voicedesign-base", "qwen3-tts-voicedesign-design"]);
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
    assert.equal(synth.inputs.mode, "clone", "a complete pair forces the clone mode");
    assert.equal(synth.inputs.reference_audio, "ref.wav", "the reference wires");
    assert.equal(synth.inputs.reference_text, "the transcript", "the transcript wires");
    assert.ok(!("voice" in synth.inputs) || synth.inputs.voice === "", "no persona on the cloner");
    assert.ok(!("instruct" in synth.inputs) || synth.inputs.instruct === "", "no instruct on the cloner");
    assert.ok(!("voice_file" in synth.inputs) || synth.inputs.voice_file === "", "no embedding load on the cloner");
    // THE MIGRATION PROOF: the size-cell route composes the folded
    // lane's graph — same checkpoint address. The variant now STEERS (extras carry the stamp — the variant-stamp
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
  it("THE OPTIONAL-CLONE LAW (operator 2026-10-12, the qwen3-tts docs ruling): no reference composes PROMPT-ONLY — mode 'tts', the autofill's empty reference rows ride untouched", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the words" }), baseModel, g, "r_promptonly");
    const synth = g.toJSON()["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides without any reference");
    assert.equal(synth.inputs.mode, "tts", "no reference, no clone mode — the engine's own dispatch (qwen3_tts.py:149) serves the plain-TTS fallthrough");
    assert.equal(synth.inputs.reference_audio, "", "the reference row stays the autofill's empty default");
    assert.equal(synth.inputs.reference_text, "", "the transcript row likewise");
  });
  it("a HALF source refuses loud (audio without its transcript or the reverse — the pair is ONE source, never two knobs)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words", ref_audio: "ref.wav" }), baseModel, new GraphBuilder(), "r_halfaudio"),
      /COMPLETE pair|ref_audio/i,
    );
    assert.throws(
      () => def.compose(def.schema({ text: "the words", ref_text: "the transcript" }), baseModel, new GraphBuilder(), "r_halftext"),
      /COMPLETE pair|ref_text/i,
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
  it("a HALF source beside a stated .qvoice is lawful (the DECL's either_or: the persona is itself a complete source — the exemption the old law carried)", () => {
    const baseModel = facts.models["qwen3-tts-base"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the words", ref_audio: "half.wav", qvoice: [{ qvoice: "Cherry.qvoice" }] }), baseModel, g, "r_qvoicehalf");
    const graph = g.toJSON();
    assert.ok(graph["AudiocoreVoiceStudio.0"], "the studio's generate node rides (the persona performs)");
    assert.equal(graph["AudiocoreTTS.0"], undefined, "no bare cloner beside it");
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
  // variant only); the pack carries the save boolean + design
  // sampling — never the prompt (one knob, one owner).
  it("a stated SAVE QVOICE boolean fires VoiceStudio export_lite on the 1.7B checkpoint (the save from any lane — the mint names itself)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.ok(designModel, "the design facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        text: "the sample to voice",
        save_qvoice: true,
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
    assert.equal(studio.inputs.name, "voice-run_design", "the build MINTS the name (voice-<runId> — no typed name, the operator's boolean law)");
    assert.equal(studio.inputs.instruct, "a warm voice", "the persona description wires as the design prompt");
    assert.equal(studio.inputs.sample_text, "the sample to voice", "the card text voices the sample");
    assert.equal(studio.inputs.seed, 7, "the entry's seed wires");
    const loader = graph["LoadAudiocoreModel.0"];
    assert.ok(loader, "the loader rides");
    // THE SIZE-AT-QUANT FOLD: the large-CustomVoice address serves
    // the family DEFAULT (customvoice/speak) — the save still fires
    // from any lane (the studio's exporter loads its own variants);
    // the loader stamps the lane it rides.
    assert.equal(loader.inputs.extras, JSON.stringify({ variant: "customvoice" }), "the loader declares the lane it rides (the large CustomVoice default — the export is lane-legal anywhere)");
  });
  it("a lonely persona description refuses loud outside the design lane (the fold keeps bare text a lawful perform)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign"]!;
    assert.throws(
      () => def.compose(def.schema({ text: "the words", design_prompt: "a warm voice" }), designModel, new GraphBuilder(), "r_nodesign"),
      /design_prompt.*fires nothing on the tts card outside the VoiceDesign lane/,
    );
    // and the flip's own law: bare text at the head COMPOSES (the family
    // default is the everyday CustomVoice perform lane — the operator's
    // large-model default, never a forced design)
    const g2 = new GraphBuilder();
    def.compose(def.schema({ text: "the words" }), designModel, g2, "r_perform");
    assert.ok(g2.toJSON()["AudiocoreTTS.0"], "bare text performs on the default lane");
  });
  it("a stale style_instruction on the design lane refuses loud (emotion styling rides the CustomVoice lane — never one knob)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample",
        design_prompt: "a warm voice",
        style_instruction: "excited",
      }), designModel, new GraphBuilder(), "r_stalestyle"),
      /style_instruction.*fires nothing on the VoiceDesign lane/,
    );
  });
  it("the stale pack spelling refuses loud on every path (it names no surface — the boolean is the contract)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    // with the save riding
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample to voice",
        save_qvoice: true,
        design_prompt: "a warm voice",
        qvoice_save: [{ save_qvoice: true }],
      }), designModel, new GraphBuilder(), "r_stalebag"),
      /qvoice_save/i,
    );
    // and with NO save signal at all (the silent-skip law: a stale
    // key refuses loud even when nothing else fires)
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample to voice",
        qvoice_save: true,
      }), designModel, new GraphBuilder(), "r_staleflat"),
      /param 'qvoice_save' names no surface on the tts card/,
    );
  });
  it("a saved persona on the designer refuses loud (design exports a new voice — it performs none)", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    assert.throws(
      () => def.compose(def.schema({
        text: "the sample to voice",
        design_prompt: "a warm voice",
        qvoice: [{ qvoice: "Old.qvoice" }],
      }), designModel, new GraphBuilder(), "r_usedesign"),
      /qvoice.*fires nothing on the Design lane/,
    );
  });
  it("THE ONE JUDGE AT COMPOSE (the seats' ownership under the boolean law): the variant's required word belongs to the bench + run seats — compose speaks no duplicate", () => {
    const designModel = facts.models["qwen3-tts-voicedesign-design"]!;
    // The design lane's required persona word lives on the VARIANT's
    // relations (the resolved lane's own rows), judged by the one
    // implementation at the bench-write door and the run seat. The
    // card's compose hand-rolls NO copy: a stated persona previews
    // (the engine's own instruct-required word guards the blank
    // downstream), and the judge's cure is the sentence the bench
    // speaks — pinned byte-for-byte here.
    const variant = qwenDecl.variants.find((v) => v.id === "voicedesign");
    assert.ok(variant?.relations !== undefined, "the voicedesign variant declares its own relations");
    const benchViol = judgeLaneRelations([variant!.relations!], { text: "the sample" });
    assert.ok(benchViol.length > 0, "the bench judge refuses the persona-less body");
    assert.match(benchViol[0]!.message, /design lane builds a voice from the description/, "the variant row's cure is the word");
    // and compose does NOT hand-roll it: the stated-persona preview
    // composes clean (no imperative duplicate — the Q4 class is dead)
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "the sample", design_prompt: "a warm voice" }), designModel, g, "r_nodup");
    assert.ok(Object.keys(g.toJSON()).length > 0, "the preview composes");
  });

  it("A NEITHER-STATED ROW COMPOSES THE SYNTH LANE (the preset-voice sample — the old gates never refused it either)", () => {
    // the together row fires only when a member is STATED (the
    // blank tolerance); a bare {text} row is a legal synth compose
    // with the large CustomVoice cell's preset voice. The pin holds
    // the boundary: the fold refused NOTHING that used to compose.
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

  it("the card serves every retained size address (the wall's own footing)", () => {
    assert.equal(rows.length, 5, `expected the five retained tts addresses, found ${String(rows.length)}`);
  });

  // THE LANE PARAMS per resolved lane topology: the clone lane needs
  // its reference pair; the design lane takes the persona + the SAVE
  // QVOICE boolean (the strongest compose — preview AND persist);
  // the speak lane needs only the words (admission on the card holds).
  const laneOf = (row: ModelFacts): string => ttsLaneTopologyOf(row).synth_lane;
  const laneParams = (row: ModelFacts): Record<string, unknown> => {
    const lane = laneOf(row);
    if (lane === "clone") {
      return { text: "wall probe", ref_audio: "/m/ref.wav", ref_text: "the reference words" };
    }
    if (lane === "design") {
      return { text: "wall probe", design_prompt: "a wall probe voice", save_qvoice: true };
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
        assert.ok(copy, "the boolean-on design run exports the .qvoice artifact");
        assert.equal(copy.inputs.dest_prefix, `wall_${row.id}/voices`, "the export persists into the run's own tree");
        // and the PLAIN design run (boolean off) previews — no copy
        const plain = new GraphBuilder();
        def.compose(def.schema({ text: "wall probe", design_prompt: "a wall probe voice" }), row, plain, `wallp_${row.id}`);
        const plainGraph = plain.toJSON() as Record<string, { class_type: string }>;
        assert.ok(Object.values(plainGraph).some((n) => n.class_type === "AudiocoreVoiceStudio"), "the plain run still designs (the preview)");
        assert.ok(!Object.values(plainGraph).some((n) => n.class_type === "MeliteQVoiceCopy"), "the plain run persists NOTHING (the boolean is the save)");
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
      /no declared action for family 'synthetic-tts' on the tts card — the boarded Qwen family \(qwen3-tts\).*State params\.model \(one of the boarded families\)/,
    );
  });

  it("THE OTHER SIZE SEAT: the small cell's save fires too (the SAVE QVOICE boolean on the small CustomVoice row exports)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ text: "sample", save_qvoice: true, design_prompt: "a wall probe voice" }), ttsModel, g, "wall_save_060");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const studio = Object.values(graph).find((n) => n.class_type === "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the save binding routes to the export segment");
    const copy = Object.values(graph).find((n) => n.class_type === "MeliteQVoiceCopy")!;
    assert.equal(copy.inputs.dest_prefix, "wall_save_060/voices", "the export persists into the run's own tree");
  });

  it("THE DECLARED DESIGN ADMISSIONS: the save branch's own refusals fire from the SAVE QVOICE boolean (the save signal)", () => {
    // The save branch's refusals are lane-level seats reached
    // through the boolean (save_qvoice fires the exporter from ANY
    // lane, per the full qvoice law) — driven here on the real
    // small-cell row, the lane every address can reach. The save's
    // own words: the missing persona, the off-surface reference,
    // and the stale pack spelling (judged on every path now).
    const model = ttsModel;
    // the save without the persona: the save branch's own word
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true }), model, new GraphBuilder(), "wall_design_missing"),
      /required Design param\(s\) 'design_prompt' missing or empty/,
    );
    // the save's off-surface reference: the save branch refuses it.
    assert.throws(
      () => def.compose(def.schema({ text: "sample", save_qvoice: true, design_prompt: "warm", ref_audio: "/m/r.wav" }), model, new GraphBuilder(), "wall_design_ref"),
      /'design_prompt' and 'ref_audio' fire together/,
    );
    // the stale 'qvoice_save' spelling names no surface — judged
    // even with no save signal (the silent-skip law).
    assert.throws(
      () => def.compose(def.schema({ text: "sample", qvoice_save: true }), model, new GraphBuilder(), "wall_design_stale"),
      /param 'qvoice_save' names no surface on the tts card/,
    );
  });
});
