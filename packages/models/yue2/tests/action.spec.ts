// The atom's own proof (the atom vocabulary, stroke 3): the compose
// action's serialized prompt is BYTE-IDENTICAL to the legacy yue2T1
// on the same doc — the card's binding change moves no wire. The
// DECL's lane_inputs are the facts door (checkpoint — one file
// carries model+clip+vae); a missing checkpoint refuses
// field-named, never composes with an empty filename. GATE S rides
// the declared seed-sentinel param (the interpreter mints before
// the factory runs).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { yue2T1, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { compose, parseYue2Facts } from "../src/actions.ts";

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
  prompt: "dreamy synth-pop, 120 BPM",
  lyrics: "[chorus]hold the line",
  mode: "full",
  duration: 60,
  n_diffusion_steps: 30,
  seed: 42,
};

const nodeOf = (g: GraphBuilder, classType: string): { inputs: Record<string, unknown> } | undefined =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === classType,
  );

describe("the yue2 compose action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane (explicit seed, ABC planning on)", () => {
    const legacy = new GraphBuilder({});
    yue2T1({ ...PARAMS }, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.ok(nodeOf(action, "YuE2GenerateABC"), "the planner rides the full mode");
    const save = nodeOf(action, "SaveAudioAdvanced")!;
    assert.equal(save.inputs.filename_prefix, "probe/music", "compose stamps the run prefix");
  });

  it("byte equality holds with the planner OFF (mode off composes no ABC node — the engine's own off mode)", () => {
    const p = { ...PARAMS, seed: 7, mode: "off", duration: 45 };
    const legacy = new GraphBuilder({});
    yue2T1({ ...p }, FACTS, legacy, "probe-off");
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-off");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.ok(!nodeOf(action, "YuE2GenerateABC"), "mode off composes no planner node at all");
  });

  it("byte equality holds on the MINIMAL doc (caption + seed — lyrics and mode fall to their lane defaults)", () => {
    const p = { prompt: "dreamy synth-pop", seed: 11 };
    const legacy = new GraphBuilder({});
    yue2T1({ ...p }, FACTS, legacy, "probe-min");
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-min");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.ok(nodeOf(action, "YuE2GenerateABC"), "the absent mode falls to full — the planner rides");
    const music = nodeOf(action, "YuE2GenerateMusic")!;
    assert.equal(music.inputs.lyrics, "", "an absent lyrics falls to the empty string, never undefined");
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = nodeOf(a, "YuE2GenerateABC")!.inputs.seed as number;
    const seedB = nodeOf(b, "YuE2GenerateMusic")!.inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(nodeOf(a, "YuE2GenerateABC")!.inputs.seed, nodeOf(b, "YuE2GenerateABC")!.inputs.seed, "each compose mints its own sentinel");
  });

  it("the facts door refuses a missing checkpoint field-named, never composes an empty filename", () => {
    assert.throws(
      () => parseYue2Facts({ checkpoint: "" }),
      /yue2 compose: lane_inputs\.checkpoint = "" — a non-empty string is required/,
    );
    assert.throws(
      () => parseYue2Facts({ unet: "yue2.safetensors" }),
      /yue2 compose: lane_inputs\.checkpoint = undefined — a non-empty string is required/,
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
    // proof — registration runs this same parse).
    const facts = parseYue2Facts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseYue2Facts>[0]);
    assert.equal(facts.checkpoint, "yue2_3b_int8_convrot.safetensors");
  });
});
