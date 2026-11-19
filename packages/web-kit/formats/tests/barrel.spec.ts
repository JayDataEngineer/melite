// barrel.spec.ts — the @melite/formats barrel re-exports every module.
// Import-safe in node: CARVE modules touch document/three only inside
// function bodies, never at module-eval time.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import * as barrel from "../src/index.ts";
import { splitCaptions } from "../src/captionSplitter.ts";

describe("formats barrel", () => {
  it("re-exports the codec surface", () => {
    assert.equal(typeof barrel.splitCaptions, "function");
    assert.equal(barrel.splitCaptions, splitCaptions);
    assert.ok(!("CAPABILITY_DRAG_MIME" in barrel));
    // CAPABILITY_DRAG_MIME left the barrel with capabilityCards
    // (2026-10-18, the estate conformance sweep — the dnd payload
    // module's live home is @melite/card-base/client). SIDEBAR_GENRE_ORDER
    // left with sidebarGenres (2026-09-12, the lucide purge).
  });
});
