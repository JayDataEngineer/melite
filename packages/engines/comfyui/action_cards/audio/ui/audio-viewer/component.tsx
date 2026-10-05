/**
 * audio's audio-viewer claim component. Mode dispatch lives HERE:
 * tile = AudioWaveform (the peaks cell — run-card artifact preview),
 * full = AudioPlayer (WaveSurfer + transport). Props: AssetViewerProps.
 */
import type { AssetViewerProps } from "@melite/contracts"
import { AudioWaveform, AudioPlayer } from "../viewers/index.ts"

export default function AudioViewerClaim({ url, mode, className }: AssetViewerProps) {
  if (mode === "tile") return <AudioWaveform audioUrl={url} height={48} color="#3b82f6" className={className} />
  return <AudioPlayer src={url} className={className} />
}
