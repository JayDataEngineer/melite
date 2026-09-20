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

test('THE VIDEO SET: the active set names its windows beneath the hero', () => {
  render(h(VideoStagePreview, video({
    artifacts: [
      { name: 'film', url: '/runs/cur/film.mp4' },
      { name: 'storyboard', url: '/runs/cur/board.mp4' },
    ],
  })))
  const link = screen.getByText('storyboard')
  expect(link.tagName).toBe('A')
  expect(link.getAttribute('href')).toBe('/runs/cur/board.mp4')
  expect(link.getAttribute('target')).toBe('_blank')
})

test('THE SEAT BUBBLE: a rest link opens its tab WITHOUT opening the walk (ledger #45)', () => {
  // the drilldown seat is a walk-opening button; the presenter
  // rides inside it. The link must consume its own click — the
  // spy seat stands in for the walk opener.
  const opened: string[] = []
  render(h('div', { onClick: () => { opened.push('walk') } },
    h(VideoStagePreview, video({
      artifacts: [
        { name: 'film', url: '/runs/cur/film.mp4' },
        { name: 'storyboard', url: '/runs/cur/board.mp4' },
      ],
    }))))
  fireEvent.click(screen.getByText('storyboard'))
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

test('THE NAMELESS MESH ASSET: the stage seats it by index (never an empty asset id)', () => {
  const { container } = render(h(MeshStagePreview, {
    ...video({ artifacts: [{ name: '', url: '/runs/cur/m.glb' }], runStatus: 'completed' }),
    kind: 'mesh',
  }))
  expect(container.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
})
