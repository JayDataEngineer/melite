// The atom's own proof (the atom vocabulary, stroke 3): the speak +
// export actions' serialized prompts are BYTE-IDENTICAL to the
// legacy ttsT1 / ttsDesignT1 on the same doc — the card's binding
// change moves no wire. The DECL's lane_inputs are the facts door
// (model_path — the audiocore load key; synth_lane — the lane
// branch DATA). THE VOICE-LOCK LAW: `speak` deliberately declares
// NO seed-sentinel — the qvoice use-branch derives the studio seed
// from the artifact path when unstated, so a pre-mint would drift
// timbre on every reuse (the lock is proven below: two composes,
// one seed). `export` declares the sentinel (single mint, no lock
// to preserve).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { ttsT1, ttsDesignT1, instantiateAction, voiceLockSeed } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { speak, exportAction, parseTtsFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const MODS = packs(DECL.mods as Array<string | { pack: string }>);
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "tts",
  defaults: { mode: "tts", voice: "vivian", variant: "customvoice" },
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: MODS,
};
// The Design variant's resolved row (the fold: a variant pick
// re-points the lane — synth_lane design, the VoiceDesign
// checkpoint).
const DESIGN_FACTS: ModelFacts = {
  ...FACTS,
  lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-1.7B-VoiceDesign", synth_lane: "design" },
};

const PARAMS = {
  text: "the words to speak",
  temperature: 0.8,
  top_p: 0.9,
  top_k: 5,
  speed: 1,
  repetition_penalty: 1.05,
  seed: 42,
};
const EXPORT_PARAMS = { ...PARAMS, voice_name: "radio-host", design_prompt: "a gritty, deep male radio host" };

const nodeOf = (g: GraphBuilder, classType: string): { inputs: Record<string, unknown> } | undefined =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === classType,
  );

