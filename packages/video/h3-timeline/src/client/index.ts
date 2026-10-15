/**
 * h3-timeline client entry — the card package's OWN cards.stage.view
 * surface (2026-09-12, the composition-root correction: a card's
 * studio registers from ITS package, never from the bench host —
 * adding a card never touches the host, the DSH plugin contract).
 *
 * THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM and
 * whatever renders its authoring surface is INJECTED): the h3-timeline
 * card's authoring surface is this package's own studio —
 * src/ui/studio/component.tsx (VideoTimelineStudio, the 26-file
 * three-layer NLE tenant the family serves as studio.tenant
 * "video/h3-timeline"). This module is the ADAPTER that mounts it on
 * the bench slot — never a second definition site: the owner props
 * pass through VERBATIM onto the tenant (the one-truth currency,
 * 2026-10-27 — the tenant speaks StageViewOwnerProps and projects
 * its CardStage internally in ui/studio/projection.ts); the document
 * rides stage.params; writes ride onPatch (patchStageParams' partial
 * merge — the E4 write channel, observed ⊆ the family's declared
 * writes); the run rides the host drill's own Run row.
 */
import { createElement as h } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { defineStageViewRegistration, wireContractToastToRowStore } from '@melite/card-base/client'
import type { ManageNamespace } from '@melite/card-base/client'
import type {
  StageViewOwnerProps,
} from '@melite/contracts'
import { VideoTimelineStudio, seatStudioManageLane } from '../ui/studio/component.tsx'

// CONTRACT TOASTS — wire the inlined catalog contract stores to the
// row's toast store via card-base's shared wire (plugin-law N1,
// 2026-10-20: one lambda spelling, one ordering proof).
wireContractToastToRowStore()

/** The registration (the ui-tool law): the card package registers its
 * own shipped studio's view under its card key. */
/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'h3TimelineStudio'

// NO estate injects here (the fifth receipt, 2026-09-29): studios
// load BEFORE the mounter in the plugin URL, and a static estate
// inject parks this plugin forever waiting on card-view's own
// $mount. The estate bind rides the factory's armed lazy getter over
// the inject-free ctx.get seam — order-proof by construction.
export const inject = ['slots']

const registerStageView = defineStageViewRegistration('h3-timeline', H3TimelineStudio)

/** The row's apply: the keyed-seam registration, PLUS the one manage
 *  seat this studio speaks (THE REFMODS LISTING DOOR's client arm,
 *  2026-11-05). The deck's assets-tab pattern, studio-shaped: the
 *  deck seats `ctx.remote.manage` at apply because its static estate
 *  inject makes that read legal — a studio's would park it (the fifth
 *  receipt), so the seat arms over the SAME inject-free reflect seam
 *  the factory's lazy bind rides and is READ at verb time, when the
 *  mounter's $mount has long landed. A host without the manage
 *  contribution answers undefined — the tenant's honest-empty, the
 *  manual fallback unchanged (studios still boot without it). */
export function apply(ctx: Parameters<typeof registerStageView>[0]): void {
  registerStageView(ctx)
  seatStudioManageLane(() => ctx.get('remote.manage') as ManageNamespace | undefined)
}

/** The timeline surface — registered under key 'h3-timeline'. The
 * ADAPTER: the tenant mounted verbatim on the owner props — the
 * projection lives inside the tenant (ui/studio/projection.ts),
 * never here. */
export function H3TimelineStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  // the kit's TooltipProvider wrap died with the kit (2026-09-12):
  // the tenant's Tips are DSH Tooltips now — self-providing, no
  // app-root provider needed.
  return h('div', { 'data-testid': 'h3-studio-tenant', style: { height: '100%', minHeight: 0 } },
    h(VideoTimelineStudio, props),
  )
}
