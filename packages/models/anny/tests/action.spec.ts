// The atom's own proof (the atom vocabulary, stroke 3): the anny
// compose action's serialized prompt is BYTE-IDENTICAL to the
// card's legacy body (the staging + turnaround tail) on the same
// doc — the card's binding change moves no wire. The door is the
// weightless vacuous parse (the bake is parametric — no checkpoint
// loads). No sampler rides the turnaround, so no seed-sentinel.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { annyLane, instantiateAction } from "@melite/comfyui-card-kit";
import { ANNY_MORPH_LABELS, ANNY_MORPH_DEFAULT } from "@melite/comfyui-card-kit/morphs";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { compose, parseAnnyFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "anny",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  body_glb: "/models/bodies/hero.glb",
  resolution: 768,
  framing: 1.2,
  focal_length: 50,
  samples: 64,
  transparent: "true",
  gender: 0.7,
  height: 0.6,
};

/** The card's legacy fallback body, verbatim (the oracle the action
 * must match byte-for-byte). */
function legacyAnny(p: Record<string, unknown>, g: GraphBuilder): void {
  const body = String(p.body_glb ?? "").trim();
  const localChanges: Record<string, number> = {};
  for (const label of ANNY_MORPH_LABELS) {
    const v = Number(p[label]);
    if (Number.isFinite(v) && v !== ANNY_MORPH_DEFAULT) localChanges[label] = v;
  }
  const bodyPath = body !== ""
    ? g.node("PrimitiveString", { value: body }).out()
    : g.node("AnnyParamsToGlb", {
        params_json: JSON.stringify({
          dialect: "authored",
          phenotype: ["gender", "age", "muscle", "weight", "height", "proportions", "cupsize", "firmness", "african", "asian", "caucasian"].map((dim) => Number(p[dim] ?? 0.5)),
          local_changes: localChanges,
        }),
      }).out();
  annyLane(p, g, bodyPath);
}

const viewsOf = (g: GraphBuilder): Array<Record<string, unknown>> =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).filter(
    (n) => n.class_type === "SaveImage",
  );

describe("the anny compose action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy card body (an attached GLB renders as-is)", () => {
    const legacy = new GraphBuilder({});
    legacyAnny({ ...PARAMS }, legacy);
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(viewsOf(action).length, 8, "the 8-view turnaround sheet rides");
    assert.deepEqual(
      viewsOf(action).map((n) => (n.inputs as { filename_prefix: string }).filename_prefix),
      ["anny_front", "anny_front_right", "anny_right", "anny_back_right", "anny_back", "anny_back_left", "anny_left", "anny_front_left"],
      "the view names ride the family convention, unstamped by run (stable)",
    );
  });

  it("byte equality holds on the identity bake (an empty body_glb — the sliders bake the body)", () => {
    const p = { ...PARAMS, body_glb: "", muscle: 0.9, firmness: 0.1, "l-upperarm-fat-incr": 1.5 };
    const legacy = new GraphBuilder({});
    legacyAnny({ ...p }, legacy);
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-bake");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const bake = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "AnnyParamsToGlb",
    )!;
    const json = JSON.parse((bake.inputs as { params_json: string }).params_json) as { phenotype: number[]; local_changes: Record<string, number> };
    assert.deepEqual(json.phenotype.slice(0, 5), [0.7, 0.5, 0.9, 0.5, 0.6], "absent dims fall to the neutral 0.5, stated dims ride (gender, muscle, height)");
    assert.deepEqual(json.local_changes, { "l-upperarm-fat-incr": 1.5 }, "only non-zero MORPH labels ship (sparse local_changes)");
  });

  it("a non-positive render amount refuses by name on BOTH paths (the row guard, ported verbatim)", () => {
    const p = { ...PARAMS, samples: 0 };
    assert.throws(() => legacyAnny({ ...p }, new GraphBuilder({})), /samples = 0: a positive number is required/);
    assert.throws(
      () => instantiateAction(compose, { ...p }, FACTS, new GraphBuilder({}), "probe-bad"),
      /samples = 0: a positive number is required/,
    );
  });

  it("the door is the weightless vacuous parse (the bake loads no checkpoint)", () => {
    assert.deepEqual(parseAnnyFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.deepEqual(
      (FACTS.lane_inputs as { weightless?: boolean }).weightless,
      false,
      "the row carries weights but the segment composes none",
    );
  });
});
