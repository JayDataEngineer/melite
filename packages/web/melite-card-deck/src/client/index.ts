/**
 * `@melite-plugin/dsh-card-deck` — browser half.
 *
 * Restored 2026-09-05 (operator order: clicking Cards "would change the
 * middle panel to a pure action card flow view") after the 2026-09-04
 * retirement (d157b6c). The client surface is:
 *
 * - the left-sidebar "Cards" row (deck-sidebar-entry) — the family
 *   pattern (Task Board / SSH): one click toggles a taskboard-style
 *   takeover of the CENTER column, mounting DeckCanvas (the /editor
 *   card studio iframe). The RIGHT-PANEL LAW (2026-09-05, operator
 *   order) is structural: the column claim is the semantic
 *   [data-pane="conversation"] pane only, every bleed rule is scoped
 *   under this plugin's own placed attribute, and the deck REFUSES to
 *   mount rather than guess — the bleed cannot reach the right panel
 *   (deck-fullbleed.ts).
 * - the native right-sidebar tab that is NOT cards: Ray ComfyUI — the
 *   NATIVE ComfyUI manager on POST /v1/manage (assets-tab.tsx; Ray
 *   Flows retired with the yaml spec library, Ray Media lives in
 *   @infer-media/dsh-media). Migrated 2026-09-10 off the retired
 *   dsh-better-sidebar registry onto ui-sidebar-right's two-stage
 *   contract (type + keyed body).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { claimDeckApply, releaseDeckApply } from './apply-guard.ts'
import { registerRayAssetsTab } from './assets-tab.tsx'
import { mountCardsSidebarEntry } from './deck-sidebar-entry.tsx'
import { mountDeckFullbleed } from './deck-fullbleed.ts'

/** 'slots' (seat declarations) + the native right-sidebar tab registry
 * (ui-sidebar-right, the web profile's own subsystem) — hosts the tabs. */
export const inject = ['slots', 'sidebarRightTabs']

export function apply(ctx: ClientContext): void {
  if (!claimDeckApply()) return
  ctx.effect(() => releaseDeckApply, 'ray-card-deck: apply claim')

  // The Cards left-sidebar entry — toggles the center-column takeover
  // (deck-sidebar-entry mounts DeckCanvas into the VERIFIED column).
  // Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountCardsSidebarEntry(), 'ray-card-deck: sidebar entry')
  } catch (error) {
    console.error('[ray-card-deck] sidebar entry mount failed:', error)
  }

  // Full-bleed takeover of the center column while the deck container is
  // the resident view — the family's Task Board / SSH method (column-level
  // overlay + <html> attribute + their dsh-panel-activate bus), our
  // namespace, our scoped attribute. Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountDeckFullbleed(), 'ray-card-deck: full-bleed')
  } catch (error) {
    console.error('[ray-card-deck] full-bleed mount failed:', error)
  }

  // The better-sidebar tabs (comfy management / flow templates — NOT
  // cards). Logged, never thrown (shell law).
  try {
    registerRayAssetsTab(ctx as unknown as Parameters<typeof registerRayAssetsTab>[0])
  } catch (error) {
    console.error('[ray-card-deck] assets tab registration failed:', error)
  }
}
