import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { rootsManifest, searchedVoice } from "../src/rootsManifest.ts";

describe("rootsManifest (§23 cross-roots)", () => {
  it("own root alone by default (no extras, never a guess)", () => {
    assert.deepEqual(rootsManifest("/r/own"), ["/r/own"]);
    assert.deepEqual(rootsManifest("/r/own", []), ["/r/own"]);
  });

  it("extras append in order; own root always leads, deduped", () => {
    assert.deepEqual(
      rootsManifest("/r/own", ["/r/maker", "/r/old"]),
      ["/r/own", "/r/maker", "/r/old"],
    );
    assert.deepEqual(
      rootsManifest("/r/own", ["/r/maker", "/r/own"]),
      ["/r/own", "/r/maker"],
    );
  });

  it("the miss voice names every searched tree", () => {
    assert.equal(searchedVoice(["/r/own"]), "(searched /r/own)");
    assert.equal(
      searchedVoice(["/r/own", "/r/maker"]),
      "(searched /r/own, /r/maker)",
    );
  });

  it("the retired env seam is GONE from the seam's law (J12: config arrays, never process.env)", () => {
    // The seam must not read the process env even when the row is
    // set: extras arrive as config, full stop.
    const prev = process.env.MELITE_STATE_ROOTS;
    process.env.MELITE_STATE_ROOTS = "/r/ghost";
    try {
      assert.deepEqual(rootsManifest("/r/own"), ["/r/own"]);
    } finally {
      if (prev === undefined) delete process.env.MELITE_STATE_ROOTS;
      else process.env.MELITE_STATE_ROOTS = prev;
    }
  });
});
