// mods-schema.spec.ts — THE DECLARED MOD-KIND GATE'S TEETH (hour
// 16). registerCard now runs every declared mod-kind row through
// a strict schemastery master + type-truth predicates. These specs
// prove each law REFUSES; the boot specs (cards-registry, the
// discovery VERBATIM wall) prove the estate's real rows pass.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateDeclaredMods } from "../src/mods-schema.ts";
import type { DeclaredModifierKind } from "../src/service.ts";

const base = (over: Record<string, unknown>): DeclaredModifierKind =>
  ({ kind: "t", label: "T", param_key: "t", cardinality: "list", ...over }) as DeclaredModifierKind;

describe("the declared mod-kind schema gate (registerCard's third door)", () => {
  it("a healthy row passes clean (the mask shape)", () => {
    validateDeclaredMods("c", [base({
      category: "standalone",
      fields: [
        { name: "threshold", label: "Threshold", type: "number", default: 0.35, min: 0.05, max: 0.95, step: 0.05 },
        { name: "name", label: "Name", type: "string", default: "sam3" },
        { name: "part", label: "Part", type: "select", default: "face", options: [{ value: "face", label: "Face" }] },
      ],
    })]);
  });

  it("null and array defaults name their JS truth (the type-truth ternaries)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: null }] })]),
      /its default is null/,
    );
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: ["a"] }] })]),
      /its default is array/,
    );
  });

  it("a number default on a string field refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: 42 }] })]),
      /declares type 'string' but its default is number/,
    );
  });

  it("a boolean default on a number field refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: false }] })]),
      /declares type 'number' but its default is boolean/,
    );
  });

  it("min > max refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: 1, min: 5, max: 2 }] })]),
      /declares min 5 > max 2/,
    );
  });

  it("a select with no options refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "select", default: "a" }] })]),
      /is a select with no options/,
    );
  });

  it("an unknown wire type refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "float", default: 1 }] })]),
      /not a wire type/,
    );
  });

  it("an unknown mod-kind key refuses as drift (the strict resolve)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ feilds: [] })]),
      /unknown key\(s\) feilds/,
    );
  });

  it("a non-positive step refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: 1, step: 0 }] })]),
      /step must be positive/,
    );
  });

  it("kindFields validate under the same laws (the type-truth reaches both planes)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ kindFields: [{ name: "k", label: "K", type: "boolean", default: "yes" }] })]),
      /declares type 'boolean' but its default is string/,
    );
  });

  it("requires rides the gate (a string pack row passes — the sam2 arm's declaration)", () => {
    validateDeclaredMods("c", [base({ requires: ["comfyui-impact-pack", "comfyui-impact-subpack"] })]);
  });
});
