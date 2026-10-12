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

  it("THE INTEGER LAW (volley item g, 2026-10-24): fractional dims refuse HERE — never a raw engine error downstream", () => {
    // The live receipt: `scale_width expected number multiple of 1
    // but got 1.5` reached the user as engine dialect. The family's
    // build is the backstop for EVERY path (flat schema + legacy
    // object rows) — it names the contract in its own voice.
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, scale: { width: 1.5, height: 768 } }, FACTS, new GraphBuilder({}), "probe-frac"),
      /scale row refused on the input-prep card: 'width'\/'height' must be integers/,
    );
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, crop: { x: 0.5, y: 20, width: 512, height: 768 } }, FACTS, new GraphBuilder({}), "probe-frac"),
      /crop row refused on the input-prep card: 'x' must be an integer/,
    );
  });

  it("THE BLANK-IMAGE LAW (volley item f, 2026-10-24): degenerate dims refuse HERE — the 2x1 receipt never composes again", () => {
    // The live receipt: run-c5eb3f2ec512 composed scale 2x1 (+ a 1x1
    // crop) and the lane served a 2x1 beige strip as the run's image.
    // The family's build is the backstop for the legacy-object path
    // that bypasses the card's gate.
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, scale: { width: 2, height: 1 } }, FACTS, new GraphBuilder({}), "probe-blank"),
      /scale row refused on the input-prep card: 'width'\/'height' must be at least 8px \(got 2x1\)/,
    );
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, crop: { x: 19, y: 20, width: 1, height: 1 } }, FACTS, new GraphBuilder({}), "probe-blank"),
      /crop row refused on the input-prep card: 'width'\/'height' must be at least 8px \(got 1x1\)/,
    );
    // The floor member itself composes (the boundary is inclusive).
    const g = new GraphBuilder({});
    instantiateAction(prep, { ...PARAMS, scale: { width: 8, height: 8 } }, FACTS, g, "probe-floor");
    assert.ok(Object.values(g.toJSON()).some((n) => n.class_type === "ImageScale"), "8x8 composes");
  });

  it("THE CLOSED SET (the dropdown law's backstop): a bogus method refuses — the engine combo would 500 it raw", () => {
    assert.throws(
      () => instantiateAction(prep, { ...PARAMS, scale: { width: 512, height: 512, method: "ultra-sharp" } }, FACTS, new GraphBuilder({}), "probe-bogus"),
      /scale row refused on the input-prep card: 'method' must be one of/,
    );
  });

  it("the declared scale_method row is the engine's enum (one truth, not a card copy)", () => {
    const row = prep.params.find((p) => p.name === "scale_method");
    assert.deepEqual(row, { name: "scale_method", type: "enum", options: ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"] });
  });

  it("the weightless door parses anything (absent ≡ {} — nothing can drift)", () => {
    assert.deepEqual(parsePrepFacts({}), {});
    assert.deepEqual(parsePrepFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
