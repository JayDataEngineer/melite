// tag-map-init-corrupt.spec.ts — module init with a CORRUPT persisted cache
// (covers loadPersisted's catch arm: never throw, fall back to empty).
import { describe, it } from "vitest";
import assert from "node:assert/strict";

(globalThis as Record<string, unknown>)["localStorage"] = {
  getItem: (_k: string): string | null => "{{{not json",
  setItem: (_k: string, _v: string): void => {},
};

describe("tagMap init (corrupt cache)", () => {
  it("falls back to empty on corrupt JSON", async () => {
    const { useTagMap } = await import("../src/tagMap.ts");
    assert.deepEqual(useTagMap.getState().tags, {});
    assert.deepEqual(useTagMap.getState().map, {});
    delete (globalThis as Record<string, unknown>)["localStorage"];
  });
});
