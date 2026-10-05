export type PromptTagCategory = 'shot' | 'camera' | 'lighting' | 'style' | 'motion' | 'mood' | 'color' | 'subject';
export interface PromptTag {
    /** The phrase as it would be inserted into a prompt. */
    value: string;
    /** Category bucket (for grouping in the dropdown). */
    category: PromptTagCategory;
}
/** Category display order for the dropdown (matches the JSON key order). */
export declare const TAG_CATEGORY_ORDER: readonly PromptTagCategory[];
/** Human-readable labels for each category. */
export declare const TAG_CATEGORY_LABELS: Record<PromptTagCategory, string>;
export declare const ALL_PROMPT_TAGS: readonly PromptTag[];
/** Case-insensitive containment filter — the workhorse for suggestions. */
export declare function filterTags(tags: readonly PromptTag[], query: string, limit?: number): PromptTag[];
/**
 * Extract the token currently being typed — the text after the last
 * comma or semicolon (trimmed of leading whitespace). Used to scope
 * autocomplete suggestions to just the phrase in progress, not the
 * whole prompt.
 *
 *   extractCurrentToken("a cat, golden") → "golden"
 *   extractCurrentToken("a cat; extreme close") → "extreme close"
 *   extractCurrentToken("a cat") → "a cat"  (no comma yet → whole thing)
 *
 * The cursor position is honored when provided; otherwise the whole
 * string is treated as the token source.
 */
export declare function extractCurrentToken(text: string, cursorPos?: number): string;
/**
 * Insert a tag at the current token position, returning the new text +
 * new cursor position. The token being typed is replaced by the tag
 * value; a comma + space separator is appended so the user can keep
 * adding tags.
 *
 *   insertTagAtToken("a cat, gol", 11, "golden hour")
 *     → { text: "a cat, golden hour, ", cursor: 21 }
 */
export declare function insertTagAtToken(text: string, cursorPos: number, tagValue: string): {
    text: string;
    cursor: number;
};
//# sourceMappingURL=promptTags.d.ts.map
