// @melite/models-joycaption — the model-plugin data pins.
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

describe("the joycaption model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-joycaption");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "joycaption");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("ONE Standard variant on the shared checkpoint key (the freeform upstream is not enumerated)", () => {
    assert.equal(DECL.variants.length, 1, "no closed set to enumerate — one variant only");
    assert.equal(DECL.variants[0]!.id, "standard");
    assert.equal(
      (DECL.defaults as Record<string, unknown>)["checkpoint"], "fancyfeast/llama-joycaption-beta-one-hf-llava",
      "the family default stamps beta-one on the shared key",
    );
  });

  it("group ids match the row groups case-EXACT (a lowercase drift doubles the rail's axes)", () => {
    const ids = new Set((DECL.variant_groups ?? []).map((g) => g.id));
    for (const v of DECL.variants) {
      assert.ok(ids.has(v.group), `row group '${v.group}' names a declared variant_groups id (case-exact)`);
    }
  });

  it("ONE variant claims the family address (cells may claim for quant addressing; variants may not share)", () => {
    const claimants = DECL.variants.filter((v) => v.route === DECL.id).map((v) => v.id);
    assert.deepEqual(claimants, [DECL.variants[0]!.id], "the head alone claims the family address");
  });

  it("the Standard cell is F32 with an honest measured VRAM claim", () => {
    const cells = DECL.variants[0]!.cells ?? [];
    assert.equal(cells.length, 1, "one quant cell only");
    assert.equal(cells[0]!.quant, "f32");
    assert.equal(cells[0]!.vram_peak_gb, 20, "measured claim rides the head cell only");
  });
});
