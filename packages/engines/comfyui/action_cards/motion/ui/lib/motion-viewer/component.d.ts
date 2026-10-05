/**
 * motion's motion-viewer claim component. Mode dispatch lives HERE:
 * tile = MotionPoster (the real skinned midpoint frame — never a
 * wrong-image thumbnail, never a bare Activity glyph), full =
 * MotionViewer (skinned playback). Props: AssetViewerProps.
 */
import type { AssetViewerProps } from "@melite/contracts";
export default function MotionViewerClaim({ url, mode, className }: AssetViewerProps): import("react").JSX.Element;
