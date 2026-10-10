// promptTags.spec.ts — the tag-grammar door battery (features/001
// A4): one arm per refusal class, one arm per legal exception. The
// door REFUSES, never rewrites — each refusal names its class and
// the offending fragment.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { checkAnimaPromptTags } from "../src/promptTags.ts";

const accepts = (field: "prompt" | "negative_prompt", text: string): void =>
  assert.doesNotThrow(() => checkAnimaPromptTags(field, text));
const refuses = (field: "prompt" | "negative_prompt", text: string, fragment: string): void =>
  assert.throws(
    () => checkAnimaPromptTags(field, text),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, new RegExp(`anima ${field}: ${fragment}`), err.message);
      return true;
    },
  );

describe("checkAnimaPromptTags — the settled grammar accepts", () => {
  it("the recommended prefix and tag order", () => {
    accepts("prompt", "masterpiece, best quality, highres, safe, 1girl, @wlop, silver hair");
  });

  it("the recipe's own settled negative (score tags are the underscore exception)", () => {
    accepts("negative_prompt", "worst quality, low quality, score_1, score_2, score_3, artist name");
  });

  it("a trailing comma (the prefix convention) and a short caption chunk", () => {
    accepts("prompt", "masterpiece, best quality, highres, safe,");
    accepts("prompt", "a girl on the left side, 1girl, silver hair");
  });
});

describe("checkAnimaPromptTags — one refusal per class", () => {
  it("missing space after a comma", () => {
    refuses("prompt", "1girl,silver hair", "missing space after comma before .silver hair.");
  });

  it("doubled comma", () => {
    refuses("prompt", "1girl,, silver hair", "doubled comma at segment 2");
  });

  it("underscore in a tag (non-score)", () => {
    refuses("prompt", "1girl, long_hair", "underscore in tag .long_hair.");
  });
});

describe("checkAnimaPromptTags — the negative seat refuses the same grammar", () => {
  it("a malformed negative refuses under its own field name", () => {
    refuses("negative_prompt", "worst quality,low quality", "missing space after comma");
  });
});
