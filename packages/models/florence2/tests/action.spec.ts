// The atom's own proof (the atom vocabulary, stroke 3): the tag
// action composes the family's own lane, and its serialized prompt is
// pinned to a COMMITTED GOLDEN — the wire the port produced while the
// kit's legacy taggerLane still existed and this spec compared the
// two arms byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law. The lane is
// weightless (the facts door is vacuous); the checkpoint rides the variant rail's stamped param (upstream downloads on first run); the wired spell bypasses the loader. The interpreter's
// own contract walls live in card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { tag } from "../src/actions.ts";
import { parseWeightlessFacts } from "@melite/comfyui-card-kit";

// The REAL resolved shape the service hands compose: a weightless
// family row (lane_inputs ≡ {} — the loader's absent-≡-{} law).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "tagger",
  defaults: {},
  lane_inputs: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  input_image: "/m/i.png",
  // The DECL's own default row (PromptGen-v2.0) — a spell the
  // engine's model enum actually serves.
  checkpoint: "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
  caption_task: "more_detailed_caption",
};


const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>, runId: string): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(tag, p, FACTS, g, runId);
  return g.toJSON() as never;
};

describe("the tag action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the vision task)", () => {
    const graph = compose(PARAMS, "probe");
    assertGraphGolden(golden("tag-vision-task"), graph, "the vision task");
    const loader = Object.values(graph).find((n) => n.class_type === "DownloadAndLoadFlorence2Model")!;
    assert.equal(loader.inputs.model, "MiaoshouAI/Florence-2-large-PromptGen-v2.0", "the stamped checkpoint rides");
    assert.equal(loader.inputs.precision, "fp16", "the fixed precision rides");
    const run = Object.values(graph).find((n) => n.class_type === "Florence2Run")!;
    assert.equal(run.inputs.task, "more_detailed_caption", "the vision task rides");
    const save = Object.values(graph).find((n) => n.class_type === "SaveText")!;
    assert.equal(save.inputs.filename_prefix, "probe/tags", "compose stamps the run prefix");
  });

  it("a re-stated task holds its golden (the live task vocabulary)", () => {
    assertGraphGolden(golden("tag-vision-task-ocr"), compose({ ...PARAMS, caption_task: "ocr_with_region" }, "probe-task"), "the re-stated task");
  });

  it("the wired spell holds the golden (a '$name' image rides verbatim, no loader)", () => {
    const p = { ...PARAMS, input_image: "$stage1" };
    const graph = compose(p, "probe-spell");
    assertGraphGolden(golden("tag-wired-spell"), graph, "the wired spell");
    assert.ok(
      !Object.values(graph).some((n) => n.class_type === "LoadImage"),
      "the spell IS the tensor — no loader builds",
    );
  });

  it("a file image keeps its loader (the disk handoff)", () => {
    const load = Object.values(compose(PARAMS, "probe-path")).find((n) => n.class_type === "LoadImage")!;
    assert.equal(load.inputs.image, PARAMS.input_image, "the file path reaches the loader verbatim");
  });

  it("a blank input_image refuses — the card's own voice (direct action callers)", () => {
    assert.throws(
      () => instantiateAction(tag, { ...PARAMS, input_image: "" }, FACTS, new GraphBuilder({}), "probe-blank"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
  });

  it("a non-string input_image rides the vacuous read then refuses (the direct-call face)", () => {
    assert.throws(
      () => instantiateAction(tag, { ...PARAMS, input_image: 5 }, FACTS, new GraphBuilder({}), "probe-type"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
  });

  it("the weightless door parses anything (absent ≡ {} — nothing can drift)", () => {
    assert.deepEqual(parseWeightlessFacts({}), {});
    assert.deepEqual(parseWeightlessFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
