// @melite/models-skin — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law). The
// skin family is a WEIGHTLESS verb family (the atom vocabulary,
// stroke 4): unoffered, no form, one coat action — the apply-skin
// backend the meld flows route to. These pins hold the PLUGIN SHAPE
// + identity; registration is proven engine-side (the walls'
// registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, coat } from "../src/index.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";

describe("THE COAT CI GOLDEN (models-hop56 wave-2: the e2e receipt promoted to a unit judge)", () => {
  it("the composed coat graph pins the verb's fixed vocabulary at the named nodes (SkinPack/SkinSidecar/SkinApply), the stated body at the graft", () => {
    const g = new GraphBuilder();
    coat.build({
      p: { body: "$body" },
      facts: {},
      model: {
        id: "skin", card: "", family: "skin", defaults: {}, lane_inputs: {},
        variants: [], variant_groups: [], outputs: [], mods: [],
      },
      g,
      runId: "",
    } as never);
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.deepEqual(graph["SkinPack.0"]?.inputs, { size: 512, seed: 20260906 },
      "the pack bakes at the fixed map size + seed");
    assert.deepEqual(graph["SkinSidecar.0"]?.inputs, { kind: "keeper", size: 512, seed: 20260906 },
      "the sidecar rides the fixed kind at the same size + seed");
    assert.equal(graph["SkinApply.0"]?.inputs["body_glb_path"], "$body",
      "the stated body grafts verbatim");
    assert.deepEqual(graph["SkinApply.0"]?.inputs["albedo"], ["SkinPack.0", 0],
      "the albedo maps ride the pack's first output");
    assert.deepEqual(graph["SkinApply.0"]?.inputs["normal"], ["SkinPack.0", 1],
      "the normal maps ride the pack's second output");
  });
});

describe("the skin model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-skin");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — lane-fact-free, unoffered, one coat action", () => {
    assert.equal(DECL.id, "skin");
    assert.equal(DECL.label, "Skin (meld coat)");
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
      ["coat"],
    );
    assert.deepEqual(coat.outputs, [{ name: "skin", kind: "mesh" }]);
  });

  // THE KNOBS ARE THE VERB'S (stroke-89): only the body rides as a
  // $-ref. The detail kind, map size and seed are the action's own
  // fixed vocabulary — a flow's initialValidators admit only
  // photo/glb/bake_params, so a knob spelled `$map_size` could never
  // be linkable and the merged worker refused it by name.
  it("the coat composes the meld graph with the body $-ref riding verbatim", () => {
    const g = new GraphBuilder();
    const out = coat.build({
      p: { body: "$body" },
      facts: coat.facts({}),
      model: {
        id: "skin",
        card: "",
        family: "skin",
        defaults: {},
        lane_inputs: {},
        variants: [],
        variant_groups: [],
        outputs: [],
      },
      g,
      runId: "",
    });
    // THE HANDLE IS THE ARTIFACT: the declared output is a mesh (the
    // grafted body), so the returned node must be the one that
    // produces it — SkinApply, whose RETURN_TYPES carry the GLB path.
    // Returning the proof renderer published a PNG as the mesh
    // channel and wired an IMAGE into the next stage's body slot. The
    // renderer is still in the graph below, as a terminal the harvest
    // finds.
    assert.equal(out.nodeId, "SkinApply.0");
    assert.deepEqual(g.toJSON(), {
      // THE COAT'S KNOBS ARE THE VERB'S OWN VOCABULARY (stroke-89):
      // the SkinPack/SkinSidecar nodes' declared defaults, verbatim —
      // the engine refuses anything else by name (seed is INT min 0;
      // kind is a combo of the meld kinds). A $-ref here could never
      // link: the door's initialValidators admit photo/glb/bake_params
      // only, so the merged worker refused "carries $map_size".
      "SkinPack.0": { class_type: "SkinPack", inputs: { size: 512, seed: 20260906 } },
      "SkinSidecar.0": {
        class_type: "SkinSidecar",
        inputs: { kind: "keeper", size: 512, seed: 20260906 },
      },
      "SaveImage.0": {
        class_type: "SaveImage",
        inputs: { images: ["SkinPack.0", 0], filename_prefix: "skin_apply/out_albedo" },
      },
      "SaveImage.1": {
        class_type: "SaveImage",
        inputs: { images: ["SkinPack.0", 1], filename_prefix: "skin_apply/out_normal" },
      },
      "SaveText.0": {
        class_type: "SaveText",
        inputs: { text: ["SkinSidecar.0", 0], filename_prefix: "skin_apply/out_kind", format: "json" },
      },
      "SkinApply.0": {
        class_type: "SkinApply",
        inputs: {
          body_glb_path: "$body",
          albedo: ["SkinPack.0", 0],
          normal: ["SkinPack.0", 1],
        },
      },
      "RayRenderGLBViews.0": {
        class_type: "RayRenderGLBViews",
        inputs: {
          glb_path: ["SkinApply.0", 0],
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
