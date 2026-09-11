/**
 * AssetsEmbed — the DSH right-sidebar embeds of the REAL sidebars, ONE
 * PER TAB (2026-08-22: "media and the cards to make action cards were
 * DIFFERENT" — two separate things in the old system, two tabs here).
 *
 * Served at /editor/?meliteAssets=media and /editor/?meliteAssets=cards (the
 * two better-sidebar tabs iframe their URL same-origin; /v1 and
 * /v1/assets/runs are proxied by the host). Each renders ONE REAL
 * component, unmodified, full-height — exactly the thing the editor
 * renders, alone:
 *
 *   ?meliteAssets=media → SidebarBody (AppSidebar) — the MEDIA ARCHIVE:
 *     search, sort, upload, category groups (Images/Video/3D/Motion/
 *     Music/Other), virtualized tiles dragging the asset MIME.
 *   ?meliteAssets=cards → LibrarySidebar — the CAPABILITY LIBRARY: search,
 *     genre groups (Create/Edit/Inpaint/Mask/Upscale/…), provenance
 *     badges, studio tiles dragging the capability MIME (drop → an
 *     action card).
 *   (The ?meliteAssets=flows fourth tab died with the flow-YAML
 *   surface 2026-09-05 — AssetsSection is media|cards only; flows
 *   compose through the card-harness + melite_flow now.)
 *
 * No page paint of its own; DSH theming flows through the card-deck
 * embed-bridge each tab runs on its iframe.
 */
import { useEffect, useState } from "react"
import { SidebarBody } from "../shared/AppSidebar"
import { LibrarySidebar } from "./LibrarySidebar"
import { loadPluginKinds } from "../flow/pluginKinds"
import { loadPluginUi } from "@/shell/pluginUi"
import { AssetPreviewDialog } from "../assets/AssetPreviewDialog"
import type { MediaAsset } from "./media"
import { listMedia } from "./media"

export type AssetsSection = "media" | "cards"

export function AssetsEmbed({ section }: { section: AssetsSection }) {
  // The preview modal (the tile-click lightbox the editor opens). When
  // embedded in DSH (window.parent !== window) the modal must cover the
  // WHOLE PAGE — an iframe cannot paint outside itself and the DSH panel
  // carries an animated transform (the containing-block trap), so the
  // HANDOFF is: post the asset to the host, which opens a dedicated
  // fullscreen overlay iframe (?melitePreview=). Standalone visits keep
  // the in-page dialog.
  const inDsh = typeof window !== "undefined" && window.parent !== window
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const selectAsset = (a: MediaAsset): void => {
    if (inDsh) {
      window.parent.postMessage({ type: "melite-preview-open", asset: a }, window.location.origin)
      return
    }
    setSelectedAsset(a)
  }
  // The lanes the shell normally loads — the bare embed loads itself
  // (same contract as AgentCardsEmbed): kinds (/v1/kinds) so kindDef()
  // is never UNKNOWN (UNKNOWN is never executable), ui-slots so tile
  // preview cells (asset-preview element claims) render.
  useEffect(() => {
    void loadPluginKinds()
    void loadPluginUi()
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
  }, [])

  if (section === "media") {
    return (
      <div data-assets-embed="media" className="flex h-screen flex-col overflow-hidden">
        <SidebarBody onSelectAsset={selectAsset} />
        {selectedAsset !== null && (
          <AssetPreviewDialog
            asset={selectedAsset}
            onClose={() => { setSelectedAsset(null) }}
            onSelect={(a) => setSelectedAsset(a)}
          />
        )}
      </div>
    )
  }
  return (
    <div data-assets-embed="cards" className="h-screen overflow-y-auto">
      <LibrarySidebar />
    </div>
  )
}

/**
 * AssetsPreviewEmbed — the FULLSCREEN preview overlay page. Opened by the
 * DSH media tab as its own top-level iframe (/editor/?melitePreview=<id>,
 * mounted via a portal to the host document body — OUTSIDE the animated
 * panel, so fixed positioning is honest). Renders the REAL
 * AssetPreviewDialog alone (its own fixed inset-0 bg-black/90 backdrop
 * paints the page); arrow navigation works because the dialog fetches
 * the archive itself (navList null). Close posts melite-preview-close to
 * the host, which unmounts the overlay.
 */
