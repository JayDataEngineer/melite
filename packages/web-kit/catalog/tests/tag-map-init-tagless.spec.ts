// tag-map-init-tagless.spec.ts — module init with a TAGLESS persisted doc
// (covers `parsed.tags ?? {}` + the localStorage write-through success and
// quota-failure arms of scheduleSync).
import { describe, it } from "vitest";
import assert from "node:assert/strict";

const store: Record<string, string> = {};
let quota = false;
(globalThis as Record<string, unknown>)["localStorage"] = {
  getItem: (_k: string): string | null => JSON.stringify({ map: { k: ["ghost"] } }),
  setItem: (k: string, v: string): void => {
    if (quota) throw new Error("quota exceeded");
    store[k] = v;
  },
};

describe("tagMap init (tagless cache)", () => {
  it("validates the map against an empty registry and writes through", async () => {
    const { useTagMap } = await import("../src/tagMap.ts");
    assert.deepEqual(useTagMap.getState().tags, {});
    assert.deepEqual(useTagMap.getState().map, {});
    useTagMap.getState().createTag("Fresh");
    const written = JSON.parse(store["melite:tag-map:v1"]) as {
      tags: Record<string, unknown>;
    };
    assert.ok("fresh" in written.tags);
    // Quota failure degrades silently; the mutation still applies.
    quota = true;
    useTagMap.getState().createTag("Brave");
    assert.ok("brave" in useTagMap.getState().tags);
    delete (globalThis as Record<string, unknown>)["localStorage"];
  });
});
