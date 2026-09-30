// The atom's own proof (the atom vocabulary, stroke 3): the tag
// action's serialized prompt is BYTE-IDENTICAL to the legacy
// taggerLane joycaption arm on the same doc — the card's binding
// change moves no wire. The lane is weightless (the facts door is
// vacuous); the checkpoint rides the variant rail's stamped param
// (upstream takes any repo id or local path); the wired spell
// bypasses the loader. The interpreter's own contract walls live in
// card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { taggerLane, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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
  checkpoint: "cupcat/joycaption-beta-one",
  caption_type: "Descriptive",
  caption_length: "medium-length",
  extra_option: "",
};

describe("the tag action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane arm (the caption template)", () => {
    const legacy = new GraphBuilder({});
    taggerLane(PARAMS, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(tag, PARAMS, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const graph = action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const loader = Object.values(graph).find((n) => n.class_type === "JJC_DownloadAndLoadJoyCaptionModel")!;
    assert.equal(loader.inputs.model, "cupcat/joycaption-beta-one", "the stamped checkpoint rides");
    const caption = Object.values(graph).find((n) => n.class_type === "JJC_JoyCaption")!;
    assert.equal(caption.inputs.caption_type, "Descriptive", "the caption template rides");
    assert.equal(caption.inputs.max_new_tokens, 512, "the fixed decode budget rides");
    const save = Object.values(graph).find((n) => n.class_type === "SaveText")!;
    assert.equal(save.inputs.filename_prefix, "probe/tags", "compose stamps the run prefix");
  });

  it("byte equality holds with an extra option (the caption constraint rides)", () => {
    const p = { ...PARAMS, caption_type: "Stable Diffusion Prompt", extra_option: "Include information about lighting." };
    const legacy = new GraphBuilder({});
    taggerLane(p, FACTS, legacy, "probe-opt");
    const action = new GraphBuilder({});
    instantiateAction(tag, p, FACTS, action, "probe-opt");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
  });

  it("byte equality holds on the wired spell (a '$name' image rides verbatim, no loader)", () => {
    const p = { ...PARAMS, input_image: "$stage1" };
    const legacy = new GraphBuilder({});
    taggerLane(p, FACTS, legacy, "probe-spell");
    const action = new GraphBuilder({});
    instantiateAction(tag, p, FACTS, action, "probe-spell");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.ok(
      !Object.values(action.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "LoadImage"),
      "the spell IS the tensor — no loader builds",
    );
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
    assert.deepEqual(parseTagFacts({}), {});
    assert.deepEqual(parseTagFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
