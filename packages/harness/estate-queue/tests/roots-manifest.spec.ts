import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { rootsManifest, searchedVoice } from "../src/rootsManifest.ts";

describe("rootsManifest (§23 cross-roots)", () => {
  it("own root alone by default (no env, never a guess)", () => {
    assert.deepEqual(rootsManifest("/r/own", {}), ["/r/own"]);
    assert.deepEqual(rootsManifest("/r/own", { MELITE_STATE_ROOTS: "" }), ["/r/own"]);
  });

  it("extras append in order; own root always leads, deduped", () => {
    assert.deepEqual(
      rootsManifest("/r/own", { MELITE_STATE_ROOTS: "/r/maker:/r/old" }),
      ["/r/own", "/r/maker", "/r/old"],
    );
    assert.deepEqual(
      rootsManifest("/r/own", { MELITE_STATE_ROOTS: "/r/maker:/r/own" }),
      ["/r/own", "/r/maker"],
    );
  });

  it("blanks drop (stray colons, whitespace)", () => {
    assert.deepEqual(
      rootsManifest("/r/own", { MELITE_STATE_ROOTS: ":/r/a:: /r/b:" }),
      ["/r/own", "/r/a", "/r/b"],
    );
  });

  it("the miss voice names every searched tree", () => {
    assert.equal(searchedVoice(["/r/own"]), "(searched /r/own)");
    assert.equal(
      searchedVoice(["/r/own", "/r/maker"]),
      "(searched /r/own, /r/maker)",
    );
  });
});
