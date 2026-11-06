// THE EDIT BAG'S PRESET CHIPS (the timeline rework's stage 3,
// 2026-11-15). The retired bag NAMES live on as starting cells over
// the ONE edit schema: each chip is a named matrix cell (mask source
// × identity anchors × denoise pole) the REGISTRATION door judges
// against the kind's own fields — a preset may not patch an
// undeclared seat, invent select vocabulary, mistype a value, or
// repeat an id. This spec fires on three doors: the served row (the
// boot itself is the judge — validateDeclaredMods refuses drift at
// registration), the compose door (every preset cell composes the
// matrix emission with its required seats staged), and the
// registration law's own arms (a forged kind reds each refusal
// class). The bag door's laws live in edit-mod.spec.ts; the matrix
// seat's in models/h3 edit-matrix.spec.ts. No @contract marker:
// package-local law, prose header (the registry row owns it).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { validateDeclaredMods } from "../../../engines/comfyui-cordis/src/mods-schema.ts";
import { specBody } from "../../../harness/melite-tools/src/discovery.ts";
import { theService } from "@melite/comfyui-cordis";
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
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

type Preset = { id: string; label: string; tooltip?: string; patch: Record<string, unknown> };

/** The served edit kind (the registration door already judged it). */
const editKind = (): { fields: Array<Record<string, unknown>>; presets: Preset[] } => {
  const kind = (def.mods ?? []).find((k) => k.kind === "edit");
  assert.ok(kind, "the card declares the edit kind");
  const presets = (kind as unknown as { presets?: Preset[] }).presets;
  assert.ok(Array.isArray(presets) && presets.length > 0, "the edit kind carries preset chips");
  return { fields: (kind.fields ?? []) as Array<Record<string, unknown>>, presets: presets! };
};

/** The seats a CELL needs staged beside its patch (the preset starts
 *  the cell; the operator still stages the files it names). */
const STAGED: Record<string, Record<string, unknown>> = {
  "identity-swap": { still: "stills/girl.png", mannequin: "clips/mannequin.mp4", region_prompt: "the person" },
  "outfit-change": { still: "stills/girl.png", mannequin: "clips/mannequin.mp4", region_prompt: "the outfit" },
  "static-mask-pass": { mask: "masks/union.png" },
  "repair-region": { region_prompt: "hands" },
  "whole-frame-restyle": {},
};

