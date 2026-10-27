// craft.ts — THE CARD-OWNED CRAFT SEAM (the agent-flow rework's slice
// 6, H5's adjudicated split).
//
// H5's burn (the image→video transcript, 2026-11-12): the anima grammar
// and the H3 prompt modes produce GOOD outputs — but the agent read the
// manuals per request, so craft knowledge rode on the agent's back. The
// adjudication split it in two
// (dev_docs/audits/agent-flow-rework-research-prompt-2026-11-12.md):
// the FORMATTING law is card-owned PREPROCESSING (a mechanical rewrite
// the write door applies, so compose is already correct), and the
// CONTENT style is a one-line hint the load digest serves. A
// preprocessor fixes spacing; it cannot invent the tags — a rewritten
// prompt is a different picture, which is why the family's grammar
// REFUSAL (anima's checkAnimaPromptTags) stays the last-resort judge
// for a hand-written bench doc, and this seam only restores the
// declared spelling.
//
// Source: DSH agent-experience, "describe behavior, not implementation"
// and "parameter rules on the parameter"
// (dev_docs/research/agent-surfaces/deepseek-harness-agent-experience-2026-10-23.md).

/** One mechanical fix the card's preprocessor applied to a param. */
export interface CraftFix {
  /** the param seat that changed (prompt, negative_prompt, …) */
  readonly param: string
  /** the rule the write answer echoes as `craft:<rule>` */
  readonly rule: string
}

/** The preprocessor's rewrite: the params to store plus what changed. */
export interface CraftRewrite {
  readonly params: Record<string, unknown>
  readonly fixed: readonly CraftFix[]
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
  readonly promptHint?: string
  /** The formatting law: a pure rewrite of the params bag. Returns
   *  the bag to store (the original object when nothing changed) plus
   *  one fix per rule that fired. */
  normalize?(params: Record<string, unknown>): CraftRewrite
}

/** Collapse whitespace runs to single spaces and trim the ends — the
 *  prose families' whole formatting law (the spacing a heredoc or a
 *  wrapped wire leaves behind, never the words). */
export function collapsePromptSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
