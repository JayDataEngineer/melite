/**
 * 3d's mesh-viewer claim component. Mode dispatch is domain
 * knowledge and lives HERE: tile = the cached static poster (MeshPoster
 * — never the run's input-image thumbnail), full = the interactive
 * turntable (AnimatedGLBViewer). Props contract: AssetViewerProps
 * (@melite/contracts) — the host hands them over verbatim.
 */
import type { AssetViewerProps } from "@melite/contracts"
import { MeshPoster, AnimatedGLBViewer } from "../viewers"

export default function MeshViewer({ url, mode, className }: AssetViewerProps) {
  if (mode === "tile") return <MeshPoster url={url} className={className ?? "w-full h-full object-cover"} />
  return <AnimatedGLBViewer glbUrl={url} className={className ?? "w-full h-[70vh] rounded-lg"} />
}
