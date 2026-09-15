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
 *  ('video' | 'image' | 'audio' | 'mesh'); an unclaimed key falls
 *  back to the host's own presentation.
 *
 * THE PRIMARY-OUTPUT LAW (2026-09-13): the kind is the CARD'S
 * DECLARED primary output — form-spec `outputs.default` — never a
 * url sniff. The url shapes stay only as the fallback when no
 * declaration is in hand (spec absent or a non-previewable declared
 * kind like text/seg whose artifacts may still carry a renderable
 * url). */
export interface PreviewOwnerProps {
  /** Media kind — the keyed dispatch value (the card's declared
   *  primary output; url-sniffed only as the fallback). */
  kind: 'video' | 'image' | 'audio' | 'mesh'
  /** The stage's rendered outputs (empty while none have landed). */
  artifacts: PreviewArtifact[]
  /** The estate's runStatus word ('' when never run). */
  runStatus: string
  /** Bench stage identity (for keyed React identity downstream). */
  stageId: string
  /** THE OUTPUT HISTORY (stroke 40 — the operator's QOL law: the
   *  mini row under the main preview is a CARD OUTPUT HISTORY):
   *  the stage's PREVIOUS unique outputs, newest first, capped at
   *  12 by the estate (derived server-side at every result
   *  overwrite — the live poll's progress faces never destroy a
   *  run's outputs; a re-run landing the same urls never
   *  double-lists). Each entry is one past run's artifact set —
   *  the hero's own run is NOT in it. Absent on lanes/rows without
   *  history. */
  history?: PreviewArtifact[][]
  /** THE STRIP OPT-OUT (output-component gap 4, stroke 67 — the
   *  operator's sketch: "advanced cards can flip the bottom bar
   *  off"): SERVED by the card's declaration (CardDefinition.preview
   *  → the form-spec doc's `preview.historyStrip`), read here by the
   *  owner build. Absent/true = ON (the default — the strip is the
   *  QOL law); false = the card claims its own bottom bar (the
   *  h3-timeline law: an advanced card's timeline IS the history). */
  historyStrip?: boolean
  /** THE PARAMS CHIP (the output-component stroke — "old
   *  generations that had different parameters"): index-aligned
   *  with `history`; entry i carries the comma-joined KEYS whose
   *  values differ between history[i]'s params snapshot and the
   *  live params (the estate snapshots at result landing —
   *  remote.ts; undefined when the entry predates snapshots or
   *  nothing differs). Rendered beside the not-current badge. */
  historyNotes?: string[]
}
