// glbLoadEnv.spec.ts — the shared GLB kernel's decoder root under the
// vitest module env (BASE_URL "/" — read once at MODULE load since
// 2026-09-12; the branch's other arm is production-only and rides a
// dated v8 ignore in the source, modelCatalog precedent). vi.stubEnv
// cannot steer the module env object (it mutates process.env only —
// probed), so the assertion pins the observable: the vitest-env root
// resolves the root decoder path.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { makeGLTFLoader } from "../src/glbLoad.ts";

describe("shared GLB kernel decoder root under the vitest module env", () => {
  it("resolves the root decoder path", () => {
    const loader = makeGLTFLoader();
    const inner = loader as unknown as {
      dracoLoader: { decoderPath: string };
    };
    assert.equal(inner.dracoLoader.decoderPath, "/draco/gltf/");
  });
});
