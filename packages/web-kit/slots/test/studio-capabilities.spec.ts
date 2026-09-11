// studio-capabilities.spec.ts — the declarative studio-kind capability registry.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { STUDIO_CAPABILITIES } from "../src/studioCapabilities.ts";
import type { StudioCapability } from "../src/studioCapabilities.ts";

describe("STUDIO_CAPABILITIES", () => {
  it("ships the mesh-studio entry with the studio discriminator", () => {
    assert.equal(STUDIO_CAPABILITIES.length, 1);
    const mesh = STUDIO_CAPABILITIES[0] as StudioCapability;
    assert.equal(mesh.kind, "studio");
    assert.equal(mesh.id, "mesh-studio");
    assert.equal(mesh.label, "Mesh");
    assert.equal(mesh.description, "anny · phenotype + morphs");
    assert.equal(mesh.genre, "3d");
    assert.equal(mesh.studio, "body");
    assert.deepEqual({ ...mesh.defaultParams }, {});
  });

  it("keeps stable ids (React keys + data-capability-tile attributes)", () => {
    const ids = STUDIO_CAPABILITIES.map((c) => c.id);
    assert.deepEqual(ids, [...new Set(ids)]);
  });
});
