/**
 * embed-shell — the DSH-embed close-fold rig (2026-09-06).
 *
 * The web-family law: ONE card design, TWO windows (editor canvas + DSH
 * iframe embed). The card-harness covers the canvas window; THIS page is
 * the embed window's rig: DSH-like chrome (280px left sidebar + chat
 * center column + 360px right panel) with the embed-mode card harness
 * (?embed=1 — AgentCardsEmbed contract: body portal, geometry tick) in a
 * content-fit iframe, driven by the REAL zoom-promotion state machine
 * (imported from the DSH plugin source, not a copy — the spec fails when
 * the shipped machine regresses).
 *
 * e2e/card-embed-close.spec.ts drives it: open a card (promotion), close
 * it (demote), and pins the HONEST LANDING — the shrink-back must converge
 * onto the tile's real column spot, not the promoted full-viewport rect.
 */
import {
  createZoomPromotion,
  PREVIEW_DIALOG_SELECTOR,
  ZOOM_OVERLAY_SELECTOR,
} from '../../../melite-card-view/src/client/zoomPromotion.ts'

const frame = document.getElementById('toolf') as HTMLIFrameElement
const params = new URLSearchParams(window.location.search)
const scenario = params.get('scenario') ?? 'chain'

const promotion = createZoomPromotion(frame, {
  intervalMs: 500,
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
  MutationObserverCtor: window.MutationObserver,
  // The shipped toolview union (FlowCards): drilldown + lightbox promote.
  overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
})

promotion.attach()
frame.src = './card-harness.html?scenario=' + encodeURIComponent(scenario) + '&embed=1'

// The spec's hooks: promotion state + the iframe document.
;(window as unknown as { __embedShell: unknown }).__embedShell = {
  isZoomOpen: () => promotion.isZoomOpen(),
  sync: () => promotion.sync(),
  frame: () => frame,
}
