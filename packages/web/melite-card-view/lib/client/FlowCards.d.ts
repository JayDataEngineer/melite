import type { ToolCallBlockView } from './types.js';
export interface FlowCardsProps {
    block: ToolCallBlockView;
    /** The shell's navigation face — the register site's inject share
     *  (the client contract's own channel for cross-surface callbacks;
     *  the entry captures ctx.sidebarRight.openResource there). Absent
     *  in headless harnesses/tests: the row degrades to the in-card
     *  drill, never throws. Returns false when the shell refused. */
    openSurface?: (address: string) => boolean;
    /** Opens the shell's Media page (the archive the card's runs land
     *  in). The header affordance renders only when the register site
     *  provides it; a shell refusal returns false and the card stays. */
    openMedia?: () => boolean;
}
/** Parse the melite_flow / card-tool call: the draft id + the model
 *  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
 *  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
 *  every card tool emits it; the handle is read from meta, never
 *  parsed out of prose. The render-text token ('card <draftId>') is
 *  the LEGACY fallback: sessions logged before a tool grew its
 *  projector still hydrate through the parse rule. */
export declare function parseCardsBlock(block: ToolCallBlockView): {
    draftId: string | null;
    model: string | null;
    malformedArgs: boolean;
    settled: boolean;
    isError: boolean;
};
/** One melite_flow call as the REAL action cards (native React, in-tree). */
export declare function FlowCards({ block, openSurface, openMedia }: FlowCardsProps): import("react").JSX.Element;
//# sourceMappingURL=FlowCards.d.ts.map
