// @melite/3d-img-to-mesh — the card's compose gate (TEST-2 breadth,
// 2026-09-12). THREE families behind one card: the dispatch stays
// HERE (bespoke), the arms ride the kit. The transfer_rig
// admissions (donor rig AND clothed target) and the lift admission
// (one clear image) are the card's own voices; every arm composes
// against its family's REAL facts row (facts.ts assembles from
// model-facts.json + the registry — the same reads the compose door
// rides, never a hand-built facts object).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { ACTION_BINDINGS } from "../src/card.ts";
import { resolveCardFlowOutputs } from '@melite/comfyui-cordis'
import { fieldsOf, type FormSpecDoc, type SchemaEnvelope } from "@melite/card-base/client";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
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

  it("the target alone refuses when the donor rides (the paired-lane gate — Q4b)", () => {
    // Round-22 compose audit Q4b: the mixed state used to fall to the
    // lane's required-params voice; it now refuses earlier, at the
    // card's paired-lane gate, before any arm — same input, never
    // composes.
    assert.throws(
      () => def.compose({ ...BASE, rigged_glb: "/m/r.glb" }, rig, new GraphBuilder(), "r1"),
      /paired transfer lane.*rigged_glb is set but target_glb is empty/,
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
    // THE MESH TRIO (operator 2026-11-02: fast/standard/quality,
    // defaulting to standard): the variant plane collapses to the
    // single 1024 row — 1536 is the quality RECIPE's pick (a patch
    // over the floor, not a served route), and the 512 lane left
    // the MESH_RESOLUTIONS envelope entirely.
    for (const row of [pixal, trellis]) {
      const variants = row.variants.filter((variant) => variant.hide_from_dropdown !== true);
      assert.deepEqual(variants.filter((variant) => variant.group === "Variant").map((variant) => variant.id), ["1024"]);
      // {} through this door — the kit's facts assembly normalizes
      // resolver_defaults ?? {}, so the EMPTY object is the no-stamp
      // state (the family defaults row owns resolution).
      assert.deepEqual(row.variants.find((variant) => variant.id === "1024")?.resolver_defaults, {});
      assert.equal(row.variants.find((variant) => variant.id === "1536"), undefined,
        "the 1536 route is retired — quality's recipe stamp is the only 1536 door");
      assert.equal(row.variants.find((variant) => variant.id === "512"), undefined,
        "the 512 lane left the engine vocabulary");
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

// 2026-10-11 — round-22 compose audit Q4b (EXHAUSTIVE-WHEN): the two
// producer predicates were conjunctive on both sides, so a mixed GLB
// state (exactly one set) satisfied NEITHER — on the lift families,
// whose arms ignore the pair, the run composed fine and the producer
// walk selected nothing: zero outputs, silently. The card's compose
// now refuses the mixed state on every family before any arm; the
// matrix pins all four cells.
describe("the paired GLB lane (round-22 compose audit Q4b)", () => {
  it("the mixed state refuses loud on the lift lane, both orders", () => {
    assert.throws(
      () => def.compose({ ...BASE, rigged_glb: "/m/r.glb" }, trellis, new GraphBuilder(), "r_mixed1"),
      /paired transfer lane.*rigged_glb is set but target_glb is empty/,
    );
    assert.throws(
      () => def.compose({ ...BASE, target_glb: "/m/t.glb" }, trellis, new GraphBuilder(), "r_mixed2"),
      /paired transfer lane.*target_glb is set but rigged_glb is empty/,
    );
  });

  it("the mixed state refuses loud on the transfer lane too (whitespace-only counts as empty)", () => {
    assert.throws(
      () => def.compose({ ...BASE, rigged_glb: "/m/r.glb", target_glb: "   " }, rig, new GraphBuilder(), "r_mixed3"),
      /paired transfer lane.*rigged_glb is set but target_glb is empty/,
    );
  });

  it("both empty lifts, both set transfers — the reachable matrix still resolves", () => {
    const lift = new GraphBuilder();
    def.compose(BASE, trellis, lift, "r_lift");
    assert.deepEqual(resolveCardFlowOutputs(def, BASE, lift.toJSON()).outputNodes, { default: "Save3DAdvanced.0" });
    const transfer = new GraphBuilder();
    def.compose({ ...BASE, rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" }, rig, transfer, "r_transfer");
    assert.deepEqual(
      resolveCardFlowOutputs(def, { ...BASE, rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" }, transfer.toJSON()).outputNodes,
      { default: "SaveRiggedModel.0" },
    );
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

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the img-to-mesh card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row — no address silently rides
// the legacy id-switch while its siblings compose the declared
// segment; (2) the row composes ITS OWN declared segment — the lift
// saves the textured glb, the rig copy saves the rigged glb. The
// declared fallback (a family-less row) rides the legacy arms.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "img-to-mesh");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 3, `expected the served img-to-mesh addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    const fam = row.family ?? row.id;
    const isRig = fam === "transfer_rig";
    const params = isRig
      ? { rigged_glb: "/m/donor.glb", target_glb: "/m/target.glb" }
      : { input_image: "/m/photo.png", ...row.defaults };
    const saveClass = isRig ? "SaveRiggedModel" : "Save3DAdvanced";
    it(`address '${row.id}' (family '${fam}') is bound and composes its own truth`, () => {
      assert.ok(
        fam in ACTION_BINDINGS,
        `family '${fam}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy id-switch`,
      );
      const g = new GraphBuilder();
      def.compose(def.schema(params), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const save = Object.values(graph).find((n) => n.class_type === saveClass)!;
      assert.ok(save, `the declared segment saves via ${saveClass}`);
      if (!isRig) {
        const expected = fam === "pixal3d" ? "pixal3d" : "trellis2_native";
        assert.equal((save.inputs as { filename_prefix: string }).filename_prefix, expected, "the family prefix is a constant");
      }
    });
  }

  it("THE DECLARED REFUSAL: a row with no owning family refuses loud (a multi-family card never guesses a lane)", () => {
    const row = { ...rows[0]!, id: "synthetic-mesh", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/photo.png", ...rows[0]!.defaults }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-mesh' on the img-to-mesh card — every boarded family/,
    );
  });
});
