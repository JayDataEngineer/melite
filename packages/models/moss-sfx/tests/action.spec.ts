// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// sfxT1 still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The DECL's lane_inputs are the facts door
// (model_path — the audiocore load key); a missing path refuses field-named,
// never composes a LoadAudiocoreModel on an empty directory. GATE S rides
// the declared seed-sentinel param (the interpreter mints before the factory
// runs).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
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

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the moss-sfx sfx action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (explicit seed — the sentinel passes through)", () => {
    const action = new GraphBuilder({});
    instantiateAction(sfx, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-explicit-seed-th"), graphOf(action), "the composed prompt is the committed golden (explicit seed — the sentinel passes through)");
    assert.equal(synthOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveAudio",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/sfx", "compose stamps the run prefix");
  });

  it("the golden holds with re-stated knobs (the pipeline's quality point)", () => {
    const p = { ...PARAMS, seed: 7, guidance_scale: 8, n_diffusion_steps: 200, duration: 4.5 };
    const action = new GraphBuilder({});
    instantiateAction(sfx, { ...p }, FACTS, action, "probe-knobs");
    assertGraphGolden(golden("the-golden-holds-with-re-stated-knobs-the-pipeline-s-quality"), graphOf(action), "the golden holds with re-stated knobs (the pipeline's quality point)");
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
      /^Error: moss-sfx sfx: lane_inputs\.model_path = "" — a non-empty string is required$/
    );
    assert.throws(
      () => parseSfxFacts({ family: "moss_sfx_v2" }),
      /^Error: moss-sfx sfx: lane_inputs\.model_path = undefined — a non-empty string is required$/
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
    // proof — registration runs this same parse).
    const facts = parseSfxFacts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseSfxFacts>[0]);
    assert.equal(facts.model_path, "MOSS-SoundEffect-v2.0-src");
  });
});
