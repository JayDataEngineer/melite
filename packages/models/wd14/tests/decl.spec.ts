// @melite/models-wd14 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity; the
// full carrier (every HF link, sha256, lane weight, variant
// matrix) is the declaration itself, and registration is proven
// engine-side (the walls' registry count, the flavor↔DECL.mods
// interlock, the boot gates). Family-specific truth pins land here
// hand-written when a fact needs pinning — never generated guesses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the wd14 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-wd14");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "wd14");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("THE WEIGHTS RAIL: one variant per live WD14Tagger|pysssss model name, moat first", () => {
    // live-pinned 2026-09-22 off the engine's object_info — the node
    // refuses unknown names at queue time, the rail refuses them at
    // selection time (unknown variant id). Eleven, no more, no less.
    const LIVE = [
      "wd-v1-4-moat-tagger-v2",
      "wd-v1-4-convnext-tagger-v2",
      "wd-v1-4-convnextv2-tagger-v2",
      "wd-v1-4-vit-tagger-v2",
      "wd-v1-4-swinv2-tagger-v2",
      "wd-v1-4-convnext-tagger",
      "wd-v1-4-vit-tagger",
      "wd-convnext-tagger-v3",
      "wd-swinv2-tagger-v3",
      "wd-vit-tagger-v3",
      "wd-eva02-large-tagger-v3",
    ];
    assert.deepEqual(
      DECL.variants.map((v) => v.id), LIVE,
      "the rail offers exactly the live closed set, moat first (the family default)",
    );
    for (const v of DECL.variants) {
      assert.equal(v.group, "Variant", "weights variants ride the Variant picker, never Recipe");
      assert.deepEqual(
        (v as { resolver_defaults?: unknown }).resolver_defaults, { checkpoint: v.id },
        `variant ${v.id} stamps its own name (the stamp overlay injects it absent-keys-only)`,
      );
      const cells = v.cells ?? [];
      assert.equal(cells.length, 1, "one quant cell per weights variant");
      assert.equal(cells[0]!.quant, "f32", "the ONNX lane is F32");
    }
    assert.equal(
      (DECL.defaults as Record<string, unknown>)["checkpoint"], "wd-v1-4-moat-tagger-v2",
      "the family default backstops bare bodies on moat",
    );
  });

  it("group ids match the row groups case-EXACT (a lowercase drift doubles the rail's axes)", () => {
    const ids = new Set((DECL.variant_groups ?? []).map((g) => g.id));
    for (const v of DECL.variants) {
      assert.ok(ids.has(v.group), `row group '${v.group}' names a declared variant_groups id (case-exact)`);
    }
  });

  it("ONE variant claims the family address (a second claimant last-wins the route and hijacks the default)", () => {
    // 2026-09-22: every variant claimed route 'wd14' and the index
    // last-won — bare bodies composed eva02 instead of moat. Cells
    // may claim for quant addressing; variants may not share.
    const claimants = DECL.variants.filter((v) => v.route === DECL.id).map((v) => v.id);
    assert.deepEqual(claimants, [DECL.variants[0]!.id], "the head alone claims the family address");
  });
});
