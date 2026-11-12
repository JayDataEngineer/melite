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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { DocumentPreviewDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client';
export { AudioDocumentBody, VideoDocumentBody } from './mediaDocument.js';
export { documentLeaf, useDocumentBlobUrl } from './mediaDocument.js';
export declare const VIDEO_PREVIEW_ID = "melite.preview.video";
export declare const AUDIO_PREVIEW_ID = "melite.preview.audio";
/** The video renderer's metadata: the estate's video vocabulary,
 * binary-whole (no plain-text fallback for a video container),
 * bytes-complete loading. Derived from mediaVocab — never a private
 * list. */
export declare function videoPreviewDefinition(): DocumentPreviewDefinition;
/** The audio renderer's metadata: the estate's audio vocabulary
 * (qvoice included — it registers so the tab opens the EMBEDDING
 * face instead of the unsupported dead end; the player arm stays
 * gated inside the body by isPlayableAudioName). */
export declare function audioPreviewDefinition(): DocumentPreviewDefinition;
/** 'slots' (the keyed document-body seat) + the documentpreview
 *  registry — both provided by the web app bundle; this row is
 *  web-surface-disabled without it (the render-seat patch law). */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
