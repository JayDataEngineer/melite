/**
 * card-mentions — the id vocabulary for chat prose (task d, seam ii).
 *
 * The honest fold: melite's card tools persist their presentationMeta
 * ({draft_id, run_id}) on the session's tool/result events, so a
 * conversation node CAN know which ids a turn produced without
 * guessing. This module owns the state-only node definition that
 * folds those events into a turn-data value, and the chatFileMentions
 * provider that resolves an authored id token against it — a token
 * the closing prose writes as inline code (`p_x1` / `run-9`) becomes
 * a link opening the Media page, where both draft tiles and run
 * artifacts live. Tokens are matched EXACTLY; a renderer that guessed
 * at what "looks like an id" is the anti-pattern the MarkdownFileMentions
 * contract exists to prevent. A turn with no card ids provides no
 * resolver at all (undefined — the prose stays inert code).
 */
import type { ChatFileMentions } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
/** One card tool's persisted ids, folded from its tool/result meta. */
export interface MeliteCardRow {
    /** The wire tool name that produced the row (CARD_TOOLS member). */
    readonly tool: string;
    /** The draft the tool staged, when its meta carried one. */
    readonly draftId: string | null;
    /** The run the tool started, when its meta carried one. */
    readonly runId: string | null;
}
/** The turn-data value published under the 'meliteCards' key. */
export interface MeliteCardsTurnData {
    readonly rows: readonly MeliteCardRow[];
}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ConversationTurnDataMap {
        /** Card-tool ids produced in this Turn (drafts and runs). */
        meliteCards: MeliteCardsTurnData;
    }
}
/** The fold's accumulated State (in-memory; the Map pairs result events
 *  back to the tool/call that named the tool). */
interface MeliteCardsState extends MeliteCardsTurnData {
    readonly turn: number;
    readonly cardCalls: ReadonlyMap<string, string>;
}
/** The state-only node: folds card-tool calls and their persisted
 *  result meta into the turn's 'meliteCards' data. The shapes follow
 *  the engine's own deliverables fold (the tree's template for
 *  event→turn-data state machines). */
export declare const meliteCardsTurnDefinition: ConversationNodeDefinition<MeliteCardsState>;
/** Build the chatFileMentions service: resolves an id token authored in
 *  one closing turn against the ids THAT turn's card tools produced.
 *  Both id kinds open the same door — the Media page — because that
 *  page is where the draft bench and the run archive both live.
 *  @param openMediaTab - the guarded shell open (never throws). */
export declare function buildChatFileMentions(openMediaTab: () => void): ChatFileMentions;
export {};
//# sourceMappingURL=card-mentions.d.ts.map
