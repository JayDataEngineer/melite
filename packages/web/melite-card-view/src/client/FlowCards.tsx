/**
 * The melite_flow toolview — THE ACTION CARDS, the real surface.
 *
 * Keyed into the shipped `tool.call.toolview` seat for the wire tool name
 * `melite_flow` (succession: the build_flow seat — same iframe, same
 * parse rule, the render just speaks the unified verb now). NOT a form,
 * NOT a summary row: an iframe mounting the editor's AgentCardsEmbed
 * (/editor/?meliteCards=<draftId>) — InlineFlowCards, the SAME
 * FlowTileGrid the Library canvas renders (ONE card design, 1:1). The
 * user reviews the tiles, edits in the zoom drilldown, and presses Run
 * ON THE CARD — the run door is executeStage inside the embedded
 * surface, a user gesture. The model executed the queue run; the card
 * is the review surface for the draft it rode in on.
 *
 * SEAMLESS IN CHAT (2026-08-22 operator verdict "window in window"):
 *   (a) THEME — startEmbedBridge (the card-deck plugin's ONE bridge, same
 *       source the Library canvas uses) copies DSH's --dsw-alias-* tokens
 *       into the frame. No custom colors anywhere; Skin Center re-skins
 *       both surfaces live.
 *   (b) AUTO-HEIGHT — the frame fits its content (polled), borderless,
 *       scrollbars off: the cards read as LISTED IN THE CHAT, Run all on
 *       top, not a boxed window.
 *   (c) FULLSCREEN DRILLDOWN — when the card zoom overlay mounts inside
 *       the frame ([data-card-zoom-overlay]), the frame itself is
 *       promoted to a fixed full-viewport overlay for its lifetime, so
 *       the drilldown is a REAL fullscreen modal, not a modal trapped in
 *       the tool output box.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import css from './card.module.css'
import { createZoomPromotion, PREVIEW_DIALOG_SELECTOR, ZOOM_OVERLAY_SELECTOR } from './zoomPromotion.ts'
import type { ToolCallBlockView } from './types.ts'
// ONE bridge, ONE theme map — the card-deck plugin's embed-bridge source
// (dependency-free; tsdown bundles it here). The Library sidebar canvas
// and this chat toolview re-skin from the SAME code.
import { startEmbedBridge, type EmbedHandle } from '../../../melite-card-deck/src/client/embed-bridge.ts'

/** Same-origin editor mount (the deck's host half serves the built dist + proxies /v1). */
const EDITOR_CARDS = '/editor/?meliteCards='

/** Height-fit poll: results loading, toasts, cards added — all change the
 * document height without resizing the frame. Cheap (one scrollHeight
 * read), same-origin. */
const FIT_INTERVAL_MS = 500

export interface FlowCardsProps {
  block: ToolCallBlockView
}

/** Parse the melite_flow call: the draft id (from the settled result's
 * rendered content) + the model (from the call args, header while loading). */
export function parseCardsBlock(block: ToolCallBlockView): {
  draftId: string | null
  model: string | null
  settled: boolean
  isError: boolean
} {
  const settled = block.kind === 'tool-result'
  const argsRaw = settled ? (block.call?.argsRaw ?? '') : (block.argsRaw ?? '')
  let model: string | null = null
  if (argsRaw !== '') {
    try {
      const args = JSON.parse(argsRaw) as Record<string, unknown>
      if (typeof args['model'] === 'string' && args['model'] !== '') model = args['model']
    } catch {
      // malformed args render header-less; never throws
    }
  }
  let draftId: string | null = null
  if (settled && block.isError !== true && Array.isArray(block.content)) {
    for (const part of block.content) {
      if (part === null || typeof part !== 'object') continue
      const text = (part as { text?: unknown }).text
      if (typeof text !== 'string') continue
      // render line (wire contract, melite_flow success): "card <draftId>
      // · flow <target> → <run_id> [status] — …" — the token leads so
      // the FIRST 'card ' hit is the handle. The gateway mints
      // draft-<time>-<tid>-<seq> ids. Older renders said "card <draftId>
      // (model) — N shots, 1 run" (build_flow) or "cards draft <p_id> —
      // …" (ray-era). Accept ALL: the token after 'card ' or after
      // 'draft ' is the draft id either way.
      const atCard = text.indexOf('card ')
      const atIdx = atCard >= 0 ? atCard : text.indexOf('draft ')
      if (atIdx < 0) continue
      const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6))
      const end = rest.indexOf(' ')
      const tok = end < 0 ? rest : rest.slice(0, end)
      if ((tok.startsWith('draft-') || tok.startsWith('p_')) && tok.length > 2) { draftId = tok; break }
    }
  }
  return { draftId, model, settled, isError: block.isError === true }
}

