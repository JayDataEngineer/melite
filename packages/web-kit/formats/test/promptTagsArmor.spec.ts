// promptTagsArmor.spec.ts — the malformed-tag-database arms of flatten().
// Separate file: it mocks ./prompt-tags.json with garbage. Spec files are
// process-isolated, so promptTags.spec.ts keeps the real database.
// Measured TOGETHER with promptTags.spec.ts for the file's union coverage.
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";

vi.mock("../src/prompt-tags.json", () => ({
  default: {
    shot: "not-an-array",
    camera: ["ok", 42, ""],
    mood: null,
  },
}));

import { ALL_PROMPT_TAGS } from "../src/promptTags.ts";

describe("prompt-tags armor", () => {
  it("skips non-array categories and non-string/empty tags", () => {
    assert.deepEqual(ALL_PROMPT_TAGS, [{ value: "ok", category: "camera" }]);
  });
});
