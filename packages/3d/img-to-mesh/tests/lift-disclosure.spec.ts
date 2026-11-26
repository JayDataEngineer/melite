// @contract cards-mesh-lift-disclosure — THE MESH LANE'S HONEST FACE
// (the Vostok defect board's img-to-mesh findings: marbling, gloss,
// no metric scale, torn lift, and "TRELLIS disclosed for faces it
// cannot do").
//
// The board's finding is not that the artifact is malformed — it is
// that the lane's limits were INVISIBLE until a run paid for them: a
// portrait came back generic, a matte source came back glossy, a mesh
// with no size took a price (a print that would not fit a plate), and
// thin geometry tore off the bed. The cure is disclosure that is TRUE
// at the live doors, so every arm here derives its expectation:
//
//   ARM 1 — the served card face states the limits (the one surface
//           every door reads before a press).
//   ARM 2 — the Recipe dial is disclosed at the knob it overrides,
//           naming the LIVE row labels + default + floor numbers
//           (a retuned dial reds the sentence that describes it).
//   ARM 3 — the disclosure is TRUE: the real action wires metallic +
//           roughness off the bake and the card declares no such knob,
//           and no node in the composed graph carries a physical-size
//           input (the "no metric scale" claim, judged against the
//           graph the run actually submits).
//   ARM 4 — the served agent doc and README carry the same four
//           facts (the doc plane is a door too).
//   ARM 5 — THE DOOR-PARITY EDGE: the flow registry's lift stage
//           stamps exactly the LIVE high recipe's wire_defaults (a
//           retune on either side reds; the hand-copied literal is
//           no longer a second home without a judge).
//   ARM 6 — no model row claims a quality tier: a Variant-group hint
//           never names a Recipe label (the "Standard resolution — the
//           fast tier" row was the burn).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "../../../engines/comfyui-card-kit/src/action.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL as PIXAL_DECL } from "../../../models/pixal3d/src/index.ts";
import { mesh as pixalMesh } from "../../../models/pixal3d/src/actions.ts";
import { DECL as TRELLIS_DECL } from "../../../models/trellis2-native/src/index.ts";
import { mesh as trellisMesh } from "../../../models/trellis2-native/src/actions.ts";
import { seedFlowsSeat } from "../../../harness/estate-queue/src/flowsData.ts";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type ServedDecl = {
  id: string;
  defaults?: Record<string, unknown>;
  description?: string;
  variants?: Array<{ id: string; group?: string; label?: string; hint?: string; wire_defaults?: Record<string, unknown> | null }>;
  variant_groups?: Array<{ id: string; label?: string; default?: string }>;
};

const FAMILIES: ReadonlyArray<{ id: string; DECL: ServedDecl; action: unknown }> = [
  { id: "pixal3d", DECL: PIXAL_DECL as unknown as ServedDecl, action: pixalMesh },
  { id: "trellis2-native", DECL: TRELLIS_DECL as unknown as ServedDecl, action: trellisMesh },
];

/** The card's declared knob (`undefined`-safe: the walk is the def's own schemastery). */
function knobTip(def: CardDefinition, key: string): string {
  const dict = (def.schema as unknown as {
    dict?: Record<string, { meta?: { extra?: { tooltip?: unknown } } }>;
  }).dict;
  const field = dict?.[key];
  assert.ok(field, `the card still declares the '${key}' knob`);
  const tip = field!.meta?.extra?.tooltip;
  assert.equal(typeof tip, "string", `'${key}' carries a served tooltip`);
  return tip as string;
}

function recipeRows(decl: ServedDecl): NonNullable<ServedDecl["variants"]> {
  return (decl.variants ?? []).filter((v) => v.group === "Recipe");
}

/** Compose the action on a doc (the same real build the run submits). */
function compose(decl: ServedDecl, action: unknown, params: Record<string, unknown>): Record<string, {
  class_type: string;
  inputs: Record<string, unknown>;
}> {
  const g = new GraphBuilder({});
  const facts: ModelFacts = {
    id: decl.id,
    card: "img-to-mesh",
    defaults: {},
    lane_inputs: (decl as unknown as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
    variants: [],
    variant_groups: [],
    outputs: [],
  };
  instantiateAction(
    action as never,
    { ...(decl.defaults ?? {}), input_image: "/in/probe.png", ...params },
    facts,
    g,
    "wall",
  );
  return g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
}

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("img-to-mesh")!;
  assert.ok(def, "the composition root serves the img-to-mesh card");
});

