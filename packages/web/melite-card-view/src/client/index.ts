/**
 * `@melite-plugin/dsh-card-view` — browser half.
 *
 * Two planes over the estate's cards surface (the bench rework, plan
 * §1 strokes 1/4):
 *
 * 1. The chat plane (unchanged): the `tool.call.toolview` keyed slot,
 *    keyed to the wire tool names in CARD_TOOLS — the Melite draft
 *    producers registered by @melite/harness-tools. Unclaimed keys
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
// The gateway client's remote service seat (ctx.remote: $mount/$stream
// + the mounted namespace face) and the estate's generated
// contribution (TYPERT_REMOTE — the descriptor set the mount serves;
// its declaration merge types ctx.remote.bench / ctx.remote.drafts).
import type {} from '@deepseek-ai/dsh-api-gateway/client'
// All four estate contributions (bench/drafts from estate-drafts,
// runs, media) — the one-lane law: every estate verb the tab speaks
// rides these mounted namespaces.
import { TYPERT_REMOTE } from '@melite/estate-drafts/remote'
import { TYPERT_REMOTE as RUNS_TYPERT_REMOTE } from '@melite/estate-runs/remote'
import { TYPERT_REMOTE as MEDIA_TYPERT_REMOTE } from '@melite/estate-media/remote'
import { FlowCards } from './FlowCards.tsx'
import { CardsTab } from './CardsTab.tsx'
import { CARDS_BENCH_ADDRESS, benchAddressOf, benchSessionKey, openCardsResource, shouldSpotlight, watchBenchLands, type BenchNamespace } from './cards-resource.ts'
import { bindEstateRemote } from '@melite/card-base/estate-remote'
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
  // TOOL-PLANE names (the DSH plain-id convention — h3-timeline
  // tool.ts: "the card id, hyphens→underscores, no suffix"): the
  // chat harness calls the tool by THIS name, so the toolview seat
  // must claim it for the conversation card to render (the registry
  // plane's h3_timeline_card is the composition wire name, a
  // different plane). Live-lane receipt 2026-09-12: an accepted
  // h3_timeline chat run rendered the generic tool card, no rows.
  'h3_timeline',
]
/** @deprecated use CARD_TOOLS — kept for back-compat imports */
export const FLOW_START_TOOL = CARD_TOOLS[0]

/** The tab type's identity (the key its body registers under). */
const CARDS_TAB_ID = '@melite-plugin/dsh-card-view'

/** Required services (fiber inject waiting — the registries must be up
 *  first: the native sidebar subsystem + the resource model + the
 *  sidebar's navigation face, which the conversation card's rows ride
 *  to open the Cards tab at a draft stage — the old embed's law — and
 *  the gateway client's remote service, which carries the mounted
 *  estate namespaces the bench tail consumes). */
export const inject = ['slots', 'sidebarRightTabs', 'resources', 'sidebarRight', 'remote']

