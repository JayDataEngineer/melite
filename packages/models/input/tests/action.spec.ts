// The atom's own proof (the atom vocabulary, stroke 3): the prep
// action composes the family's own lane, and its serialized prompt is
// pinned to a COMMITTED GOLDEN — the wire the port produced while the
// kit's legacy inputPrepLane still existed and this spec compared the
// two byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law. The lane is
// weightless (the facts door is vacuous); the audio restage, the crop
// row, and the scale row each keep their proven bytes (and their
// refusal voices). The interpreter's own contract walls live in
// card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
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

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>, runId: string): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(prep, p, FACTS, g, runId);
  return g.toJSON() as never;
};

describe("the prep action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (plain image passthrough)", () => {
    const graph = compose({ ...PARAMS }, "probe");
    assertGraphGolden(golden("prep-passthrough"), graph, "the plain image passthrough");
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage")!;
    assert.equal(save.inputs.filename_prefix, "probe/input_prep", "compose stamps the run prefix");
  });

  it("the audio restage arm holds its golden (LoadAudio → SaveAudio, nothing else)", () => {
    const p = { source: "/m/a.wav", media_type: "audio" };
    const graph = compose(p, "probe-audio");
    assertGraphGolden(golden("prep-audio-restage"), graph, "the audio restage");
    const action = new GraphBuilder({});
    instantiateAction(prep, { ...p }, FACTS, action, "probe-audio");
    assert.deepEqual(classes(action).sort(), ["LoadAudio", "SaveAudio"], "the audio arm builds exactly its two nodes");
  });

  it("the crop arm holds its golden (ImageCrop rides the stated quad)", () => {
    const p = { ...PARAMS, crop: { x: 10, y: 20, width: 512, height: 768 } };
    const graph = compose(p, "probe-crop");
    assertGraphGolden(golden("prep-crop"), graph, "the crop arm");
    const crop = Object.values(graph).find((n) => n.class_type === "ImageCrop")!;
    assert.equal(crop.inputs.width, 512, "the crop quad rides");
  });

  it("the scale arm holds its goldens (lanczos default + a stated method)", () => {
    assertGraphGolden(golden("prep-scale-default"), compose({ ...PARAMS, scale: { width: 1024, height: 1024 } }, "probe-scale"), "the scale default");
    assertGraphGolden(
      golden("prep-scale-bilinear"),
      compose({ ...PARAMS, scale: { width: 1024, height: 768, method: "bilinear" } }, "probe-scale"),
      "the stated method",
    );
    const scaleNode = Object.values(compose({ ...PARAMS, scale: { width: 1024, height: 1024 } }, "probe-scale")).find(
      (n) => n.class_type === "ImageScale",
    )!;
    assert.equal(scaleNode.inputs.upscale_method, "lanczos", "an unstated method keeps the proven default");
  });

  it("the combined arm holds its golden (crop then scale)", () => {
    const p = { ...PARAMS, crop: { x: 0, y: 0, width: 800, height: 600 }, scale: { width: 1600, height: 1200 } };
    assertGraphGolden(golden("prep-crop-then-scale"), compose(p, "probe-both"), "the combined arm");
  });

  it("the malformed rows refuse in the family's voice (field-named, never composes)", () => {
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
