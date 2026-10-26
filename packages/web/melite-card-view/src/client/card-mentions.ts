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
import type { ChatFileMentions } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConversationNodeDefinition, ConversationTurnDataMap } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CARD_TOOLS } from './card-tools.ts'
import { draftIdOf, type DraftId } from '@melite/contracts/benchStage'
import { chromeCopy } from '../chromeCopy.ts'

/** One card tool's persisted ids, folded from its tool/result meta. */
export interface MeliteCardRow {
  /** The wire tool name that produced the row (CARD_TOOLS member). */
  readonly tool: string
  /** The draft the tool staged, when its meta carried one. */
  readonly draftId: DraftId | null
  /** The run the tool started, when its meta carried one. */
  readonly runId: string | null
}

/** The turn-data value published under the 'meliteCards' key. */
export interface MeliteCardsTurnData {
  readonly rows: readonly MeliteCardRow[]
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationTurnDataMap {
    /** Card-tool ids produced in this Turn (drafts and runs). */
    meliteCards: MeliteCardsTurnData
  }
}

/** The fold's accumulated State (in-memory; the Map pairs result events
 *  back to the tool/call that named the tool). */
interface MeliteCardsState extends MeliteCardsTurnData {
  readonly turn: number
  readonly cardCalls: ReadonlyMap<string, string>
}

const CARD_TOOL_SET: ReadonlySet<string> = new Set<string>(CARD_TOOLS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Read one string field off a tool/result meta object. */
function metaString(meta: unknown, key: string): string | null {
  if (!isRecord(meta)) return null
  const value = meta[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** The state-only node: folds card-tool calls and their persisted
 *  result meta into the turn's 'meliteCards' data. The shapes follow
 *  the engine's own deliverables fold (the tree's template for
 *  event→turn-data state machines). */
export const meliteCardsTurnDefinition: ConversationNodeDefinition<MeliteCardsState> = {
  kind: 'meliteCards',
  match(event) {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    if (event.type === 'tool/call') {
      return CARD_TOOL_SET.has(String(event.data.name)) ? { id: String(event.data.turn), role: 'update' } : null
    }
    if (event.type === 'tool/result') return { id: String(event.data.turn), role: 'update' }
    return null
  },
  start(_context, match) {
    if (match.event.type !== 'turn/start') throw new Error('meliteCards start requires turn/start')
    return { turn: match.event.data.turn, cardCalls: new Map<string, string>(), rows: [] }
  },
  update(context, match) {
    if (match.event.type === 'tool/call') {
      const cardCalls = new Map(context.state.cardCalls)
      cardCalls.set(String(match.event.data.callId), String(match.event.data.name))
      return { ...context.state, cardCalls }
    }
    if (match.event.type !== 'tool/result') return context.state
    // tool/result pairs back to its tool/call through the result
    // message's source.callId (the engine's own deliverables fold
    // pairs the same two fields).
    const callId = String(match.event.data.message.source.callId)
    const tool = context.state.cardCalls.get(callId)
    if (tool === undefined) return context.state
    const draftId = metaString(match.event.data.meta, 'draft_id')
    const runId = metaString(match.event.data.meta, 'run_id')
    if (draftId === null && runId === null) return context.state
    return { ...context.state, rows: [...context.state.rows, { tool, draftId: draftId === null ? null : draftIdOf(draftId), runId }] }
  },
  buildLocationData(context, scope, previous) {
    if (scope !== 'turn' || context.state === undefined) return null
    if (previous?.kind === 'turn' && previous.turn === context.state.turn && previous.key === 'meliteCards' && previous.value.rows === context.state.rows) return previous
    return { kind: 'turn', turn: context.state.turn, key: 'meliteCards', value: { rows: context.state.rows } }
  },
}

/** Build the chatFileMentions service: resolves an id token authored in
 *  one closing turn against the ids THAT turn's card tools produced.
 *  Both id kinds open the same door — the Media page — because that
 *  page is where the draft bench and the run archive both live.
 *  @param openMediaTab - the guarded shell open (never throws). */
export function buildChatFileMentions(openMediaTab: () => void): ChatFileMentions {
  return {
    forClosing(owner) {
      const data = owner.turn.data.get('meliteCards')
      if (data === undefined || data.rows.length === 0) return undefined
      const known = new Map<string, 'draft' | 'run'>()
      for (const row of data.rows) {
        if (row.draftId !== null) known.set(row.draftId, 'draft')
        if (row.runId !== null) known.set(row.runId, 'run')
      }
      if (known.size === 0) return undefined
      return {
        resolve(value: string) {
          const kind = known.get(value)
          if (kind === undefined) return undefined
          return {
            open: () => { openMediaTab() },
            label: value,
            title: chromeCopy.mentionTitle({ kind, value }),
          }
        },
      }
    },
  }
}
