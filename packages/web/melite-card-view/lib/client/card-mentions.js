import { CARD_TOOLS } from "./card-tools.js";
const CARD_TOOL_SET = new Set(CARD_TOOLS);
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
/** Read one string field off a tool/result meta object. */
function metaString(meta, key) {
    if (!isRecord(meta))
        return null;
    const value = meta[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}
/** The state-only node: folds card-tool calls and their persisted
 *  result meta into the turn's 'meliteCards' data. The shapes follow
 *  the engine's own deliverables fold (the tree's template for
 *  event→turn-data state machines). */
export const meliteCardsTurnDefinition = {
    kind: 'meliteCards',
    match(event) {
        if (event.type === 'turn/start')
            return { id: String(event.data.turn), role: 'start' };
        if (event.type === 'tool/call') {
            return CARD_TOOL_SET.has(String(event.data.name)) ? { id: String(event.data.turn), role: 'update' } : null;
        }
        if (event.type === 'tool/result')
            return { id: String(event.data.turn), role: 'update' };
        return null;
    },
    start(_context, match) {
        if (match.event.type !== 'turn/start')
            throw new Error('meliteCards start requires turn/start');
        return { turn: match.event.data.turn, cardCalls: new Map(), rows: [] };
    },
    update(context, match) {
        if (match.event.type === 'tool/call') {
            const cardCalls = new Map(context.state.cardCalls);
            cardCalls.set(String(match.event.data.callId), String(match.event.data.name));
            return { ...context.state, cardCalls };
        }
        if (match.event.type !== 'tool/result')
            return context.state;
        // tool/result pairs back to its tool/call through the result
        // message's source.callId (the engine's own deliverables fold
        // pairs the same two fields).
        const callId = String(match.event.data.message.source.callId);
        const tool = context.state.cardCalls.get(callId);
        if (tool === undefined)
            return context.state;
        const draftId = metaString(match.event.data.meta, 'draft_id');
        const runId = metaString(match.event.data.meta, 'run_id');
        if (draftId === null && runId === null)
            return context.state;
        return { ...context.state, rows: [...context.state.rows, { tool, draftId, runId }] };
    },
    buildLocationData(context, scope, previous) {
        if (scope !== 'turn' || context.state === undefined)
            return null;
        if (previous?.kind === 'turn' && previous.turn === context.state.turn && previous.key === 'meliteCards' && previous.value.rows === context.state.rows)
            return previous;
        return { kind: 'turn', turn: context.state.turn, key: 'meliteCards', value: { rows: context.state.rows } };
    },
};
/** Build the chatFileMentions service: resolves an id token authored in
 *  one closing turn against the ids THAT turn's card tools produced.
 *  Both id kinds open the same door — the Media page — because that
 *  page is where the draft bench and the run archive both live.
 *  @param openMediaTab - the guarded shell open (never throws). */
export function buildChatFileMentions(openMediaTab) {
    return {
        forClosing(owner) {
            const data = owner.turn.data.get('meliteCards');
            if (data === undefined || data.rows.length === 0)
                return undefined;
            const known = new Map();
            for (const row of data.rows) {
                if (row.draftId !== null)
                    known.set(row.draftId, 'draft');
                if (row.runId !== null)
                    known.set(row.runId, 'run');
            }
            if (known.size === 0)
                return undefined;
            return {
                resolve(value) {
                    const kind = known.get(value);
                    if (kind === undefined)
                        return undefined;
                    return {
                        open: () => { openMediaTab(); },
                        label: value,
                        title: `melite ${kind} ${value} — opens the Media page`,
                    };
                },
            };
        },
    };
}
//# sourceMappingURL=card-mentions.js.map
