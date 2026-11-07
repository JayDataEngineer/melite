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
/** Collapse whitespace runs to single spaces and trim the ends — the
 *  prose families' whole formatting law (the spacing a heredoc or a
 *  wrapped wire leaves behind, never the words). */
export function collapsePromptSpace(text) {
    return text.replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=craft.js.map