describe("the edit bag's preset chips (stage 3: named cells over the ONE schema)", () => {
  it("THE SERVED CELLS: seven named cells, every patch key a declared field, every value the field's own type and vocabulary", () => {
    const { fields, presets } = editKind();
    assert.deepEqual(presets.map((p) => p.id), [
      "repair-region", "identity-swap", "outfit-change", "whole-frame-restyle", "refine-2x", "extend-continuation", "upscale-2x", "static-mask-pass",
    ], "the retired names live on as the cells — the refine posture sixth (the fourth dial), the continuation seventh (slice 2's dial), the deferred upscale eighth (slice 3's posture)");
    const byName = new Map(fields.map((f) => [String(f["name"]), f]));
    for (const p of presets) {
      assert.ok(typeof p.label === "string" && p.label !== "", `preset ${p.id} carries a label`);
      assert.ok(Object.keys(p.patch).length > 0, `preset ${p.id} patches at least one dial`);
      for (const key of Object.keys(p.patch)) {
        const field = byName.get(key);
        assert.ok(field !== undefined, `preset ${p.id} patches '${key}' — a declared field of the edit kind`);
        if (field!["type"] === "select") {
          const values = ((field!["options"] as Array<Record<string, unknown>>) ?? []).map((o) => String(o["value"]));
          assert.ok(values.includes(String(p.patch[key])), `preset ${p.id}'s '${key}' rides a served option`);
        }
        if (field!["type"] === "number") {
          assert.equal(typeof p.patch[key], "number", `preset ${p.id}'s '${key}' is a number (the field's wire type)`);
        }
        if (field!["type"] === "boolean") {
          assert.equal(typeof p.patch[key], "boolean", `preset ${p.id}'s '${key}' is a boolean (the field's wire type)`);
        }
      }
    }
  });

  it("EVERY CELL COMPOSES: each preset patch rides the card's own compose door to the matrix emission", () => {
    const { presets } = editKind();
    for (const p of presets) {
      const entry = {
        source_clip: "clips/take.mp4",
        edit_prompt: "the edit the cell names",
        ...(STAGED[p.id] ?? {}),
        ...p.patch,
      };
      const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, "run_preset_" + p.id);
      const out = graphOf(g);
      if (p.patch["continuation"] === true) {
        // the continuation posture's single window joins BY FILE
        // (the raw boundary the latent carry cannot cross) — the
        // one-film join grammar serves instead of ChainAssemble.
        assert.ok(JSON.stringify(out).includes("extend_film"), `preset ${p.id} composes the joined-film grammar`);
        assert.ok(ofClass(out, "MiniMaxH3AddGuide").length > 0, `preset ${p.id} composes the forced seam`);
      } else if (typeof p.patch["chain_run"] === "string" && p.patch["chain_run"] !== "") {
        // the upscale posture's cell composes the REQUEUE LOOP
        // family (slice 3): the checkpoint head + the assemble
        // tail, no masked-edit latent — the loop is the other
        // mechanism the one door serves.
        assert.ok(ofClass(out, "MiniMaxH3ChainCheckpointManager").length > 0, `preset ${p.id} composes the checkpoint head`);
        assert.ok(ofClass(out, "MiniMaxH3ChainAssemble").length > 0, `preset ${p.id} composes the assemble tail`);
        assert.equal(ofClass(out, "MiniMaxH3FantasticVideoEditLatent").length, 0, `preset ${p.id} composes no matrix latent — the loop family serves`);
      } else {
        assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1, `preset ${p.id} composes one assemble terminal`);
        assert.ok(ofClass(out, "MiniMaxH3FantasticVideoEditLatent").length > 0, `preset ${p.id} composes the edit latent`);
      }
    }
  });

  it("NO CELL IS A REFUSAL CELL: no preset lands on the matrix seat's refused cells (the boil, the off-grid window)", () => {
    const { presets } = editKind();
    for (const p of presets) {
      const boil = p.patch["mask_source"] === "whole-frame"
        && p.patch["reference"] === "self"
        && typeof p.patch["denoise"] === "number" && (p.patch["denoise"] as number) >= 0.8
        // THE CONTINUATION CARVE-OUT (slice 2): the boil law's premise
        // is a RE-RENDER of existing frames with no anchor; a
        // continuation never re-renders the prior — fresh seconds
        // are seam-anchored and joined after. The cell is lawful
        // only as the continuation posture it patches itself to be.
        && p.patch["continuation"] !== true;
      assert.equal(boil, false, `preset ${p.id} is not the identity-boil cell (F3-17)`);
    }
  });

  it("THE REGISTRATION LAW FIRES — a patch key outside the kind's own fields refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, presets: [{ id: "drift", label: "Drift", patch: { not_a_field: "x" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /patches 'not_a_field' — not a declared field/);
  });

  it("THE REGISTRATION LAW FIRES — invented select vocabulary refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, presets: [{ id: "drift", label: "Drift", patch: { mask_source: "quantum" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /not a served option/);
  });

  it("THE REGISTRATION LAW FIRES — a mistyped value refuses (the type-truth law)", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, presets: [{ id: "drift", label: "Drift", patch: { denoise: "loud" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /with string — the field declares number/);
  });

  it("THE REGISTRATION LAW FIRES — a preset-carrying kind resolves clean (the door admits the carrying face itself)", () => {
    const { fields, presets } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, presets,
    };
    // the true face — the door's carrying path, never a refusal
    assert.doesNotThrow(() => validateDeclaredMods("forged-card", [kind as never]));
    // and a presets-free kind never enters the walk (the bare face)
    const bare = { kind: "forged2", label: "Bare", param_key: "forged2", cardinality: "list", fields };
    assert.doesNotThrow(() => validateDeclaredMods("forged-card", [bare as never]));
  });

  it("THE REGISTRATION LAW FIRES — a repeated id refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, presets: [
        { id: "same", label: "One", patch: { denoise: 0.3 } },
        { id: "same", label: "Two", patch: { denoise: 0.4 } },
      ],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /preset 'same' is declared twice/);
  });

  it("THE WIRE: the form-spec body serves the edit presets verbatim (the chips the GUI renders ride the same cells)", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const served = (body.features?.modifiers ?? []).find((k) => k.param_key === "edit");
    assert.ok(served, "the form-spec serves the edit kind");
    const presets = (served as unknown as { presets?: Preset[] }).presets;
    assert.ok(Array.isArray(presets), "the wire carries the preset cells");
    assert.deepEqual(presets!.map((p) => p.id), editKind().presets.map((p) => p.id),
      "the served cells are the declared cells, verbatim");
  });
});
