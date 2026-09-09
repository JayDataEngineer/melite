// @melite/models-z-image — the model-plugin data pins.
// (Carrier law: see melite-models-krea-2/tests — a model plugin
// carries its whole truth; registration is proven engine-side.)
//
// Run: node --experimental-strip-types --test tests/
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the z-image model plugin", () => {
  it("is a plugin boarding no mods (the z-image shape: absent ≡ empty)", () => {
    assert.equal(family.name, "family-z-image");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
    assert.equal(DECL.mods, undefined, "z-image declares no mutation packs");
  });

  it("carries its defaults and lane inputs", () => {
    assert.equal((DECL.defaults ?? {}).sampler, "res_multistep");
    assert.equal((DECL.lane_inputs ?? {}).unet, "z_image_turbo_int8_convrot.safetensors");
    assert.equal(DECL.genre, "image");
  });
});
