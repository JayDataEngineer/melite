// rootsManifest.spec.ts — THE CROSS-ROOTS ORDER, the one order both
// run-resolving readers take (the gallery's artifact door and the
// media list): the caller's own tree first (its own writes win), then
// the manifest roots in their declared order, de-duplicated. A run id
// present in two trees must never be answered by different bytes by
// two doors, so the ORDER is the contract, not each reader's walk.
import { describe, it } from "vitest";
import assert from "node:assert/strict";

import { crossRootOrder, rootsManifest, searchedVoice } from "../src/rootsManifest.ts";

describe("crossRootOrder (the one cross-root order)", () => {
  it("own tree leads, then the manifest roots in their declared order", () => {
    assert.deepEqual(crossRootOrder("/own/flow", ["/a/output", "/b/output"]), [
      "/own/flow",
      "/a/output",
      "/b/output",
    ]);
  });

  it("a tree already answered is not asked again — own tree, a repeated root, a repeated sibling", () => {
    assert.deepEqual(
      crossRootOrder("/own/flow", ["/own/flow", "/a/output", "/a/output", "/b/output"]),
      ["/own/flow", "/a/output", "/b/output"],
    );
    // the same tree named later in the manifest keeps the position it
    // first won — own tree first, however the manifest spells it
    assert.deepEqual(crossRootOrder("/own/flow", ["/a/output", "/own/flow"]), [
      "/own/flow",
      "/a/output",
    ]);
  });

  it("blanks drop and an empty manifest is the caller's own tree alone", () => {
    assert.deepEqual(crossRootOrder("/own/flow", []), ["/own/flow"]);
    assert.deepEqual(crossRootOrder("/own/flow", ["", "/a/output", ""]), ["/own/flow", "/a/output"]);
    assert.deepEqual(crossRootOrder("", ["/a/output"]), ["/a/output"]);
    assert.deepEqual(crossRootOrder("", []), []);
  });
});

describe("rootsManifest (own root + the extras seam)", () => {
  it("own root leads, blanks drop, the first occurrence wins", () => {
    assert.deepEqual(
      rootsManifest("/own", { MELITE_STATE_ROOTS: "/a: /b : /a" } as Record<string, string>),
      ["/own", "/a", "/b"],
    );
    assert.deepEqual(rootsManifest("/own", {} as Record<string, string>), ["/own"]);
    assert.deepEqual(rootsManifest("/own", { MELITE_STATE_ROOTS: "/own" } as Record<string, string>), [
      "/own",
    ]);
  });

  it("the miss voice names every searched tree", () => {
    assert.equal(
      searchedVoice(["/own", "/a"]),
      "(searched /own, /a)",
    );
  });
});
