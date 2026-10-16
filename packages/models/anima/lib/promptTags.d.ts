/** Refuse a prompt or negative that breaks the Danbooru tag
 *  grammar. Called from the t2i build before any node renders —
 *  a malformed grammar dies at compose time with the offending
 *  fragment named, never at the encoder.
 *  @param field the param seat being judged ("prompt" or "negative_prompt")
 *  @param text the raw param value
 *  @throws Error naming the refusal class and the offending fragment */
export declare function checkAnimaPromptTags(field: "prompt" | "negative_prompt", text: string): void;
//# sourceMappingURL=promptTags.d.ts.map