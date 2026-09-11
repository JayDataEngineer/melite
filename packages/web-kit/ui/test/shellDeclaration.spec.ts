// shellDeclaration.spec.ts — the typed seam tables: the construction
// door returns the declaration frozen, bottom seam optional.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { defineShellDeclaration } from "../src/shellDeclaration.ts";
import type { ShellDeclaration } from "../src/shellDeclaration.ts";

describe("defineShellDeclaration", () => {
  it("returns the declaration with its seam values intact", () => {
    const declaration: ShellDeclaration = {
      center: { kind: "stage3d" },
      bottom: { kind: "recipe" },
      rail: { slots: ["input_image"] },
    };
    assert.deepEqual(defineShellDeclaration(declaration), declaration);
  });
  it("freezes the declaration (tenants may not mutate tables)", () => {
    const declaration: ShellDeclaration = {
      center: { kind: "paint2d" },
      rail: { slots: [] },
    };
    const built = defineShellDeclaration(declaration);
    assert.ok(Object.isFrozen(built));
  });
  it("accepts a declaration without the optional bottom seam", () => {
    const declaration: ShellDeclaration = {
      center: { kind: "native" },
      rail: { slots: ["a", "b"] },
    };
    const built = defineShellDeclaration(declaration);
    assert.equal(built.center.kind, "native");
    assert.equal(built.bottom, undefined);
    assert.deepEqual(built.rail.slots, ["a", "b"]);
  });
  it("accepts the timeline bottom seam", () => {
    const declaration: ShellDeclaration = {
      center: { kind: "stage3d" },
      bottom: { kind: "timeline" },
      rail: { slots: [] },
    };
    assert.equal(defineShellDeclaration(declaration).bottom?.kind, "timeline");
  });
});
