// bodyPresets.spec.ts — the Body Studio one-click archetypes.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  BODY_PRESETS,
  DEFAULT_PRESET_ID,
  getPresetById,
} from "../src/bodyPresets.ts";

describe("BODY_PRESETS", () => {
  it("ships exactly the neutral/male/female set", () => {
    assert.deepEqual(BODY_PRESETS.map((p) => p.id), ["neutral", "male", "female"]);
  });

  it("gives every preset id/name/description plus a valid Character body", () => {
    for (const p of BODY_PRESETS) {
      assert.equal(typeof p.id, "string");
      assert.ok(p.id.length > 0);
      assert.equal(typeof p.name, "string");
      assert.ok(p.name.length > 0);
      assert.equal(typeof p.description, "string");
      assert.ok(p.description.length > 0);
      // Character half: 11 Anny phenotype coeffs, localChanges present.
      assert.ok(Array.isArray(p.coeffs));
      assert.equal(p.coeffs!.length, 11);
      for (const c of p.coeffs!) assert.equal(typeof c, "number");
      assert.ok(p.localChanges === null || typeof p.localChanges === "object");
      assert.equal(p.identityModel, "anny");
    }
  });

  it("uses gender-opposed baselines for male vs female", () => {
    const male = getPresetById("male")!;
    const female = getPresetById("female")!;
    assert.ok(male.coeffs![0]! < female.coeffs![0]!);
  });
});

describe("getPresetById", () => {
  it("hits every shipped id", () => {
    for (const p of BODY_PRESETS) {
      assert.equal(getPresetById(p.id)?.name, p.name);
    }
  });

  it("misses unknown ids with undefined", () => {
    assert.equal(getPresetById("nope"), undefined);
    assert.equal(getPresetById(""), undefined);
  });
});

describe("DEFAULT_PRESET_ID", () => {
  it("is null so first mount never clobbers saved edits", () => {
    assert.equal(DEFAULT_PRESET_ID, null);
  });
});
