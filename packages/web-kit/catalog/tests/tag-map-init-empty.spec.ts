// tag-map-init-empty.spec.ts — module init with an EMPTY persisted cache
// (covers loadPersisted's no-raw arm). localStorage is stubbed BEFORE the
// dynamic import so the one module-level loadPersisted() sees it.
import { describe, it } from "vitest";
import assert from "node:assert/strict";

const store: Record<string, string> = {};
(globalThis as Record<string, unknown>)["localStorage"] = {
  getItem: (_k: string): string | null => null,
  setItem: (k: string, v: string): void => {
    store[k] = v;
  },
};

describe("tagMap init (empty cache)", () => {
  it("starts empty when nothing is persisted", async () => {
    const { useTagMap } = await import("../src/tagMap.ts");
    assert.deepEqual(useTagMap.getState().tags, {});
    assert.deepEqual(useTagMap.getState().map, {});
    delete (globalThis as Record<string, unknown>)["localStorage"];
  });
});
