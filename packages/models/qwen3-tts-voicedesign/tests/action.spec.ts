// The atom's own proof (the atom vocabulary, stroke 3): the speak + export
// actions' serialized prompts are BYTE-IDENTICAL to the legacy ttsT1 /
// ttsDesignT1 on the same doc — the card's binding change moves no wire. The
// DECL's lane_inputs are the facts door (model_path — the audiocore load
// key; synth_lane — the lane branch DATA). THE VOICE-LOCK LAW: `speak`
// deliberately declares NO seed-sentinel — the qvoice use-branch derives the
// studio seed from the artifact path when unstated, so a pre-mint would
// drift timbre on every reuse (the lock is proven below: two composes, one
// seed). `export` declares the sentinel (single mint, no lock to preserve).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction, voiceLockSeed } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { speak, exportAction, parseTtsFacts, laneTopologyOf } from "../src/actions.ts";

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
// re-points the lane — the voicedesign topology is the design
// lane, the VoiceDesign checkpoint).
const DESIGN_FACTS: ModelFacts = {
  ...FACTS,
  lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-1.7B-VoiceDesign" },
  defaults: { ...FACTS.defaults, variant: "voicedesign" },
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

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the qwen3-tts speak + export actions — byte-stability (the compatibility law)", () => {
  it("the speak action's serialized prompt is identical to the legacy lane (persona lane, explicit seed)", () => {
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, voice: "vivian" }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-perso-8c19a60ad3"), graphOf(action), "the composed prompt is the committed golden (persona lane, explicit seed)");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(synth.inputs.voice, "vivian", "the model's default persona fills the unstated doc voice");
    assert.equal(nodeOf(action, "SaveAudio")!.inputs.filename_prefix, "probe/tts", "compose stamps the run prefix");
  });

  it("the speak action rides the Design variant's resolved row (the lane branch routes to the export segment)", () => {
    const p = { ...PARAMS, voice_name: "radio-host", design_prompt: "a gritty, deep male radio host" };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, DESIGN_FACTS, action, "probe-design");
    assertGraphGolden(golden("the-speak-action-rides-the-design-variant-s-resol-53966ab480"), graphOf(action), "the speak action rides the Design variant's resolved row (the lane branch routes to the export segment)");
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
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, FACTS, action, "probe-use");
    assertGraphGolden(golden("the-use-branch-byte-identity-holds-with-an-explic-16052027a0"), graphOf(action), "the use-branch byte-identity holds with an explicit seed (the lock passes a stated seed through)");
    assert.equal(nodeOf(action, "AudiocoreVoiceStudio")!.inputs.seed, 42, "a stated seed wins over the lock");
  });

  it("the export action's serialized prompt is identical to the legacy design lane (explicit seed)", () => {
    const action = new GraphBuilder({});
    instantiateAction(exportAction, { ...EXPORT_PARAMS }, FACTS, action, "probe-export");
    assertGraphGolden(golden("the-export-action-s-serialized-prompt-is-identica-d801860661"), graphOf(action), "the export action's serialized prompt is identical to the legacy design lane (explicit seed)");
    const studio = nodeOf(action, "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the export mode rides");
    assert.equal(studio.inputs.name, "radio-host", "the Design mod's name rides");
    const copy = nodeOf(action, "MeliteQVoiceCopy")!;
    assert.equal(copy.inputs.dest_prefix, "probe-export/voices", "the .qvoice persists into the run's own tree");
  });


  it("byte equality holds on the MINIMAL doc (bare words + seed — every optional spread arm absent)", () => {
    const minimalFacts: ModelFacts = { ...FACTS, defaults: { variant: "customvoice" } };
    const p = { text: "bare words", seed: 11 };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, minimalFacts, action, "probe-min");
    assertGraphGolden(golden("the-golden-holds-on-the-minimal-doc-bare-words-se-5dbc723a17"), graphOf(action), "the golden holds on the MINIMAL doc (bare words + seed — every optional spread arm absent)");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.mode, "tts", "the absent defaults fall to the lane's own mode");
    assert.equal(synth.inputs.top_k, 0, "an unstated optional leaves the vendor autofill's own default (no override key)");
  });

  // The clone lane rides the Base variant's resolved row (the
  // speak action's lane branch is DATA, so the base variant's
  // topology composes the clone segment on this family's
  // checkpoint).
  const CLONE_FACTS: ModelFacts = {
    ...FACTS,
    lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-1.7B-Base-merged" },
    defaults: { ...FACTS.defaults, variant: "base" },
  };
  it("byte equality holds on the clone lane's MINIMAL doc (reference pair + seed only)", () => {
    const minimalClone: ModelFacts = { ...CLONE_FACTS, defaults: { variant: "base" } };
    const p = { text: "bare clone", seed: 12, ref_audio: "/m/r.wav", ref_text: "the words" };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, minimalClone, action, "probe-clone-min");
    assertGraphGolden(golden("the-golden-holds-on-the-clone-lane-s-minimal-doc-45c2bfe077"), graphOf(action), "the golden holds on the clone lane's MINIMAL doc (reference pair + seed only)");
    assert.equal(nodeOf(action, "AudiocoreTTS")!.inputs.top_k, 0, "an unstated optional leaves the vendor autofill's own default (no override key)");
  });

  it("THE QVOICE CARRY on the clone lane — a stated embedding performs through the studio, byte-identical", () => {
    const p = { ...PARAMS, ref_audio: "/m/r.wav", ref_text: "the words", qvoice: [{ qvoice: "/m/voices/narrator.qvoice" }] };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, CLONE_FACTS, action, "probe-clone-carry");
    assertGraphGolden(golden("the-qvoice-carry-on-the-clone-lane-a-stated-embed-690c561951"), graphOf(action), "THE QVOICE CARRY on the clone lane — a stated embedding performs through the studio, byte-identical");
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

  it("the facts door refuses field-named, the topology refuses unknown variants, and the DECL's own rows parse clean", () => {
    assert.throws(
      () => parseTtsFacts({}),
      /qwen3-tts-voicedesign speak: lane_inputs\.model_path = undefined — a non-empty string is required/,
    );
    // the DECL's family row parses clean (the admission gate's
    // proof — registration runs this same parse).
    const raw = (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseTtsFacts>[0];
    const facts = parseTtsFacts(raw);
    assert.equal(facts.model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    // the lane topology: the head speaks with instruction control,
    // the design variant designs, the base variant clones without
    // it, an unknown variant id refuses loud.
    assert.equal(laneTopologyOf(FACTS).synth_lane, "speak");
    assert.equal(laneTopologyOf(FACTS).instruction_control, true);
    assert.equal(laneTopologyOf(DESIGN_FACTS).synth_lane, "design");
    assert.equal(laneTopologyOf(CLONE_FACTS).synth_lane, "clone");
    assert.equal(laneTopologyOf(CLONE_FACTS).instruction_control, false);
    assert.throws(
      () => laneTopologyOf({ ...FACTS, defaults: { ...FACTS.defaults, variant: "yodel" } }),
      /qwen3-tts-voicedesign: no lane topology for variant "yodel" — the DECL declares no such lane/,
    );
  });
});
