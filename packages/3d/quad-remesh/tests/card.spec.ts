// @melite/3d-quad-remesh — the card's compose gate (TEST-2 breadth,
// 2026-09-12). The one-implementation rule's own refusals live HERE
// on the card: the dense input must be named, and smooth_normal
// must be 0.0 (the node hardcodes --smooth-normal 0.0 — a non-zero
// knob could never take effect, so it refuses by name, never
// silently). Everything else rides to the node's own loud laws.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { resolveCardFlowOutputs } from "@melite/comfyui-cordis/service";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("quad-remesh")!;
  assert.ok(def, "the composition root serves the quad-remesh card");
});

describe("the quad-remesh compose gate", () => {
  it("the input is the shared mesh atom and the node ranges are served", () => {
    const env = theService().formSchemas("quad-remesh", "autoremesher")!.schema as {
      uid: number;
      refs: Record<string, { dict?: Record<string, number>; meta?: { min?: number; max?: number; extra?: Record<string, unknown> } }>;
    };
    const root = env.refs[env.uid]!;
    const input = env.refs[root.dict?.input ?? ""]!;
    const target = env.refs[root.dict?.target_quads ?? ""]!;
    assert.equal(input.meta?.extra?.wtype, "mesh");
    assert.equal(target.meta?.min, 0);
    assert.equal(target.meta?.max, 200000);
  });

  it("a missing input refuses loud (the remesh needs its mesh)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'input' missing on the quad-remesh lane/,
    );
  });

  it("a non-zero smooth_normal refuses BY NAME (the node hardcodes it)", () => {
    assert.throws(
      () => def.compose(def.schema({ input: "/m/scan.glb", smooth_normal: 0.5 }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /smooth_normal = 0.5 refuses: the AutoRemesher node hardcodes --smooth-normal 0.0/,
    );
  });

  it("THE SCHEMA GATE: values outside the node budget refuse loud (0–200000)", () => {
    for (const target_quads of [-1, 200001]) {
      assert.throws(
        () => def.compose({ input: "/m/scan.glb", target_quads }, DUMMY_MODEL, new GraphBuilder(), "r_oob"),
        /target_quads|between|range/i,
      );
    }
  });

  it("THE SCHEMA GATE: a wrong-typed target_quads refuses loud", () => {
    assert.throws(
      () => def.compose({ input: "/m/scan.glb", target_quads: "many" }, DUMMY_MODEL, new GraphBuilder(), "r_type"),
      /target_quads|many/i,
    );
  });

  it("THE SCHEMA GATE: an unstated target_quads arrives as the declared default 50000 (the walk fills it)", () => {
    const g = new GraphBuilder();
    def.compose({ input: "/m/scan.glb" }, DUMMY_MODEL, g, "r_def");
    assert.equal(g.toJSON()["AutoRemesher.0"].inputs.target_quads, 50000,
      "the fresh doc composes the schema-declared default 50000, not undefined");
  });

  it("the package root is a node-side host marker", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const marker = await import("../src/index.ts");
    const ctx = new Context();
    marker.apply(ctx);
    assert.equal(marker.name, "@melite/3d-quad-remesh");
    assert.deepEqual(marker.inject, []);
  });

  it("the happy lane is the single-node graph (GLB in, GLB out)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ input: "/m/scan.glb", target_quads: 80000, edge_scaling: 1.5, sharp_edge: 45, adaptivity: 1.4, anisotropy: 1.2 }),
      DUMMY_MODEL, g, "run_5",
    );
    const graph = g.toJSON();
    const remesh = graph["AutoRemesher.0"];
    assert.ok(remesh, "the single node IS the render");
    assert.equal(remesh.inputs.glb_path, "/m/scan.glb");
    assert.equal(remesh.inputs.target_quads, 80000);
    assert.equal(remesh.inputs.filename_prefix, "run_5/remeshed", "compose stamps the prefix, never a knob");
    assert.deepEqual(resolveCardFlowOutputs(def, { input: "/m/scan.glb" }, graph), {
      outputs: { default: "mesh" },
      outputNodes: { default: "AutoRemesher.0" },
    });
  });
});
