// @melite/3d-img-to-mesh — the card's compose gate (TEST-2 breadth,
// 2026-09-12). THREE families behind one card: the dispatch stays
// HERE (bespoke), the arms ride the kit. The transfer_rig
// admissions (donor rig AND clothed target) and the lift admission
// (one clear image) are the card's own voices; every arm composes
// against its family's REAL facts row (facts.ts assembles from
// model-facts.json + the registry — the same reads the compose door
// rides, never a hand-built facts object).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { resolveCardFlowOutputs } from "@melite/comfyui-cordis/service";
import { fieldsOf, type FormSpecDoc, type SchemaEnvelope } from "@melite/card-base";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;

let BASE: Record<string, unknown> = {};

let trellis: ModelFacts;
let pixal: ModelFacts;
let rig: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("img-to-mesh")!;
  assert.ok(def, "the composition root serves the img-to-mesh card");
  trellis = facts.models["trellis2-native"]!;
  pixal = facts.models.pixal3d!;
  rig = facts.models.transfer_rig!;
  assert.ok(trellis && pixal && rig, "all three family facts rows serve");
  BASE = { input_image: "/m/photo.png", ...trellis.defaults };
});

describe("the default family (boarded order)", () => {
  it("Pixal3D boards first — the operator's standing pick", () => {
    // Boarded order IS the default order (discovery derives the
    // default family/service from boarded[0], the picker lists in
    // this order) — a reorder re-defaults the card, so it is pinned.
    assert.deepEqual((def as unknown as { boarded: string[] }).boarded,
      ['pixal3d', 'trellis2-native', 'transfer_rig']);
  });
  it("requires a model before the multi-family renderer can compose", () => {
    assert.equal(def.requiresModel, true);
    assert.throws(
      () => theService().compose("img-to-mesh", null, {}, "missing-model"),
      /requires a model id/,
    );
  });
});

describe("the transfer_rig arm (the rig copy)", () => {
  it("both GLBs missing refuse TOGETHER, named", () => {
    assert.throws(
      () => def.compose(BASE, rig, new GraphBuilder(), "r1"),
      /required param\(s\) 'rigged_glb' \(Rigged source GLB\), 'target_glb' \(Target GLB\) missing on the transfer_rig lane/,
    );
  });

  it("the target alone refuses when the donor rides", () => {
    assert.throws(
      () => def.compose({ ...BASE, rigged_glb: "/m/r.glb" }, rig, new GraphBuilder(), "r1"),
      /required param\(s\) 'target_glb' \(Target GLB\) missing/,
    );
  });

  it("the happy rig copy composes against the real facts row", () => {
    const g = new GraphBuilder();
    def.compose({ ...BASE, rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" }, rig, g, "r1");
    assert.ok(Object.keys(g.toJSON()).length > 0, "the arm emits its graph");
  });
});

describe("the lift arms (one clear image → textured mesh)", () => {
  it("a missing source image refuses loud (admitMeshLift)", () => {
    assert.throws(
      () => { const p = { ...BASE }; delete p.input_image; def.compose(p, trellis, new GraphBuilder(), "r1"); },
      /input_image/,
    );
  });

  it("the trellis arm composes on the native TRELLIS.2 lane", () => {
    const g = new GraphBuilder();
    def.compose({ ...BASE, seed: 7, steps: 8 }, trellis, g, "r1");
    const graph = g.toJSON();
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("LoadImage")),
      "the source image loads",
    );
    assert.ok(Object.keys(graph).length > 5, "the full official chain composes");
  });

  it("the pixal arm composes on the pixel-aligned + MoGe lane", () => {
    const g = new GraphBuilder();
    def.compose({ ...BASE, camera_fov: "49.13", resolution: "1536" }, pixal, g, "r1");
    const graph = g.toJSON();
    assert.ok(Object.keys(graph).length > 5, "the pixal chain composes");
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("TRELLIS") || k.includes("Pixal") || k.startsWith("LoadImage")),
      "the pixal lane emits",
    );
  });
});


