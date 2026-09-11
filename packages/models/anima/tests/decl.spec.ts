// @melite/models-anima — the model-plugin data pins.
// (Carrier law: see melite-models-krea-2/tests — a model plugin
// carries its whole truth; registration is proven engine-side.)
//
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the anima model plugin", () => {
  it("is a plugin boarding no mods", () => {
    assert.equal(family.name, "family-anima");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
    assert.equal(DECL.mods, undefined, "anima declares no mutation packs");
  });

  it("carries its defaults (the er_sde sampler is the anima tell)", () => {
    assert.equal(DECL.id, "anima");
    assert.equal((DECL.defaults ?? {}).sampler, "er_sde");
    assert.equal(DECL.genre, "image");
  });
});
