/** regions.ts — the region-slot props contracts (fifth lane): what a
 * sidebar / chat-input claimant receives. */
import type { MediaAsset } from "./mediaTypes"

export interface AppSidebarProps {
 open: boolean
 onToggle: () => void
 onSelectAsset?: (asset: MediaAsset) => void
 /** Load a run's stages back onto the canvas as cards ("Open as cards"). */
 onOpenRun?: (asset: MediaAsset) => void
}

/** The chat-history drawer's content claim (H-DRAWER): what the host
 *  hands the winning claimant. */
export interface HistorySidebarProps {
 onClose: () => void
}

export interface ChatInputRegionProps {
  running: boolean
  onSend: (text: string, media?: string) => void
  onStop: () => void
}

/** The asset-viewer claim's props (the viewer seam, 2026-08-21): what
 *  a mesh/motion/video/audio viewer claimant receives. The claim owns
 *  the mode dispatch (tile → poster/waveform cell, full → interactive
 *  transport); the host owns WHICH kind + chrome (badges, layout). */
export interface AssetViewerProps {
  url: string
  /** "tile" = compact non-interactive cell (poster / waveform).
   *  "full" = the dialog transport (turntable, scrub, play). */
  mode: "tile" | "full"
  className?: string
}
