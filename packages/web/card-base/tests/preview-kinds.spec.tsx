// @vitest-environment happy-dom
// preview-kinds.spec.tsx — THE KIND PREVIEWS (preview.tsx half 2):
// video and audio ride the same history law as image (one hero
// film/track, the active set's named windows beneath, the history
// strip + stale badge shared); empty states stay honest about the
// live-run flag. The history mechanics themselves are walled in
// preview-history.spec.tsx — here each kind proves it plugs in.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { resetPickCellsForTests } from '../src/preview.tsx'
import { createElement as h } from 'react'

import { AudioStagePreview, ImageStagePreview, MeshStagePreview, VideoStagePreview } from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'

afterEach(() => { cleanup(); resetPickCellsForTests() })

const video = (over: Partial<PreviewOwnerProps> = {}): PreviewOwnerProps => ({
  kind: 'video',
  artifacts: [{ name: 'film', url: '/runs/cur/film.mp4' }],
  runStatus: 'completed',
  stageId: 's_0',
  ...over,
})

const audio = (over: Partial<PreviewOwnerProps> = {}): PreviewOwnerProps => ({
  kind: 'audio',
  artifacts: [{ name: 'track', url: '/runs/cur/track.mp3' }],
  runStatus: 'completed',
  stageId: 's_0',
  ...over,
})

