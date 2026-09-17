// @melite/3d-anny — the card's compose gate (TEST-2 breadth,
// 2026-09-12; REWRITTEN stroke 89 — the truth pass; EXTENDED stroke
// 90 — keep-all-features): a GLB is NEVER required (the parametric
// bake owns the default body); photo→body is the hmr-estimate
// VERB, so no SAM ingest arm exists; the 11 identity dims bake
// through AnnyParamsToGlb when no GLB rides; the 254-morph sculpt
// panel rides the pin vocabulary as SPARSE local_changes; the
// native figure rides the served preview.figure claim.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { ANNY_MORPH_LABELS } from "@melite/comfyui-card-kit/morphs";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

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
    assert.equal(doc.local_changes, undefined);
  });

  it("the served preview claim names the native figure door (never the GLB export)", () => {
    assert.deepEqual(def.preview, { figure: { door: "/v1/poser/mesh", identityModel: "anny" } });
  });
});
