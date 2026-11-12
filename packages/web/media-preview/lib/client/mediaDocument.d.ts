import type { JSX } from 'react';
import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client';
/** The shared bytes face: the body's Blob URL lifecycle, owned once.
 * A non-bytes content value (never delivered for a 'bytes-complete'
 * registration) renders nothing — the owner's own states carry the
 * pending/failure faces, and a renderer that guessed a source would
 * fight the seat. @returns the object URL, or null while bytes are
 * absent. */
export declare function useDocumentBlobUrl(owner: DocumentPreviewProps): string | null;
/** The decoded filename the seat previews — the address's last
 * segment (separators stay literal in DSH file addresses; each
 * segment rides percent-encoded, decoded once like every consumer
 * of the address grammar). The renderer selection itself already
 * matched on this suffix. */
export declare function documentLeaf(owner: DocumentPreviewProps): string;
/** THE VIDEO FACE: the estate's video vocabulary (mp4 webm mkv mov
 * m4v avi — mediaVocab's own set, never a private list) behind one
 * native controls player. The element's own error face covers a
 * container the browser cannot decode (mkv/avi on some engines) —
 * the browser's honest answer, never the estate's silent dead end. */
export declare function VideoDocumentBody(props: DocumentPreviewProps): JSX.Element;
/** THE AUDIO FACE: the estate's audio vocabulary behind one native
 * controls player — except the qvoice arm, which renders the
 * embedding face (the no-play-button law, one spelling:
 * isPlayableAudioName). */
export declare function AudioDocumentBody(props: DocumentPreviewProps): JSX.Element;
//# sourceMappingURL=mediaDocument.d.ts.map