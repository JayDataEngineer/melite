// The atom's own proof (the atom vocabulary, stroke 3): the prep
// action's serialized prompt is BYTE-IDENTICAL to the legacy
// inputPrepLane on the same doc — the card's binding change moves
// no wire. The lane is weightless (the facts door is vacuous); the
// audio restage, the crop row, and the scale row each keep their
// legacy arm bytes (and their legacy refusal voices). The
// interpreter's own contract walls live in card-kit's
// tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { inputPrepLane, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { prep, parsePrepFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: a weightless
// family row (lane_inputs ≡ {} — the loader's absent-≡-{} law).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "input-prep",
  defaults: {},
  lane_inputs: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  source: "/m/i.png",
  media_type: "image",
};

const classes = (g: GraphBuilder): string[] =>
  Object.values(g.toJSON() as Record<string, { class_type: string }>).map((n) => n.class_type);

describe("the prep action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane (plain image passthrough)", () => {
    const legacy = new GraphBuilder({});
    inputPrepLane({ ...PARAMS }, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveImage",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/input_prep", "compose stamps the run prefix");
  });

  it("byte equality holds on the audio restage arm (LoadAudio → SaveAudio, nothing else)", () => {
    const p = { source: "/m/a.wav", media_type: "audio" };
    const legacy = new GraphBuilder({});
    inputPrepLane({ ...p }, legacy, "probe-audio");
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...p }, FACTS, action, "probe-audio");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.deepEqual(classes(action).sort(), ["LoadAudio", "SaveAudio"], "the audio arm builds exactly its two nodes");
  });

  it("byte equality holds on the crop arm (ImageCrop rides the stated quad)", () => {
    const p = { ...PARAMS, crop: { x: 10, y: 20, width: 512, height: 768 } };
    const legacy = new GraphBuilder({});
    inputPrepLane({ ...p }, legacy, "probe-crop");
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...p }, FACTS, action, "probe-crop");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const crop = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "ImageCrop",
    )!;
    assert.equal(crop.inputs.width, 512, "the crop quad rides");
  });

  it("byte equality holds on the scale arm (lanczos default + a stated method)", () => {
    for (const scale of [{ width: 1024, height: 1024 }, { width: 1024, height: 768, method: "bilinear" }]) {
      const legacy = new GraphBuilder({});
      inputPrepLane({ ...PARAMS, scale }, legacy, "probe-scale");
      const action = new GraphBuilder({});
      instantiateAction(prep, { ...PARAMS, scale }, FACTS, action, "probe-scale");
      assert.deepEqual(action.toJSON(), legacy.toJSON());
    }
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...PARAMS, scale: { width: 1024, height: 1024 } }, FACTS, action, "probe-scale");
    const scaleNode = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "ImageScale",
    )!;
    assert.equal(scaleNode.inputs.upscale_method, "lanczos", "an unstated method keeps the legacy default");
  });

  it("byte equality holds on the combined arm (crop then scale)", () => {
    const p = { ...PARAMS, crop: { x: 0, y: 0, width: 800, height: 600 }, scale: { width: 1600, height: 1200 } };
    const legacy = new GraphBuilder({});
    inputPrepLane({ ...p }, legacy, "probe-both");
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...p }, FACTS, action, "probe-both");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
  });

  it("the malformed rows refuse in the legacy voice (field-named, never composes)", () => {
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, crop: { x: "ten", y: 20, width: 512, height: 768 } }, FACTS, new GraphBuilder({}), "probe-bad"),
      /crop row refused on the input-prep card: 'x' must be a number \(got "ten"\)/,
    );
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, scale: { width: "wide", height: 768 } }, FACTS, new GraphBuilder({}), "probe-bad"),
      /scale row refused on the input-prep card: 'width'\/'height' must be numbers/,
    );
  });

  it("the weightless door parses anything (absent ≡ {} — nothing can drift)", () => {
    assert.deepEqual(parsePrepFacts({}), {});
    assert.deepEqual(parsePrepFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
