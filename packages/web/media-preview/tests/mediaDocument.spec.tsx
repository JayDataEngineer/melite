// mediaDocument.spec — THE SHARE DOOR'S PREVIEW BODIES: the video
// face mounts one native controls player from the seat's bytes, the
// audio face mounts one for every playable name, and the qvoice arm
// renders the embedding note (cards-qvoice-no-play-button: a .qvoice
// output carries NO player — embeddings, not PCM). The Blob URL
// carries the estate's ONE MIME spelling (contentTypeForArtifact)
// and revokes on unmount.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import {
  AudioDocumentBody,
  documentLeaf,
  VideoDocumentBody,
} from '../src/client/mediaDocument.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** The slot's owner face for one previewed file (PropsRuntime spreads
 * these on the body props; DocumentPreviewProps extends the owner). */
const ownerFor = (leaf: string, data: Uint8Array | null): DocumentPreviewProps =>
  ({
    resourceAddress: `dsh-file://session/s_1/runs/r_1/${encodeURIComponent(leaf).replace(/%3A/gi, ':')}`,
    content: data === null
      ? { kind: 'renderer', revision: 1, loaded: () => {}, failed: () => {}, reload: () => {} }
      : { kind: 'bytes', data },
    wrap: false,
    scrollportRef: () => {},
    addResource: () => {},
    setResources: () => {},
  }) as unknown as DocumentPreviewProps

describe('VideoDocumentBody — the estate video vocabulary behind one native player', () => {
  it('mounts a controls video whose src is the bytes\' Blob URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const owner = ownerFor('film.mp4', new Uint8Array([1, 2, 3]))
    const { container } = render(<VideoDocumentBody {...owner} />)
    const video = container.querySelector('video[data-testid="melite-media-preview-video"]')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('controls')).not.toBeNull()
    expect(video?.getAttribute('src')).toBe(createObjectURL.mock.results[0]?.value)
    // THE ONE MIME SPELLING (the audio-seek stroke law): the Blob the
    // URL was minted from carries the artifact's mapped content type
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob
    expect(blob.type).toBe('video/mp4')
  })

  it('renders nothing while bytes are absent (the owner\'s states carry pending/failure)', () => {
    const owner = ownerFor('film.mp4', null)
    const { container } = render(<VideoDocumentBody {...owner} />)
    expect(container.querySelector('video')).toBeNull()
  })
})

describe('AudioDocumentBody — the estate audio vocabulary, qvoice excepted', () => {
  it('mounts a controls audio for a playable name', () => {
    vi.spyOn(URL, 'createObjectURL')
    const owner = ownerFor('voice.flac', new Uint8Array([4, 5]))
    const { container } = render(<AudioDocumentBody {...owner} />)
    const audio = container.querySelector('audio[data-testid="melite-media-preview-audio"]')
    expect(audio).not.toBeNull()
    expect(audio?.getAttribute('controls')).not.toBeNull()
  })

  it('a qvoice name renders the embedding face — ZERO audio elements (the no-play-button law)', () => {
    vi.spyOn(URL, 'createObjectURL')
    const owner = ownerFor('narrator.qvoice', new Uint8Array([6]))
    const { container } = render(<AudioDocumentBody {...owner} />)
    expect(container.querySelector('audio')).toBeNull()
    expect(container.querySelector('[data-testid="melite-media-preview-embedding"]')).not.toBeNull()
  })

  it('renders nothing while bytes are absent (the owner\'s states carry pending/failure)', () => {
    const owner = ownerFor('voice.flac', null)
    const { container } = render(<AudioDocumentBody {...owner} />)
    expect(container.querySelector('audio')).toBeNull()
    expect(container.querySelector('[data-testid="melite-media-preview-embedding"]')).toBeNull()
  })
})

describe('the Blob URL lifecycle (the builtin image renderer\'s, mirrored)', () => {
  it('revokes the URL when the body unmounts', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const owner = ownerFor('film.webm', new Uint8Array([7]))
    const { unmount } = render(<VideoDocumentBody {...owner} />)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith(createObjectURL.mock.results[0]?.value)
  })
})

describe('documentLeaf — the address\'s decoded last segment', () => {
  it('splits the DECODED filename off the resource address (segments ride percent-encoded)', () => {
    expect(documentLeaf(ownerFor('a b (take 2).mp4', null))).toBe('a b (take 2).mp4')
    expect(documentLeaf(ownerFor('take#2.flac', null))).toBe('take#2.flac')
  })
  it('a malformed escape never throws in render — the raw segment stands', () => {
    const owner = ownerFor('x.mp4', null)
    const malformed = { ...owner, resourceAddress: 'dsh-file://session/s_1/runs/r_1/take%zz.mp4' }
    expect(documentLeaf(malformed as never)).toBe('take%zz.mp4')
  })
})
