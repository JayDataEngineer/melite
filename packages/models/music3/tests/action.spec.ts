// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// musicT1 still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The DECL's lane_inputs are the facts door
// (the MiniMax trio rail); a missing weight refuses field-named, never
// composes with an empty filename. GATE S rides the declared seed-sentinel
// param (the interpreter mints before the factory runs).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { compose, parseMusicFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "music",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  prompt: "funk, pop, soul, guitar, 105 BPM",
  lyrics: "[verse]shine a light",
  duration: 30,
  guidance_scale: 1.7,
  n_diffusion_steps: 30,
  lm_cfg_scale: 1.7,
  seed: 42,
};

const samplerOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "KSampler",
  )!;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the music3 compose action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (explicit seed — the sentinel passes through)", () => {
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-explicit-seed-th"), graphOf(action), "the composed prompt is the committed golden (explicit seed — the sentinel passes through)");
    assert.equal(samplerOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveAudioAdvanced",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/music", "compose stamps the run prefix");
    assert.equal(save.inputs.format, "mp3", "the mp3 pin rides");
  });

  it("the golden holds with re-stated knobs (duration + steps)", () => {
    const p = { ...PARAMS, seed: 7, duration: 90, n_diffusion_steps: 48, guidance_scale: 3.2 };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-knobs");
    assertGraphGolden(golden("the-golden-holds-with-re-stated-knobs-duration-steps"), graphOf(action), "the golden holds with re-stated knobs (duration + steps)");
    assert.equal(samplerOf(action).inputs.steps, 48, "the restated steps ride");
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = samplerOf(a).inputs.seed as number;
    const seedB = samplerOf(b).inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own sentinel");
  });

  it("the facts door refuses a missing weight field-named, never composes an empty filename", () => {
    assert.throws(
      () => parseMusicFacts({ unet: "dit.safetensors", text_encoder: "te.safetensors", clip_type: "minimax", vae: "" }),
      /^Error: music3 compose: lane_inputs\.vae = "" — a non-empty string is required$/
    );
    assert.throws(
      () => parseMusicFacts({ text_encoder: "te.safetensors", clip_type: "minimax", vae: "dav.safetensors" }),
      /^Error: music3 compose: lane_inputs\.unet = undefined — a non-empty string is required$/
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
    // proof — registration runs this same parse).
    const facts = parseMusicFacts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseMusicFacts>[0]);
    assert.equal(facts.unet, "minimax_music3_dit_int8_convrot.safetensors");
    assert.equal(facts.clip_type, "minimax");
  });
});
