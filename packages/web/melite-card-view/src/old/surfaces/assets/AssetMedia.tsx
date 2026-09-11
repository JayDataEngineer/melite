/**
 * AssetMedia — the single shared renderer for every media type (sidebar
 * tiles, preview dialog).
 *
 * Tile mode shows the ACTUAL asset, never a wrong-substitute fallback:
 *   • image  → the image itself
 *   • mesh   → MeshPoster (the real GLB rendered to a static PNG, cached)
 *   • motion → MotionPoster (the real NPZ midpoint frame, cached)
 *   • video  → the run's poster thumbnail, else the video element's frame
 *   • audio  → a music-note icon (audio is inherently non-visual — the
 *              icon IS the correct representation, not a wrong substitute)
 *
 * The previous implementation used the run's `thumbnail` (its first IMAGE
 * artifact) as the poster for mesh/motion tiles — for a Trellis
 * (image→mesh) run, that thumbnail is the INPUT image, so the tile showed
 * the source picture instead of the generated 3D object. "Completely
 * wrong." Mesh/motion now render their own real content via *Poster.
 */
import { useState } from "react"
import { Music, Box, Activity, Play, AlertTriangle } from "lucide-react"
import type { MediaAsset } from "../library/media"
import { meshViewerSlot, motionViewerSlot, videoViewerSlot, audioViewerSlot } from "@melite/slots"
import { isImageAsset } from "./AssetMedia.utils"
import { JsonViewer } from "./JsonViewer"

