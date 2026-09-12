/** stagePreview.ts — the keyed `cards.stage.preview` slot's OWNER
 *  currency (the preview seam, 2026-09-13 hour-9 — the operator's
 *  law: "there should be a PREVIEW seem. Where the VIDEO PREVIEW and
 *  the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"). One seam, keyed by MEDIA KIND: every card's
 *  rendered output previews through the same shared components —
 *  video and image today — built on DSH primitives, never bespoke
 *  per-card preview islands. */
/** One rendered output: its name (the artifact key) and its url. */
export interface PreviewArtifact {
  name: string
  url: string
}
/** The preview seam's owner currency: what a stage produced, plus
 *  the live-run flag for honest progress states. Keyed by `kind`
 *  ('video' | 'image'); an unclaimed key falls back to the host's
 *  own presentation. */
export interface PreviewOwnerProps {
  /** Media kind — the keyed dispatch value. */
  kind: 'video' | 'image'
  /** The stage's rendered outputs (empty while none have landed). */
  artifacts: PreviewArtifact[]
  /** The estate's runStatus word ('' when never run). */
  runStatus: string
  /** Bench stage identity (for keyed React identity downstream). */
  stageId: string
}
