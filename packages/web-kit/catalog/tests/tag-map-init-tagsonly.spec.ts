// tag-map-init-tagsonly.spec.ts — module init with a MAPLESS persisted doc
// (covers `parsed.map ?? {}`).
import { describe, it } from "vitest";
import assert from "node:assert/strict";

(globalThis as Record<string, unknown>)["localStorage"] = {
  getItem: (_k: string): string | null =>
    JSON.stringify({ tags: { keep: { name: "Keep", color: "sky" } } }),
  setItem: (_k: string, _v: string): void => {},
};

describe("tagMap init (mapless cache)", () => {
  it("hydrates the registry with an empty index", async () => {
    const { useTagMap } = await import("../src/tagMap.ts");
    assert.deepEqual(Object.keys(useTagMap.getState().tags), ["keep"]);
    assert.deepEqual(useTagMap.getState().map, {});
    delete (globalThis as Record<string, unknown>)["localStorage"];
  });
});
