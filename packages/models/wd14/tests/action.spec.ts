// The atom's own proof (the atom vocabulary, stroke 3): the tag
// action composes the family's own lane, and its serialized prompt is
// pinned to a COMMITTED GOLDEN — the wire the port produced while the
// kit's legacy taggerLane still existed and this spec compared the
// two arms byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law: the flat
// wire stays byte-identical unless someone refreshes it on purpose.
// The lane is weightless (the facts door is vacuous); the checkpoint
// rides the variant rail's stamped param; the wired spell bypasses the
// loader. The interpreter's own contract walls live in card-kit's
// tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join } from "node:path";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { DECL } from "../src/index.ts";
import { tag, parseTagFacts } from "../src/actions.ts";

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
  checkpoint: "wd-v1-4-moat-tagger-v2",
  threshold: 0.35,
  character_threshold: 0.85,
  exclude_tags: "ugly",
  replace_underscore: false,
  trailing_comma: false,
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>, runId: string): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(tag, p, FACTS, g, runId);
  return g.toJSON() as never;
};

describe("the tag action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the default floors)", () => {
    const graph = compose(PARAMS, "probe");
    assertGraphGolden(golden("tag-default-floors"), graph, "the default floors");
    const tagNode = Object.values(graph).find((n) => n.class_type === "WD14Tagger|pysssss")!;
    assert.equal(tagNode.inputs.model, "wd-v1-4-moat-tagger-v2", "the stamped checkpoint rides");
    assert.equal(tagNode.inputs.threshold, 0.35, "the general floor rides");
    const save = Object.values(graph).find((n) => n.class_type === "SaveText")!;
    assert.equal(save.inputs.filename_prefix, "probe/tags", "compose stamps the run prefix");
  });

  it("re-stated knobs hold the golden (the confidence floors ride the node)", () => {
    const p = { ...PARAMS, threshold: 0.6, character_threshold: 0.9, replace_underscore: true, trailing_comma: true };
    assertGraphGolden(golden("tag-re-stated-knobs"), compose(p, "probe-knobs"), "the re-stated knobs");
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
    assert.equal(load.inputs.image, "/m/i.png", "the file path reaches the loader verbatim");
  });

  it("a blank input_image refuses — the card's own voice (direct action callers)", () => {
    assert.throws(
      () => instantiateAction(tag, { ...PARAMS, input_image: "  " }, FACTS, new GraphBuilder({}), "probe-blank"),
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
    assert.deepEqual(parseTagFacts({}), {});
    assert.deepEqual(parseTagFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
