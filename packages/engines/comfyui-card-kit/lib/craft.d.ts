/** One mechanical fix the card's preprocessor applied to a param. */
export interface CraftFix {
    /** the param seat that changed (prompt, negative_prompt, …) */
    readonly param: string;
    /** the rule the write answer echoes as `craft:<rule>` */
    readonly rule: string;
}
/** The preprocessor's rewrite: the params to store plus what changed. */
export interface CraftRewrite {
    readonly params: Record<string, unknown>;
    readonly fixed: readonly CraftFix[];
}
/** THE CARD-OWNED CRAFT LAW — two halves, one declaration:
 *
 *  `promptHint` is the CONTENT-style line the load digest serves (the
 *  fact the agent used to read a manual for), and `normalize` is the
 *  FORMATTING law the write door applies before the bench stores a
 *  param. A card with no craft law declares nothing and every write
 *  passes through untouched (the no-op law). */
export interface CardCraft {
    /** The one-line style hint the load digest serves — content, not
     *  formatting (the preprocessor cannot invent tags). */
    readonly promptHint?: string;
    /** The formatting law: a pure rewrite of the params bag. Returns
     *  the bag to store (the original object when nothing changed) plus
     *  one fix per rule that fired. */
    normalize?(params: Record<string, unknown>): CraftRewrite;
}
/** Collapse whitespace runs to single spaces and trim the ends — the
 *  prose families' whole formatting law (the spacing a heredoc or a
 *  wrapped wire leaves behind, never the words). */
export declare function collapsePromptSpace(text: string): string;
//# sourceMappingURL=craft.d.ts.map