/** Wire the mounted frame: theme bridge + auto-height + fullscreen zoom. */
function useSeamlessFrame(draftId: string | null): React.RefObject<HTMLIFrameElement> {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const frame = frameRef.current
    if (frame === null || draftId === null) return
    let bridge: EmbedHandle | null = null

    // Fit + ZOOM PROMOTION live in zoomPromotion.ts — a PURE state machine
    // with injected timers/observer, unit-tested against every shipped
    // failure mode (stuck slab after a document swap or a reload; dead
    // detection). This effect keeps only the DSH-specific wiring: the theme
    // bridge hook and the cleanup.
    const promotion = createZoomPromotion(frame, {
      intervalMs: FIT_INTERVAL_MS,
      setInterval: (fn, ms) => window.setInterval(fn, ms),
      clearInterval: (id) => window.clearInterval(id),
      MutationObserverCtor: window.MutationObserver,
      // BOTH app-global layers promote: the drilldown overlay (the shipped
      // contract) and the asset lightbox — a future path opening the
      // lightbox WITHOUT the zoom must not strand it in the tool-output
      // box with the DSH chrome lit around it (the deck's 2026-08-25 bug,
      // pre-empted here).
      overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
      onDocReady: () => {
        bridge?.stop()
        bridge = startEmbedBridge(frame)
      },
    })
    promotion.attach()
    return () => {
      promotion.detach()
      bridge?.stop()
    }
  }, [draftId])
  return frameRef
}

/** One melite_flow call as the REAL action cards (embedded editor surface). */
export function FlowCards({ block }: FlowCardsProps) {
  const parsed = useMemo(() => parseCardsBlock(block), [block])
  const [frameUp, setFrameUp] = useState(false)
  const frameRef = useSeamlessFrame(parsed.draftId)

  // A settled, successful call whose result predates the draft contract
  // (render text without a draft token) is a LEGACY block — it can never
  // mount cards. Never show it an eternal "composing…" (2026-08-22
  // "GETS STUCK: composing" verdict); render the inert superseded note.
  const legacy = parsed.settled && !parsed.isError && parsed.draftId === null
  if (legacy) {
    return (
      <div className={css.card} data-dsh-part="melite-flow-card" data-legacy="1">
        <div className={css.head}>
          <span className={css.badge}>melite</span>
          <span className={css.model}>{parsed.model ?? 'flow'}</span>
          <span className={css.state} data-state="legacy">cards · earlier draft</span>
        </div>
      </div>
    )
  }

  return (
    <div className={css.card} data-dsh-part="melite-flow-card" data-draft-id={parsed.draftId ?? ''}>
      {parsed.draftId !== null
        ? (
          <>
            {frameUp ? null : <div className={css.load}>cards…</div>}
            <iframe
              ref={frameRef}
              className={css.frame}
              src={EDITOR_CARDS + encodeURIComponent(parsed.draftId)}
              title={'Melite action cards ' + parsed.draftId}
              scrolling="no"
              onLoad={() => { setFrameUp(true) }}
            />
          </>
        )
        : <div className={css.load}>{parsed.isError ? 'draft failed' : 'composing…'}</div>}
    </div>
  )
}
