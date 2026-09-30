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

  it("declares the carrier — lane-fact-free, unoffered, one seat action", () => {
    assert.equal(DECL.id, "fit");
    assert.equal(DECL.label, "Fit (meld seat)");
    assert.equal(DECL.genre, "3d");
    assert.equal(DECL.engine, undefined);
    assert.equal(DECL.unoffered, true);
    assert.equal(DECL.form, undefined);
    assert.equal(DECL.lane_inputs, undefined, "the carrier declares no engine-general facts (the binary owns its own weights)");
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

  // THE BONE IS THE CALLER'S, and it rides the graph: a named bone
  // reaches FitRow verbatim, the rest of the row is the node's own
  // declared defaults, and the proof sheet is rendered but NOT
  // returned (the declared output is the seated mesh).
  it("the seat composes the meld graph with the caller's bone", () => {
    const g = new GraphBuilder();
    const out = seat.build({
      p: { body: "$body", prop: "$prop", bone: "hand_r" },
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
    } as never);
    // THE HANDLE IS THE ARTIFACT (the skin verb's shape): the seated
    // mesh, not the proof renderer.
    assert.equal(out.nodeId, "FitProp.0");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["FitRow.0"]?.inputs["bone"], "hand_r", "the caller's bone rides verbatim");
    assert.equal(graph["FitRow.0"]?.inputs["align"], "socket", "the rest is the node's default row");
    assert.ok("RayRenderGLBViews.0" in graph, "the proof sheet is rendered in-graph");
    assert.deepEqual(graph["FitProp.0"]?.inputs["prop_glb_path"], "$prop");
  });

  // An empty or absent bone refuses at COMPOSE, by name — the
  // vendor's row gate refuses an empty Bone before it picks a mode
  // (fit_surgery.py:66-69), so the door's graph must never carry
  // one to the engine.
  it("an empty bone refuses at compose rather than reaching the engine", () => {
    const g = new GraphBuilder();
    assert.throws(
      () =>
        seat.build({
          p: { body: "$body", prop: "$prop", bone: "  " },
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
  });
});
