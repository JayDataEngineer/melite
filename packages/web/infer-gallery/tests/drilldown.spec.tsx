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
import { useState } from 'react'

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

function renderDrilldown(item: MediaDrilldownItem, props?: { openArtifact?: (item: MediaDrilldownItem) => void; onDelete?: (item: MediaDrilldownItem) => Promise<void>; onRename?: (item: MediaDrilldownItem, name: string) => Promise<void> }): { closed: string[] } {
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

  it('FIT THE BOX, NOT THE VIEWPORT — video and image size to the seat, never 94vw (the "too big for the box" catch)', () => {
    // Operator catch, 2026-09-23 (asked 5+ times): the lightbox
    // dialog is min(1200px, 96vw); a maxWidth:94vw video is
    // viewport-clamped and renders WIDER than the dialog on any
    // screen past ~1280px. The media element takes the seat's
    // content width and letterboxes inside itself (contain) — it
    // can never exceed the box. No vw clamp anywhere on the element.
    const video = render(
      <MediaDrilldown item={{ ...IMAGE, kind: 'video', file: 'v.mp4' }} onClose={() => {}} />,
    )
    const v = document.querySelector('video') as HTMLElement
    expect(v.style.width).toBe('100%')
    expect(v.style.objectFit).toBe('contain')
    expect(v.style.maxWidth).toBe('')
    expect(v.style.maxHeight).toBe('72vh')
    video.unmount()
    renderDrilldown({ ...IMAGE, kind: 'image', file: 'i.png' })
    const img = document.querySelector('img') as HTMLElement
    expect(img.style.width).toBe('100%')
    expect(img.style.objectFit).toBe('contain')
    expect(img.style.maxWidth).toBe('')
    expect(img.style.maxHeight).toBe('72vh')
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

// ── THE WALK ARROWS (2026-09-20, the operator's catch: "where are
// my side arrows when I open an image so scroll through to
// others") ─────────────────────────────────────────────────────
// The OPTIONAL sibling walk: arrows render only when a list of
// 2+ rides; they walk wrap-around; ArrowLeft/ArrowRight ride the
// same verbs; a drilldown WITHOUT siblings is exactly the old
// face (no arrows painted).
describe('MediaDrilldown — the walk arrows', () => {
  const B = { ...IMAGE, url: 'https://example.com/b.png', file: 'b.png' }
  const C = { ...IMAGE, url: 'https://example.com/c.png', file: 'c.png' }

  it('NO SIBLINGS = the old face: no arrows painted', () => {
    renderDrilldown(IMAGE)
    expect(screen.queryByTestId('drill-prev')).toBeNull()
    expect(screen.queryByTestId('drill-next')).toBeNull()
  })

  it('a single sibling paints no arrows either (nothing to walk)', () => {
    render(<MediaDrilldown item={IMAGE} onClose={() => {}} siblings={[IMAGE]} />)
    expect(screen.queryByTestId('drill-prev')).toBeNull()
    expect(screen.queryByTestId('drill-next')).toBeNull()
  })

  it('LEFT IS OUT (operator 2026-09-21: "I wanted you to reverse the arrow direction"): ‹ walks toward current and ON current it EXITS the history view; › walks deeper and the deep end dims — the walk is a line, not a ring', async () => {
    const user = userEvent.setup()
    const closed = { n: 0 }
    // the CONTROLLED harness — the real call-site law: the parent
    // owns the current item (onNavigate re-renders with the next);
    // the hero <img>'s src proves the walk followed each click
    function Walk() {
      const [cur, setCur] = useState<MediaDrilldownItem>(IMAGE)
      return <MediaDrilldown item={cur} onClose={() => { closed.n += 1 }} siblings={[IMAGE, B, C]} onNavigate={setCur} />
    }
    render(<Walk />)
    await user.click(screen.getByTestId('drill-next'))
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/b.png')
    await user.click(screen.getByTestId('drill-next'))
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/c.png')
    // at the TAIL (the oldest): › is DISABLED — nothing deeper, no ring
    expect((screen.getByTestId('drill-next') as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByTestId('drill-prev'))
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/b.png')
    await user.click(screen.getByTestId('drill-prev'))
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png')
    // at the HEAD (current): ‹ HOLDS — the viewer never closes on a walk
    // step (operator 2026-09-20: "it closes out when I scroll too far to
    // the left"); exit rides ✕/Escape only. The chip dims, never dead-arms
    // silently: it is visibly the end of the line.
    await user.click(screen.getByTestId('drill-prev'))
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png')
    expect(closed.n).toBe(0)
  })

  it('THE KEYBOARD rides the same verbs: ArrowLeft on current EXITS; ArrowRight walks deeper', async () => {
    const user = userEvent.setup()
    const closed = { n: 0 }
    function Walk() {
      const [cur, setCur] = useState<MediaDrilldownItem>(IMAGE)
      return <MediaDrilldown item={cur} onClose={() => { closed.n += 1 }} siblings={[IMAGE, B, C]} onNavigate={setCur} />
    }
    render(<Walk />)
    await user.keyboard('[ArrowRight]')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/b.png')
    await user.keyboard('[ArrowRight]')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/c.png')
    // at the tail: ArrowRight HOLDS (the disabled chip's verb returns)
    await user.keyboard('[ArrowRight]')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/c.png')
    await user.keyboard('[ArrowLeft]')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/b.png')
    await user.keyboard('[ArrowLeft]')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png')
    await user.keyboard('[ArrowLeft]') // at the head: HOLDS — never closes
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png')
    expect(closed.n).toBe(0)
  })

  it('THE CURRENT ITEM OUTSIDE THE LIST: arrows hide (no position, no walk)', () => {
    render(<MediaDrilldown item={IMAGE} onClose={() => {}} siblings={[B, C]} onNavigate={() => {}} />)
    expect(screen.queryByTestId('drill-prev')).toBeNull()
    expect(screen.queryByTestId('drill-next')).toBeNull()
  })
})

// ── THE MODAL MUTATIONS (the mediasidebar's popup modal on media
// stuff): delete + rename buttons ──────────────────────────────
// OPTIONAL verbs (the 3D-door pattern): absent = no buttons (the
// card zoom); present = the confirm + inline-rename faces with
// busy/error states owned here, the async verbs owned by the
// parent.
describe('MediaDrilldown — delete + rename buttons', () => {
  it('NO VERBS = the old face: no buttons painted', () => {
    renderDrilldown(IMAGE)
    expect(screen.queryByTestId('drill-delete')).toBeNull()
    expect(screen.queryByTestId('drill-rename')).toBeNull()
  })

  it('delete asks for confirm, then fires the verb (cancel holds)', async () => {
    const user = userEvent.setup()
    const deleted: MediaDrilldownItem[] = []
    renderDrilldown(IMAGE, { onDelete: async (item) => { deleted.push(item) } })
    await user.click(screen.getByTestId('drill-delete'))
    // the confirm face names the file.
    expect(screen.getByText('Delete a.png?')).toBeTruthy()
    await user.click(screen.getByTestId('drill-delete-cancel'))
    expect(deleted).toHaveLength(0)
    expect(screen.queryByText('Delete a.png?')).toBeNull()
    await user.click(screen.getByTestId('drill-delete'))
    await user.click(screen.getByTestId('drill-delete-confirm'))
    expect(deleted).toEqual([IMAGE])
  })

  it('a failing delete surfaces the door error (never closes)', async () => {
    const user = userEvent.setup()
    renderDrilldown(IMAGE, { onDelete: async () => { throw new Error('delete failed (protected_sidecar)') } })
    await user.click(screen.getByTestId('drill-delete'))
    await user.click(screen.getByTestId('drill-delete-confirm'))
    expect(await screen.findByTestId('drill-op-error')).toBeTruthy()
    expect(screen.getByText('delete failed (protected_sidecar)')).toBeTruthy()
  })

  it('rename opens an inline input prefilled with the file; save fires the verb', async () => {
    const user = userEvent.setup()
    const renamed: Array<{ item: MediaDrilldownItem; name: string }> = []
    renderDrilldown(IMAGE, { onRename: async (item, name) => { renamed.push({ item, name }) } })
    await user.click(screen.getByTestId('drill-rename'))
    const input = screen.getByTestId('drill-rename-input') as HTMLInputElement
    expect(input.value).toBe('a.png')
    await user.clear(input)
    await user.type(input, 'b.png')
    await user.click(screen.getByTestId('drill-rename-save'))
    expect(renamed).toEqual([{ item: IMAGE, name: 'b.png' }])
  })

  it('rename to the same name saves nothing; cancel holds', async () => {
    const user = userEvent.setup()
    const renamed: string[] = []
    renderDrilldown(IMAGE, { onRename: async (_item, name) => { renamed.push(name) } })
    await user.click(screen.getByTestId('drill-rename'))
    // save with the prefilled (unchanged) name fires nothing.
    await user.click(screen.getByTestId('drill-rename-save'))
    expect(renamed).toHaveLength(0)
    await user.click(screen.getByTestId('drill-rename-cancel'))
    expect(screen.queryByTestId('drill-rename-input')).toBeNull()
  })

  it('Enter in the rename input saves; Escape cancels', async () => {
    const user = userEvent.setup()
    const renamed: string[] = []
    renderDrilldown(IMAGE, { onRename: async (_item, name) => { renamed.push(name) } })
    await user.click(screen.getByTestId('drill-rename'))
    const input = screen.getByTestId('drill-rename-input')
    await user.clear(input)
    await user.type(input, 'typed.png')
    await user.keyboard('[Enter]')
    expect(renamed).toEqual(['typed.png'])
    cleanup()
    renderDrilldown(IMAGE, { onRename: async () => {} })
    await user.click(screen.getByTestId('drill-rename'))
    expect(screen.queryByTestId('drill-rename-input')).toBeTruthy()
    fireEvent.keyDown(screen.getByTestId('drill-rename-input'), { key: 'Escape' })
    expect(screen.queryByTestId('drill-rename-input')).toBeNull()
  })

  it('a double confirm fires the verb once (the busy guard holds the second click)', async () => {
    const user = userEvent.setup()
    let calls = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    renderDrilldown(IMAGE, { onDelete: async () => { calls += 1; await gate } })
    await user.click(screen.getByTestId('drill-delete'))
    const confirm = screen.getByTestId('drill-delete-confirm')
    // two rapid clicks before the gate releases — the second is held.
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(calls).toBe(1)
    expect(screen.getByText('Deleting…')).toBeTruthy()
    release()
    await screen.findByTestId('drill-delete')
  })

  it('a failing rename surfaces the door error', async () => {
    const user = userEvent.setup()
    renderDrilldown(IMAGE, { onRename: async () => { throw new Error('rename failed (already_exists)') } })
    await user.click(screen.getByTestId('drill-rename'))
    const input = screen.getByTestId('drill-rename-input') as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'taken.png')
    await user.click(screen.getByTestId('drill-rename-save'))
    expect(await screen.findByTestId('drill-op-error')).toBeTruthy()
    expect(screen.getByText('rename failed (already_exists)')).toBeTruthy()
  })

  it('only the passed verbs paint (delete without rename and vice versa)', async () => {
    const user = userEvent.setup()
    renderDrilldown(IMAGE, { onDelete: async () => {} })
    expect(screen.queryByTestId('drill-delete')).toBeTruthy()
    expect(screen.queryByTestId('drill-rename')).toBeNull()
    await user.click(screen.getByTestId('drill-delete'))
    expect(screen.queryByTestId('drill-delete-confirm')).toBeTruthy()
    cleanup()
    renderDrilldown(IMAGE, { onRename: async () => {} })
    expect(screen.queryByTestId('drill-rename')).toBeTruthy()
    expect(screen.queryByTestId('drill-delete')).toBeNull()
  })
})