test('THE VIDEO HERO: one native player keyed on the hero url', () => {
  const { container } = render(h(VideoStagePreview, video()))
  const hero = screen.getByTestId('stage-preview-video-hero')
  expect(hero.tagName).toBe('VIDEO')
  expect(hero.getAttribute('src')).toBe('/runs/cur/film.mp4')
  expect(hero.hasAttribute('controls')).toBe(true)
  expect(container.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
})

test('THE VIDEO EMPTY: honest about the live-run flag (rendering vs never-run)', () => {
  const running = render(h(VideoStagePreview, video({ artifacts: [], runStatus: 'running' })))
  expect(running.container.textContent).toContain('rendering… the film lands here')
  running.unmount()
  const idle = render(h(VideoStagePreview, video({ artifacts: [], runStatus: '' })))
  expect(idle.container.textContent).toContain('No render yet — run lands the film here')
  idle.unmount()
})

test('THE VIDEO SET: the windows ride PLAYABLE thumbs, never text links (catch b, 2026-09-22)', () => {
  // a film run's artifacts arrive windows-first, film LAST — the
  // named film must still win the hero (the product, not w1), and
  // every other clip shows its FACE (a <video> thumb), not a link
  const { container } = render(h(VideoStagePreview, video({
    artifacts: [
      { name: 'h3_t4_w1', url: '/runs/cur/w1.mp4' },
      { name: 'h3_t4_w2', url: '/runs/cur/w2.mp4' },
      { name: 'h3_t4_w3', url: '/runs/cur/w3.mp4' },
      { name: 'h3_t4_film', url: '/runs/cur/film.mp4' },
    ],
  })))
  // THE FILM IS THE HERO even though it arrives last
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/cur/film.mp4')
  // ALL FOUR clips render as playable faces — the film included
  // (the all-visible law: promoting a window never hides a clip)
  const strip = screen.getByTestId('stage-preview-video-strip')
  const faces = strip.querySelectorAll('video')
  expect(faces.length).toBe(4)
  expect(faces[0]!.getAttribute('src')).toBe('/runs/cur/film.mp4')
  expect(faces[1]!.getAttribute('src')).toBe('/runs/cur/w1.mp4')
  expect(faces[0]!.hasAttribute('controls')).toBe(false)
  // names paint on the thumbs
  expect(screen.getByText('h3_t4_w1')).not.toBeNull()
  expect(screen.getByText('h3_t4_w3')).not.toBeNull()
  // no text-link door in the video set
  expect(strip.querySelector('a')).toBeNull()
})

test('THE VIDEO THUMB TOGGLE: click promotes a window into the hero, click again returns (the toggle law)', () => {
  render(h(VideoStagePreview, video({
    artifacts: [
      { name: 'h3_t4_w1', url: '/runs/cur/w1.mp4' },
      { name: 'h3_t4_film', url: '/runs/cur/film.mp4' },
    ],
  })))
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/cur/film.mp4')
  const thumb = screen.getByTitle('h3_t4_w1 — click to preview')
  fireEvent.click(thumb)
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/cur/w1.mp4')
  // the film returns to the strip; clicking the active thumb toggles back
  fireEvent.click(screen.getByTitle('h3_t4_w1 (viewing — click to return to the film)'))
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/cur/film.mp4')
})

test('THE SEAT BUBBLE: a thumb click opens its tab WITHOUT opening the walk (ledger #45)', () => {
  // the drilldown seat is a walk-opening button; the presenter
  // rides inside it. The thumb must consume its own click — the
  // spy seat stands in for the walk opener.
  const opened: string[] = []
  render(h('div', { onClick: () => { opened.push('walk') } },
    h(VideoStagePreview, video({
      artifacts: [
        { name: 'film', url: '/runs/cur/film.mp4' },
        { name: 'storyboard', url: '/runs/cur/board.mp4' },
      ],
    }))))
  fireEvent.click(screen.getByTitle('storyboard — click to preview'))
  expect(opened).toEqual([])
})

test('THE VIDEO HISTORY LAW: strip, promote, stale badge, notes ride like image', () => {
  render(h(VideoStagePreview, video({
    history: [[{ name: 'film', url: '/runs/prev/film.mp4' }]],
    historyNotes: ['steps'],
  })))
  expect(screen.getByTestId('stage-output-history')).not.toBeNull()
  const tile = screen.getByTitle('film (differs: steps)')
  fireEvent.click(tile)
  expect(screen.getByTestId('history-stale-badge').textContent).toContain('differs: steps')
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/prev/film.mp4')
})

test('THE AUDIO HERO: one native player keyed on the hero url', () => {
  render(h(AudioStagePreview, audio()))
  const hero = screen.getByTestId('stage-preview-audio-hero')
  expect(hero.tagName).toBe('AUDIO')
  expect(hero.getAttribute('src')).toBe('/runs/cur/track.mp3')
  expect(hero.hasAttribute('controls')).toBe(true)
})

test('THE AUDIO EMPTY: honest about the live-run flag (rendering vs never-run)', () => {
  const running = render(h(AudioStagePreview, audio({ artifacts: [], runStatus: 'running' })))
  expect(running.container.textContent).toContain('rendering… the track lands here')
  running.unmount()
  const idle = render(h(AudioStagePreview, audio({ artifacts: [], runStatus: '' })))
  expect(idle.container.textContent).toContain('No render yet — run lands the track here')
  idle.unmount()
})

test('THE AUDIO SET: the active set names its clips beneath the hero', () => {
  render(h(AudioStagePreview, audio({
    artifacts: [
      { name: 'track', url: '/runs/cur/track.mp3' },
      { name: 'stems', url: '/runs/cur/stems.mp3' },
    ],
  })))
  const link = screen.getByText('stems')
  expect(link.tagName).toBe('A')
  expect(link.getAttribute('href')).toBe('/runs/cur/stems.mp3')
})

test('THE IMAGE EMPTY: honest about the live-run flag (rendering vs never-run)', () => {
  const running = render(h(ImageStagePreview, { ...video({ artifacts: [], runStatus: 'running' }), kind: 'image' }))
  expect(running.container.textContent).toContain('rendering… the image lands here')
  running.unmount()
  const idle = render(h(ImageStagePreview, { ...video({ artifacts: [], runStatus: '' }), kind: 'image' }))
  expect(idle.container.textContent).toContain('No render yet — run lands the image here')
  idle.unmount()
})

test('THE MESH EMPTY: the stage seats no assets; the hint honors the live-run flag', () => {
  const running = render(h(MeshStagePreview, { ...video({ artifacts: [], runStatus: 'running' }), kind: 'mesh' }))
  expect(running.container.textContent).toContain('rendering… the mesh lands here')
  running.unmount()
  const idle = render(h(MeshStagePreview, { ...video({ artifacts: [], runStatus: '' }), kind: 'mesh' }))
  expect(idle.container.textContent).toContain('No render yet — run lands the mesh here')
  idle.unmount()
})

test('THE EMPTY HISTORY ENTRY: a urlless entry still tiles (keyed by index, titled empty)', () => {
  const { container } = render(h(VideoStagePreview, video({ history: [[]] })))
  const tile = container.querySelector('[data-testid="stage-output-history"] button')
  expect(tile).not.toBeNull()
  expect(tile!.getAttribute('title')).toBe('')
  // promoting it views nothing new — the flat hero stands (never an empty hero)
  fireEvent.click(tile!)
  expect(screen.getByTestId('stage-preview-video-hero').getAttribute('src')).toBe('/runs/cur/film.mp4')
  expect(screen.queryByTestId('history-stale-badge')).toBeNull()
})

test('THE AUDIO HISTORY LAW: promote swaps the whole set; the badge clears on a new run', () => {
  const { rerender } = render(h(AudioStagePreview, audio({
    history: [[{ name: 'old', url: '/runs/prev/old.mp3' }]],
  })))
  fireEvent.click(screen.getByTitle('old'))
  expect(screen.getByTestId('history-stale-badge')).not.toBeNull()
  expect(screen.getByTestId('stage-preview-audio-hero').getAttribute('src')).toBe('/runs/prev/old.mp3')
  // a NEW result reclaims the hero (the selection never outlives its run)
  rerender(h(AudioStagePreview, audio({ artifacts: [{ name: 'fresh', url: '/runs/new/fresh.mp3' }] })))
  expect(screen.getByTestId('stage-preview-audio-hero').getAttribute('src')).toBe('/runs/new/fresh.mp3')
  expect(screen.queryByTestId('history-stale-badge')).toBeNull()
})

// ── THE KIND FACE (the operator's catches, 2026-10-08: "it says
// 'gone' instead historical view under the preview… works for image
// cards, but not audio"; then "a long rectangle with a file name,
// instead of something nice and compact") ──────────────────────
// An <img> decodes ONLY images: an audio (or video, or mesh) url
// seated in an <img> fires onError the moment a real browser mounts
// it — every non-image history tile flipped to the dead face and the
// Music card's strip said 'gone' for files that exist. The kind face
// renders a COMPACT 48×48 glyph square (the image thumb row's own
// rhythm — the name-in-chip cut painted "a long rectangle with a
// file name"); the full artifact name rides the TILE BUTTON's
// tooltip, never the face. The dead face stays an IMAGE-only honesty
// (preview-history.spec walls it there).
test('THE AUDIO KIND FACE: a track tile renders the compact glyph square — never an <img> decode, never a false gone', () => {
  const { container } = render(h(AudioStagePreview, audio({
    history: [[{ name: 'old', url: '/runs/prev/old.mp3' }]],
  })))
  const block = container.querySelector('[data-testid="stage-output-history"]') as HTMLElement
  // NO img seat exists to error — the false-'gone' path is dead by
  // construction for non-image kinds
  expect(block.querySelector('img')).toBeNull()
  expect(block.textContent).not.toContain('gone')
  // the face IS the glyph (svg), carries NO file name — compact,
  // never a long rectangle; the name rides the tile's tooltip
  const face = block.querySelector('[data-testid="history-thumb-audio"]') as SVGElement
  expect(face).not.toBeNull()
  expect(face.tagName.toLowerCase()).toBe('svg')
  expect(face.textContent).toBe('')
  const tile = block.querySelector('button') as HTMLElement
  expect(tile.getAttribute('title')).toContain('old')
  // the tile still promotes its generation to the hero
  fireEvent.click(tile)
  expect(screen.getByTestId('stage-preview-audio-hero').getAttribute('src')).toBe('/runs/prev/old.mp3')
})

test('THE VIDEO KIND FACE: a film tile renders the glyph face (an mp4 in an <img> errors the same way an mp3 does)', () => {
  const { container } = render(h(VideoStagePreview, video({
    history: [[{ name: 'film', url: '/runs/prev/film.mp4' }]],
  })))
  const block = container.querySelector('[data-testid="stage-output-history"]') as HTMLElement
  expect(block.querySelector('img')).toBeNull()
  const face = block.querySelector('[data-testid="history-thumb-video"]') as SVGElement
  expect(face.tagName.toLowerCase()).toBe('svg')
  expect(face.textContent).toBe('')
})

test('THE MESH KIND FACE: a glb tile renders the glyph face like every non-image kind', () => {
  const { container } = render(h(MeshStagePreview, {
    ...video({ history: [[{ name: 'mesh', url: '/runs/prev/m.glb' }]] }),
    kind: 'mesh',
  }))
  const block = container.querySelector('[data-testid="stage-output-history"]') as HTMLElement
  expect(block.querySelector('img')).toBeNull()
  const face = block.querySelector('[data-testid="history-thumb-mesh"]') as SVGElement
  expect(face.tagName.toLowerCase()).toBe('svg')
  expect(face.textContent).toBe('')
})

test('THE NAMELESS MESH ASSET: the stage seats it by index (never an empty asset id)', () => {
  const { container } = render(h(MeshStagePreview, {
    ...video({ artifacts: [{ name: '', url: '/runs/cur/m.glb' }], runStatus: 'completed' }),
    kind: 'mesh',
  }))
  expect(container.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
})
