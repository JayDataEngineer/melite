// THE MOD-FACE CONTRACTS (stroke 79 — the seam-law unification):
// the leaf-face owner props live HERE, in the shared contracts
// package, beside their siblings (PreviewOwnerProps in
// stagePreview.ts, StageViewOwnerProps in stageView.ts, the
// regions Props) — never inside the consumer package that first
// hosted them. A leaf face is a HOST-delivered component: the
// card DECLARES the face (leaf_face on the kind row), the fold
// SERVES it verbatim, the client plane delivers the component,
// and the base degrades without it (the plain inputs hold).
// These props are pure data + callbacks — no React types ride,
// so any plane (the client bundle, a test double, a future
// non-React host) can speak the contract.

/** THE PAINT FACE (paint-leaf-canvas.md, stroke 76): the host's
 *  brush modal. The payload field's paint verb. */
export interface PaintFaceComponentProps {
  /** the reference image URL (the card's input field value, when
   *  the host can name one — else the empty string rides) */
  referenceUrl: string
  /** the payload field's current value (paint-over seeds) */
  payloadUrl: string
  /** SAVE: write the PNG data URL into the payload field */
  onSave: (dataUrl: string) => void
  onCancel: () => void
}

/** THE BBOX FACE (stroke 78 — the bbox-canvas leaf): the host's
 *  selection modal — an image preview the user drags a rectangle
 *  on. Same delivery law as the paint face: a component from the
 *  client plane, never an import; absent host = the four number
 *  inputs hold (the degrade is graceful). */
export interface BboxFaceComponentProps {
  /** the image the rectangle selects ON (the card's input field) */
  referenceUrl: string
  /** the entry's current rectangle (null = unset) */
  bbox: { x: number; y: number; width: number; height: number } | null
  /** SAVE: write the rectangle (already image-pixel coordinates) */
  onSave: (bbox: { x: number; y: number; width: number; height: number }) => void
  onCancel: () => void
}
