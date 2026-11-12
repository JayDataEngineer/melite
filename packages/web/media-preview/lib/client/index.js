import { mediaVocab } from '@melite/contracts/mediaKinds';
import { AudioDocumentBody, VideoDocumentBody } from "./mediaDocument.js";
export { AudioDocumentBody, VideoDocumentBody } from "./mediaDocument.js";
export { documentLeaf, useDocumentBlobUrl } from "./mediaDocument.js";
export const VIDEO_PREVIEW_ID = 'melite.preview.video';
export const AUDIO_PREVIEW_ID = 'melite.preview.audio';
/** The video renderer's metadata: the estate's video vocabulary,
 * binary-whole (no plain-text fallback for a video container),
 * bytes-complete loading. Derived from mediaVocab — never a private
 * list. */
export function videoPreviewDefinition() {
    return {
        id: VIDEO_PREVIEW_ID,
        extensions: mediaVocab().video,
        binaryExtensions: mediaVocab().video,
        priority: 'extension',
        title: () => 'Video',
        loading: 'bytes-complete',
    };
}
/** The audio renderer's metadata: the estate's audio vocabulary
 * (qvoice included — it registers so the tab opens the EMBEDDING
 * face instead of the unsupported dead end; the player arm stays
 * gated inside the body by isPlayableAudioName). */
export function audioPreviewDefinition() {
    return {
        id: AUDIO_PREVIEW_ID,
        extensions: mediaVocab().audio,
        binaryExtensions: mediaVocab().audio,
        priority: 'extension',
        title: () => 'Audio',
        loading: 'bytes-complete',
    };
}
/** 'slots' (the keyed document-body seat) + the documentpreview
 *  registry — both provided by the web app bundle; this row is
 *  web-surface-disabled without it (the render-seat patch law). */
export const inject = ['slots', 'documentPreviews'];
export function apply(ctx) {
    // SHELL LAW (the deck pattern): each registration site catches its
    // own collision and logs loud; a failed site never kills the other.
    try {
        ctx.effect(() => ctx.documentPreviews.register(videoPreviewDefinition()), '@melite/media-preview: video renderer');
    }
    catch (error) {
        console.error('[melite/media-preview] video renderer registration failed:', error);
    }
    try {
        ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({ name: 'sidebar.right.tab.document', key: VIDEO_PREVIEW_ID }, VideoDocumentBody)), '@melite/media-preview: video body');
    }
    catch (error) {
        console.error('[melite/media-preview] video body registration failed:', error);
    }
    try {
        ctx.effect(() => ctx.documentPreviews.register(audioPreviewDefinition()), '@melite/media-preview: audio renderer');
    }
    catch (error) {
        console.error('[melite/media-preview] audio renderer registration failed:', error);
    }
    try {
        ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({ name: 'sidebar.right.tab.document', key: AUDIO_PREVIEW_ID }, AudioDocumentBody)), '@melite/media-preview: audio body');
    }
    catch (error) {
        console.error('[melite/media-preview] audio body registration failed:', error);
    }
}
//# sourceMappingURL=index.js.map
