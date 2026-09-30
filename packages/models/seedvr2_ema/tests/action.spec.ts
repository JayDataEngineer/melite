// The atom's own proof (the atom vocabulary, stroke 3): the wire is pinned
// to a COMMITTED GOLDEN — recorded while the kit's legacy upscaleLane still
// existed and this spec compared the two arms byte-for-byte. That arm is
// deleted (the families own their lanes now), so the golden carries the
// compatibility law. The DECL's lane_inputs are the facts door (unet + vae);
// a missing weight refuses field-named, never composes with an empty
// filename. GATE S rides the declared seed-sentinel param (the interpreter
// mints before the factory runs). The interpreter's own contract walls live
// in card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { upscale, parseUpscaleFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "upscale-tools",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  input_image: "/m/i.png",
  seed: 42,
  resolution: 1080,
  max_resolution: 4096,
  batch_size: 1,
};

const upscalerOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "SeedVR2VideoUpscaler",
  )!;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the upscale action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (explicit seed — the sentinel passes through)", () => {
    const action = new GraphBuilder({});
    instantiateAction(upscale, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-explicit-seed-th"), graphOf(action), "the composed prompt is the committed golden (explicit seed — the sentinel passes through)");
    assert.equal(upscalerOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(upscalerOf(action).inputs.uniform_batch_size, true, "the fixed batch law rides");
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveImage",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/gen", "compose stamps the run prefix");
  });

  it("the golden holds with re-stated knobs (the resolution caps)", () => {
    const p = { ...PARAMS, seed: 7, resolution: 2160, max_resolution: 2048, batch_size: 4 };
    const action = new GraphBuilder({});
    instantiateAction(upscale, { ...p }, FACTS, action, "probe-knobs");
    assertGraphGolden(golden("the-golden-holds-with-re-stated-knobs-the-resolution-caps"), graphOf(action), "the golden holds with re-stated knobs (the resolution caps)");
    assert.equal(upscalerOf(action).inputs.resolution, 2160, "the target rides");
  });

  it("the golden holds on the wired spell (a '$name' image rides verbatim, no loader)", () => {
    const p = { ...PARAMS, input_image: "$stage1" };
    const action = new GraphBuilder({});
    instantiateAction(upscale, { ...p }, FACTS, action, "probe-spell");
    assertGraphGolden(golden("the-golden-holds-on-the-wired-spell-a-name-image-rides-verba"), graphOf(action), "the golden holds on the wired spell (a '$name' image rides verbatim, no loader)");
    assert.ok(
      !Object.values(action.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "LoadImage"),
      "the spell IS the tensor — no loader builds",
    );
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(upscale, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(upscale, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = upscalerOf(a).inputs.seed as number;
    const seedB = upscalerOf(b).inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own sentinel");
  });

  it("the facts door refuses a missing weight field-named, never composes an empty filename", () => {
    assert.throws(
      () => parseUpscaleFacts({ vae: "ema_vae_fp16.safetensors" }),
      /seedvr2_ema upscale: lane_inputs\.unet = undefined — a non-empty string is required/,
    );
    assert.throws(
      () => parseUpscaleFacts({ unet: "seedvr2_ema_3b_fp16.safetensors", vae: "" }),
      /seedvr2_ema upscale: lane_inputs\.vae = "" — a non-empty string is required/,
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
        // proof — registration runs this same parse).
    const facts = parseUpscaleFacts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseUpscaleFacts>[0]);
    assert.equal(facts.unet, "seedvr2_ema_3b_fp16.safetensors");
    assert.equal(facts.vae, "ema_vae_fp16.safetensors");
  });
});
