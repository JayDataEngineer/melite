// @melite/models-fit — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law). The
// fit family is a WEIGHTLESS verb family (the atom vocabulary,
// stroke 4): unoffered, no form, one seat action — the fit-seat
// backend the meld flows route to. These pins hold the PLUGIN SHAPE
// + identity; registration is proven engine-side (the walls'
// registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, seat } from "../src/index.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";

describe("the fit model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-fit");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — weightless, unoffered, one seat action", () => {
    assert.equal(DECL.id, "fit");
    assert.equal(DECL.label, "Fit (meld seat)");
    assert.equal(DECL.genre, "3d");
    assert.equal(DECL.engine, undefined);
    assert.equal(DECL.unoffered, true);
    assert.equal(DECL.form, undefined);
    assert.equal(DECL.lane_inputs?.family, "fit");
    assert.equal(DECL.lane_inputs?.weightless, true);
    assert.equal(DECL.variants.length, 1);
    assert.equal(DECL.variants[0]?.id, "standard");
    assert.deepEqual(
      DECL.variant_groups?.map((gr) => gr.id),
      ["Variant"],
    );
    assert.deepEqual(
      DECL.actions?.map((a) => a.id),
      ["seat"],
    );
    assert.deepEqual(seat.outputs, [{ name: "seat", kind: "mesh" }]);
  });

  // THE VERB REFUSES WITHOUT A BONE, at compose, naming the missing
  // seam — which is why there is no composed-graph case here. The
  // vendor's FitRow gate refuses an empty Bone before it picks a mode
  // (fit_surgery.py:66-68), a bone name belongs to the body being
  // fitted rather than to a constant, and no flow initial can carry
  // one (the door admits photo/glb/bake_params only). So the honest
  // shape of this verb today is a refusal, not a graph.
  it("the seat refuses at compose, naming the seam a bone needs", () => {
    const g = new GraphBuilder();
    assert.throws(
      () =>
        seat.build({
          p: { body: "$body", prop: "$prop" },
          facts: seat.facts({}),
          model: {
            id: "fit",
            card: "",
            family: "fit",
            defaults: {},
            lane_inputs: {},
            variants: [],
            variant_groups: [],
            outputs: [],
            mods: [],
          },
          g,
          runId: "",
        } as never),
      /needs a BONE/,
    );
    assert.throws(
      () =>
        seat.build({
          p: { body: "$body", prop: "$prop" },
          facts: seat.facts({}),
          model: {
            id: "fit",
            card: "",
            family: "fit",
            defaults: {},
            lane_inputs: {},
            variants: [],
            variant_groups: [],
            outputs: [],
            mods: [],
          },
          g,
          runId: "",
        } as never),
      /the door admits photo\/glb\/bake_params only/,
    );
  });
});
