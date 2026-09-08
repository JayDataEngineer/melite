/**
 * motion's motion-viewer claim component. Mode dispatch lives HERE:
 * tile = MotionPoster (the real skinned midpoint frame — never a
 * wrong-image thumbnail, never a bare Activity glyph), full =
 * MotionViewer (skinned playback). Props: AssetViewerProps.
 */
import type { AssetViewerProps } from "@melite/contracts"
import { MotionPoster, MotionViewer } from "../viewers"

export default function MotionViewerClaim({ url, mode, className }: AssetViewerProps) {
  if (mode === "tile") return <MotionPoster url={url} className={className ?? "w-full h-full object-cover"} />
  return <MotionViewer url={url} className={className ?? "w-full h-[70vh] rounded-lg"} />
}
