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
// THE SIZE-AT-QUANT FOLD (operator 2026-10-26): the family row is
// the LARGE default (the 1.7B CustomVoice tree — "ALWAYS the big
// model"); every cell owns its own tree, so this spec pins the
// persona lane at BOTH sizes, the clone lane at both trees, and the
// design lane on its VoiceDesign tree — a tree on the wrong cell is
// the silent neighbor-cell bug, byte-caught here.
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
// THE SMALL CELL's resolved row (customvoice × 0.6B): the same
// lane, the 0.6B tree.
const SMALL_FACTS: ModelFacts = {
  ...FACTS,
  lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged" },
};
// The Base variant's resolved row (the fold: a variant pick
// re-points the lane — the base variant's topology is the clone
// lane, the Base checkpoint). BOTH trees: the 0.6B clone rides the
// hf tree (transcript-014), the 1.7B clone rides the merged tree.
const CLONE_FACTS: ModelFacts = {
  ...FACTS,
  lane_inputs: { ...FACTS.lane_inputs, model_path: "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base" },
  defaults: { ...FACTS.defaults, variant: "base" },
};
const CLONE_17_FACTS: ModelFacts = {
  ...FACTS,
  lane_inputs: { ...FACTS.lane_inputs, model_path: "Qwen3-TTS-12Hz-1.7B-Base-merged" },
  defaults: { ...FACTS.defaults, variant: "base" },
};
// The design lane's resolved row (voicedesign × 1.7B — the only
// size upstream ships a design checkpoint at).
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
const EXPORT_PARAMS = { ...PARAMS, save_qvoice: true, design_prompt: "a gritty, deep male radio host" };

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
    assertGraphGolden(golden("the-speak-action-s-serialized-prompt-is-identical-822e73d04d"), graphOf(action), "the speak action's serialized prompt is identical to the legacy lane (persona lane, explicit seed)");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(synth.inputs.voice, "vivian", "the model's default persona fills the unstated doc voice");
    assert.equal(nodeOf(action, "SaveAudio")!.inputs.filename_prefix, "probe/tts", "compose stamps the run prefix");
    // THE LARGE DEFAULT: the family row loads the 1.7B tree.
    assert.equal(nodeOf(action, "LoadAudiocoreModel")!.inputs.model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
  });

  it("THE STATED-VALUE WALL (models-hop56 wave-2): a stated style_instruction rides AudiocoreTTS.instruct on the customvoice lane", () => {
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, style_instruction: "a hushed evening tone" }, FACTS, action, "probe-instruct");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.instruct, "a hushed evening tone", "the stated instruction rides the instruct input verbatim");
  });

  it("THE SMALL CELL — the same lane on the 0.6B tree (the size coordinate changes ONLY the load)", () => {
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, voice: "vivian" }, SMALL_FACTS, action, "probe-small");
    assertGraphGolden(golden("the-small-cell-the-same-lane-on-the-0-6b-tree"), graphOf(action), "THE SMALL CELL — the same lane on the 0.6B tree (the size coordinate changes ONLY the load)");
    const load = nodeOf(action, "LoadAudiocoreModel")!;
    assert.equal(load.inputs.model_path, "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged", "the 0.6B cell's own tree");
    // same wire otherwise: the large golden with the tree swapped is
    // byte-this graph (the fold moves no wire, only the coordinate).
    const large = new GraphBuilder({});
    instantiateAction(speak, { ...PARAMS, voice: "vivian" }, FACTS, large, "probe-small");
    const a = JSON.stringify(graphOf(action)).replaceAll("Qwen3-TTS-12Hz-0.6B-CustomVoice-merged", "TREE");
    const b = JSON.stringify(graphOf(large)).replaceAll("Qwen3-TTS-12Hz-1.7B-CustomVoice-merged", "TREE");
    assert.equal(a, b, "the two size cells' graphs differ by the tree string alone");
  });

  it("the speak action rides the Base variant's resolved row (the variant topology branches, never a family-id switch)", () => {
    const p = { ...PARAMS, ref_audio: "/m/ref.wav", ref_text: "the reference words" };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, CLONE_FACTS, action, "probe-clone");
    assertGraphGolden(golden("the-speak-action-rides-the-base-variant-s-resolve-1dff565338"), graphOf(action), "the speak action rides the Base variant's resolved row (the variant topology branches, never a family-id switch)");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.reference_audio, "/m/ref.wav", "the clone reference rides");
    // THE 1.7B CLONE CELL: same clone wire, the merged tree (the
    // size coordinate changes only the load — proven by swap, not a
    // second golden).
    const seventeen = new GraphBuilder({});
    instantiateAction(speak, { ...p }, CLONE_17_FACTS, seventeen, "probe-clone");
    const a = JSON.stringify(graphOf(action)).replaceAll("qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base", "TREE");
    const b = JSON.stringify(graphOf(seventeen)).replaceAll("Qwen3-TTS-12Hz-1.7B-Base-merged", "TREE");
    assert.equal(a, b, "the clone lane's two size cells differ by the tree string alone");
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

  it("the export action composes the design lane (THE QVOICE BOOLEAN LAW — save_qvoice on: the mint names itself, no typed name rides)", () => {
    const action = new GraphBuilder({});
    instantiateAction(exportAction, { ...EXPORT_PARAMS }, DESIGN_FACTS, action, "probe-export");
    assertGraphGolden(golden("the-export-action-composes-the-design-lane"), action.toJSON(), "the export action composes the design lane");
    const studio = nodeOf(action, "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the export mode rides");
    assert.equal(studio.inputs.name, "voice-probe-export", "the build MINTS the export name (voice-<runId> — the operator's boolean law: no typed name)");
    assert.equal(nodeOf(action, "LoadAudiocoreModel")!.inputs.model_path, "Qwen3-TTS-12Hz-1.7B-VoiceDesign", "the design lane loads its own tree — never the family default's");
    const copy = nodeOf(action, "MeliteQVoiceCopy")!;
    assert.equal(copy.inputs.voice_name, "voice-probe-export", "the copy searches the SAME mint (one name, both nodes)");
    assert.equal(copy.inputs.dest_prefix, "probe-export/voices", "the .qvoice persists into the run's own tree");
  });

  it("THE PREVIEW HALF (the qvoice boolean law): speak on the design lane with NO boolean previews — the studio designs + the flac lands, and NOTHING persists to the media tree", () => {
    const action = new GraphBuilder({});
    instantiateAction(speak, { text: "hi", design_prompt: "warm", seed: 1 }, DESIGN_FACTS, action, "probe-prev");
    const studio = nodeOf(action, "AudiocoreVoiceStudio")!;
    assert.equal(studio.inputs.mode, "export_lite", "the studio designs (its only design path)");
    assert.equal(studio.inputs.instruct, "warm", "the persona rides the instruct input");
    assert.equal(nodeOf(action, "MeliteQVoiceCopy"), undefined, "NO copy node — the embedding does not persist (the boolean is the save, never the lane)");
    assert.equal(nodeOf(action, "SaveAudio")!.inputs.filename_prefix, "probe-prev/design", "the design sample lands as the run's preview flac");
  });

  it("the speak action honors the boolean itself (save_qvoice on the speak action's design lane = the export segment — the card returns before speak, other callers get the law)", () => {
    const action = new GraphBuilder({});
    instantiateAction(speak, { text: "hi", design_prompt: "warm", seed: 1, save_qvoice: true }, DESIGN_FACTS, action, "probe-both");
    assert.notEqual(nodeOf(action, "MeliteQVoiceCopy"), undefined, "the boolean on speak fires the persist");
  });


  it("the golden holds on the MINIMAL doc (bare words + seed — every optional spread arm absent)", () => {
    const minimalFacts: ModelFacts = { ...FACTS, defaults: { variant: "customvoice" } };
    const p = { text: "bare words", seed: 11 };
    const action = new GraphBuilder({});
    instantiateAction(speak, { ...p }, minimalFacts, action, "probe-min");
    assertGraphGolden(golden("the-golden-holds-on-the-minimal-doc-bare-words-se-5dbc723a17"), graphOf(action), "the golden holds on the MINIMAL doc (bare words + seed — every optional spread arm absent)");
    const synth = nodeOf(action, "AudiocoreTTS")!;
    assert.equal(synth.inputs.mode, "tts", "the absent defaults fall to the lane's own mode");
    assert.equal(synth.inputs.top_k, 0, "an unstated optional leaves the vendor autofill's own default (no override key)");
  });

  it("the golden holds on the clone lane's MINIMAL doc (reference pair + seed only)", () => {
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
      /^Error: qwen3-tts speak: lane_inputs\.model_path = undefined — a non-empty string is required$/
    );
    // the DECL's family row parses clean (the admission gate's
    // proof — registration runs this same parse) — the LARGE tree.
    const raw = (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseTtsFacts>[0];
    const facts = parseTtsFacts(raw);
    assert.equal(facts.model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    // the lane topology: the head speaks, the design lane exports,
    // the Base variant clones (both trees — one topology, never a
    // tree switch), an unknown variant id refuses loud.
    assert.equal(laneTopologyOf(FACTS).synth_lane, "speak");
    assert.equal(laneTopologyOf(CLONE_FACTS).synth_lane, "clone");
    assert.equal(laneTopologyOf(CLONE_17_FACTS).synth_lane, "clone", "the 1.7B clone is the SAME lane, a different tree");
    assert.equal(laneTopologyOf(DESIGN_FACTS).synth_lane, "design");
    assert.throws(
      () => laneTopologyOf({ ...FACTS, defaults: { ...FACTS.defaults, variant: "yodel" } }),
      /qwen3-tts: no lane topology for variant "yodel" — the DECL declares no such lane/,
    );
  });
});
