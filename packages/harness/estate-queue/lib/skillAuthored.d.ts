/** One authored skill as the door receives it. */
export interface SkillDraft {
    /** The model family the skill serves ("krea-2"). */
    readonly model: string;
    /** The skill's name — its id leaf and its directory (SLUG_RE). */
    readonly name: string;
    /** One-line summary (rides every load verbatim; one line by law). */
    readonly description: string;
    /** The operator's trigger words, in their order. */
    readonly trigger_words: readonly string[];
    /** The operator's examples, verbatim. */
    readonly examples: readonly string[];
    /** Free markdown after the rendered sections ("" for none). */
    readonly body: string;
    /** The mod row this skill documents (a loras tray file name), or
     *  "" for a skill that names no file. */
    readonly lora: string;
    /** Rewrite an existing doc (the door refuses silently losing the
     *  previous trigger words: an update is an explicit call). */
    readonly replace: boolean;
}
/** The served answer of one write. */
export interface SkillWritten {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly replaced: boolean;
}
/** THE ONE DERIVATION (writer and walker both spell this): the skill
 *  doc's directory under the estate's state root. */
export declare function authoredSkillDir(stateRoot: string, family: string, stem: string): string;
/** The doc file inside the authored skill's directory. */
export declare function authoredSkillDoc(stateRoot: string, family: string, stem: string): string;
/** The doc's text. Deterministic — no timestamps, so a rewrite of the
 *  same draft is byte-identical. */
export declare function renderAuthoredSkill(d: Omit<SkillDraft, "replace">): string;
/**
 * Land one authored skill doc.
 *
 * @param repo the checkout root (the family seat is verified there)
 * @param stateRoot the estate's state root (the authored plane)
 * @param draft the skill as the door received it
 * @returns the served answer (the id the read door answers with)
 * @throws Error with the door's refusal voice when a field is missing,
 *   a leaf is not path-safe, the family is unseated, or an existing
 *   doc would be silently replaced
 */
export declare function writeAuthoredSkill(repo: string, stateRoot: string, draft: SkillDraft): SkillWritten;
//# sourceMappingURL=skillAuthored.d.ts.map
