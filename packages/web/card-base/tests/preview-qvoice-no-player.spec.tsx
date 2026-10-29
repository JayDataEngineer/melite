// @vitest-environment happy-dom
/**
 * preview-qvoice-no-player.spec.tsx — THE PLAYABLE HERO (operator
 * 2026-11-12: a `.qvoice` output must NOT have a play button — the
 * container carries voice EMBEDDINGS, not PCM; flac/mp3 keep the
 * player). qvoice still classifies as audio so it lists in the
 * media library — the predicate `isPlayableAudioName` is the ONE
 * spelling that splits "lists as audio" from "a player can decode
 * it", and the audio preview consults it twice: the hero seat
 * PREFERS a decodable artifact, and a qvoice-only hero renders the
 * embedding face (a named link + note), never an <audio> element.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h } from 'react'

import { AudioStagePreview } from '../src/preview.tsx'
import { isPlayableAudioName } from '@melite/contracts/mediaKinds'
import { mediaKindOf } from '@melite/contracts/mediaKinds'
import type { PreviewOwnerProps } from '@melite/contracts'

afterEach(() => cleanup())

const owner = (artifacts: Array<{ name: string, url: string }>): PreviewOwnerProps => ({
  kind: 'audio',
  artifacts,
  runStatus: 'completed',
})

describe('isPlayableAudioName — one spelling of playable', () => {
  test('PCM containers play; the qvoice embedding container does not — while BOTH still classify as audio', () => {
    for (const name of ['line.flac', 'line.mp3', 'take.wav', 'clip.ogg', 'a.m4a']) {
      expect(isPlayableAudioName(name), name).toBe(true)
      expect(mediaKindOf(name), name).toBe('audio')
    }
    expect(isPlayableAudioName('test_hera_01.qvoice')).toBe(false)
    // listing stays intact: qvoice is still audio-kind (the TTS
    // chain audit's 2026-10-15 cure is untouched by this split)
    expect(mediaKindOf('test_hera_01.qvoice')).toBe('audio')
  })

  test('query strings strip like every other vocabulary seat; case and non-audio names answer honestly', () => {
    expect(isPlayableAudioName('/runs/x/voice.qvoice?token=abc')).toBe(false)
    expect(isPlayableAudioName('/runs/x/take.flac?token=abc')).toBe(true)
    expect(isPlayableAudioName('VOICE.QVOICE')).toBe(false)
    expect(isPlayableAudioName('sheet.png')).toBe(false)
    expect(isPlayableAudioName('noext')).toBe(false)
  })
})

describe('AudioStagePreview — the hero seat', () => {
  test('a qvoice-only output renders the EMBEDDING face, never a player (the operator\'s burn)', () => {
    const { queryByTestId, getByTestId } = render(
      h(AudioStagePreview, owner([{ name: 'test_hera_01.qvoice', url: '/runs/r/test_hera_01.qvoice' }])),
    )
    expect(queryByTestId('stage-preview-audio-hero')).toBeNull()
    expect(getByTestId('stage-preview-audio-embedding')).toBeTruthy()
    // the face is a LINK to the artifact — still functional, never a play button
    const link = getByTestId('stage-preview-audio-embedding').querySelector('a')
    expect(link?.getAttribute('href')).toBe('/runs/r/test_hera_01.qvoice')
  })

  test('a flac hero keeps the native player (current behavior for real audio)', () => {
    const { getByTestId, queryByTestId } = render(
      h(AudioStagePreview, owner([{ name: 'line.flac', url: '/runs/r/line.flac' }])),
    )
    expect(getByTestId('stage-preview-audio-hero')).toBeTruthy()
    expect(queryByTestId('stage-preview-audio-embedding')).toBeNull()
  })

  test('a mixed set (design sample flac + saved qvoice) prefers the PLAYABLE artifact for the hero', () => {
    const { getByTestId } = render(h(AudioStagePreview, owner([
      { name: 'test_hera_01.qvoice', url: '/runs/r/test_hera_01.qvoice' },
      { name: 'design_sample.flac', url: '/runs/r/design_sample.flac' },
    ])))
    const hero = getByTestId('stage-preview-audio-hero') as HTMLAudioElement
    expect(hero.getAttribute('src')).toBe('/runs/r/design_sample.flac')
    // the qvoice still rides the strip as a link
    const link = document.querySelector('a[href="/runs/r/test_hera_01.qvoice"]')
    expect(link).toBeTruthy()
  })
})