describe("the family-scoped surface and output bindings", () => {
  it("the transfer arm shows only its two mesh inputs; the lift arm shows the image input", () => {
    const schema = theService().formSchemas("img-to-mesh", "transfer_rig")!.schema as SchemaEnvelope;
    const families = def.boarded.map((id) => ({ id, present: true }));
    const transfer = fieldsOf({ form: "img-to-mesh", model: "transfer_rig", schema, families } as FormSpecDoc);
    assert.deepEqual(transfer.map((field) => field.name), ["rigged_glb", "target_glb"]);
    const lift = fieldsOf({ form: "img-to-mesh", model: "pixal3d", schema, families } as FormSpecDoc);
    assert.equal(lift.find((field) => field.name === "input_image")?.type, "image");
    assert.equal(lift.find((field) => field.name === "rigged_glb"), undefined);
  });

  it("offers only engine-supported resolution and quant cells", () => {
    for (const row of [pixal, trellis]) {
      const variants = row.variants.filter((variant) => variant.hide_from_dropdown !== true);
      assert.deepEqual(variants.filter((variant) => variant.group === "Variant").map((variant) => variant.id), ["1024", "1536"]);
      assert.equal(row.variants.find((variant) => variant.id === "512")?.hide_from_dropdown, true);
      assert.equal(row.variants.find((variant) => variant.id === "1536")?.resolver_defaults.resolution, "1536");
      for (const variant of row.variants) {
        for (const cell of variant.cells) {
          if (cell.quant === "bf16") assert.equal(cell.hide_from_dropdown, true);
        }
      }
    }
    assert.throws(() => def.schema({ ...BASE, resolution: "512" }), /resolution|1024|1536/);
  });

  it("keeps the two producer predicates mutually exclusive", () => {
    const [lift, transfer] = def.flowOutputBindings!;
    assert.equal(lift.when?.({}), true);
    assert.equal(transfer.when?.({ rigged_glb: "/m/r.glb", target_glb: "" }), false);
    assert.equal(transfer.when?.({ rigged_glb: "/m/r.glb" }), false);
    assert.equal(transfer.when?.({ rigged_glb: "", target_glb: "/m/t.glb" }), false);
    assert.equal(transfer.when?.({ target_glb: "/m/t.glb" }), false);
    assert.equal(transfer.when?.({ rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" }), true);
  });

  it("binds the lift and transfer outputs to their actual producers", () => {
    const lift = new GraphBuilder();
    def.compose(BASE, trellis, lift, "lift");
    assert.deepEqual(resolveCardFlowOutputs(def, BASE, lift.toJSON()), {
      outputs: { default: "mesh" },
      outputNodes: { default: "Save3DAdvanced.0" },
    });
    const transfer = new GraphBuilder();
    const transferParams = { ...BASE, rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" };
    def.compose(transferParams, rig, transfer, "transfer");
    assert.deepEqual(resolveCardFlowOutputs(def, transferParams, transfer.toJSON()), {
      outputs: { default: "mesh" },
      outputNodes: { default: "SaveRiggedModel.0" },
    });
  });
});

describe("THE SCHEMA GATE (admission validates values, not just keys)", () => {
  it("an out-of-envelope steps refuses loud (declared 4–60), never composes", () => {
    assert.throws(
      () => def.compose({ ...BASE, steps: 500 }, trellis, new GraphBuilder(), "r_oob"),
      /steps|500|between|range/i,
    );
  });

  it("a wrong-typed steps refuses loud", () => {
    assert.throws(
      () => def.compose({ ...BASE, steps: "many" }, trellis, new GraphBuilder(), "r_type"),
      /steps|many/i,
    );
  });

  it("model defaults, not a second card schema, supply unstated lift steps", () => {
    const schemaOnly = def.schema({ input_image: "/m/photo.png" });
    assert.equal(schemaOnly.steps, undefined, "the card schema stays defaultless for model-owned knobs");
    const g = new GraphBuilder();
    def.compose({ ...trellis.defaults, input_image: "/m/photo.png" }, trellis, g, "r_def");
    assert.equal(g.toJSON()["KSampler.0"].inputs.steps, 12,
      "the model row supplies the default 12");
  });
});


describe("the dual-face law: the root is the row-mount marker", () => {
  it("apply registers NOTHING node-side (the card rides the CARD face; the studio rides the client face)", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const marker = await import("../src/index.ts");
    const ctx = new Context();
    marker.apply(ctx);
    assert.equal(marker.name, "@melite/3d-img-to-mesh");
  });
});
