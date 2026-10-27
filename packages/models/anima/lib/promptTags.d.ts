/** Refuse a prompt or negative that breaks the Danbooru tag
 *  grammar. Called from the t2i build before any node renders —
 *  a malformed grammar dies at compose time with the offending
 *  fragment named, never at the encoder.
 *  @param field the param seat being judged ("prompt" or "negative_prompt")
 *  @param text the raw param value
 *  @throws Error naming the refusal class and the offending fragment */
export declare function checkAnimaPromptTags(field: "prompt" | "negative_prompt", text: string): void;
/** THE MECHANICAL RESTORE (the card-owned craft seam's tag half, the
 *  rework's slice 6): the same three grammar classes the refusal
 *  names, restored instead of refused — the separator becomes ", ",
 *  a doubled comma collapses, and an underscore tag is re-spelled with
 *  spaces (score tags keep theirs). The words are preserved verbatim:
 *  this restores the recipe's spelling, it never rewrites the prompt.
 *  A trailing comma is the prefix convention, not a separator error —
 *  it survives. Called by the write door (melite_construct) before the
 *  bench stores a prompt, so a hand-typed bench doc is the only state
 *  that can still meet checkAnimaPromptTags.
 *  @param text the raw prompt/negative value
 *  @returns the restored text (the input when already legal) plus the
 *    rule names that fired */
export declare function normalizeAnimaPromptTags(text: string): {
    text: string;
    fixed: string[];
};
//# sourceMappingURL=promptTags.d.ts.map
