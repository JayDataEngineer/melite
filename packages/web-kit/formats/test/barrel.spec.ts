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
    assert.ok("CAPABILITY_DRAG_MIME" in barrel);
    assert.ok("SIDEBAR_GENRE_ORDER" in barrel);
  });
});
