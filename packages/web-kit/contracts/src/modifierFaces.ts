// THE MOD-FACE CONTRACTS (stroke 79 — the seam-law unification;
// REWORKED stroke 95 — the mask leaf rework, the operator's
// design: "Inputs bar, then the Mods bar; the mods open a popup
// with visual preview"): the leaf-face owner props live HERE, in
// the shared contracts package, beside their siblings
// (PreviewOwnerProps in stagePreview.ts, StageViewOwnerProps in
// stageView.ts, the regions Props) — never inside the consumer
// package that first hosted them. A leaf face is a HOST-delivered
// component: the card DECLARES the face (leaf_face on the kind
// row), the fold SERVES it verbatim, the client plane delivers
// the component, and the base degrades without it (the plain
// inputs hold). These props are pure data + callbacks — no React
// types ride, so any plane (the client bundle, a test double, a
// future non-React host) can speak the contract.
//
// THE EMBEDDED LAW (stroke 95): a leaf face is an EMBEDDED CANVAS
// — the visual preview INSIDE the mod leaf popup, never a nested
// modal behind a button. The face renders the reference image
// with its interaction (a dragged rectangle; brush strokes) and
// reports EVERY committed change through `onChange` — the leaf's
// own Add/Save/Cancel buttons own the commit chrome. The retired
// modal-shaped contracts (onSave/onCancel + a fixed backdrop)
// died with the verb buttons that opened them.

/** THE PAINT FACE (paint-leaf-canvas.md, stroke 76; embedded
 *  stroke 95): the host's brush canvas. The payload PNG is the
 *  contract either way — the canvas writes the same field the
 *  three-source square (upload/drop/pick) writes. */
export interface PaintCanvasFaceProps {
  /** the reference image URL (the card's input field value, when
   *  the host can name one — else the empty string rides; the
   *  brush paints OVER it) */
  referenceUrl: string
  /** the payload field's current value (a PNG data URL — the
   *  canvas seeds its stroke layer from it, the paint-over law) */
  value: string
  /** a COMMITTED change (a pointer-up after strokes, or Clear):
   *  the payload PNG data URL (alpha = strokes); '' = cleared */
  onChange: (dataUrl: string) => void
}

/** THE BBOX FACE (stroke 78 — the bbox-canvas leaf; embedded
 *  stroke 95): the host's selection canvas — the reference image
 *  with a rectangle the user drags. Same delivery law as the
 *  paint face: a component from the client plane, never an
 *  import; absent host = the four number inputs hold (the
 *  degrade is graceful). */
export interface BboxCanvasFaceProps {
  /** the image the rectangle selects ON (the card's input field) */
  referenceUrl: string
  /** the entry's current rectangle in image pixels (null = unset) */
  value: { x: number; y: number; width: number; height: number } | null
  /** a COMMITTED change (a pointer-up on a live rectangle, or
   *  Clear): the rectangle in image pixels, rounded; null = the
   *  box removed */
  onChange: (bbox: { x: number; y: number; width: number; height: number } | null) => void
}
