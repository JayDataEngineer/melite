// @melite/3d-quad-remesh — the card's compose gate (TEST-2 breadth,
// 2026-09-12). The one-implementation rule's own refusals live HERE
// on the card: the dense input must be named, and smooth_normal
// must be 0.0 (the node hardcodes --smooth-normal 0.0 — a non-zero
// knob could never take effect, so it refuses by name, never
// silently). Everything else rides to the node's own loud laws.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { ACTION_BINDINGS } from "../src/card.ts";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { resolveCardFlowOutputs } from "@melite/comfyui-cordis/service";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

/** The autoremesher family row the card boards — the only lane the
 *  interlock leaves: every compose rides a declared action. */
const familyRow = () => Object.values(facts.models).find((m) => m.card === "quad-remesh")!;

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

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
    def.compose({ input: "/m/scan.glb" }, familyRow(), g, "r_def");
    assert.equal(g.toJSON()["AutoRemesher.0"].inputs.target_quads, 50000,
      "the fresh doc composes the schema-declared default 50000, not undefined");
  });

  it("THE BUDGET CLASS: an unstated preset arrives as the declared default 'hero' (the node's combo takes no '')", () => {
    const g = new GraphBuilder();
    def.compose({ input: "/m/scan.glb" }, familyRow(), g, "r_preset");
    assert.equal(g.toJSON()["AutoRemesher.0"].inputs.preset, "hero",
      "the wiring judge refuses '' against the live combo (the af-move stop, 2026-10-09) — the walk fills the declared class");
  });

  it("THE BUDGET CLASS: a preset outside the closed classes refuses loud", () => {
    assert.throws(
      () => def.compose(def.schema({ input: "/m/scan.glb", preset: "spaceship" }), DUMMY_MODEL, new GraphBuilder(), "r_cls"),
      /preset|spaceship/i,
    );
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
      familyRow(), g, "run_5",
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

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the quad-remesh card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row; (2) the row composes ITS OWN
// declared segment — the remesher saves under the run-scoped
// prefix. An unbound family refuses loud (the interlock).
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "quad-remesh");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 1, `expected the served quad-remesh addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      const g = new GraphBuilder();
      def.compose(def.schema({ input: "/m/scan.glb" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const remesh = Object.values(graph).find((n) => n.class_type === "AutoRemesher")!;
      assert.ok(remesh, "the declared segment remeshes");
      assert.equal(remesh.inputs.filename_prefix, `wall_${row.id}/remeshed`, "compose stamps the run prefix");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    const row = { ...rows[0]!, id: "synthetic-remesh", family: undefined };
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema({ input: "/m/scan.glb" }), row as never, g, "wall_fallback"),
      /no declared action for family 'synthetic-remesh' on the quad-remesh card — every boarded family \(autoremesher\)/,
    );
  });
});
