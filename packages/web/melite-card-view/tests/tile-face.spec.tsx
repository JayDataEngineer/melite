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
import { benchRow, previewKindFor, previewArtifactsFor } from '../src/client/CardsTab'

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

  // THE RESTORED-RUN LAW (2026-10-02, the operator: "when I resume
  // historical runs the image preview doesn't auto populate back" —
  // the non-zoomed tile showed the kind face while the zoomed drill
  // previewed the very same run).
  test('a RESTORED image run: the gallery route previews (the kind comes from the artifact name)', () => {
    // The gallery's restore stamp (infer-gallery/bench-load.ts) mints
    // the query-carrying artifact route, keyed by the run-relative
    // tail. The url is loadable; its PATH has no extension, so the
    // url sniff alone reads null — which is exactly what emptied the
    // tile. The harvest's NAME carries the kind.
    const url = '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rz/out.png')
    const row = benchRow(stage({
      card: 'image-gen',
      result: { url, artifacts: { 'run-0f1e2d-rz/out.png': url } },
    }) as never)
    expect(row.face).toBe('image')
    expect(row.thumbUrl).toBe(url)
  })

  test('a RESTORED video run: the gallery route rides the video face', () => {
    const url = '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rz/clip.mp4')
    const row = benchRow(stage({
      card: 'h3-timeline',
      result: { url, artifacts: { 'run-0f1e2d-rz/clip.mp4': url } },
    }) as never)
    expect(row.face).toBe('video')
    expect(row.videoUrl).toBe(url)
    expect(row.thumbUrl).toBeNull()
  })

  test('a RESTORED mesh run: the turnaround poster rides the gallery route (the pick reads the name the url hides)', () => {
    const route = (tail: string): string => '/infer-gallery/artifact?path=' + encodeURIComponent(tail)
    const row = benchRow(stage({
      card: 'anny',
      result: {
        url: route('run-0f1e2d-rz/model.glb'),
        artifacts: { 'run-0f1e2d-rz/model.glb': route('run-0f1e2d-rz/model.glb'), 'run-0f1e2d-rz/turnaround.png': route('run-0f1e2d-rz/turnaround.png') },
      },
    }) as never)
    expect(row.face).toBe('mesh')
    expect(row.thumbUrl).toBe(route('run-0f1e2d-rz/turnaround.png'))
  })

  test('the tile and the drill decide from ONE harvest (the asymmetry is gone by construction)', () => {
    const url = '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rz/out.png')
    const st = stage({
      card: 'image-gen',
      result: { url, artifacts: { 'run-0f1e2d-rz/out.png': url } },
    }) as never
    // The drill reads previewArtifactsFor; the tile now classifies off
    // the same rows, so a run can never preview in one view and show
    // a kind face in the other.
    expect(previewArtifactsFor(st as unknown as Record<string, unknown>)[0]?.url)
      .toBe(benchRow(st).thumbUrl)
  })
})

test('the sniff itself: every media kind is nameable (no null holes for real artifacts)', () => {
  for (const u of ['/a.mp4', '/a.webm', '/a.mov', '/a.png', '/a.jpg', '/a.webp',
                   '/a.mp3', '/a.wav', '/a.ogg', '/a.flac', '/a.m4a', '/a.glb', '/a.gltf']) {
    expect(previewKindFor(u), u).not.toBeNull()
  }
  expect(screen.queryByRole('img')).toBeNull()
})
