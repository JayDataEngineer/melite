/**
 * `@melite/media-preview` — client half: THE SHARE DOOR'S PREVIEW
 * FACE (operator 2026-11-12: "Look up in dsh, this already exists for
 * images. The agent can already make a toolcall to show images in
 * the chat window via explicit tool call. We just need to use this,
 * and extend it for video and audio.").
 *
 * The toolcall is the HARNESS `present` tool — DSH's own explicit
 * delivery declaration (dsh-tool-present + the web ui-deliverables
 * cards + the sidebar document seat). Melite adds NO verb (the
 * share-verb design is void by this ruling); melite EXTENDS the
 * seat's renderer vocabulary so the estate's video/audio artifacts
 * preview exactly where a presented image already does. Before this
 * row, a presented .mp4/.wav answered the tab's unsupported-preview
 * dead end ("a known binary container suffix without a registered
 * renderer").
 *
 * THE SEAM is DSH's public extension point (the documentpreview
 * package's own README): metadata through `ctx.documentPreviews.
 * register({ id, extensions, binaryExtensions, priority, title,
 * loading })`, body under the SAME id in the keyed, session-scoped
 * `sidebar.right.tab.document` slot. Both registrations are effects
 * (the disposer law); every extension derives from @melite/contracts
 * mediaVocab — the ONE classifier vocabulary (the li-ay stroke: one
 * vocabulary, or the seats disagree by construction). priority
 * 'extension' keeps melite's rows ahead of any builtin; loading
 * 'bytes-complete' rides the shared file reader (no private fetch).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the Context.documentPreviews service merge and the
// sidebar.right.tab.document SlotMap row (both provided by the web
// app's documentpreview plugin — inject below demands them), plus
// ctx.slots (the SlotRegistry service merge from the renderer).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { DocumentPreviewDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import { mediaVocab } from '@melite/contracts/mediaKinds'
import { AudioDocumentBody, VideoDocumentBody } from './mediaDocument.tsx'

export { AudioDocumentBody, VideoDocumentBody } from './mediaDocument.tsx'
export { documentLeaf, useDocumentBlobUrl } from './mediaDocument.tsx'

export const VIDEO_PREVIEW_ID = 'melite.preview.video'
export const AUDIO_PREVIEW_ID = 'melite.preview.audio'

/** The video renderer's metadata: the estate's video vocabulary,
 * binary-whole (no plain-text fallback for a video container),
 * bytes-complete loading. Derived from mediaVocab — never a private
 * list. */
export function videoPreviewDefinition(): DocumentPreviewDefinition {
  return {
    id: VIDEO_PREVIEW_ID,
    extensions: mediaVocab().video,
    binaryExtensions: mediaVocab().video,
    priority: 'extension',
    title: () => 'Video',
    loading: 'bytes-complete',
  }
}

/** The audio renderer's metadata: the estate's audio vocabulary
 * (qvoice included — it registers so the tab opens the EMBEDDING
 * face instead of the unsupported dead end; the player arm stays
 * gated inside the body by isPlayableAudioName). */
export function audioPreviewDefinition(): DocumentPreviewDefinition {
  return {
    id: AUDIO_PREVIEW_ID,
    extensions: mediaVocab().audio,
    binaryExtensions: mediaVocab().audio,
    priority: 'extension',
    title: () => 'Audio',
    loading: 'bytes-complete',
  }
}

/** 'slots' (the keyed document-body seat) + the documentpreview
 *  registry — both provided by the web app bundle; this row is
 *  web-surface-disabled without it (the render-seat patch law). */
export const inject = ['slots', 'documentPreviews']

export function apply(ctx: ClientContext): void {
  // SHELL LAW (the deck pattern): each registration site catches its
  // own collision and logs loud; a failed site never kills the other.
  try {
    ctx.effect(() => ctx.documentPreviews.register(videoPreviewDefinition()), '@melite/media-preview: video renderer')
  } catch (error) {
    console.error('[melite/media-preview] video renderer registration failed:', error)
  }
  try {
    ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () =>
      ctx.slots.register({ name: 'sidebar.right.tab.document', key: VIDEO_PREVIEW_ID }, VideoDocumentBody)),
    '@melite/media-preview: video body')
  } catch (error) {
    console.error('[melite/media-preview] video body registration failed:', error)
  }
  try {
    ctx.effect(() => ctx.documentPreviews.register(audioPreviewDefinition()), '@melite/media-preview: audio renderer')
  } catch (error) {
    console.error('[melite/media-preview] audio renderer registration failed:', error)
  }
  try {
    ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () =>
      ctx.slots.register({ name: 'sidebar.right.tab.document', key: AUDIO_PREVIEW_ID }, AudioDocumentBody)),
    '@melite/media-preview: audio body')
  } catch (error) {
    console.error('[melite/media-preview] audio body registration failed:', error)
  }
}