export function AssetsPreviewEmbed({ assetId }: { assetId: string }) {
  // PERSISTENT-FRAME NAVIGATION (2026-08-25 "huge lag loading assets"): the
  // host keeps this overlay page ALIVE across previews and swaps the asset
  // with a melite-preview-navigate message — a full editor boot per click was
  // seconds over a tailscale link. effectiveAssetId = URL asset until the
  // first navigate, then the navigated one.
  const [navAssetId, setNavAssetId] = useState<string | null>(null)
  const effectiveAssetId = navAssetId ?? assetId
  useEffect(() => {
    const onMsg = (e: MessageEvent): void => {
      const d = e.data as { type?: string; assetId?: string } | null
      if (d === null || typeof d !== "object") return
      if (d.type === "melite-preview-navigate" && typeof d.assetId === "string") {
        setNavAssetId(d.assetId)
      }
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])

  const [asset, setAsset] = useState<MediaAsset | null>(null)
  const [missing, setMissing] = useState(false)
  // The viewer estate (video/mesh/motion/audio slot claims) streams in
  // ASYNC via loadPluginUi(). Mounting the dialog before it lands made the
  // first paint fall through the slot walk to the honest-but-wrong-here
  // "Unsupported asset type" fallback — the user SAW that flash before the
  // real video viewer mounted (2026-08-25 "Unsupported Media" blink). The
  // dialog mounts only once the claims are in; after that a missing claim
  // genuinely means the owning plugin is disabled and the fallback IS
  // honest.
  const [uiReady, setUiReady] = useState(false)

  // Same self-load the other embeds run (kinds + ui-slots) — the dialog's
  // media surface may need the lanes the shell normally mounts.
  useEffect(() => {
    let alive = true
    void (async () => {
      try { await loadPluginKinds() } catch { /* fail-safe below */ }
      try { await loadPluginUi() } catch { /* claims stay absent */ }
      if (alive) setUiReady(true)
    })()
    // OPAQUE BLACK from the first frame (2026-08-22 "horrible blink" +
    // "partially opaque" verdicts). The dialog backdrop is bg-black/90 —
    // a transparent page let the DSH shell show through BOTH before the
    // dialog mounted (the blink) and through the backdrop's 10% (ghost
    // UI). This is a lightbox page: black behind black/90 reads solid.
    document.documentElement.style.background = "#000"
    document.body.style.background = "#000"
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    listMedia()
      .then((items) => {
        if (!alive) return
        const found = items.find((a) => a.id === effectiveAssetId) ?? null
        if (found === null) setMissing(true)
        else setAsset(found)
      })
      .catch(() => { if (alive) setMissing(true) })
    return () => { alive = false }
  }, [effectiveAssetId])

  const close = (): void => {
    window.parent.postMessage({ type: "melite-preview-close" }, window.location.origin)
  }

  // ATOMIC REVEAL handshake (2026-08-25 "blinks black, then loads the rest
  // in"): the host mounts this overlay iframe INVISIBLE and holds it there
  // until 'melite-preview-ready' — so every boot frame (editor page paint,
  // dialog chrome, media element) happens off-screen and the user sees ONE
  // transition: their app → the fully-dressed preview. Ready means the
  // FIRST-PAINT CONTENT is actually decodable:
  //   image → img.decode() · video → the player's <video> reaches
  //   loadeddata · anything else → a committed double rAF.
  // A 5s failsafe reveals anyway: fail-visible beats fail-invisible.
  // The ready message ECHOES the asset id: the host keeps this page alive
  // across previews and needs to know WHICH asset settled before revealing
  // (a navigate may have superseded this one mid-load).
  useEffect(() => {
    if ((!asset && !missing) || !uiReady) return
    let alive = true
    const reveal = () => {
      if (!alive) return
      alive = false
      window.parent.postMessage(
        { type: "melite-preview-ready", assetId: effectiveAssetId },
        window.location.origin,
      )
    }
    const failsafe = window.setTimeout(reveal, 5000)
    void (async () => {
      if (missing) {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        reveal()
        return
      }
      // The dialog mounts this tick at the latest — wait out its root.
      for (let i = 0; i < 120 && alive; i++) {
        if (document.querySelector("[data-asset-preview-dialog]")) break
        await new Promise((r) => requestAnimationFrame(r))
      }
      if (!alive) return
      const root = document.querySelector("[data-asset-preview-dialog]")
      const img = root?.querySelector("img") ?? null
      const video = root?.querySelector("video") ?? null
      try {
        if (img) {
          await img.decode()
        } else if (video) {
          if (video.readyState < 2) {
            await new Promise<void>((resolve) => {
              const done = () => {
                video.removeEventListener("loadeddata", done)
                resolve()
              }
              video.addEventListener("loadeddata", done)
              // Metadata-only streams (no moov yet) still get revealed.
              window.setTimeout(done, 3000)
            })
          }
        } else {
          // No decodable element (audio player, viewer chrome): commit the
          // mount with one painted frame pair before revealing.
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        }
      } catch {
        // decode() rejects on broken/aborted sources — reveal the honest
        // error/broken state rather than hanging invisible.
      }
      if (!alive) return
      requestAnimationFrame(() => requestAnimationFrame(reveal))
    })()
    return () => { alive = false; window.clearTimeout(failsafe) }
  }, [asset?.id, missing, uiReady, effectiveAssetId])

  if (missing) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90">
        <button onClick={close} className="rounded-lg border border-white/20 bg-black/60 px-4 py-2 text-sm text-white/90">
          Asset not found — close
        </button>
      </div>
    )
  }
  // Loading paints BLACK, not nothing (the no-blink law): a null return
  // is a transparent hole in the overlay until listMedia resolves.
  if (asset === null) {
    return <div className="fixed inset-0 z-[100000] bg-black" aria-label="Loading asset" />
  }
  return (
    <AssetPreviewDialog
      asset={asset}
      onClose={close}
      onSelect={setAsset}
    />
  )
}
