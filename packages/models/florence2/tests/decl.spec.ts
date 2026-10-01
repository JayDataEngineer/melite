// @melite/models-florence2 — the model-plugin data pins.
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

describe("the florence2 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-florence2");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "florence2");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("THE WEIGHTS RAIL's plugin shape — slugs, verbatim stamps, default (the roster itself is the wall's)", () => {
    // The engine-truth direction (exactly the live closed set, one
    // variant per DownloadAndLoadFlorence2Model model name) is
    // judged by the vocab-rails-subset wall against the tracked
    // fixture. This spec pins only what DERIVES from the
    // declaration itself: the id-slug law (variant-id charset
    // /^[a-z0-9_-]+$/, lowercase, '/' and '.' as dashes), the
    // verbatim label==stamp pairing, and the family default.
    const slug = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    for (const v of DECL.variants) {
      assert.equal(v.id, slug(v.label), `variant id ${v.id} is the slug of its verbatim upstream name`);
      assert.deepEqual(
        (v as { resolver_defaults?: unknown }).resolver_defaults, { checkpoint: v.label },
        `variant ${v.id} stamps the verbatim upstream name`,
      );
    }
    assert.ok(
      DECL.variants[0]!.label.includes("PromptGen"),
      "the family default (the head) is the PromptGen tuning — the moat first",
    );
    assert.equal(
      (DECL.defaults as Record<string, unknown>)["checkpoint"], DECL.variants[0]!.label,
      "the family default backstops bare bodies on the head variant",
    );
  });

  it("group ids match the row groups case-EXACT (a lowercase drift doubles the rail's axes)", () => {
    // 2026-09-22: variant_groups ids were 'variant'/'quant' while
    // rows ride group 'Variant' — axisGroups unions both, the client
    // rendered TWO Variant selects sharing one value key, the empty
    // one refusing the held pick as itself ("invalid variant").
    const ids = new Set((DECL.variant_groups ?? []).map((g) => g.id));
    for (const v of DECL.variants) {
      assert.ok(ids.has(v.group), `row group '${v.group}' names a declared variant_groups id (case-exact)`);
    }
  });

  it("ONE variant claims the family address (a second claimant last-wins the route and hijacks the default)", () => {
    // Cells may claim for quant addressing; variants may not share.
    const claimants = DECL.variants.filter((v) => v.route === DECL.id).map((v) => v.id);
    assert.deepEqual(claimants, [DECL.variants[0]!.id], "the head alone claims the family address");
  });
});
