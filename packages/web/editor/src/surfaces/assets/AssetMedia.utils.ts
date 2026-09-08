import type { MediaAsset } from "../library/media"

/** Extracted from AssetMedia.tsx so the component module exports ONLY
 * components (React Fast Refresh). See vite-plugin-no-full-reload.ts. */
export function isImageAsset(a: MediaAsset): boolean {
  return a.type === "image" || a.url.startsWith("data:image/")
}
