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

  it("THE WEIGHTS RAIL: one variant per live loader model name, PromptGen-v2.0 large first", () => {
    // live-pinned 2026-09-22 off DownloadAndLoadFlorence2Model's
    // object_info combo. Fourteen, no more, no less. Ids are
    // DECL-charset slugs (the variant-id law /^[a-z0-9_-]+$/);
    // labels + resolver stamps carry the verbatim upstream names.
    const LIVE: Array<[string, string]> = [
      ["miaoshouai-florence-2-large-promptgen-v2-0", "MiaoshouAI/Florence-2-large-PromptGen-v2.0"],
      ["miaoshouai-florence-2-base-promptgen-v2-0", "MiaoshouAI/Florence-2-base-PromptGen-v2.0"],
      ["miaoshouai-florence-2-large-promptgen-v1-5", "MiaoshouAI/Florence-2-large-PromptGen-v1.5"],
      ["miaoshouai-florence-2-base-promptgen-v1-5", "MiaoshouAI/Florence-2-base-PromptGen-v1.5"],
      ["microsoft-florence-2-large", "microsoft/Florence-2-large"],
      ["microsoft-florence-2-base", "microsoft/Florence-2-base"],
      ["microsoft-florence-2-large-ft", "microsoft/Florence-2-large-ft"],
      ["microsoft-florence-2-base-ft", "microsoft/Florence-2-base-ft"],
      ["huggingfacem4-florence-2-docvqa", "HuggingFaceM4/Florence-2-DocVQA"],
      ["thwri-cogflorence-2-1-large", "thwri/CogFlorence-2.1-Large"],
      ["thwri-cogflorence-2-2-large", "thwri/CogFlorence-2.2-Large"],
      ["gokaygokay-florence-2-sd3-captioner", "gokaygokay/Florence-2-SD3-Captioner"],
      ["gokaygokay-florence-2-flux-large", "gokaygokay/Florence-2-Flux-Large"],
      ["pjmixers-images-florence-2-base-castollux-v0-5", "PJMixers-Images/Florence-2-base-Castollux-v0.5"],
    ];
    assert.deepEqual(
      DECL.variants.map((v) => v.id), LIVE.map(([id]) => id),
      "the rail offers exactly the live closed set, the family default first",
    );
    DECL.variants.forEach((v, i) => {
      assert.equal(v.label, LIVE[i]![1], `variant ${v.id} labels the verbatim upstream name`);
      assert.deepEqual(
        (v as { resolver_defaults?: unknown }).resolver_defaults, { checkpoint: LIVE[i]![1] },
        `variant ${v.id} stamps the verbatim name`,
      );
    });
    assert.equal(
      (DECL.defaults as Record<string, unknown>)["checkpoint"], "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
      "the family default backstops bare bodies",
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
