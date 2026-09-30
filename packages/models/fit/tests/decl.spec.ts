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
        body: ref("body"),
        prop: ref("prop"),
        model_name: ref("model_name"),
        bone: ref("bone"),
        align: ref("align"),
        position: ref("position"),
        rotation: ref("rotation"),
        fit_ratio: ref("fit_ratio"),
        fit_ref_bone: ref("fit_ref_bone"),
        fit_ref_bone2: ref("fit_ref_bone2"),
        seat_ratio: ref("seat_ratio"),
        finger_bone: ref("finger_bone"),
        thumb_bone: ref("thumb_bone"),
        target_width: ref("target_width"),
      },
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
      "FitRow.0": {
        class_type: "FitRow",
        inputs: {
          model_name: "$model_name",
          bone: "$bone",
          align: "$align",
          position: "$position",
          rotation: "$rotation",
          fit_ratio: "$fit_ratio",
          fit_ref_bone: "$fit_ref_bone",
          fit_ref_bone2: "$fit_ref_bone2",
          seat_ratio: "$seat_ratio",
          finger_bone: "$finger_bone",
          thumb_bone: "$thumb_bone",
          target_width: "$target_width",
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
