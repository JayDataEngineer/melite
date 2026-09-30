// The atom's own proof (the atom vocabulary, stroke 3): the sfx
// action's serialized prompt is BYTE-IDENTICAL to the legacy sfxT1
// on the same doc — the card's binding change moves no wire. The
// DECL's lane_inputs are the facts door (model_path — the audiocore
// load key); a missing path refuses field-named, never composes a
// LoadAudiocoreModel on an empty directory. GATE S rides the
// declared seed-sentinel param (the interpreter mints before the
// factory runs).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { sfxT1, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { sfx, parseSfxFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "sfx",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  prompt: "sharp metallic clang with long decay",
  guidance_scale: 4,
  n_diffusion_steps: 100,
  duration: 10,
  seed: 42,
};

const synthOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "AudiocoreTTS",
  )!;

describe("the moss-sfx sfx action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane (explicit seed — the sentinel passes through)", () => {
    const legacy = new GraphBuilder({});
    sfxT1({ ...PARAMS }, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(sfx, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(synthOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveAudio",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/sfx", "compose stamps the run prefix");
  });

  it("byte equality holds with re-stated knobs (the pipeline's quality point)", () => {
    const p = { ...PARAMS, seed: 7, guidance_scale: 8, n_diffusion_steps: 200, duration: 4.5 };
    const legacy = new GraphBuilder({});
    sfxT1({ ...p }, FACTS, legacy, "probe-knobs");
    const action = new GraphBuilder({});
    instantiateAction(sfx, { ...p }, FACTS, action, "probe-knobs");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(synthOf(action).inputs.num_inference_steps, 200, "the restated steps ride");
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(sfx, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(sfx, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = synthOf(a).inputs.seed as number;
    const seedB = synthOf(b).inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own sentinel");
  });

  it("the facts door refuses a missing model_path field-named, never composes an empty load row", () => {
    assert.throws(
      () => parseSfxFacts({ model_path: "" }),
      /moss-sfx sfx: lane_inputs\.model_path = "" — a non-empty string is required/,
    );
    assert.throws(
      () => parseSfxFacts({ family: "moss_sfx_v2" }),
      /moss-sfx sfx: lane_inputs\.model_path = undefined — a non-empty string is required/,
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
    // proof — registration runs this same parse).
    const facts = parseSfxFacts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseSfxFacts>[0]);
    assert.equal(facts.model_path, "MOSS-SoundEffect-v2.0-src");
  });
});
