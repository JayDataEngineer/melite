// promptTags.spec.ts — the tag-grammar door battery (features/001
// A4): one arm per refusal class, one arm per legal exception. The
// door REFUSES, never rewrites — each refusal names its class and
// the offending fragment.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { checkAnimaPromptTags, normalizeAnimaPromptTags } from "../src/promptTags.ts";

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

describe("normalizeAnimaPromptTags — the mechanical restore (the card-owned craft seam)", () => {
  it("restores every refusal class at once and names each rule", () => {
    // `long_hair blonde` is the wrapped-wire shape: one segment whose
    // underscore tag sits beside a plain word (the respell walks both)
    const r = normalizeAnimaPromptTags("1girl,long_hair blonde,,smile");
    assert.equal(r.text, "1girl, long hair blonde, smile");
    assert.deepEqual(r.fixed.sort(), ["tag-separator", "tag-underscore-space"]);
  });

  it("collapses a whitespace run inside a tag (the wrapped-wire spelling)", () => {
    const r = normalizeAnimaPromptTags("1girl,  silver   hair, smile");
    assert.equal(r.text, "1girl, silver hair, smile");
    assert.deepEqual(r.fixed, ["whitespace"]);
  });

  it("leaves a legal prompt untouched (identity, no rules fired)", () => {
    const text = "1girl, long hair, smile, score_9";
    const r = normalizeAnimaPromptTags(text);
    assert.equal(r.text, text);
    assert.deepEqual(r.fixed, []);
  });

  it("keeps the score tags' underscores and the prefix-convention trailing comma", () => {
    assert.equal(normalizeAnimaPromptTags("score_7, masterpiece").text, "score_7, masterpiece");
    assert.equal(normalizeAnimaPromptTags("1girl, ").text, "1girl,");
  });

  it("the restored text passes the family's own refusal door", () => {
    const r = normalizeAnimaPromptTags("1girl,long_hair,,smile");
    assert.doesNotThrow(() => checkAnimaPromptTags("prompt", r.text));
  });
});
