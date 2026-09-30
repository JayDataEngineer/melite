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

  it("the seat composes the meld graph with $-refs riding verbatim", () => {
    const g = new GraphBuilder();
    const ref = (k: string): string => `$${k}`;
    const out = seat.build({
      p: {
        // THE TWO FILES RIDE AS $-refs; the fit row is the verb's own
        // vocabulary (stroke-89), so no knob is a request param and
        // none can name a key the flow cannot declare.
        body: ref("body"),
        prop: ref("prop"),},
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
      },
      g,
      runId: "",
    });
    assert.equal(out.nodeId, "RayRenderGLBViews.0");
    assert.deepEqual(g.toJSON(), {
      // THE FIT ROW IS THE VERB'S OWN VOCABULARY (stroke-89): the
      // FitRow node's declared defaults, verbatim — not $-refs, which
      // the door can never link (its initialValidators admit
      // photo/glb/bake_params only).
      "FitRow.0": {
        class_type: "FitRow",
        inputs: {
          model_name: "prop",
          bone: "",
          align: "socket",
          position: "0,0,0",
          rotation: "0,0,0",
          fit_ratio: 0.0,
          fit_ref_bone: "",
          fit_ref_bone2: "",
          seat_ratio: 0.22,
          finger_bone: "",
          thumb_bone: "",
          target_width: 0.0,
        },
      },
      "FitProp.0": {
        class_type: "FitProp",
        inputs: {
          body_glb_path: "$body",
          prop_glb_path: "$prop",
          row_json: ["FitRow.0", 0],
        },
      },
      "RayRenderGLBViews.0": {
        class_type: "RayRenderGLBViews",
        inputs: {
          glb_path: ["FitProp.0", 0],
          resolution: 768,
          framing: 1.2,
          focal_length: 50,
          samples: 64,
          transparent: true,
        },
      },
    });
  });
});