function isMeshAsset(a: MediaAsset): boolean {
  return (
    a.type === "glb" ||
    a.type === "mesh" ||
    /\.(glb|gltf|fbx)(\?|#|$)/i.test(a.name)
  )
}

function isMotionAsset(a: MediaAsset): boolean {
  return a.type === "npz" || a.type === "motion" || /\.npz(\?|#|$)/i.test(a.name)
}


function isVideoAsset(a: MediaAsset): boolean {
  return a.type === "video" || a.url.startsWith("data:video/")
}

function isAudioAsset(a: MediaAsset): boolean {
  return a.type === "audio" || a.url.startsWith("data:audio/")
}

/** JSON documents (.json) — viewed pretty-printed by JsonViewer in dialog
 *  mode (2026-08-25 bug 3: ".json is unsupported type for viewing"). */
function isJsonAsset(a: MediaAsset): boolean {
  return /\.json(\?|#|$)/i.test(a.name) || /\.json(\?|#|$)/i.test(a.url)
}

interface AssetMediaProps {
  asset: MediaAsset
  /** "tile" = compact cover (no audio player, auto-rotate mesh). "full" = dialog (controls). */
  mode?: "tile" | "full"
  className?: string
  imgClassName?: string
  style?: React.CSSProperties
}

export function AssetMedia({ asset, mode = "tile", className, imgClassName, style }: AssetMediaProps) {
  // The viewer seam (2026-08-21): viewers FLOW IN from their plugins —
  // 3d (mesh), motion, video, audio — over the ui-claim
  // wire. The kernel keeps the KIND FOLD + chrome only; a claim absent
  // (plugin disabled) falls to the honest type-labelled fallback below,
  // never fake content.
  meshViewerSlot.useVersion()
  motionViewerSlot.useVersion()
  videoViewerSlot.useVersion()
  audioViewerSlot.useVersion()
  const mesh = isMeshAsset(asset)
  const image = isImageAsset(asset)
  const video = isVideoAsset(asset)
  const audio = isAudioAsset(asset)
  const motion = isMotionAsset(asset)
  const json = isJsonAsset(asset)

  if (mode === "tile") {
    // Images: pass straight through (they ARE the preview).
    if (image) {
      return <ImageTile url={asset.url} alt={asset.name} className={imgClassName ?? className} />
    }
    // Mesh: render the ACTUAL GLB to a static poster (MeshPoster). NEVER the
    // run's `thumbnail` — for a Trellis (image→mesh) run, that's the INPUT
    // image, not the output mesh. MeshPoster loads + renders the real GLB
    // once, caches the PNG, so repeated sidebar opens are instant.
    if (mesh) {
      const MeshViewer = meshViewerSlot.resolve(null)?.Viewer
      return (
        <div className={`relative ${className ?? "w-full aspect-square"}`}>
          {MeshViewer ? (
            <MeshViewer url={asset.url} mode="tile" className="w-full h-full object-cover" />
          ) : (
            // Honest fallback: the mesh-viewer claim is absent (3d
            // disabled) — a type-labelled glyph, never the run's
            // input-image thumbnail and never fake content.
            <IconTile Icon={Box} className="w-full h-full" />
          )}
          <TypeBadge type="mesh" />
        </div>
      )
    }
    // Motion: render the ACTUAL NPZ midpoint frame (MotionPoster). Same
    // principle — the real motion data, not a wrong-image thumbnail and not
    // a bare Activity glyph masking the content.
    if (motion) {
      const MotionPosterViewer = motionViewerSlot.resolve(null)?.Viewer
      return (
        <div className={`relative ${className ?? "w-full aspect-square"}`}>
          {MotionPosterViewer ? (
            <MotionPosterViewer url={asset.url} mode="tile" className="w-full h-full object-cover" />
          ) : (
            <IconTile Icon={Activity} className="w-full h-full" />
          )}
          <TypeBadge type="motion" />
        </div>
      )
    }
    // Video: the run's poster thumbnail IS a legitimate frame for video
    // runs (the backend generates it from the output). Fall back to the
    // video element's own frame only when no thumbnail exists — never a
    // glyph. A type badge keeps the media type legible at a glance.
    if (video) {
      const inner = asset.thumbnail ? (
        <ImageTile
          url={asset.thumbnail}
          alt={asset.name}
          className={imgClassName ?? "w-full h-full object-cover"}
        />
      ) : (
        <video
          src={asset.url}
          className={imgClassName ?? "w-full h-full object-cover"}
          muted
          playsInline
          preload="metadata"
        />
      )
      return (
        <div className={`relative ${className ?? "w-full aspect-square"}`}>
          {inner}
          <TypeBadge type="video" />
        </div>
      )
    }
    // Audio: inherently non-visual — a music note IS the correct
    // representation, not a wrong substitute (no visual content exists).
    if (audio) return <IconTile Icon={Music} className={className} />
    // Unknown / binary: the ONLY honest render for an unclassifiable asset
    // is an explicit "unknown type" affordance — never a glyph that mimics
    // real content.
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 ${className ?? "w-full aspect-square"} bg-sidebar-accent/30`}
      >
        <AlertTriangle className="h-5 w-5 text-muted-foreground/40" />
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
          Unknown type
        </span>
      </div>
    )
  }

  // ── "full" (dialog) mode ────────────────────────────────────────────────
  // JSON documents render as pretty-printed text (JsonViewer) — no slot
  // claim involved; this is a first-party leaf viewer like the image <img>.
  if (json) {
    return <JsonViewer url={asset.url} className={className ?? "max-w-[88vw]"} />
  }
  if (motion) {
    const M = motionViewerSlot.resolve(null)?.Viewer
    if (M) return <M url={asset.url} mode="full" className="w-full h-[70vh] rounded-lg" />
  }
  if (mesh) {
    const M = meshViewerSlot.resolve(null)?.Viewer
    if (M) return <M url={asset.url} mode="full" className="w-full h-[70vh] rounded-lg" />
  }
  if (image) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        // decoding="async": the preview dialog shows ONE large image; async
        //   decode keeps the dialog open + transition smooth instead of
        //   blocking the main thread on a big base64 decode. (Not lazy here —
        //   the user explicitly opened this image, fetch it immediately.)
        decoding="async"
        className={imgClassName ?? className ?? "max-w-full max-h-[70vh] object-contain rounded-lg select-none"}
        style={style}
      />
    )
  }
  if (video) {
    const V = videoViewerSlot.resolve(null)?.Viewer
    if (V) return <V url={asset.url} mode="full" className={className} />
    // Fallback: native HTML5 video player when no plugin viewer is claimed
    return (
      <video
        src={asset.url}
        controls
        autoPlay
        className={className ?? "w-full max-h-[70vh] rounded-lg bg-black"}
      />
    )
  }
  if (audio) {
    const A = audioViewerSlot.resolve(null)?.Viewer
    if (A) return <A url={asset.url} mode="full" className={className} />
    // Fallback: native HTML5 audio player when no plugin viewer is claimed
    return (
      <audio src={asset.url} controls autoPlay className="w-full" />
    )
  }

  // Unknown / binary asset — or a known kind whose viewer claim is absent
  // (owning plugin disabled) — in the dialog: EXPLICIT affordance, never a
  // bare glyph that mimics content. The user must see "this type can't be
  // shown", not a mystery icon.
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className ?? "w-full aspect-square"} bg-sidebar-accent/30`}
    >
      <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
      <div className="text-sm font-medium text-muted-foreground/60">Unsupported asset type</div>
      <div className="max-w-xs text-center text-xs text-muted-foreground/40">{asset.name}</div>
    </div>
  )
}

function IconTile({ Icon, className }: { Icon: typeof Box; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className ?? "w-full aspect-square"} bg-sidebar-accent/40`}>
      <Icon className="h-6 w-6 text-muted-foreground/40" />
    </div>
  )
}

/** Small corner glyph layered over a thumbnail so the media type stays legible. */
function TypeBadge({ type }: { type: "video" | "mesh" | "motion" }) {
  const Icon = type === "video" ? Play : type === "mesh" ? Box : Activity
  const label = type === "video" ? "Video" : type === "mesh" ? "3D" : "Motion"
  return (
    <div className="pointer-events-none absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-foreground/85 backdrop-blur-sm">
      <Icon className="h-2.5 w-2.5" />
      <span>{label}</span>
    </div>
  )
}

function ImageTile({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      <img
        src={url}
        alt={alt}
        // loading="lazy": defer fetch/decode until the tile nears the viewport.
        //   For data: URLs (current run-protocol artifacts) the bytes are already
        //   in memory, but the browser still gates the decode — a paginated grid
        //   of 20 large images no longer decodes them all up-front. When assets
        //   move to stream/blob URLs this also defers the network fetch.
        // decoding="async": off-main-thread decode — the tile grid doesn't block
        //   the UI thread on paint. Pairs with the onLoad fade-in below: the
        //   pulse placeholder shows until decode completes, then fades.
        loading="lazy"
        decoding="async"
        className={`${className ?? "w-full aspect-square object-cover bg-sidebar-accent/40"} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity`}
        // draggable={false} is INTENTIONAL — suppresses the browser's
        // default image-drag ghost so the parent AssetTile's own
        // `draggable onDragStart` (AppSidebar.tsx) can emit the
        // application/tech-noir-asset MIME. Setting draggable={true}
        // here would make the browser start a default image drag
        // (empty dataTransfer) instead of the parent's custom drag —
        // the CardTile + SlotSquare drop targets would receive nothing
        // and the drop would silently fail. The drag source is the
        // parent, not the inner media. (Phase 3c, 2026-08-07.)
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-sidebar-accent/50 animate-pulse">
          <Box className="h-4 w-4 text-sidebar-foreground/25" />
        </div>
      )}
    </>
  )
}
