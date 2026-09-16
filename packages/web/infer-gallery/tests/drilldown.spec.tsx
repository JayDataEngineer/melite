/**
 * MediaDrilldown — THE media drilldown, one face for every surface
 * (the gallery tiles and the cards' stage previews ride the SAME
 * component): the kind-switched full-size artifact, the 3D sidebar
 * door (optional — hidden without a sidebar), the caption, the
 * close rails.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MediaDrilldown, type MediaDrilldownItem } from '../src/drilldown.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const IMAGE: MediaDrilldownItem = {
  kind: 'image',
  url: 'https://example.com/a.png',
  file: 'a.png',
  head: 'a red cube',
  time: '12:00',
}

function renderDrilldown(item: MediaDrilldownItem, props?: { openArtifact?: (item: MediaDrilldownItem) => void }): { closed: string[] } {
  const closed: string[] = []
  render(<MediaDrilldown item={item} onClose={() => { closed.push('closed') }} {...props} />)
  return { closed }
}

describe('MediaDrilldown — the kind-switched face', () => {
  it('shows the full-size image with its caption', () => {
    renderDrilldown(IMAGE)
    const img = screen.getByAltText('a.png') as HTMLImageElement
    expect(img.tagName).toBe('IMG')
    expect(img.src).toBe('https://example.com/a.png')
    expect(screen.getByText('a red cube')).toBeTruthy()
    expect(screen.getByText('12:00 · a.png')).toBeTruthy()
    expect(screen.getByText('Esc or click the mask to close')).toBeTruthy()
  })

  it('plays video and audio kinds', () => {
    const video = render(
      <MediaDrilldown item={{ ...IMAGE, kind: 'video', file: 'v.mp4' }} onClose={() => {}} />,
    )
    expect(document.querySelector('video')?.getAttribute('src')).toBe('https://example.com/a.png')
    video.unmount()
    renderDrilldown({ ...IMAGE, kind: 'audio', file: 'a.mp3' })
    expect(document.querySelector('audio')?.getAttribute('src')).toBe('https://example.com/a.png')
  })

  it('an unknown kind renders the caption without an artifact', () => {
    renderDrilldown({ ...IMAGE, kind: 'pdf' } as unknown as MediaDrilldownItem)
    expect(screen.getByText('a red cube')).toBeTruthy()
    expect(document.querySelector('img,video,audio')).toBeNull()
  })

  it('an empty filename falls back to the default title', () => {
    renderDrilldown({ ...IMAGE, file: '', time: '' })
    expect(screen.getByText('a red cube')).toBeTruthy()
    // time + file both empty filter out — no dangling separator.
    expect(screen.queryByText(/·/)).toBeNull()
  })

  it('the close rail closes', async () => {
    const user = userEvent.setup()
    const { closed } = renderDrilldown(IMAGE)
    await user.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(closed).toEqual(['closed'])
  })
})

describe('MediaDrilldown — the 3D sidebar door', () => {
  const MODEL: MediaDrilldownItem = { ...IMAGE, kind: 'model', file: 'mesh.glb' }

  it('opens the sidebar artifact on click and on Enter/Space (never on other keys)', async () => {
    const user = userEvent.setup()
    const opened: MediaDrilldownItem[] = []
    renderDrilldown(MODEL, { openArtifact: (item) => { opened.push(item) } })
    const link = screen.getByText('open 3D view in sidebar')
    await user.click(link)
    expect(opened).toHaveLength(1)
    expect(opened[0]).toEqual(MODEL)
    fireEvent.keyDown(link, { key: 'Enter' })
    fireEvent.keyDown(link, { key: ' ' })
    fireEvent.keyDown(link, { key: 'Tab' })
    expect(opened).toHaveLength(3)
  })

  it('hides the door without a sidebar (the download stays)', () => {
    renderDrilldown(MODEL)
    expect(screen.queryByText('open 3D view in sidebar')).toBeNull()
    const download = screen.getByText('download mesh.glb') as HTMLAnchorElement
    expect(download.getAttribute('href')).toBe('https://example.com/a.png')
    expect(download.getAttribute('download')).toBe('mesh.glb')
    fireEvent.click(download)
  })
})
