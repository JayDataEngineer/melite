/**
 * video's video-viewer claim component — the hover-scrub transport
 * for full/dialog mode. Props: AssetViewerProps (src ← url).
 */
import type { AssetViewerProps } from "@melite/contracts"
import { VideoPlayer } from "../viewers/index.ts"
import styles from "./component.module.css"

export default function VideoViewerClaim({ url, mode, className }: AssetViewerProps) {
  // Both modes render the transport; the host sizes the cell.
  void mode
  return <VideoPlayer src={url} className={className ?? styles.fullDefault} />
}
