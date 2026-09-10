/**
 * `@infer-media/dsh-media` — client half.
 *
 * Registers TWO native right-sidebar page tabs ("Media", "Flows") backed
 * DIRECTLY on the same-origin /v1/flows doors (the estate collapse
 * deleted the host half's merge routes). Migrated 2026-09-10
 * from the retired dsh-better-sidebar registry (uninstalled with the
 * plugin) onto the web profile's native subsystem — the two-registration
 * contract per ui-sidebar-right (the shipped documentpreview is the
 * reference): the tab TYPE via ctx.sidebarRightTabs.register (id + kind;
 * page tabs carry no patterns — they are opened by kind), the BODY via
 * the keyed `sidebar.right.pane.tab` seat under the type's id.
 *
 * NO CHROME-DRIVING SELF-HEAL. The 700ms openTab tick machine that used
 * to live here is deleted with the migration: the old dock booted closed
 * and swallowed one-shot opens; the native right sidebar governs its own
 * layout, lists every page type in the add-control's guide, and a plugin
 * never drives host chrome on a timer (the law the assets tab already
 * carries). Reachability is the guide entry + ctx.sidebarRight.openTab.
 *
 * This entry is deliberately JSX-free (the shared preset only discovers
 * src/client/index.ts); React elements are built with createElement and
 * the glyphs live in MediaPanel.tsx / FlowsPanel.tsx.
 */
import * as React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { claimMediaApply, releaseMediaApply } from './apply-guard.ts'
import { MediaPanel, MediaTabIcon } from './MediaPanel.tsx'
import { FlowsPanel, FlowsTabIcon } from './FlowsPanel.tsx'

/** 'slots' (seat declarations) + the native tab registry (the body slot
 *  is declared by the sidebar package itself; the registry must be up
 *  first for the type registrations). */
export const inject = ['slots', 'sidebarRightTabs']

export function apply(ctx: ClientContext): void {
  if (!claimMediaApply()) return
  ctx.effect(() => releaseMediaApply, 'infer-media: apply claim')

  // Media — the merged run browser, one guide box under the cards tab.
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: 'infer-media:media',
      kind: 'media',
      title: (): string => 'Media',
      guide: [{
        order: 51,
        title: (): string => 'Media',
        description: (): string => 'Every gateway\'s runs and artifacts, merged.',
        icon: MediaTabIcon,
      }],
    }), 'infer-media: media tab type')
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: 'infer-media:media' },
      MediaPanel,
    ))
  } catch (error) {
    console.error('[infer-media] media tab registration failed:', error)
  }

  // Flows — the composed action cards (drafts) one guide box below Media.
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: 'infer-media:flows',
      kind: 'flows',
      title: (): string => 'Flows',
      guide: [{
        order: 52,
        title: (): string => 'Flows',
        description: (): string => 'The composed action cards (drafts), every gateway.',
        icon: FlowsTabIcon,
      }],
    }), 'infer-media: flows tab type')
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: 'infer-media:flows' },
      FlowsPanel,
    ))
  } catch (error) {
    console.error('[infer-media] flows tab registration failed:', error)
  }
}
