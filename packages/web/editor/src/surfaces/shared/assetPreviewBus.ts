// assetPreviewBus — open the AssetPreviewDialog from anywhere inside the
// workspace, with an explicit navigation list.
//
// The lightbox lives at the workspace root (WorkspaceLayout owns
// selectedAsset). Cards render deep inside tab surfaces (the Agent chat's
// InlineFlowCards, the Library canvas) and INSIDE a portal
// (CardZoomOverlay portals into [data-workspace-content]) — prop-drilling a
// "click the output → open the lightbox" callback through every surface
// would be a tour of the whole tree. A tiny context bridges it: the layout
// provides the opener; consumers call it with the asset + an optional
// navList. When navList is omitted the dialog falls back to the
// same-category archive (the left-drawer behavior).
//
// React portals preserve context, so the bus works through the zoom
// overlay's portal without any wiring.
import { createContext, useContext } from "react";
import type { MediaAsset } from "../library/media";

export interface OpenAssetPreview {
  (asset: MediaAsset, navList?: MediaAsset[]): void;
}

/** The workspace's asset-lightbox opener. The default is a no-op so tests
 *  (and any surface rendered without the provider) never crash. */
export const AssetPreviewBusContext = createContext<OpenAssetPreview>(() => {});

export function useAssetPreviewBus(): OpenAssetPreview {
  return useContext(AssetPreviewBusContext);
}
