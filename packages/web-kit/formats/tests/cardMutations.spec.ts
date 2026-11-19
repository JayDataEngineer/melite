// cardMutations.spec.ts — the declarative card + flow mutation gate:
// coerce → validate → patch for stage and doc renames.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  CARD_MUTATIONS,
  DOC_MUTATIONS,
  TITLE_MAX_LEN,
  applyDocMutation,
  applyStageMutation,
} from "../src/cardMutations.ts";
import type { DocMutation, StageMutation } from "../src/cardMutations.ts";

describe("cardMutations gate", () => {
  it("seeds the title bound both tables mirror", () => {
    assert.equal(TITLE_MAX_LEN, 120);
    assert.equal(CARD_MUTATIONS.rename.field, "title");
    assert.equal(DOC_MUTATIONS.rename.field, "name");
  });

  it("stage rename trims and patches", () => {
    const r = applyStageMutation({ kind: "rename", value: "  hello  " });
    assert.deepEqual(r, { ok: true, patch: { title: "hello" } });
  });

  it("stage rename accepts exactly TITLE_MAX_LEN chars", () => {
    const r = applyStageMutation({ kind: "rename", value: "x".repeat(120) });
    assert.equal(r.ok, true);
  });

  it("stage rename refuses empty / whitespace-only", () => {
    assert.deepEqual(applyStageMutation({ kind: "rename", value: "" }), {
      ok: false,
      error: "Invalid title: must be 1-120 non-empty characters",
    });
    assert.deepEqual(applyStageMutation({ kind: "rename", value: "   " }).ok, false);
  });

  it("stage rename refuses over-long titles", () => {
    const r = applyStageMutation({ kind: "rename", value: "y".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /Invalid title/);
  });

  it("stage rename refuses non-string values (coerce passthrough)", () => {
    const r = applyStageMutation({ kind: "rename", value: 42 as unknown as string });
    assert.equal(r.ok, false);
  });

  it("stage rename refuses unknown kinds (defense in depth)", () => {
    const r = applyStageMutation({ kind: "bogus", value: "x" } as unknown as StageMutation);
    assert.deepEqual(r, { ok: false, error: "Unknown stage mutation kind: bogus" });
  });

  it("doc rename trims and patches the flow name", () => {
    const r = applyDocMutation({ kind: "rename", value: " flow " });
    assert.deepEqual(r, { ok: true, patch: { name: "flow" } });
  });

  it("doc rename refuses empty / over-long / non-string", () => {
    assert.deepEqual(applyDocMutation({ kind: "rename", value: "" }).ok, false);
    assert.deepEqual(applyDocMutation({ kind: "rename", value: "z".repeat(121) }).ok, false);
    assert.deepEqual(applyDocMutation({ kind: "rename", value: null as unknown as string }).ok, false);
  });

  it("doc rename refuses unknown kinds", () => {
    const r = applyDocMutation({ kind: "move", value: "x" } as unknown as DocMutation);
    assert.deepEqual(r, { ok: false, error: "Unknown doc mutation kind: move" });
  });
});
