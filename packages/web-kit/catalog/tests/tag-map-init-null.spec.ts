// tag-map-init-null.spec.ts — module init with a JSON-null persisted cache
// (covers validateDocument's !parsed arm: never throw, fall back to empty).
import { describe, it } from "vitest";
import assert from "node:assert/strict";

(globalThis as Record<string, unknown>)["localStorage"] = {
  getItem: (_k: string): string | null => "null",
  setItem: (_k: string, _v: string): void => {},
};

describe("tagMap init (null cache)", () => {
  it("falls back to empty on a null document", async () => {
    const { useTagMap } = await import("../src/tagMap.ts");
    assert.deepEqual(useTagMap.getState().tags, {});
    assert.deepEqual(useTagMap.getState().map, {});
    delete (globalThis as Record<string, unknown>)["localStorage"];
  });
});
