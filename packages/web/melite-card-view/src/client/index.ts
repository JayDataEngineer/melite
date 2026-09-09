/**
 * `@melite-plugin/dsh-card-view` — browser half.
 *
 * One keyed slot contribution into the shipped composition (verified against
 * the installed CLI's dsh-client-ui-tool bundle): the `tool.call.toolview`
 * seat, keyed to the wire tool names in CARD_TOOLS — the Melite draft
 * producers registered by @melite-plugin/dsh-tools. Unclaimed keys fall
 * back to the generic tool row, so this registration is additive for our
 * own tools.
 *
 * Registration waits for the seat declaration via ctx.slots.inject (the
 * declaration ledger's wait seam); unload cancels a pending wait and cascades
 * the registration.
 *
 * Failure policy: slot problems are logged, never thrown — the web shell fails
 * the whole boot when a plugin apply throws, and an external plugin must not
 * take the GUI down.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the slots service onto ClientContext (ctx.slots) and the
// SlotMap/LocaleNamespaceMap merge tables.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { claimCardViewApply, releaseCardViewApply } from './apply-guard.ts'
import { FlowCards } from './FlowCards.tsx'
import type { ToolCallBlockView, ToolCallOwnerProps } from './types.ts'

// Type-only local spelling of the Tool-owned keyed view slot (the same shape
// dsh-client-ui-tool declares) so this package registers without depending on
// the sibling UI package — same pattern as dsh-task-board's local
// 'web-ui.plugin.item' spelling.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'tool.call.toolview': { kind: 'keyed'; scope: 'session'; owner: ToolCallOwnerProps }
  }
}

/** Every card tool that produces a draft — the card tile renders for ALL of them. */
export const CARD_TOOLS = [
  'melite_flow',
  'image_card', 'tts_card', 'video_card', 'music_card', 'sfx_card',
  'three_d_card', 'motion_card', 'body_card', 'image_edit_card',
  'h3_timeline_card',
  'creature_flow', 'humanoid_flow', 'non_humanoid_flow', 'prop_flow',
  'sprite_sheet',
]
/** @deprecated use CARD_TOOLS — kept for back-compat imports */
export const FLOW_START_TOOL = CARD_TOOLS[0]

/** Required services (fiber inject waiting — the slot registry must be up first). */
export const inject = ['slots']

/**
 * Register the flow card for EVERY card tool so drafts always render
 * as interactive flows in the chat — regardless of which tool made them.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // A duplicated client injection (factory executed twice per page lifetime)
  // would register a second keyed entry. First application wins.
  if (!claimCardViewApply()) return
  ctx.effect(() => releaseCardViewApply, 'melite-card-view: apply claim')

  for (const tool of CARD_TOOLS) {
    try {
      ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
        { name: 'tool.call.toolview', key: tool },
        FlowCards,
      ))
    } catch (error) {
      console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error)
    }
  }
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { parseCardsBlock, FlowCards } from './FlowCards.tsx'
export type { FlowCardsProps } from './FlowCards.tsx'
export type { ToolCallBlockView } from './types.ts'
