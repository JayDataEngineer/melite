// shortcuts.spec.ts — the centralized keyboard-shortcut registry:
// shape invariants, id lookup, category grouping.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  SHORTCUTS,
  SHORTCUT_CATEGORY_ORDER,
  findShortcutById,
  groupShortcutsByCategory,
} from "../src/shortcuts.ts";
import type { ShortcutCategory } from "../src/shortcuts.ts";

const VALID_CATEGORIES: readonly ShortcutCategory[] = [
  "Transport",
  "Editing",
  "Selection",
  "Navigation",
  "History",
  "Clipboard",
];

describe("SHORTCUTS", () => {
  it("is non-empty", () => {
    assert.ok(SHORTCUTS.length > 0);
  });
  it("every entry has a non-empty id, keys, and description", () => {
    for (const s of SHORTCUTS) {
      assert.ok(s.id.length > 0);
      assert.ok(s.keys.length > 0);
      assert.ok(s.description.length > 0);
    }
  });
  it("ids are unique", () => {
    const ids = SHORTCUTS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("every category is a known ShortcutCategory", () => {
    for (const s of SHORTCUTS) {
      assert.ok(VALID_CATEGORIES.includes(s.category));
    }
  });
  it("covers every ordered category", () => {
    const present = new Set(SHORTCUTS.map((s) => s.category));
    for (const cat of SHORTCUT_CATEGORY_ORDER) {
      assert.ok(present.has(cat), `missing category ${cat}`);
    }
  });
});

describe("SHORTCUT_CATEGORY_ORDER", () => {
  it("lists each valid category exactly once", () => {
    assert.deepEqual(
      [...SHORTCUT_CATEGORY_ORDER].sort(),
      [...VALID_CATEGORIES].sort(),
    );
  });
});

describe("findShortcutById", () => {
  it("returns the def for a known id", () => {
    assert.deepEqual(findShortcutById("play-pause"), {
      id: "play-pause",
      keys: "Space",
      description: "Play / pause",
      category: "Transport",
    });
  });
  it("returns undefined for an unknown id", () => {
    assert.equal(findShortcutById("no-such-shortcut"), undefined);
  });
});

describe("groupShortcutsByCategory", () => {
  it("keys every ordered category", () => {
    const grouped = groupShortcutsByCategory();
    assert.deepEqual(
      Object.keys(grouped).sort(),
      [...SHORTCUT_CATEGORY_ORDER].sort(),
    );
  });
  it("places each shortcut under its own category only", () => {
    const grouped = groupShortcutsByCategory();
    for (const cat of SHORTCUT_CATEGORY_ORDER) {
      for (const s of grouped[cat]) {
        assert.equal(s.category, cat);
      }
    }
  });
  it("partitions the whole registry without loss", () => {
    const grouped = groupShortcutsByCategory();
    const total = SHORTCUT_CATEGORY_ORDER.reduce(
      (n, cat) => n + grouped[cat].length,
      0,
    );
    assert.equal(total, SHORTCUTS.length);
  });
});
