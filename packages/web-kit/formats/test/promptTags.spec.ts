// promptTags.spec.ts — the prompt tag library + autocomplete helpers.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  ALL_PROMPT_TAGS,
  TAG_CATEGORY_LABELS,
  TAG_CATEGORY_ORDER,
  extractCurrentToken,
  filterTags,
  insertTagAtToken,
} from "../src/promptTags.ts";
import type { PromptTag } from "../src/promptTags.ts";

const tag = (value: string): PromptTag => ({ value, category: "subject" });

describe("ALL_PROMPT_TAGS", () => {
  it("is frozen and non-empty", () => {
    assert.ok(Object.isFrozen(ALL_PROMPT_TAGS));
    assert.ok(ALL_PROMPT_TAGS.length > 0);
  });

  it("covers every category in display order with labels", () => {
    const seen = new Set(ALL_PROMPT_TAGS.map((t) => t.category));
    for (const cat of TAG_CATEGORY_ORDER) {
      assert.ok(seen.has(cat), `category ${cat} has no tags`);
      assert.ok(TAG_CATEGORY_LABELS[cat].length > 0);
    }
    for (const t of ALL_PROMPT_TAGS) {
      assert.ok(t.value.length > 0);
      assert.ok(TAG_CATEGORY_ORDER.includes(t.category));
    }
  });

  it("ships known library entries", () => {
    const values = new Set(ALL_PROMPT_TAGS.map((t) => t.value));
    for (const v of ["golden hour", "dolly in", "teal and orange"] as const) {
      assert.ok(values.has(v));
    }
  });
});

describe("filterTags", () => {
  it("returns [] for an empty/blank query", () => {
    assert.deepEqual(filterTags(ALL_PROMPT_TAGS, ""), []);
    assert.deepEqual(filterTags(ALL_PROMPT_TAGS, "   "), []);
  });

  it("matches case-insensitively", () => {
    const out = filterTags(ALL_PROMPT_TAGS, "GOLDEN");
    assert.ok(out.some((t) => t.value === "golden hour"));
  });

  it("orders prefix matches before substring matches", () => {
    const tags = [tag("pineapple"), tag("apple"), tag("ape")];
    assert.deepEqual(
      filterTags(tags, "ap", 10).map((t) => t.value),
      ["apple", "ape", "pineapple"],
    );
  });

  it("finds substring-only matches on the real library", () => {
    const out = filterTags(ALL_PROMPT_TAGS, "hour", 10).map((t) => t.value);
    assert.ok(out.includes("golden hour"));
    assert.ok(out.includes("blue hour"));
    assert.ok(out.includes("magic hour"));
  });

  it("honors the limit", () => {
    const tags = [tag("a1"), tag("a2"), tag("a3")];
    assert.equal(filterTags(tags, "a", 2).length, 2);
    assert.equal(filterTags(tags, "a", 0).length, 0);
  });

  it("returns [] when nothing matches", () => {
    assert.deepEqual(filterTags([tag("apple")], "zzz"), []);
  });
});

describe("extractCurrentToken", () => {
  it("takes the text after the last comma", () => {
    assert.equal(extractCurrentToken("a cat, golden"), "golden");
  });

  it("takes the text after the last semicolon", () => {
    assert.equal(extractCurrentToken("a cat; extreme close"), "extreme close");
  });

  it("returns the whole text when there is no separator", () => {
    assert.equal(extractCurrentToken("a cat"), "a cat");
  });

  it("honors an explicit cursor position", () => {
    assert.equal(extractCurrentToken("a, golden hour, silver", 9), "golden");
  });

  it("trims leading whitespace after the separator", () => {
    assert.equal(extractCurrentToken("a,   golden"), "golden");
  });

  it("defaults the cursor to the end of the text", () => {
    assert.equal(extractCurrentToken("a, golden"), "golden");
  });
});

describe("insertTagAtToken", () => {
  it("replaces the token after a comma prefix", () => {
    const out = insertTagAtToken("a cat, gol", 10, "golden hour");
    assert.equal(out.text, "a cat, golden hour, ");
    assert.equal(out.cursor, "a cat, golden hour, ".length);
  });

  it("inserts with no prefix when there is no separator", () => {
    const out = insertTagAtToken("gol", 3, "golden hour");
    assert.equal(out.text, "golden hour, ");
    assert.equal(out.cursor, "golden hour, ".length);
  });

  it("adds a comma separator after a semicolon prefix", () => {
    const out = insertTagAtToken("a; gol", 6, "golden hour");
    assert.equal(out.text, "a;, golden hour, ");
    assert.equal(out.cursor, out.text.length);
  });

  it("preserves the text after the cursor", () => {
    const out = insertTagAtToken("a, gol XYZ", 6, "golden hour");
    assert.equal(out.text, "a, golden hour,  XYZ");
  });
});
