/**
 * tile-face.spec.tsx — THE TILE FACE LAW (2026-09-13, operator):
 * "I wouldn't get 'broken image' for music… a screenshot or some
 *  preview would show up instead of the no-image display bug."
 * The bench tile's preview face dispatches on the artifact's kind:
 * audio → the audio-bars face (NEVER an <img> with an mp3 src),
 * mesh → a real poster from the run's own image artifacts when one
 * exists (zero render cost), else the kind face; video → a metadata
 * <video>. The chat-plane line row rides the same dispatch.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { benchRow, previewKindFor } from '../src/client/CardsTab'

const stage = (over: Record<string, unknown> = {}) => ({
  id: 's1', card: 'music', title: 'the song', status: 'done',
  runStatus: 'done', params: {}, inputs: {},
  ...over,
})

afterEach(cleanup)

describe('benchRow tile face dispatch', () => {
  test('a music row: the audio-bars face, never an <img>', () => {
    const row = benchRow(stage({ result: { url: '/melite-media/out/hero.mp3' } }) as never)
    expect(row.face).toBe('audio')
    expect(row.thumbUrl).toBeNull()
    expect(row.videoUrl).toBeNull()
    expect(previewKindFor('/melite-media/out/hero.mp3')).toBe('audio')
  })

  test('a mesh row whose run shipped a turnaround poster: the poster becomes the thumb', () => {
    const row = benchRow(stage({
      card: 'anny', result: { url: '/melite-media/out/model.glb', artifacts: { model: '/melite-media/out/model.glb', turnaround: '/melite-media/out/turnaround.png' } },
    }) as never)
    expect(row.face).toBe('mesh')
    expect(row.thumbUrl).toBe('/melite-media/out/turnaround.png')
  })

  test('a mesh row with no poster: the kind face (no broken <img>, no poster lie)', () => {
    const row = benchRow(stage({
      card: 'anny', result: { url: '/melite-media/out/model.glb', artifacts: { model: '/melite-media/out/model.glb' } },
    }) as never)
    expect(row.face).toBe('mesh')
    expect(row.thumbUrl).toBeNull()
  })

  test('a video row: the video url rides (metadata <video> face), thumb stays null', () => {
    const row = benchRow(stage({ result: { url: '/melite-media/out/clip.mp4' } }) as never)
    expect(row.face).toBe('video')
    expect(row.videoUrl).toBe('/melite-media/out/clip.mp4')
    expect(row.thumbUrl).toBeNull()
  })

  test('an image row keeps today\u2019s <img> path', () => {
    const row = benchRow(stage({ result: { url: '/melite-media/out/frame.png' } }) as never)
    expect(row.face).toBe('image')
    expect(row.thumbUrl).toBe('/melite-media/out/frame.png')
  })

  test('a bare run-relative filename still hides (the run view owns that face)', () => {
    const row = benchRow(stage({ result: { url: 'out/hero.mp3' } }) as never)
    expect(row.face).toBe('audio')
    expect(row.videoUrl).toBeNull()
    expect(row.thumbUrl).toBeNull()
  })
})

test('the sniff itself: every media kind is nameable (no null holes for real artifacts)', () => {
  for (const u of ['/a.mp4', '/a.webm', '/a.mov', '/a.png', '/a.jpg', '/a.webp',
                   '/a.mp3', '/a.wav', '/a.ogg', '/a.flac', '/a.m4a', '/a.glb', '/a.gltf']) {
    expect(previewKindFor(u), u).not.toBeNull()
  }
  expect(screen.queryByRole('img')).toBeNull()
})
