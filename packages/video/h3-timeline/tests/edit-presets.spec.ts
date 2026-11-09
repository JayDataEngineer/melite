// THE EDIT BAG'S PRESET CHIPS (the timeline rework's stage 3,
// 2026-11-15). The retired bag NAMES live on as starting cells over
// the ONE edit schema: each chip is a named matrix cell (mask source
// × identity anchors × denoise pole) the REGISTRATION door judges
// against the kind's own fields — a section may not patch an
// undeclared seat, invent select vocabulary, mistype a value, or
// repeat an id. This spec fires on three doors: the served row (the
// boot itself is the judge — validateDeclaredMods refuses drift at
// registration), the compose door (every section cell composes the
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
const editKind = (): { fields: Array<Record<string, unknown>>; sections: Preset[] } => {
  const kind = (def.mods ?? []).find((k) => k.kind === "edit");
  assert.ok(kind, "the card declares the edit kind");
  const sections = (kind as unknown as { sections?: Preset[] }).sections;
  assert.ok(Array.isArray(sections) && sections.length > 0, "the edit kind carries section chips");
  return { fields: (kind.fields ?? []) as Array<Record<string, unknown>>, sections: sections! };
};

/** The seats a CELL needs staged beside its patch (the section starts
 *  the cell; the operator still stages the files it names). */
const STAGED: Record<string, Record<string, unknown>> = {
  "identity-swap": { still: "stills/girl.png", mannequin: "clips/mannequin.mp4", region_prompt: "the person" },
  "repair-region": { mask: "masks/hands_union.png" },
  "whole-frame-restyle": {},
};

