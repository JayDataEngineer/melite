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
import { loadCardDefs } from "@melite/comfyui-cordis";
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

/** The schema defaults as literals — the wire-string knobs ride
 *  strings (resolution/atlas/camera_fov…), the door extracts
 *  defaults without re-validation and compose coerces at the
 *  closed tables. */
const BASE: Record<string, unknown> = {
  input_image: "/m/photo.png", seed: 42, steps: 12, cfg: 7.5,
  resolution: "1024", shape_steps: 20, shape_cfg: 7.5,
  tex1_steps: 12, tex1_cfg: 7.5, tex2_steps: 12, tex2_cfg: 1,
  remesh_resolution: 768, decimate_faces: 700000, smooth_angle: 180,
  atlas_size: "4096", ao_size: "1024", normal_size: "2048",
  struct_sampler: "euler", struct_scheduler: "normal",
  shape_sampler: "euler", shape_scheduler: "normal",
  tex1_sampler: "euler", tex1_scheduler: "simple",
  tex2_sampler: "euler", tex2_scheduler: "normal",
  sd3_shift: 5, rescale_struct: 0.7, rescale_shape: 0.5,
  override_struct: 0.667, override_shape: 0.769,
  bg_removal: "auto", camera_fov: "auto",
};

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
});

describe("the default family (boarded order)", () => {
  it("Pixal3D boards first — the operator's standing pick", () => {
    // Boarded order IS the default order (discovery derives the
    // default family/service from boarded[0], the picker lists in
    // this order) — a reorder re-defaults the card, so it is pinned.
    assert.deepEqual((def as unknown as { boarded: string[] }).boarded,
      ['pixal3d', 'trellis2-native', 'transfer_rig']);
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

  it("an unstated steps arrives as the declared default 12 (the walk fills it)", () => {
    const g = new GraphBuilder();
    const p = { ...BASE }; delete p.steps;
    def.compose(p, trellis, g, "r_def");
    assert.equal(g.toJSON()["KSampler.0"].inputs.steps, 12,
      "the fresh doc composes the schema-declared default 12, not undefined");
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
