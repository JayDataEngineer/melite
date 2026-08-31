/**
 * DeckCanvas -- the Cards TAB body: the REAL card-authoring canvas
 * (web/editor surfaces/library+pipeline), served at /editor/ by the host
 * half and mounted here. The embed-bridge re-skins it with DSH theme
 * tokens and strips its own chrome -- the canvas rides DSH's sidebar and
 * details column, it does not bring its own frame.
 */
import { useEffect, useRef, useState } from 'react'
import css from './deck.module.css'
import { startEmbedBridge, type EmbedHandle } from './embed-bridge.ts'
import { createZoomPromotion, PREVIEW_DIALOG_SELECTOR, ZOOM_OVERLAY_SELECTOR } from '../../../melite-card-view/src/client/zoomPromotion.ts'

/** CARD REPLAY (2026-08-30, additive): a surface may ask the studio to
 * open with ONE draft loaded — the editor's own /editor/?meliteCards=<id>
 * mode (it fetches the draft and hydrateDraft()s the card with every
 * parameter filled). Parked here BEFORE mount by deck-sidebar-entry's
 * openDeckWithDraft(); consumed once by the canvas below. */
let pendingDraftId = ''

export function setPendingDraft(draftId: string): void {
  pendingDraftId = draftId
}

/** Live-open event while the canvas is already mounted. */
export const OPEN_DRAFT_EVENT = 'melite-cards-deck-open-draft'

export function DeckCanvas() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [draftId, setDraftId] = useState(() => {
    const d = pendingDraftId
    pendingDraftId = ''
    return d
  })

  useEffect(() => {
    const onOpenDraft = (e: Event): void => {
      const d = (e as CustomEvent<{ draftId?: unknown }>).detail?.draftId
      if (typeof d === 'string' && d !== '') setDraftId(d)
    }
    document.addEventListener(OPEN_DRAFT_EVENT, onOpenDraft)
    return () => { document.removeEventListener(OPEN_DRAFT_EVENT, onOpenDraft) }
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    let handle: EmbedHandle | null = null
    const arm = (): void => {
      handle?.stop()
      handle = startEmbedBridge(frame)
    }
    arm()

    // IMAGE MODE PROMOTION (2026-08-25 "THE LEFT SIDEBAR IS STILL VISIBLE"):
    // the editor's asset lightbox is fixed inset-0 INSIDE this iframe, so
    // its black backdrop covered only the center column -- the DSH sidebar
    // stayed lit beside it. While EITHER app-global overlay lives in the
    // frame, the frame itself is promoted to a fixed full-viewport slab
    // (the toolview's zoom-promotion machine): the black reads edge to
    // edge, sidebar UNDER it; closing restores the column fill.
    //
    // BOTH layers promote (2026-08-26 "rightsidebar literally floating OVER
    // the image"): the asset lightbox AND the card zoom overlay (the
    // drilldown). Watching only the lightbox was the deck-side half of the
    // bug PipelineCards pre-empted on 2026-08-25 ("the deck's 2026-08-25
    // bug") -- clicking a card image opened the drilldown trapped in the
    // column with the DSH chrome lit around it. fitHeight stays OFF --
    // this frame is CSS-sized by the column (canvasIframe 100%/100%); an
    // inline height would fight it every tick.
    const promotion = createZoomPromotion(frame, {
      intervalMs: 500,
      setInterval: (fn, ms) => window.setInterval(fn, ms),
      clearInterval: (id) => window.clearInterval(id),
      MutationObserverCtor: window.MutationObserver,
      overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
      fitHeight: false,
      background: '#000',
    })
    promotion.attach()
    return () => {
      promotion.detach()
      handle?.stop()
    }
  }, [])

  return (
    <div className={css.canvasFrame} data-plugin="melite-card-deck-canvas">
      <iframe
        ref={frameRef}
        className={css.canvasIframe}
        src={draftId === '' ? '/editor/' : '/editor/?meliteCards=' + encodeURIComponent(draftId)}
        title="Melite card canvas"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