/**
 * Register both planes: the toolview keys for every card tool, and the
 * cards tab (type + body + resource provider).
 * @param ctx - client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  // THE CONTRIBUTION MOUNT (the mux swap's client half, 2026-09-15):
  // the generated bench/drafts descriptors mount onto ctx.remote —
  // after this the browser speaks the estate's remotes natively
  // (bench/subscribe pushes over the same-origin mux; the poll era's
  // HTTP heartbeat is dead). The mount rides the plugin's effect
  // lifetime (cordis disposes with the plugin); a failed mount is
  // LOGGED, never thrown — the cards tab then serves one HTTP
  // snapshot + one visible failure frame (the silent-death law), and
  // the rest of the plugin keeps its seats.
  try {
    const dispose = await ctx.remote.$mount(TYPERT_REMOTE)
    ctx.effect(() => dispose, 'melite-card-view: estate remote contribution')
  } catch (error) {
    console.error('[melite-card-view] estate remote contribution failed to mount:', error)
  }
  // The runs + media contributions ride the same mount seam (stroke
  // 81 — the one estate lane; a failed mount logs, never throws the
  // boot: the verbs then refuse loudly at the bind seam).
  try {
    const disposeRuns = await ctx.remote.$mount(RUNS_TYPERT_REMOTE)
    ctx.effect(() => disposeRuns, 'melite-card-view: runs remote contribution')
  } catch (error) {
    console.error('[melite-card-view] runs remote contribution failed to mount:', error)
  }
  try {
    const disposeMedia = await ctx.remote.$mount(MEDIA_TYPERT_REMOTE)
    ctx.effect(() => disposeMedia, 'melite-card-view: media remote contribution')
  } catch (error) {
    console.error('[melite-card-view] media remote contribution failed to mount:', error)
  }

  // DOUBLE-APPLY LAW (client contract): registration conflicts fail at
  // load — "do not work around it; the conflict is the design
  // speaking." A stale-bundle second apply throws per registration;
  // the per-site catch logs it and the FIRST registration keeps the
  // seat. No cross-instance guard, no module/global flag.

  // THE NAMESPACE SEATS (the inject fix, extended stroke 81): stream
  // callbacks run detached from any inject-declaring fiber, and each
  // namespace is a NESTED SERVICE whose access requires the dotted
  // inject on the accessing fiber — the 2026-09-15 live lane died
  // with "cannot get property \"remote.bench\" without inject". A
  // static inject on THIS plugin would deadlock (the namespaces
  // exist only after our own $mount lands), so the capture rides a
  // CHILD PLUGIN started after the mounts: its fiber declares the
  // four injects, resolves the namespace services once, and the
  // captured objects are plain services — later calls at callback
  // time carry no access checks. The bind ALSO seats the one-lane
  // verb module (@melite/card-base/estate-remote): every
  // bench/drafts/runs/media verb in the tab rides these namespaces. The child disposes with
  // this plugin (the namespaces die with the mounts anyway).
  let benchNs: BenchNamespace | undefined
  try {
    const fiber = ctx.plugin({
      name: 'melite-card-view: estate namespaces',
      inject: ['remote.bench', 'remote.drafts', 'remote.runs', 'remote.media'],
      apply: (child: ClientContext): void => {
        benchNs = child.remote.bench
        bindEstateRemote({
          bench: child.remote.bench,
          drafts: child.remote.drafts,
          runs: child.remote.runs,
          media: child.remote.media,
        })
      },
    })
    await fiber
  } catch (error) {
    console.error('[melite-card-view] estate namespace fiber failed:', error)
  }

  for (const tool of CARD_TOOLS) {
    try {
      // THE SURFACE FACE: the conversation card's way into the Cards
      // tab rides the register call's inject share (plain callback from
      // the apply closure — the contract's own cross-surface channel):
      // ctx.sidebarRight.openResource claims the address, places it,
      // and reveals the column in one step (ISidebarRight).
      ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
        {
          name: 'tool.call.toolview',
          key: tool,
          inject: (): { openSurface: (address: string) => boolean } => ({
            openSurface: (address: string): boolean => { ctx.sidebarRight.openResource(address); return true },
          }),
        },
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
        if (resolved.startsWith(CARDS_BENCH_ADDRESS)) return 'Cards'
        return resolved.replace(/^dsh-resource:\/\/cards\//, '')
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
        // The tab HOSTS card surfaces: declaring the children puts
        // renderSlot('cards.stage.view') and
        // renderSlot('cards.stage.preview') into CardsTab's composed
        // props (the ui-tool children law — hour-9: the preview seam
        // rides here so the shared video/image previews render).
        children: {
          'cards.stage.view': { kind: 'keyed', scope: 'session' },
          'cards.stage.preview': { kind: 'keyed', scope: 'session' },
        },
      },
      CardsTab,
    ))
  } catch (error) {
    console.error('[melite-card-view] cards tab body registration failed:', error)
  }

  // The resource provider — the values the body reads (and the wand's
  // openResource targets, plan §5). The LIVE remote face rides the
  // open call (the bench tail subscribes through it; a failed mount
  // leaves it absent and the provider degrades visibly).
  try {
    ctx.effect(() => ctx.resources.register({
      protocol: 'cards',
      open: (address: string, rctx: { signal: AbortSignal }) =>
        openCardsResource(address, rctx, ctx.remote, benchNs),
    }), 'melite-card-view: cards resource provider')
  } catch (error) {
    console.error('[melite-card-view] cards resource provider registration failed:', error)
  }

  // THE BENCH SPOTLIGHT (stroke 42, the one-flow law: "AI
  // conversation and human share 1 FLOW — there is no other flow
  // state"): while the cards surface is not the user's visible seat,
  // an agent-authored bench write brings the Cards tab FORWARD —
  // openResource claims the bench address, places it, and reveals
  // the column in one step (ISidebarRight: "content the user cannot
  // see is not opened"). The chat's construct writes carry author
  // "agent" in the served log (bench.ts's default), the human's own
  // writes carry "user" — the watcher discriminates on exactly that,
  // so the reveal never fires for the user's own gestures. A failed
  // reveal (no session mounted yet) surfaces in the console, never
  // silently.
  try {
    // THE SESSION SOURCE (stroke 44): uiSession's scope adapter
    // follows the current selection — getSnapshot().props.sessionId
    // (the ui-session merge's SessionStandardProps) is the active
    // conversation. The watcher reads it on every wake and subscribes
    // to the adapter's observable for push-driven re-keys (a
    // conversation switch re-keys the bench stream at switch time —
    // HostObservable.subscribe, no timer).
    const activeBenchSession = (): string => {
      try {
        const uiSession = (ctx as unknown as { uiSession?: { adapter?: { current?: { getSnapshot?: () => { props?: Record<string, unknown> } } } } }).uiSession
        const snap = uiSession?.adapter?.current?.getSnapshot?.()
        const sid = snap?.props?.['sessionId']
        return benchSessionKey(typeof sid === 'string' ? sid : undefined)
      } catch {
        // the address-grammar root spells the unattributed bench —
        // never a local literal (the sessionkey law)
        return benchSessionKey(undefined)
      }
    }
    const subscribeBenchSession = (fn: () => void): (() => void) => {
      try {
        const uiSession = (ctx as unknown as { uiSession?: { adapter?: { current?: { subscribe?: (listener: () => void) => () => void } } } }).uiSession
        const off = uiSession?.adapter?.current?.subscribe?.(fn)
        return typeof off === 'function' ? off : () => {}
      } catch {
        return () => {}
      }
    }
    ctx.effect(() => watchBenchLands(activeBenchSession, (sessionKey) => {
      try {
        if (shouldSpotlight(ctx.sidebarRight.isExpanded())) {
          ctx.sidebarRight.openResource(benchAddressOf(sessionKey))
        }
      } catch (error) {
        console.error('[melite-card-view] bench spotlight reveal failed:', error)
      }
    }, undefined, ctx.remote, benchNs, subscribeBenchSession), 'melite-card-view: bench spotlight')
  } catch (error) {
    console.error('[melite-card-view] bench spotlight registration failed:', error)
  }
}

// EXPORT DISCIPLINE (client contract, packages/client/AGENTS.md): the
// /client entry exports only what cordis loading needs — apply +
// inject below. Components, helpers, and constants stay internal;
// same-package tests import relatively (../src/client/...), which is
// the sanctioned zero-machinery path. (CARD_TOOLS stays internal to
// the apply loop; no consumer — melite-tools' wall test owns its own
// list.)
