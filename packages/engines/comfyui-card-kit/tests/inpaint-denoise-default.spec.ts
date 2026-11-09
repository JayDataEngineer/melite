// @contract cards-inpaint-denoise-default
// inpaint-denoise-default.spec.ts — THE INPAINT DEFAULT WALL (F7,
// the qa8 burn 2026-11-01: "image-edit inpaint ran clean but the
// REQUESTED EDIT DID NOT LAND… the default denoise on the inpaint
// arm is too weak").
//
// The cure moved the served default to MASK_DENOISE_DEFAULT (1 — the
// crop reworks fully, the edit lands) at ONE home (the kit's
// pack-fields.ts), retired the parallel cordis copy (packs.ts imports
// the kit schema back — the kit header's own one-home law), and moved
// the crop_stitch-only gate's neutral with it. These arms pin every
// seat of that one truth: the served z default, both detailer arms'
// built nodes, the gate's neutrality, the GUI's welded snapshot, the
// agent doc, and the dead second writer.
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MaskFields, MASK_DENOISE_DEFAULT } from "../src/pack-fields.ts";
import { emitKnob } from "../src/params-emit.ts";
import { GraphBuilder } from "../src/graph.ts";
import { detailerSave, genDetailerSave } from "../src/lanes-image.ts";
import { refuseImageEditFiring } from "../src/lanes-image.ts";

const KIT = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO = KIT + "/../../..";

/** The built DetailerForEach node's denoise off a serialized graph. */
function detailerDenoise(gen: boolean): unknown {
  const g = new GraphBuilder();
  const img = g.node("LoadImage", {}).out();
  const io = {
    image: img, segs: g.node("IMPACT_SEGS", {}).out(), model: g.node("CheckpointLoaderSimple", {}).out(0),
    clip: g.node("CheckpointLoaderSimple", {}).out(1), vae: g.node("CheckpointLoaderSimple", {}).out(2),
    positive: g.node("CLIPTextEncode", {}).out(0), negative: g.node("CLIPTextEncode", {}).out(1), seed: 7,
  };
  const region: Record<string, unknown> = {}; // NOTHING stated — the default is the arm under test
  if (gen) genDetailerSave(g, { steps: 4, cfg: 1 }, region, io, "r_spec");
  else detailerSave(g, { steps: 4, cfg: 1 }, region, io, "r_spec", undefined);
  const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
  const node = Object.values(graph).find((n) => n.class_type === "DetailerForEach");
  assert.ok(node, "the detailer arm built its node");
  return node!.inputs["denoise"];
}

describe("the inpaint denoise default — one truth, every seat", () => {
  test("the served z default IS the const (1) — the range law rides unchanged", () => {
    // THE CARRIER DICT SHAPE (params-emit's own Schema — "shared with
    // the no-cheat door"): the namespace never carried a default
    // export; the dict's members are Schema nodes, which is what
    // emitKnob consumes.
    const dict = (MaskFields as unknown as { dict: Record<string, import("../src/params-emit.ts").Schema> }).dict;
    const knob = emitKnob(dict["mask_denoise"] as never);
    assert.equal(MASK_DENOISE_DEFAULT, 1, "the home const is 1 (the qa8 cure)");
    assert.equal(knob["default"], MASK_DENOISE_DEFAULT, "the served default is the const");
    assert.equal(knob["minimum"], 0.05, "the validating floor rides (whoever owns the default owns the floor)");
    assert.equal(knob["maximum"], 1);
  });

  test("both detailer arms build denoise = the const when the region states nothing", () => {
    assert.equal(detailerDenoise(false), MASK_DENOISE_DEFAULT, "edit detailerSave rides the default");
    assert.equal(detailerDenoise(true), MASK_DENOISE_DEFAULT, "the gen twin rides the same default");
  });

  test("the crop_stitch-only gate's neutral moved with the default", () => {
    // the OLD default (0.5) is now a STATED value — outside crop_stitch
    // it refuses, naming the new neutral in the cure voice
    assert.throws(
      () => refuseImageEditFiring({ mask_denoise: 0.5 }),
      /'mask_denoise' fires .*back it to 1/,
      "a stated 0.5 outside crop_stitch refuses — the neutral is the const",
    );
    // the const itself rides silent outside crop_stitch (nothing stated)
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask_denoise: MASK_DENOISE_DEFAULT }),
      "the new default is the gate's neutral",
    );
  });

  test("the GUI's welded snapshot serves the new default (the fixture is the served truth)", () => {
    for (const f of ["image-edit-spec.json", "image-edit-fibo2-spec.json"]) {
      const doc = JSON.parse(readFileSync(join(REPO, "packages/web/melite-card-view/tests/fixtures", f), "utf8")) as {
        mod_schemas: { mask: { refs: Record<string, { meta?: { description?: string; default?: unknown } }> } };
      };
      const ref = Object.values(doc.mod_schemas.mask.refs).find((r) => r.meta?.description === "Region Denoise");
      assert.ok(ref, f + " carries the Region Denoise knob");
      assert.equal(ref!.meta!.default, MASK_DENOISE_DEFAULT, f + " serves the const");
    }
  });

  test("the agent doc names the new default and the old warning is gone", () => {
    const md = readFileSync(join(REPO, "packages/image/image-edit/src/agents/AGENT.md"), "utf8");
    assert.match(md, /mask_denoise default\s*\n?\s*is 1/, "the doc states the served default");
    assert.match(md, /explicit LOWER mask_denoise/, "the doc teaches the keep-structure cure");
    assert.doesNotMatch(md, /WARNING \(F7\)/, "the old 0.5-era warning is retired");
    assert.doesNotMatch(md, /ALWAYS state an/, "the old always-state imperative is retired");
  });

  test("no parallel default — the cordis pack imports the kit schema back (the one home)", () => {
    const packs = readFileSync(join(REPO, "packages/engines/comfyui-cordis/src/mods/packs.ts"), "utf8");
    assert.match(packs, /import \{ MaskFields \} from '@melite\/comfyui-card-kit\/pack-fields'/,
      "the engine imports the kit's schema — the kit header's own law");
    assert.doesNotMatch(packs, /mask_denoise: z\.number/, "the parallel copy is dead — no second writer");
  });
});
