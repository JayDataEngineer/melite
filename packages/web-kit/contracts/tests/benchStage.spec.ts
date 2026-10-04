// benchStage.spec.ts — the one normalization's own contract walls.
// normalizeBenchStage is total (a row in, a stage row out, never
// throws) and idempotent; these walls pin the ID LAW's caller-stated
// arm directly: a STRING index is the caller's own id and rides
// verbatim onto an id-less row — the number arm (the positional
// s_<n> mint) is pinned by the drafts plane's own suite.
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { normalizeBenchStage } from "../src/benchStage.ts";

describe("normalizeBenchStage's id law (the caller-stated arm)", () => {
  test("a STRING index rides verbatim onto an id-less row", () => {
    const out = normalizeBenchStage({ card: "card-a" }, "g_7");
    assert.equal(out["id"], "g_7", "the caller's id is the row's id, verbatim");
  });

  test("an empty-string index rides verbatim too — the wire admission reads it as no stage", () => {
    const out = normalizeBenchStage({ card: "card-a" }, "");
    assert.equal(out["id"], "", "the empty string is a caller-stated id, not a mint trigger");
  });

  test("a row with its OWN id keeps it — the index never overwrites", () => {
    const out = normalizeBenchStage({ id: "mine", card: "card-a" }, "g_7");
    assert.equal(out["id"], "mine");
  });

  test("a junk row normalizes to a stage row carrying the caller's id", () => {
    const out = normalizeBenchStage("a bare string row", "g_9");
    assert.equal(out["id"], "g_9");
    assert.deepEqual(out["inputs"], {});
    assert.deepEqual(out["params"], {});
  });

  test("idempotence holds on the caller-stated arm", () => {
    const once = normalizeBenchStage({ card: "card-a" }, "g_7");
    const twice = normalizeBenchStage(once, "g_7");
    assert.deepEqual(twice, once);
  });
});
