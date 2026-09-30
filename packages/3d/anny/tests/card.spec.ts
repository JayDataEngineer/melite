// @melite/3d-anny — the card's compose gate (TEST-2 breadth,
// 2026-09-12; REWRITTEN stroke 89 — the truth pass; EXTENDED stroke
// 90 — keep-all-features): a GLB is NEVER required (the parametric
// bake owns the default body); photo→body is the hmr-estimate
// VERB, so no SAM ingest arm exists; the 11 identity dims bake
// through AnnyParamsToGlb when no GLB rides; the 254-morph sculpt
// panel rides the pin vocabulary as SPARSE local_changes; the
// native figure rides the served preview.figure claim.
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
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { ANNY_MORPH_LABELS } from "@melite/comfyui-card-kit/morphs";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import { resolveCardFlowOutputs } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", family: "anny", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("anny")!;
  assert.ok(def, "the composition root serves the anny card");
});

describe("the anny compose gate", () => {
  it("NO body_glb bakes the neutral body (a GLB is never required)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({}), DUMMY_MODEL, g, "r1");
    const graph = g.toJSON();
    const bake = graph["AnnyParamsToGlb.0"];
    assert.ok(bake, "the bake node rides when no GLB is attached");
    const doc = JSON.parse(bake.inputs.params_json as string) as { dialect: string; phenotype: number[] };
    assert.equal(doc.dialect, "authored");
    assert.equal(doc.phenotype.length, 11, "the 11 authored dims");
    assert.ok(doc.phenotype.every((v) => v === 0.5), "untouched sliders = the neutral bake");
    assert.ok(graph["CompositeCharacter.0"], "the composite rides the baked glb_path");
  });

  it("THE FLOOR IS ON THE SCHEMA MASTER (the 'scaled wrong, some go to 10' bug): out-of-range values refuse", () => {
    assert.throws(() => def.schema({ gender: 2 }), /gender/i, "identity dims cap at 1");
    assert.throws(() => def.schema({ gender: -0.1 }), /gender/i, "identity dims floor at 0");
    const aMorph = ANNY_MORPH_LABELS[0];
    assert.throws(() => def.schema({ [aMorph]: 3 }), new RegExp(aMorph, "i"), "morphs cap at 2");
    assert.throws(() => def.schema({ [aMorph]: -1.5 }), new RegExp(aMorph, "i"), "morphs floor at -1");
    // the lawful ranges pass
    const ok = def.schema({ gender: 1, [aMorph]: 2, [ANNY_MORPH_LABELS[1]]: -1 });
    assert.equal(ok.gender, 1);
  });

  it("THE SCHEMA GATE: an out-of-envelope resolution refuses loud at compose (declared 256–2048), never composes", () => {
    assert.throws(
      () => def.compose({ resolution: 5000 }, DUMMY_MODEL, new GraphBuilder(), "r_oob"),
      /resolution|5000|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed resolution refuses loud at compose", () => {
    assert.throws(
      () => def.compose({ resolution: "huge" }, DUMMY_MODEL, new GraphBuilder(), "r_type"),
      /resolution|huge/i,
    );
  });

  it("THE SCHEMA GATE: an unstated resolution arrives as the declared default 768 (the walk fills it)", () => {
    const g = new GraphBuilder();
    def.compose({}, DUMMY_MODEL, g, "r_def");
    assert.equal(g.toJSON()["RayRenderGLBViews.0"].inputs.resolution, 768,
      "the fresh doc composes the schema-declared default 768, not undefined");
  });

  it("authored sliders carry into the bake vector (dim order = the served labels)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ muscle: 0.9, height: 0.2 }), DUMMY_MODEL, g, "r1");
    const doc = JSON.parse(g.toJSON()["AnnyParamsToGlb.0"].inputs.params_json as string) as { phenotype: number[] };
    // gender/age/muscle/weight/height/... → muscle idx 2, height idx 4
    assert.equal(doc.phenotype[2], 0.9);
    assert.equal(doc.phenotype[4], 0.2);
    assert.equal(doc.phenotype[0], 0.5);
  });

  it("an attached GLB renders as-is (no bake node)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "/m/anny-base-body.glb", resolution: 512 }), DUMMY_MODEL, g, "r1");
    const graph = g.toJSON();
    assert.equal(graph["PrimitiveString.0"].inputs.value, "/m/anny-base-body.glb");
    assert.ok(graph["CompositeCharacter.0"], "the composite node rides the body path");
    assert.equal(graph["AnnyParamsToGlb.0"], undefined, "no bake when a GLB rides");
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("RayRenderGLBViews")),
      "the turnaround views node is emitted",
    );
  });

  it("an all-whitespace body_glb still bakes (whitespace is emptiness, never a refusal)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "   " }), DUMMY_MODEL, g, "r1");
    assert.ok(g.toJSON()["AnnyParamsToGlb.0"], "whitespace falls to the bake arm");
  });

  it("NO SAM arm exists anywhere (photo→body is the hmr-estimate verb)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ body_glb: "/m/body.glb", transparent: "false" } as Record<string, unknown>),
      DUMMY_MODEL, g, "r1",
    );
    const graph = g.toJSON();
    assert.equal(Object.keys(graph).find((k) => k.startsWith("LoadImage")), undefined, "no image ingest on this card");
    assert.equal(Object.keys(graph).find((k) => k.startsWith("RaySAMSegmentHairClothing")), undefined, "the SAM sprite node is gone");
  });

  it("finalize is the anny strip (identity on the empty strip table)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "/m/body.glb" }), DUMMY_MODEL, g, "r1");
    assert.deepEqual(def.finalize?.(g.toJSON()), g.toJSON(), "nothing strips");
  });

  // ── stroke 90: the sculpt panel converts, it does not die ──────

  it("the schema carries ALL 254 morph sliders in the morph group (the [REDACTED 2026-11-05]-ton law)", async () => {
    const { theService } = await import("@melite/comfyui-cordis");
    await loadCardDefs();
    const live = theService().formSchemas("anny", "anny")!;
    const env = live.schema as { refs: Record<string | number, { type?: string; dict?: Record<string, unknown> }>; uid: number };
    const root = env.refs[env.uid];
    const dict = root?.dict ?? {};
    for (const label of ANNY_MORPH_LABELS) {
      assert.ok(label in dict, `morph ${label} rides the card envelope`);
    }
    assert.equal(ANNY_MORPH_LABELS.length, 254);
  });

  it("changed morphs ride the bake as SPARSE local_changes; untouched ones never ship", () => {
    const g = new GraphBuilder();
    const label = ANNY_MORPH_LABELS[0];
    def.compose(def.schema({ [label]: 1.5 } as Record<string, unknown>), DUMMY_MODEL, g, "r1");
    const doc = JSON.parse(g.toJSON()["AnnyParamsToGlb.0"].inputs.params_json as string) as {
      phenotype: number[]; local_changes?: Record<string, number>;
    };
    assert.deepEqual(doc.local_changes, { [label]: 1.5 }, "only the touched morph ships");
  });

  it("the neutral bake carries NO local_changes key (absent = the engine's own 0)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({}), DUMMY_MODEL, g, "r1");
    const doc = JSON.parse(g.toJSON()["AnnyParamsToGlb.0"].inputs.params_json as string) as { local_changes?: unknown };
    assert.deepEqual(doc.local_changes, {}, "the authored dialect always carries the required object");
  });

  it("declares the mesh input and a representative turnaround image output", () => {
    assert.deepEqual(def.flowKinds.inputs, { body_glb: "mesh" });
    assert.deepEqual(def.flowKinds.outputs, { default: "image" });
    const g = new GraphBuilder();
    def.compose(def.schema({}), DUMMY_MODEL, g, "flow");
    assert.deepEqual(resolveCardFlowOutputs(def, {}, g.toJSON()), {
      outputs: { default: "image" },
      outputNodes: { default: "SaveImage.0" },
    });
  });

  it("the served preview claim names the identity model (the live arms derive client-side)", () => {
    assert.deepEqual(def.preview, { figure: { identityModel: "anny" } });
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row this card serves: (1) the row's OWNING FAMILY
// holds an ACTION_BINDINGS row — no address silently rides the
// legacy lane while its siblings compose the declared segment; (2)
// the row composes ITS OWN declared segment — the turnaround
// renders the 8 views. The declared fallback (a family-less row)
// rides the legacy lane in the open, never a silent second copy.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "anny");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 1, `expected the served anny addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      const g = new GraphBuilder();
      def.compose(def.schema({}), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string }>;
      const views = Object.values(graph).filter((n) => n.class_type === "SaveImage");
      assert.equal(views.length, 8, "the declared segment renders the 8-view turnaround sheet");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    const row = { ...rows[0]!, id: "synthetic-anny", family: undefined };
    assert.throws(
      () => def.compose(def.schema({}), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-anny' on the anny card — every boarded family \(anny\)/,
    );
  });
});
