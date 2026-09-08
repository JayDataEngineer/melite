// AgentCardsEmbed — the DSH chat embed of the REAL agent cards surface.
//
// Served at /editor/?meliteCards=<draftId> (the DSH toolview iframes this
// URL same-origin; /v1 + /v1/assets/runs are proxied by the host).
// It renders InlineFlowCards — the SAME FlowTileGrid the Library
// canvas renders (ONE card design, 1:1) — hydrated from the backend
// draft, BARE: no ActivityBar, no drawers, no tab chrome, no page paint.
// The user reviews the tiles, edits in the zoom drilldown, and presses
// Run — the run door lives in the store's executeStage (POST /v1/flows/
// start), a user gesture on the card, never the model's.
//
// SEAMLESS (2026-08-22 "window in window" verdict): the page paints
// NOTHING of its own — html/body transparent, no min-height — so the
// toolview frame auto-fits the cards and they read as listed in the
// chat. DSH theming flows through the toolview's embed-bridge (the
// card-deck plugin's ONE bridge): it copies --dsw-alias-* tokens onto
// this document's :root, and every surface inside (tiles, buttons,
// modals) re-skins. The drilldown zoom overlay mounts over this
// document; the toolview promotes the whole frame fullscreen while it
// lives (see FlowCards.tsx).
//
// OUTPUT LIGHTBOX (2026-08-25 bugfix, "click the output → no modal"):
// clicking a zoomed card's output publishes to the assetPreviewBus — but
// the bus's default opener is a NO-OP and this bare page has no
// WorkspaceLayout to provide the real one + mount AssetPreviewDialog. In
// DSH the click did literally nothing. Fix: this embed provides its OWN
// bus opener and mounts the REAL dialog. In-frame is honest exactly when
// it matters — the lightbox only opens over the zoom overlay, and while
// that overlay lives the toolview holds the frame fullscreen (the same
// reason the drilldown itself works). No host handoff needed; the full
// asset object crosses (mediaAssetFromUrl ids are raw URLs — data: URLs
// would not survive an id-lookup handoff).
import { useCallback, useEffect, useState } from "react"
import { InlineFlowCards } from "./InlineFlowCards"
import { useEmbedGeometryTick } from "./useEmbedGeometryTick"
import { loadPluginKinds } from "./pluginKinds"
import { loadPluginUi } from "@/shell/pluginUi"
import { AssetPreviewBusContext } from "@/surfaces/shared/assetPreviewBus"
import { AssetPreviewDialog } from "../assets/AssetPreviewDialog"
import type { MediaAsset } from "../library/media"

export function AgentCardsEmbed({ draftId }: { draftId: string }) {
  // GEOMETRY TICK (2026-08-22): the toolview's fullscreen zoom promotion
  // resizes THIS document's viewport mid-zoom; the reflow moves every tile
  // without a React render, and stale framer projections made the close
  // morph land where the card WAS ("the zoom out lands in the wrong spot").
  // Bumping state here re-renders down to the tiles so framer re-measures
  // every shared-element rect. The value rides a data attribute so the
  // contract is observable in tests.
  const geometryTick = useEmbedGeometryTick()
  // The lanes the shell (WorkspaceLayout) normally loads — the bare embed
  // must load them itself (failures logged, never thrown):
  //   kinds (/v1/kinds): kindDef() reads UNKNOWN until synced, and UNKNOWN
  //     is NEVER executable — the Run button would silently no-op.
  //   ui slots (/v1/ui-slots): the tile preview cell is an element slot
  //     claim (asset-preview); without the lane the done tile renders
  //     status but no artifact thumb.
  useEffect(() => {
    void loadPluginKinds()
    void loadPluginUi()
    // No page paint: the frame must show the DSH chat behind it, so the
    // cards sit IN the conversation, not on a boxed canvas.
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
  }, [])

  // The output lightbox state — the WorkspaceLayout pair (asset + explicit
  // nav list). The zoom overlay passes the flow-order outputs so the
  // arrows navigate THIS flow, not the archive (2026-08-08 contract).
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [previewNavList, setPreviewNavList] = useState<MediaAsset[] | null>(null)
  const openAssetPreview = useCallback((asset: MediaAsset, navList?: MediaAsset[]) => {
    setSelectedAsset(asset)
    setPreviewNavList(navList ?? null)
  }, [])

  return (
    <AssetPreviewBusContext.Provider value={openAssetPreview}>
      <div
        className="p-2 pb-3"
        data-agent-cards-embed
        data-draft-id={draftId}
        data-geometry-tick={geometryTick}
      >
        <InlineFlowCards toolStatus="complete" result={{ draftId, stages: [] }} />
      </div>
      <AssetPreviewDialog
        asset={selectedAsset}
        navList={previewNavList}
        onClose={() => {
          setSelectedAsset(null)
          setPreviewNavList(null)
        }}
        onSelect={(a) => setSelectedAsset(a)}
      />
    </AssetPreviewBusContext.Provider>
  )
}
