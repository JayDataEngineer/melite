export declare function enhanceRecipes(root?: string): Record<string, string>;
/** The served recipe for one model: exact route key first, else the
 *  family head entry, else null (the caller's stub stands and the
 *  sweep falls to the generic recipe — the no-file law). */
export declare function enhanceRecipeFor(model: string, family: string): string | null;
//# sourceMappingURL=enhanceRecipes.d.ts.map
