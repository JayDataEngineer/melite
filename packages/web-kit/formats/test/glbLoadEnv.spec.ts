// glbLoadEnv.spec.ts — the no-BASE_URL arm of the shared GLB kernel
// (separate file: the DRACO singleton reads import.meta.env lazily on
// first construction, and spec files are process-isolated, so this file
// gets a fresh singleton. Measured TOGETHER with glbLoad.spec.ts for the
// file's union coverage).
import { describe, it, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import { makeGLTFLoader } from "../src/glbLoad.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shared GLB kernel without BASE_URL", () => {
  it("falls back to the root decoder path", () => {
    vi.stubEnv("BASE_URL", undefined as unknown as string);
    const loader = makeGLTFLoader();
    const inner = loader as unknown as {
      dracoLoader: { decoderPath: string };
    };
    assert.equal(inner.dracoLoader.decoderPath, "/draco/gltf/");
  });
});
