/**
 * `@melite-plugin/dsh-card-view` — browser half.
 *
 * Two planes over the estate's cards surface (the bench rework, plan
 * §1 strokes 1/4):
 *
 * 1. The chat plane (unchanged): the `tool.call.toolview` keyed slot,
 *    keyed to the wire tool names in CARD_TOOLS — the Melite draft
 *    producers registered by @melite-plugin/dsh-tools. Unclaimed keys
 *    fall back to the generic tool row, so this registration is
 *    additive for our own tools.
 *
 * 2. The sidebar plane (new, 2026-09-10): the `cards` tab TYPE on the
 *    native right-sidebar registry (two registrations sharing one
 *    kind, the ui-sidebar-right contract — the shipped
 *    documentpreview is the reference) plus the `cards` resource
 *    provider (ctx.resources) the body reads through `useResource`.
 *    The tab claims `dsh-resource://cards/**`; `openTab('cards')`
 *    opens the bench page. This replaces the dsh-better-sidebar
 *    registry (retired with the plugin) — the native subsystem is
 *    the one the web profile ships.
 *
 * Registration waits for seat declarations via ctx.slots.inject (the
 * declaration ledger's wait seam); unload cancels a pending wait and
 * cascades the registration.
 *
 * Failure policy: slot/registry problems are logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws, and
 * an external plugin must not take the GUI down.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots, sidebar-right owns ctx.sidebarRightTabs,
// resources owns ctx.resources. The SlotMap key below merges onto
// ui-slots' root table (the lexical declare-merge point).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import { claimCardViewApply, releaseCardViewApply } from './apply-guard.ts'
import { imgToMeshStudio } from './img-to-mesh-studio.tsx'
import { FlowCards } from './FlowCards.tsx'
import { CardsTab } from './CardsTab.tsx'
import { CARDS_BENCH_ADDRESS, openCardsResource } from './cards-resource.ts'
import { resolveCardsAddress } from './CardsTab.tsx'
import type { StageViewOwnerProps, ToolCallBlockView, ToolCallOwnerProps } from './types.ts'

// Type-only local spelling of the Tool-owned keyed view slot (the same shape
// dsh-client-ui-tool declares) so this package registers without depending on
// the sibling UI package — same pattern as dsh-task-board's local
// 'web-ui.plugin.item' spelling.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'tool.call.toolview': { kind: 'keyed'; scope: 'session'; owner: ToolCallOwnerProps }
    /**
     * Keyed stage surface, dispatched by card name (the ui-tool
     * 'tool.call.toolview' law, mirrored). Register with
     * `key: '<card name>'` to own how one card's stage renders inside
     * the zoom card — the key domain is open (any card name), so a
     * typo simply never renders. An unclaimed key falls back to the
     * generic form-spec card; registering is additive for your own
     * card and a takeover for a shipped one. The owner passes the
     * stage's identity, its frozen bench row, and the drill's own
     * verbs, so the view stays a pure function of what the bench
     * already knows.
     */
    'cards.stage.view': { kind: 'keyed'; scope: 'session'; owner: StageViewOwnerProps }
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

/** The tab type's identity (the key its body registers under). */
const CARDS_TAB_ID = '@melite-plugin/dsh-card-view'

/** Required services (fiber inject waiting — the registries must be up
 *  first: the native sidebar subsystem + the resource model). */
export const inject = ['slots', 'sidebarRightTabs', 'resources']

/**
 * Register both planes: the toolview keys for every card tool, and the
 * cards tab (type + body + resource provider).
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

  // BUILT-IN STUDIO SURFACE (the ui-tool law: the host package ships
  // its own cards' views — read/search/web live in ui-tool; img-to-mesh
  // lives here). Third-party cards register additively from their own
  // packages through the same keyed slot.
  ctx.plugin(imgToMeshStudio)

  // Stage one — the tab type: claims every cards address; the bench
  // page is opened by kind ('cards'). Extension band is the default a
  // type from outside the product carries.
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: CARDS_TAB_ID,
      kind: 'cards',
      patterns: ['dsh-resource://cards/**'],
      title: (address: string): string => {
        // THE ADDRESS LAW (the 'sidebar://cards' title bug, 2026-09-11:
        // the operator's own DOM paste): any address the shell opens
        // resolves through the SAME law the body rides — the bench page
        // is titled 'Cards' no matter which address form reached it
        // (guide clicks arrive as sidebar://cards, openTab as the
        // dsh-resource form).
        const resolved = resolveCardsAddress(address)
        return resolved === CARDS_BENCH_ADDRESS ? 'Cards' : resolved.replace(/^dsh-resource:\/\/cards\//, '')
      },
      guide: [{
        order: 50,
        title: (): string => 'Cards',
        description: (): string => 'The working flow — the shared bench and its runs.',
      }],
    }), 'melite-card-view: cards tab type')
  } catch (error) {
    console.error('[melite-card-view] cards tab type registration failed:', error)
  }

  // Stage two — the body, dispatched under the type's id.
  try {
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
      {
        name: 'sidebar.right.pane.tab',
        key: CARDS_TAB_ID,
        // The tab HOSTS card surfaces: declaring the child puts
        // renderSlot('cards.stage.view') into CardsTab's composed
        // props (the ui-tool children law).
        children: {
          'cards.stage.view': { kind: 'keyed', scope: 'session' },
        },
      },
      CardsTab,
    ))
  } catch (error) {
    console.error('[melite-card-view] cards tab body registration failed:', error)
  }

  // The resource provider — the values the body reads (and the wand's
  // openResource targets, plan §5).
  try {
    ctx.effect(() => ctx.resources.register({
      protocol: 'cards',
      open: openCardsResource,
    }), 'melite-card-view: cards resource provider')
  } catch (error) {
    console.error('[melite-card-view] cards resource provider registration failed:', error)
  }
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { parseCardsBlock, FlowCards } from './FlowCards.tsx'
export type { FlowCardsProps } from './FlowCards.tsx'
export type { ToolCallBlockView } from './types.ts'
export {
  CARDS_BENCH_ADDRESS, cardsRunAddress, parseCardsAddress, mergeRunFrame,
  restoreRunToBench,
} from './cards-resource.ts'
export type {
  CardsValue, CardsBenchValue, CardsRunValue, BenchStageRow, BenchLogHead, RunStageStatus,
  RestoreReport,
} from './cards-resource.ts'
export { CardsTab, groupStagesByCard } from './CardsTab.tsx'
