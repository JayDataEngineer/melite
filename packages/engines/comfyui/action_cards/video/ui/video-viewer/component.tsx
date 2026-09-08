/**
 * video's video-viewer claim component — the hover-scrub transport
 * for full/dialog mode. Props: AssetViewerProps (src ← url).
 */
import type { AssetViewerProps } from "@melite/contracts"
import { VideoPlayer } from "../viewers"

export default function VideoViewerClaim({ url, mode, className }: AssetViewerProps) {
  // Both modes render the transport; the host sizes the cell.
  void mode
  return <VideoPlayer src={url} className={className ?? "w-full h-[70vh] rounded-lg"} />
}