describe("the edit bag's section chips (stage 3: named cells over the ONE schema)", () => {
  it("THE SERVED SECTIONS: six checkable stages (§0.7 merged the swaps and the mask variants — one section per modifier, the variant is a dial), every patch key a declared field, every value the field's own type and vocabulary", () => {
    const { fields, sections } = editKind();
    assert.deepEqual(sections.map((p) => p.id), [
      "repair-region", "identity-swap", "whole-frame-restyle", "refine-2x", "extend-continuation", "upscale-2x",
    ], "the flow face's stages — Repair, Swap (one — clothing vs identity is prompt words, §0.7), Restyle, Refine, Extend, Upscale; the static mask is Repair's mask-slot value, not a second section");
    // (F7, the front-end evasion audit 2026-11-07) ids and JS types
    // pin NOTHING of the cell's meaning: which denoise pole, which
    // scale, which keep_audio IS the operator-facing cell. The
    // patches are pinned VALUE-VERBATIM here — a 0.32→0.40 drift
    // on repair-region reds this arm by name (the registration door
    // type-checks; this is the only seat that judges the payload).
    assert.deepEqual(sections.map((p) => p.patch), [
      { mask_source: "static-png", reference: "self", denoise: 0.32, keep_audio: true },
      { mask_source: "region", reference: "still+mannequin", denoise: 1 },
      { mask_source: "whole-frame", reference: "self", denoise: 0.6 },
      { mask_source: "whole-frame", reference: "self", denoise: 0.32, refine: true, scale: 2, clip_seconds: 2.5, keep_audio: true },
      { continuation: true, mask_source: "whole-frame", reference: "self", denoise: 1 },
      { chain_run: "prior-chain-run-name", denoise: 0.24, steps: 20 },
    ], "each section's payload, verbatim — the pole, the scale, the sound seat are the section");
    const byName = new Map(fields.map((f) => [String(f["name"]), f]));
    for (const p of sections) {
      assert.ok(typeof p.label === "string" && p.label !== "", `section ${p.id} carries a label`);
      assert.ok(Object.keys(p.patch).length > 0, `section ${p.id} patches at least one dial`);
      for (const key of Object.keys(p.patch)) {
        const field = byName.get(key);
        assert.ok(field !== undefined, `section ${p.id} patches '${key}' — a declared field of the edit kind`);
        if (field!["type"] === "select") {
          const values = ((field!["options"] as Array<Record<string, unknown>>) ?? []).map((o) => String(o["value"]));
          assert.ok(values.includes(String(p.patch[key])), `section ${p.id}'s '${key}' rides a served option`);
        }
        if (field!["type"] === "number") {
          assert.equal(typeof p.patch[key], "number", `section ${p.id}'s '${key}' is a number (the field's wire type)`);
        }
        if (field!["type"] === "boolean") {
          assert.equal(typeof p.patch[key], "boolean", `section ${p.id}'s '${key}' is a boolean (the field's wire type)`);
        }
      }
    }
  });

  it("EVERY CELL COMPOSES: each section patch rides the card's own compose door to the matrix emission", () => {
    const { sections } = editKind();
    for (const p of sections) {
      const entry = {
        source_clip: "clips/take.mp4",
        edit_prompt: "the edit the cell names",
        ...(STAGED[p.id] ?? {}),
        ...p.patch,
      };
      const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, "run_section_" + p.id);
      const out = graphOf(g);
      if (p.patch["continuation"] === true) {
        // the continuation posture's single window joins BY FILE
        // (the raw boundary the latent carry cannot cross) — the
        // one-film join grammar serves instead of ChainAssemble.
        assert.ok(JSON.stringify(out).includes("extend_film"), `section ${p.id} composes the joined-film grammar`);
        assert.ok(ofClass(out, "MiniMaxH3AddGuide").length > 0, `section ${p.id} composes the forced seam`);
      } else if (typeof p.patch["chain_run"] === "string" && p.patch["chain_run"] !== "") {
        // the upscale posture's cell composes the REQUEUE LOOP
        // family (slice 3): the checkpoint head + the assemble
        // tail, no masked-edit latent — the loop is the other
        // mechanism the one door serves.
        assert.ok(ofClass(out, "MiniMaxH3ChainCheckpointManager").length > 0, `section ${p.id} composes the checkpoint head`);
        assert.ok(ofClass(out, "MiniMaxH3ChainAssemble").length > 0, `section ${p.id} composes the assemble tail`);
        assert.equal(ofClass(out, "MiniMaxH3FantasticVideoEditLatent").length, 0, `section ${p.id} composes no matrix latent — the loop family serves`);
      } else {
        assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1, `section ${p.id} composes one assemble terminal`);
        assert.ok(ofClass(out, "MiniMaxH3FantasticVideoEditLatent").length > 0, `section ${p.id} composes the edit latent`);
      }
    }
  });

  it("NO CELL IS A REFUSAL CELL: no section lands on the matrix seat's refused cells (the boil, the off-grid window)", () => {
    const { sections } = editKind();
    for (const p of sections) {
      const boil = p.patch["mask_source"] === "whole-frame"
        && p.patch["reference"] === "self"
        && typeof p.patch["denoise"] === "number" && (p.patch["denoise"] as number) >= 0.8
        // THE CONTINUATION CARVE-OUT (slice 2): the boil law's premise
        // is a RE-RENDER of existing frames with no anchor; a
        // continuation never re-renders the prior — fresh seconds
        // are seam-anchored and joined after. The cell is lawful
        // only as the continuation posture it patches itself to be.
        && p.patch["continuation"] !== true;
      assert.equal(boil, false, `section ${p.id} is not the identity-boil cell (F3-17)`);
    }
  });

  it("THE REGISTRATION LAW FIRES — a patch key outside the kind's own fields refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, sections: [{ id: "drift", label: "Drift", patch: { not_a_field: "x" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /patches 'not_a_field' — not a declared field/);
  });

  it("THE REGISTRATION LAW FIRES — invented select vocabulary refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, sections: [{ id: "drift", label: "Drift", patch: { mask_source: "quantum" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /not a served option/);
  });

  it("THE REGISTRATION LAW FIRES — a mistyped value refuses (the type-truth law)", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, sections: [{ id: "drift", label: "Drift", patch: { denoise: "loud" } }],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /with string — the field declares number/);
  });

  it("THE REGISTRATION LAW FIRES — a section-carrying kind resolves clean (the door admits the carrying face itself)", () => {
    const { fields, sections } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, sections,
    };
    // the true face — the door's carrying path, never a refusal
    assert.doesNotThrow(() => validateDeclaredMods("forged-card", [kind as never]));
    // and a sections-free kind never enters the walk (the bare face)
    const bare = { kind: "forged2", label: "Bare", param_key: "forged2", cardinality: "list", fields };
    assert.doesNotThrow(() => validateDeclaredMods("forged-card", [bare as never]));
  });

  it("THE REGISTRATION LAW FIRES — a repeated id refuses", () => {
    const { fields } = editKind();
    const kind = {
      kind: "forged", label: "Forged", param_key: "forged", cardinality: "list",
      fields, sections: [
        { id: "same", label: "One", patch: { denoise: 0.3 } },
        { id: "same", label: "Two", patch: { denoise: 0.4 } },
      ],
    };
    assert.throws(() => validateDeclaredMods("forged-card", [kind as never]), /section 'same' is declared twice/);
  });

  it("THE RIDING FIELDS DECLARE THEIR SUBMENUS (slice 5, the master modal): every rides-only seat states its master through the one visible_when grammar, and the wire serves it", async () => {
    // THE OPERATOR'S NAMED ASK (the collapse's slice 5): "the refine
    // switch opening the scale submenu" - the GUI hides nothing by
    // hand; each riding field declares the switch that opens it, and
    // the leaf interprets the same grammar every card face already
    // does. The blank-mask law rides the same seat: the region/static
    // mask fields stand down under whole-frame (nothing is held).
    const { fields } = editKind();
    const vw = (name: string): string | undefined =>
      (fields.find((f) => f.name === name) as { visible_when?: string } | undefined)?.visible_when;
    assert.equal(vw("scale"), "refine=true", "the named submenu: scale opens under the refine switch");
    assert.equal(vw("extend_seconds"), "continuation=true", "the extend seat opens under the continuation switch");
    assert.equal(vw("region_prompt"), "mask_source=region", "the SAM3 prompt rides the region source");
    assert.equal(vw("detection_threshold"), "mask_source=region", "the detection threshold rides the region source");
    assert.equal(vw("mask"), "mask_source=static-png", "the staged PNG rides the static source");
    assert.equal(vw("mask_grow"), "mask_source!=whole-frame", "mask tuning rides any real mask");
    assert.equal(vw("mask_blur"), "mask_source!=whole-frame", "same law as the grow");
    assert.equal(vw("still"), "reference=still+mannequin", "the still rides the swap anchors");
    assert.equal(vw("mannequin"), "reference=still+mannequin", "the mannequin rides the swap anchors");
    assert.equal(vw("refine"), "chain_run=null", "the refine switch stands down under the upscale posture");
    assert.equal(vw("continuation"), "chain_run=null", "the continuation switch stands down under the upscale posture");
    assert.equal(vw("segment_crf"), "chain_run!=null", "the HQ segment quality rides the upscale posture (B-2's twelfth guard)");
    // THE DERIVED CENSUS (the modsystem wall-coverage audit 2026-11-09,
    // the census-lie finding): the walk below rode a hand-listed eleven
    // while the kind declared TWELVE — segment_crf (chain_run!=null,
    // card.ts B-2) red nothing when stripped. The loop is DERIVED now:
    // every field of the edit kind that declares visible_when must be
    // served verbatim — a thirteenth guard reds by name, and a
    // projection that strips visible_when reds one arm per guard.
    // (F4, the front-end evasion audit 2026-11-07) the silent-shrink
    // class stays dead.
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const served = (body.features?.modifiers ?? []).find((k) => k.param_key === "edit");
    const servedFields = ((served as unknown as { fields?: Array<Record<string, unknown>> }).fields ?? []);
    const servedVw = (name: string): string | undefined =>
      (servedFields.find((f) => f.name === name) as { visible_when?: string } | undefined)?.visible_when;
    const guards = fields.filter((f) => (f as { visible_when?: string }).visible_when !== undefined);
    assert.ok(guards.length >= 12, `the edit kind declares its guards (found ${guards.length}, the floor is the twelve of B-2)`);
    for (const f of guards) {
      const name = (f as { name?: string }).name ?? ""
      // P1-5 (defect board row 5): an internal seat never reaches the
      // wire AT ALL — its submenu law rides only the declaration (the
      // expert override door); the verbatim-served law binds every
      // SERVED field's guard
      if ((f as { internal?: unknown }).internal === true) {
        assert.equal(servedFields.find((x) => x.name === name), undefined,
          `the internal '${name}' seat is never served — the second dialect is off the agent's face`)
        continue
      }
      assert.equal(servedVw(name), (f as { visible_when?: string }).visible_when,
        `the wire serves the '${name}' submenu law verbatim`)
    }
  });

  it("THE WIRE: the form-spec body serves the edit sections verbatim (the chips the GUI renders ride the same cells)", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const served = (body.features?.modifiers ?? []).find((k) => k.param_key === "edit");
    assert.ok(served, "the form-spec serves the edit kind");
    const sections = (served as unknown as { sections?: Preset[] }).sections;
    assert.ok(Array.isArray(sections), "the wire carries the section cells");
    assert.deepEqual(sections!.map((p) => p.id), editKind().sections.map((p) => p.id),
      "the served cells are the declared cells, verbatim");
  });
});

describe("P0-3 — the served resolution field defaults auto (the film's own tier, derived at compose)", () => {
  it("the edit kind's resolution field: default 'auto', the auto option FIRST (defect board row 3 — an agent never states the source's tier)", () => {
    const { fields } = editKind();
    const f = fields.find((x) => x["name"] === "resolution") as Record<string, unknown>;
    assert.ok(f, "the resolution field serves");
    assert.equal(f["default"], "auto", "the default derives the film's own pin — never a hardcoded 736p cross-regime join");
    const options = (f["options"] as Array<Record<string, unknown>>);
    assert.equal(options[0]!["value"], "auto", "auto is the first choice");
    assert.ok(String(options[0]!["label"]).includes("film"), "the auto label names what it derives");
    assert.ok(options.some((o) => o["value"] === "768p" && o["value"] === "768p"), "the explicit tiers still serve for overrides");
  });
});