describe("the qwen3-tts speak + export actions — byte-stability (the compatibility law)", () => {
  it("the speak action's serialized prompt is identical to the legacy lane (persona lane, explicit seed)", () => {
    const legacy = new GraphBuilder({});
    ttsT1({ ...PARAMS, voice: "vivian" }, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, voice: "vivian" }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(synth.inputs.voice, "vivian", "the model's default persona fills the unstated doc voice");
    assert.equal(nodeOf(action, "SaveAudio")!.inputs.filename_prefix, "probe/tts", "compose stamps the run prefix");
  });

  it("the speak action rides the Design variant's resolved row (the lane branch routes to the export segment)", () => {
    const p = { ...PARAMS, voice_name: "radio-host", design_prompt: "a gritty, deep male radio host" };
    const legacy = new GraphBuilder({});
    ttsT1({ ...p }, DESIGN_FACTS, legacy, "probe-design");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, DESIGN_FACTS, action, "probe-design");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const studio = nodeOf(action, "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the design lane IS the export segment");
  });

  it("THE VOICE-LOCK LAW — an unstated seed locks to the artifact path (two composes, one seed)", () => {
    const { seed: _drop, ...unlocked } = PARAMS;
    const p = { ...unlocked, qvoice: [{ qvoice: "/m/voices/narrator.qvoice" }] };
    const a = new GraphBuilder({});
    instantiateAction(speak, { ...p }, FACTS, a, "probe-lock-a");
    const b = new GraphBuilder({});
    instantiateAction(speak, { ...p }, FACTS, b, "probe-lock-b");
    const seedA = nodeOf(a, "AudiocoreVoiceStudio")!.inputs.seed as number;
    const seedB = nodeOf(b, "AudiocoreVoiceStudio")!.inputs.seed as number;
    assert.equal(seedA, voiceLockSeed({}, "/m/voices/narrator.qvoice"), "the lock derives from the artifact path (FNV-1a)");
    assert.equal(seedA, seedB, "same voice, same render seed, every time — no sentinel pre-mint breaks the lock");
  });

  it("the use-branch byte-identity holds with an explicit seed (the lock passes a stated seed through)", () => {
    const p = { ...PARAMS, qvoice: [{ qvoice: "/m/voices/narrator.qvoice" }] };
    const legacy = new GraphBuilder({});
    ttsT1({ ...p }, FACTS, legacy, "probe-use");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, FACTS, action, "probe-use");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodeOf(action, "AudiocoreVoiceStudio")!.inputs.seed, 42, "a stated seed wins over the lock");
  });

  it("the export action's serialized prompt is identical to the legacy design lane (explicit seed)", () => {
    const legacy = new GraphBuilder({});
    ttsDesignT1({ ...EXPORT_PARAMS }, FACTS, legacy, "probe-export");
    const action = new GraphBuilder({});
    instantiateAction(exportAction, { ...EXPORT_PARAMS }, FACTS, action, "probe-export");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const studio = nodeOf(action, "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the export mode rides");
    assert.equal(studio.inputs.name, "radio-host", "the Design mod's name rides");
    const copy = nodeOf(action, "MeliteQVoiceCopy")!;
    assert.equal(copy.inputs.dest_prefix, "probe-export/voices", "the .qvoice persists into the run's own tree");
  });


  it("byte equality holds on the MINIMAL doc (bare words + seed — every optional spread arm absent)", () => {
    const minimalFacts: ModelFacts = { ...FACTS, defaults: {} };
    const p = { text: "bare words", seed: 11 };
    const legacy = new GraphBuilder({});
    ttsT1({ ...p }, minimalFacts, legacy, "probe-min");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, minimalFacts, action, "probe-min");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.mode, "tts", "the absent defaults fall to the lane's own mode");
    assert.equal(synth.inputs.top_k, 0, "an unstated optional leaves the vendor autofill's own default (no override key)");
  });

  // The clone lane rides a synthetic row (the 1.7B family serves
  // its design route; the speak action's lane branch is DATA, so a
  // clone-resolved row composes the clone segment on either
  // family's checkpoint).
  const CLONE_FACTS: ModelFacts = {
    ...FACTS,
    lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-1.7B-VoiceDesign", synth_lane: "clone" },
  };
  it("byte equality holds on the clone lane's MINIMAL doc (reference pair + seed only)", () => {
    const minimalClone: ModelFacts = { ...CLONE_FACTS, defaults: {} };
    const p = { text: "bare clone", seed: 12, ref_audio: "/m/r.wav", ref_text: "the words" };
    const legacy = new GraphBuilder({});
    ttsT1({ ...p }, minimalClone, legacy, "probe-clone-min");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, minimalClone, action, "probe-clone-min");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodeOf(action, "AudiocoreTTS")!.inputs.top_k, 0, "an unstated optional leaves the vendor autofill's own default (no override key)");
  });

  it("THE QVOICE CARRY on the clone lane — a stated embedding performs through the studio, byte-identical", () => {
    const p = { ...PARAMS, ref_audio: "/m/r.wav", ref_text: "the words", qvoice: [{ qvoice: "/m/voices/narrator.qvoice" }] };
    const legacy = new GraphBuilder({});
    ttsT1({ ...p }, CLONE_FACTS, legacy, "probe-clone-carry");
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, CLONE_FACTS, action, "probe-clone-carry");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.ok(nodeOf(action, "AudiocoreVoiceStudio"), "the carry rides the studio, never the cloner");
    assert.ok(!nodeOf(action, "AudiocoreTTS"), "a stated embedding performs nothing through the synth node");
  });

  it("seed -1 mints ONCE per speak compose; two runs differ (the branch-local mint — no sentinel, by law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = nodeOf(a, "AudiocoreTTS")!.inputs.seed as number;
    const seedB = nodeOf(b, "AudiocoreTTS")!.inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the branch-local mint is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own seed");
  });

  it("GATE S — the export sentinel mints ONCE per compose; two runs differ", () => {
    const a = new GraphBuilder({});
    instantiateAction(exportAction, { ...EXPORT_PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(exportAction, { ...EXPORT_PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = nodeOf(a, "AudiocoreVoiceStudio")!.inputs.seed as number;
    const seedB = nodeOf(b, "AudiocoreVoiceStudio")!.inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own sentinel");
  });

  it("the facts door refuses field-named, and the DECL's own rows parse clean", () => {
    assert.throws(
      () => parseTtsFacts({ synth_lane: "speak" }),
      /qwen3-tts-voicedesign speak: lane_inputs\.model_path = undefined — a non-empty string is required/,
    );
    assert.throws(
      () => parseTtsFacts({ model_path: "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged", synth_lane: "yodel" }),
      /qwen3-tts-voicedesign speak: lane_inputs\.synth_lane = "yodel" — speak, clone, or design is required/,
    );
    // the DECL's family row parses clean (the admission gate's
    // proof — registration runs this same parse); ''-absent falls
    // to speak.
    const raw = (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseTtsFacts>[0];
    const facts = parseTtsFacts(raw);
    assert.equal(facts.model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    assert.equal(facts.synth_lane, "speak");
    assert.equal(parseTtsFacts({ model_path: "x" }).synth_lane, "", "an absent synth_lane falls to the speak lane");
  });
});
