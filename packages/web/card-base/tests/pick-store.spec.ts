// pick-store.spec.ts — the pick mirror's OWN three laws, walled
// direct at the module grain (the preview-history behavior walls
// exercise them through the component; these pin the header's
// claims themselves). The module is a deliberate DECIDED-KEEP vs
// dsh-client-store's defineStore registration — the receipt for
// that keep is the module header's different-question rationale
// plus these walls: identity isolation, the 64-cell cap, LRU
// refresh.

import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { pickCellOf, readPick, resetPickCellsForTests, writePick } from "../src/pick-store.ts";

afterEach(() => {
  resetPickCellsForTests();
});

describe("the pick mirror — identity isolation", () => {
  it("one identity reads the SAME cell across calls (mounts share it)", () => {
    const a = pickCellOf("stage/run-1");
    const b = pickCellOf("stage/run-1");
    assert.equal(a, b);
    writePick(a, "url-7");
    assert.equal(readPick(pickCellOf("stage/run-1")), "url-7");
  });

  it("different identities are DIFFERENT cells — a pick never leaks across stages or runs", () => {
    writePick(pickCellOf("stage-a/run-1"), "left");
    writePick(pickCellOf("stage-b/run-1"), "right");
    writePick(pickCellOf("stage-a/run-2"), "newest");
    assert.equal(readPick(pickCellOf("stage-a/run-1")), "left");
    assert.equal(readPick(pickCellOf("stage-b/run-1")), "right");
    assert.equal(readPick(pickCellOf("stage-a/run-2")), "newest");
  });

  it("a fresh cell starts unpicked (null), never a stale borrow", () => {
    assert.equal(readPick(pickCellOf("fresh/identity")), null);
  });
});

describe("the pick mirror — the 64-cell cap prunes the OLDEST insertion", () => {
  it("the 65th identity evicts the first; the evicted identity comes back unpicked", () => {
    writePick(pickCellOf("id-0"), "oldest-pick");
    for (let i = 1; i < 64; i += 1) pickCellOf("id-" + i);
    pickCellOf("id-64"); // at cap — the prune fires on this mint
    assert.equal(readPick(pickCellOf("id-0")), null,
      "the evicted identity mints a fresh unpicked cell on return");
    assert.equal(readPick(pickCellOf("id-1")), null,
      "id-1 was never picked — its cell survives eviction-free and reads null");
  });

  it("the cap holds: after the prune, the last 64 identities all keep their picks", () => {
    for (let i = 0; i < 64; i += 1) writePick(pickCellOf("id-" + i), "pick-" + i);
    pickCellOf("newcomer");
    for (let i = 1; i < 64; i += 1) {
      assert.equal(readPick(pickCellOf("id-" + i)), "pick-" + i,
        "id-" + i + " kept its pick after the newcomer pruned id-0");
    }
  });
});

describe("the pick mirror — LRU refresh (not FIFO-of-birth)", () => {
  it("a late READ refreshes insertion order: the touched cell survives the cap, the untouched oldest goes", () => {
    for (let i = 0; i < 64; i += 1) writePick(pickCellOf("cell-" + i), "pick-" + i);
    writePick(pickCellOf("cell-5"), "touched-late"); // refreshes cell-5 to newest
    pickCellOf("newcomer"); // evicts the OLDEST — cell-0, NOT cell-5
    assert.equal(readPick(pickCellOf("cell-5")), "touched-late",
      "the refreshed cell kept its pick across the prune");
    assert.equal(readPick(pickCellOf("cell-0")), null,
      "the untouched oldest was the one evicted");
  });
});