describe("ARM 1 — the served card face states the lane's limits", () => {
  it("the source-image tooltip names faces, printability, and the missing metric scale", () => {
    const tip = knobTip(def, "input_image");
    assert.match(tip, /faces/i, "the face limit is named on the surface a press reads first");
    assert.match(tip, /generic/i, "…and says what a face returns instead: generic form, not a likeness");
    assert.match(tip, /metric scale/i, "the missing metric scale is named (no size knob states one)");
    assert.match(tip, /print/i, "the print caveat is named");
    assert.match(tip, /slicer|watertight/i, "…with the check the operator must run (slicer/watertight)");
  });

  it("the atlas knob names the inferred material — metallic + roughness come from the bake, with no knob", () => {
    const tip = knobTip(def, "atlas_size");
    assert.match(tip, /metallic/i, "the metallic map is named as a bake output");
    assert.match(tip, /roughness/i, "the roughness map is named as a bake output");
    assert.match(tip, /no knob|not a knob/i, "…and the absence of a control is stated, never implied");
  });
});

describe("ARM 2 — the Recipe dial is disclosed at the knob it overrides", () => {
  // A tier's number word ("1M", "700k", "10k") — the tooltip speaks
  // in the operator's units, so the arm derives the word from the
  // declared count instead of pinning a literal.
  const facesWord = (n: unknown): string => {
    const v = Number(n);
    if (v >= 1_000_000 && v % 1_000_000 === 0) return `${v / 1_000_000}M`;
    return `${v / 1000}k`;
  };
  /** The 100 chars either side of every mention of `label`. */
  const neighbourhoods = (tip: string, label: string): string[] => {
    const out: string[] = [];
    const lower = tip.toLowerCase();
    const needle = label.toLowerCase();
    for (let i = lower.indexOf(needle); i >= 0; i = lower.indexOf(needle, i + 1)) {
      out.push(tip.slice(Math.max(0, i - 100), i + needle.length + 100));
    }
    return out;
  };

  it("every Recipe row is named WITH its own numbers — a renamed or retuned row leaves the sentence describing a dial nobody serves", () => {
    const tip = knobTip(def, "resolution");
    for (const fam of FAMILIES) {
      const rows = recipeRows(fam.DECL);
      assert.ok(rows.length >= 4, `${fam.id}: the Recipe group still carries its rows`);
      const floor = fam.DECL.defaults ?? {};
      const group = fam.DECL.variant_groups?.find((g) => g.id === "Recipe");
      assert.ok(rows.some((r) => r.id === group?.default), `${fam.id}: the Recipe group names a live default row`);
      for (const row of rows) {
        // The row's OWN tier numbers: its stamps, else the family's
        // floor it leaves alone (the stamp-less row IS the floor).
        const wires = row.wire_defaults ?? {};
        const remesh = String(wires["remesh_resolution"] ?? floor["remesh_resolution"]);
        const faces = facesWord(wires["decimate_faces"] ?? floor["decimate_faces"]);
        const near = neighbourhoods(tip, String(row.label));
        assert.ok(
          near.some((text) => text.includes(remesh) && text.includes(faces)),
          `${fam.id}: the served dial sentence must name '${row.label}' beside ITS numbers (remesh ${remesh} + ${faces}) — ` +
            `a renamed or retuned row leaves the tooltip describing a dial nobody serves. Tooltip: ${JSON.stringify(tip)}`,
        );
      }
      // The default is named as the default (the birth stamp).
      const defaultRow = rows.find((r) => r.id === group?.default)!;
      assert.match(
        tip, new RegExp(`${String(defaultRow.label)}[^.]{0,40}default`, "i"),
        `${fam.id}: the disclosure says which row a fresh birth lands on ('${defaultRow.label}' is the default)`,
      );
    }
  });
});

describe("ARM 3 — the disclosure is TRUE at the graph the run submits", () => {
  for (const fam of FAMILIES) {
    it(`${fam.id}: the bake's metallic + roughness outputs reach ApplyTextureToMesh, and no knob or node carries a physical size`, () => {
      const graph = compose(fam.DECL, fam.action, {});
      const bake = Object.entries(graph).find(([, n]) => n.class_type === "BakeTextureFromVoxel");
      assert.ok(bake, `${fam.id}: the chain bakes the material beside the color`);
      const apply = Object.entries(graph).find(([, n]) => n.class_type === "ApplyTextureToMesh");
      assert.ok(apply, `${fam.id}: the chain applies the bake`);
      const [bakeId] = bake!;
      const metallic = apply![1].inputs["metallic"];
      const roughness = apply![1].inputs["roughness"];
      assert.deepEqual(metallic, [bakeId, 1], `${fam.id}: metallic IS the bake's own output 1 — the material is inferred, as the tooltip says`);
      assert.deepEqual(roughness, [bakeId, 2], `${fam.id}: roughness IS the bake's own output 2`);
      // The absence claim: no knob names a material control…
      const dict = (def.schema as unknown as { dict?: Record<string, unknown> }).dict ?? {};
      for (const key of Object.keys(dict)) {
        assert.doesNotMatch(
          key,
          /^(metallic|metalness|roughness|gloss)$/i,
          `the disclosure promises no material knob; the schema declares '${key}' — cure the sentence or trade the knob`,
        );
      }
      // …and no node in the submitted graph states a physical size or
      // a length unit. ('unit: degrees' on MoGe's FOV node is an
      // ANGULAR unit — the arm judges the unit's value, never its key,
      // so an angular unit stays lawful and a metre-scale one reds.)
      const LENGTH_UNIT = /^(mm|cm|m|meter|metre|meters|metres|inch|inches|ft|feet|microns?)$/i;
      for (const [id, node] of Object.entries(graph)) {
        for (const [key, value] of Object.entries(node.inputs)) {
          assert.doesNotMatch(
            key,
            /^(mesh_scale|model_scale|scale_factor|physical_size|size_mm|unit_scale|bake_scale)$/i,
            `${fam.id}: '${id}' (${node.class_type}) carries a physical-size input '${key}' — the "no metric scale" disclosure would be false`,
          );
          if (/^units?$/i.test(key) && typeof value === "string") {
            assert.doesNotMatch(
              value, LENGTH_UNIT,
              `${fam.id}: '${id}' states a LENGTH unit ('${value}') — the mesh would carry a metric scale the card discloses it has not`,
            );
          }
        }
      }
    });
  }
});

