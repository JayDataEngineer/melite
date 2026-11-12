/**
 * mediaDocument.tsx — the share door's preview bodies: one VIDEO face
 * and one AUDIO face for the GUI's sidebar document seat.
 *
 * THE SEAM (references/deepseek-harness/docs — the ui-deliverables +
 * sidebar-documentpreview pair): the agent's `present` toolcall
 * declares files; the delivery card's click opens the right-Sidebar
 * document tab; the tab picks a renderer from
 * `ctx.documentPreviews` by file suffix (extension band over builtin,
 * longest suffix first) and mounts its body from the keyed
 * `sidebar.right.tab.document` slot under the same id. This package
 * registers the estate's video/audio vocabulary there — before it,
 * a presented .mp4 or .wav hit the "known binary container suffix
 * without a registered renderer" dead end while a .png previewed
 * fine (the operator's exact gap: images work, video and audio do
 * not).
 *
 * THE BODIES are presentational only (the web-card law: derive from
 * the slot's shared state, own no fetch): `loading: 'bytes-complete'`
 * hands the whole file as `{ kind: 'bytes', data }`; the body mints
 * ONE Blob URL from those bytes with the estate's ONE MIME spelling
 * (contentTypeForArtifact — the audio-seek stroke law: no player
 * seeks what it is barely willing to name), mounts the native
 * element (`<video controls>` / `<audio controls>`), and revokes the
 * URL on unmount and on every bytes change (the DSH builtin image
 * renderer's own Blob lifecycle, mirrored).
 *
 * THE QVOICE LAW (cards-qvoice-no-play-button, operator 2026-11-12):
 * a .qvoice output carries NO player — the container is voice
 * embeddings, not PCM. The classifier keeps it in the audio
 * vocabulary so it lists; the PLAYER seat asks
 * `isPlayableAudioName` (the one spelling), so a qvoice preview
 * renders the embedding face (named note, never an audio element).
 *
 * The slot's owner fields arrive spread on the props themselves
 * (PropsRuntime = OwnerOf & … — content, resourceAddress, wrap at
 * the top level, the same shape ToolCallViewProps carries `block`).
 */
import { useEffect, useMemo } from 'react'
import type { JSX } from 'react'
import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import { contentTypeForArtifact, isPlayableAudioName } from '@melite/contracts/mediaKinds'

/** The shared bytes face: the body's Blob URL lifecycle, owned once.
 * A non-bytes content value (never delivered for a 'bytes-complete'
 * registration) renders nothing — the owner's own states carry the
 * pending/failure faces, and a renderer that guessed a source would
 * fight the seat. @returns the object URL, or null while bytes are
 * absent. */
export function useDocumentBlobUrl(owner: DocumentPreviewProps): string | null {
  const data = owner.content.kind === 'bytes' ? owner.content.data : null
  // the URL is derived state: one memo per bytes identity, revoked by
  // the effect when the identity changes or the body unmounts (the
  // builtin image renderer's lifecycle, mirrored)
  const url = useMemo(() => {
    if (data === null) return null
    const leaf = owner.resourceAddress.slice(owner.resourceAddress.lastIndexOf('/') + 1)
    return URL.createObjectURL(new Blob([data], { type: contentTypeForArtifact(leaf) }))
  }, [data, owner.resourceAddress])
  useEffect(() => () => { if (url !== null) URL.revokeObjectURL(url) }, [url])
  return url
}

/** The decoded filename the seat previews — the address's last
 * segment (separators stay literal in DSH file addresses; each
 * segment rides percent-encoded, decoded once like every consumer
 * of the address grammar). The renderer selection itself already
 * matched on this suffix. */
export function documentLeaf(owner: DocumentPreviewProps): string {
  const last = owner.resourceAddress.slice(owner.resourceAddress.lastIndexOf('/') + 1)
  try {
    return decodeURIComponent(last)
  } catch {
    // a malformed escape never reaches the seat (the sender encoded
    // it); keep the raw segment rather than throwing in render
    return last
  }
}

/** THE VIDEO FACE: the estate's video vocabulary (mp4 webm mkv mov
 * m4v avi — mediaVocab's own set, never a private list) behind one
 * native controls player. The element's own error face covers a
 * container the browser cannot decode (mkv/avi on some engines) —
 * the browser's honest answer, never the estate's silent dead end. */
export function VideoDocumentBody(props: DocumentPreviewProps): JSX.Element {
  const url = useDocumentBlobUrl(props)
  if (url === null) return <></>
  return (
    <video
      controls
      src={url}
      data-testid="melite-media-preview-video"
      style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', margin: 'auto' }}
    />
  )
}

/** THE AUDIO FACE: the estate's audio vocabulary behind one native
 * controls player — except the qvoice arm, which renders the
 * embedding face (the no-play-button law, one spelling:
 * isPlayableAudioName). */
export function AudioDocumentBody(props: DocumentPreviewProps): JSX.Element {
  const url = useDocumentBlobUrl(props)
  const leaf = documentLeaf(props)
  if (url === null) return <></>
  if (!isPlayableAudioName(leaf)) {
    return (
      <div data-testid="melite-media-preview-embedding" style={{ padding: 24, opacity: 0.8 }}>
        <p style={{ margin: 0 }}>
          {leaf}
          {' — voice embeddings (qvoice), not audio a player can decode; the voice rides the tts lane\u2019s own seats.'}
        </p>
      </div>
    )
  }
  return (
    <audio
      controls
      src={url}
      data-testid="melite-media-preview-audio"
      style={{ display: 'block', width: '100%' }}
    />
  )
}
