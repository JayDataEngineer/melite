// attach — local port of the three non-visual the shared kit imports the
// studio used (ASSET_DRAG_MIME, readAsDataURL, isImageUrl). DSH ships
// no atoms for drag payloads or file reads — the logic below is
// byte-identical to packages/web-kit/ui/src/SlotSquare.tsx.
export const ASSET_DRAG_MIME = "application/tech-noir-asset"

/** THE "is this a thumbnail" rule for slot-shaped values — data: image
 * URLs, and http(s)/root-relative server asset URLs (the real artifact
 * shape: /v1/assets/runs/{rid}/{rel}). */
export function isImageUrl(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    // blob: — the fresh-upload object-URL preview (the upload rail's
    // local mirror while the PARAM carries the estate path)
    /^blob:/i.test(value) ||
    /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
  )
}

/** Read a File / Blob and resolve its data: URL. THE one read path for
 * every slot-shaped attach (SlotGrid, InputCardEditor). */
export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(file)
  })
}
