// runs-hero.spec.ts — THE DECLARED HERO (the mask hero defect,
// 2026-10-09): the history/preview hero is gallery[0] (engine
// completion order) — a card that saves secondary same-kind
// artifacts (the mask card's manifest photo beside mask_combined)
// declares its product stem on the DECL (primaryFile) and the
// match moves first. Pure arms only (declaredPrimaryFirst); the
// runOne glue reads the run's cardId against the cached defs.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { declaredPrimaryFirst } from "../src/runsExecute.ts";

describe("declaredPrimaryFirst (the declared hero)", () => {
  it("the declared stem moves first (the mask shape: manifest finished first, product leads)", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_manifest_00001_.png", "mask/mask_combined_00001_.png", "mask/instance_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_combined leads the gallery");
    assert.deepEqual(
      [...out].sort(),
      ["mask/mask_combined_00001_.png", "mask/instance_00001_.png", "mask/mask_manifest_00001_.png"].sort(),
      "the reorder drops nothing",
    );
  });

  it("no stem (or an empty stem) keeps engine order (inline flows + undeclared cards)", () => {
    const names = ["b.png", "a.png"];
    assert.deepEqual(declaredPrimaryFirst(names, undefined), names, "undefined = engine order");
    assert.deepEqual(declaredPrimaryFirst(names, ""), names, "empty = engine order");
  });

  it("no match keeps engine order (never a reorder into nothing)", () => {
    const names = ["mask/mask_manifest_00001_.png", "mask/instance_00001_.png"];
    assert.deepEqual(declaredPrimaryFirst(names, "mask_combined"), names, "a missing hero changes nothing");
  });

  it("an exact or extension stem matches (stem + counter is the engine shape)", () => {
    assert.deepEqual(declaredPrimaryFirst(["b.png", "hero.png"], "hero"), ["hero.png", "b.png"], "exact stem");
    assert.deepEqual(declaredPrimaryFirst(["b.png", "herox_00001_.png"], "hero"), ["b.png", "herox_00001_.png"], "the underscore boundary holds (a longer stem never steals the hero)");
  });

  it("a same-stem figure never steals the product hero", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_figure_2_00001_.png", "mask/mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_figure_2 starts with mask_ but not mask_combined_");
  });
});