describe("ARM 4 — the doc plane carries the same four facts", () => {
  it("AGENT.md names the dial, faces, the inferred material, the missing scale, and printability", () => {
    const md = readFileSync(join(REPO, "packages/3d/img-to-mesh/src/agents/AGENT.md"), "utf8");
    assert.match(md, /Recipe dial/, "the dial is named in the served doc");
    assert.match(md, /faces[\s\S]{0,120}?generic|generic[\s\S]{0,120}?faces/i, "the face limit is mirrored");
    assert.match(md, /metallic[\s\S]{0,160}?roughness|roughness[\s\S]{0,160}?metallic/i, "the inferred material is mirrored");
    assert.match(md, /no metric scale/i, "the scale limit is mirrored");
    assert.match(md, /print[- ]ready/i, "the print caveat is mirrored");
  });

  it("README's limitations list carries the dial and the deliverable's limits", () => {
    const md = readFileSync(join(REPO, "packages/3d/img-to-mesh/README.md"), "utf8");
    const limits = md.slice(md.indexOf("## Known Limitations"));
    assert.notEqual(limits.length, 0, "the README keeps its limitations section");
    assert.match(limits, /Recipe dial/i, "the dial lands in the limitations list");
    assert.match(limits, /faces arrive generic|faces/i, "the face limit lands in the limitations list");
    assert.match(limits, /metric scale/i, "the scale limit lands in the limitations list");
  });
});

describe("ARM 5 — the door-parity edge: the flow's lift stage stamps the LIVE high tier", () => {
  it("the object_forge lift stage's tier stamps are the trellis2-native high recipe's wire_defaults", () => {
    const seat = seedFlowsSeat();
    const rows = seat.names().map((n) => seat.get(n)).filter((r): r is NonNullable<typeof r> => r !== undefined);
    const lift = rows.flatMap((r) => r.stages).find((s) => s.card === "img-to-mesh");
    assert.ok(lift, "a flow stage still lifts through the img-to-mesh card");
    const group = TRELLIS_DECL.variant_groups?.find((g) => g.id === "Recipe");
    const high = recipeRows(TRELLIS_DECL as unknown as ServedDecl).find((v) => v.id === group?.default);
    assert.ok(high, "the live high recipe row exists");
    for (const [key, value] of Object.entries(high!.wire_defaults ?? {})) {
      assert.deepEqual(
        (lift!.params as Record<string, unknown>)[key], value,
        `the flow's lift stage must stamp the dial's live ${key} (${JSON.stringify(value)}) — a hand-copied literal that drifts is the door-divergence burn: a UI birth composes one tier, the flow another`,
      );
    }
  });
});

describe("ARM 6 — no model row claims a quality tier", () => {
  it("a Variant-group hint never names a Recipe label (the 'fast tier' row is dead)", () => {
    for (const fam of FAMILIES) {
      const labels = recipeRows(fam.DECL).map((r) => String(r.label).toLowerCase());
      for (const row of (fam.DECL.variants ?? []).filter((v) => v.group === "Variant")) {
        const hint = String(row.hint ?? "").toLowerCase();
        for (const label of labels) {
          assert.ok(
            !new RegExp(`\\b${label}\\b`).test(hint.split(".")[0] ?? ""),
            `${fam.id}: the model row '${row.id}' calls itself ${JSON.stringify(label)} in '${row.hint}' — the quality tiers are the Recipe group; a second row that claims one is the dialect the operator read as a dial`,
          );
        }
      }
    }
  });
});
