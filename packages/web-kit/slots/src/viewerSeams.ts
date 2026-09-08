/**
 * viewerSeams — the ASSET VIEWER slots (2026-08-21, the viewer exodus:
 * GLB/motion/video/audio playback left the kernel for their owning
 * plugins; the kernel keeps the dispatch fold + chrome only).
 *
 * One slot per MEDIA KIND — the host's kind table picks the slot, the
 * claimant owns the rendering. A claim component receives
 * AssetViewerProps and owns the mode dispatch (tile → poster/waveform,
 * full → interactive). Claim absent (plugin disabled) = the host's
 * honest fallback: a type-labelled glyph, never fake content.
 *
 * Same kernel as every other lane: claims ride the ui wire
 * (plugins/<id>/ui/<claim>/ui.yaml → /v1/ui-slots → syncPluginUi),
 * precedence decides shadowing, melite-* ships the defaults.
 */
import type { ComponentType } from "react"
import { createUiSlot } from "./uiSlotSeam"
import type { AssetViewerProps } from "@melite/contracts"

/** Every viewer slot's element shape: the claim's component. */
export interface AssetViewerElement {
  Viewer: ComponentType<AssetViewerProps>
}

/** GLB assets (.glb/.gltf/.fbx) — melite-3d's MeshPoster / AnimatedGLBViewer. */
export const meshViewerSlot = createUiSlot<AssetViewerElement, null>("mesh-viewer")
/** Motion assets (.npz) — melite-motion's MotionPoster / MotionViewer. */
export const motionViewerSlot = createUiSlot<AssetViewerElement, null>("motion-viewer")
/** Video assets — melite-video's VideoPlayer. */
export const videoViewerSlot = createUiSlot<AssetViewerElement, null>("video-viewer")
/** Audio assets — melite-audio's AudioWaveform (tile) / AudioPlayer (full). */
export const audioViewerSlot = createUiSlot<AssetViewerElement, null>("audio-viewer")
