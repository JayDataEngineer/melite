// The atom's own proof (the atom vocabulary, stroke 3): the tag
// action composes the family's own lane, and its serialized prompt is
// pinned to a COMMITTED GOLDEN — the wire the port produced while the
// kit's legacy taggerLane still existed and this spec compared the
// two arms byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law. The lane is
// weightless (the facts door is vacuous); the checkpoint rides the
// variant rail's stamped param (upstream takes any repo id or local
// path); the wired spell bypasses the loader. The interpreter's own
// contract walls live in card-kit's tests/action.spec.ts.
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
  checkpoint: "cupcat/joycaption-beta-one",
  caption_type: "Descriptive",
  caption_length: "medium-length",
  extra_option: "",
};


const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>, runId: string): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(tag, p, FACTS, g, runId);
  return g.toJSON() as never;
};

describe("the tag action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the caption template)", () => {
    const graph = compose(PARAMS, "probe");
    assertGraphGolden(golden("tag-caption-template"), graph, "the caption template");
    const loader = Object.values(graph).find((n) => n.class_type === "JJC_DownloadAndLoadJoyCaptionModel")!;
    assert.equal(loader.inputs.model, "cupcat/joycaption-beta-one", "the stamped checkpoint rides");
    const caption = Object.values(graph).find((n) => n.class_type === "JJC_JoyCaption")!;
    assert.equal(caption.inputs.caption_type, "Descriptive", "the caption template rides");
    assert.equal(caption.inputs.max_new_tokens, 512, "the fixed decode budget rides");
    const save = Object.values(graph).find((n) => n.class_type === "SaveText")!;
    assert.equal(save.inputs.filename_prefix, "probe/tags", "compose stamps the run prefix");
  });

  it("an extra option holds its golden (the caption constraint rides)", () => {
    const p = { ...PARAMS, caption_type: "Stable Diffusion Prompt", extra_option: "Include information about lighting." };
    assertGraphGolden(golden("tag-caption-extra-option"), compose(p, "probe-opt"), "the extra option");
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
