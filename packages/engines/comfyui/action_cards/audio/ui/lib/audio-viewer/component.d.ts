/**
 * audio's audio-viewer claim component. Mode dispatch lives HERE:
 * tile = AudioWaveform (the peaks cell — run-card artifact preview),
 * full = AudioPlayer (WaveSurfer + transport). Props: AssetViewerProps.
 */
import type { AssetViewerProps } from "@melite/contracts";
export default function AudioViewerClaim({ url, mode, className }: AssetViewerProps): import("react").JSX.Element;
