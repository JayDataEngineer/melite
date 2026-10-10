// @melite/models-anima/src/promptTags — the Danbooru tag-grammar
// door (features/001 A4, cured 2026-10-21). The recipe's grammar
// is mechanical, so the family REFUSES a prompt that breaks it —
// never silently rewrites (a rewritten prompt is a different
// picture, and the author never learns their tags are malformed).
// Three refusal classes, one door: missing space after a comma,
// doubled comma, underscore in a tag. The score-tag exception is
// the recipe's own rule (score_1..score_9 are the one legal
// underscore form — "spaces instead of underscores, except score
// tags").

/** An underscore-bearing token that is NOT a score tag
 *  (score_[0-9] with optional decimals) — the recipe's one legal
 *  underscore form. */
function isScoreTag(token: string): boolean {
  return /^score_[0-9](\.[0-9]+)?$/.test(token);
}

/** Refuse a prompt or negative that breaks the Danbooru tag
 *  grammar. Called from the t2i build before any node renders —
 *  a malformed grammar dies at compose time with the offending
 *  fragment named, never at the encoder.
 *  @param field the param seat being judged ("prompt" or "negative_prompt")
 *  @param text the raw param value
 *  @throws Error naming the refusal class and the offending fragment */
export function checkAnimaPromptTags(field: "prompt" | "negative_prompt", text: string): void {
  const segments = text.split(",");
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    // class 2 — doubled comma: an empty segment anywhere except a
    // trailing one (a prompt ending in a single comma is the
    // prefix convention, not a doubled separator).
    if (seg.trim() === "" && i < segments.length - 1) {
      throw new Error(
        `anima ${field}: doubled comma at segment ${i + 1} — one comma, one space, then the next tag (${JSON.stringify(text)})`,
      );
    }
    // class 1 — missing space after a comma: the separator grammar
    // is ", " (comma + space); a comma glued to the next tag
    // refuses (the first segment has no comma in front of it).
    if (i > 0 && seg !== "" && !seg.startsWith(" ")) {
      throw new Error(
        `anima ${field}: missing space after comma before ${JSON.stringify(seg)} — the separator is comma + space (${JSON.stringify(text)})`,
      );
    }
    // class 3 — underscore in a tag: Danbooru tags use spaces;
    // the score tags are the exception, per the recipe.
    for (const token of seg.trim().split(/\s+/)) {
      if (token.includes("_") && !isScoreTag(token)) {
        throw new Error(
          `anima ${field}: underscore in tag ${JSON.stringify(token)} — tags use spaces; only score tags (score_1..score_9) keep the underscore (${JSON.stringify(text)})`,
        );
      }
    }
  }
}
