// @vitest-environment jsdom
/**
 * THE FILES FACE (operator 2026-11-09, "we have no file browser… media
 * browsing keeps only the last 500, meaning all the other media is
 * effectively lost in nested folders"): the MediaPanel's third tab over
 * GET /infer-gallery/browse — the DISK truth behind the runs window.
 * Pinned at the DOM level over stubbed fetches: the runs feed can
 * serve ZERO rows (the 500-run eviction window emptied it) while the
 * files face still lists every run dir on disk; the walk paginates
 * with an honest total; a media file opens the SAME lightbox with its
 * walk siblings; unknown files ride the native door, never a dead row.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { MediaPanel } from '../src/client/MediaPanel.tsx'
import { decodeBrowse } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))
const browsePage = (body: Record<string, unknown>): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

/** Route fetch by URL: the two panel feeds answer empty, the browse
 * door answers per-test. */
const stub = (browse: (url: string) => Promise<Response>): void => {
  vi.stubGlobal('fetch', (url: string) =>
    url === '/infer-gallery/runs'
      ? runsFeed([])
      : url === '/infer-gallery/drafts'
        ? draftsFeed([])
        : browse(url))
}

const switchToFiles = async (): Promise<void> => {
  fireEvent.click(screen.getByText('Files'))
  await waitFor(() => { expect(document.querySelector('[data-infer-media-files]')).toBeTruthy() })
}

describe('decodeBrowse — the wire guard', () => {
  it('keeps well-formed rows and their optional numbers', () => {
    const page = decodeBrowse({
      path: 'run-abcd-1', total: 3, nextCursor: 2,
      entries: [
        { name: 'a.mp4', kind: 'file', size: 10, mtime: 1000 },
        { name: 'sub', kind: 'dir', mtime: 2000 },
      ],
    })
    expect(page.entries).toEqual([
      { name: 'a.mp4', kind: 'file', size: 10, mtime: 1000 },
      { name: 'sub', kind: 'dir', mtime: 2000 },
    ])
    expect(page.total).toBe(3)
    expect(page.nextCursor).toBe(2)
  })
  it('drops unrenderable rows and defaults a foreign shape honestly', () => {
    const page = decodeBrowse({
      path: '', entries: [
        { name: '', kind: 'dir' },
        { name: 'x', kind: 'symlink' },
        { name: 7, kind: 'dir' },
        null,
      ],
      total: 'many', nextCursor: '2',
    })
    expect(page.entries).toEqual([])
    // a foreign total/cursor never mints a walk: total falls to what
    // arrived, cursor falls to null (the walk is complete)
    expect(page.total).toBe(0)
    expect(page.nextCursor).toBe(null)
  })
  it('a null body and foreign-typed optionals fall to the empty walk, never a crash', () => {
    // the (json ?? {}) arm: a dead upstream answering null still
    // decodes to the empty page
    expect(decodeBrowse(null)).toEqual({ path: '', entries: [], total: 0, nextCursor: null })
    // foreign-typed size/mtime drop their optional fields (the wire
    // guard never mints a string where a number belongs)
    const page = decodeBrowse({ path: '', entries: [{ name: 'a.mp4', kind: 'file', size: 'big', mtime: 'yesterday' }] })
    expect(page.entries).toEqual([{ name: 'a.mp4', kind: 'file' }])
  })
})

describe('the files face — the disk walk behind the runs window', () => {
  it('lists run dirs the runs feed no longer serves (the no-loss law)', async () => {
    stub(() => browsePage({
      path: '', total: 2, nextCursor: null,
      entries: [
        { name: 'run-abcd-old', kind: 'dir', mtime: 2 },
        { name: 'run-eff0-new', kind: 'dir', mtime: 1 },
      ],
    }))
    render(<MediaPanel />)
    // the runs feed served ZERO rows — the eviction window holds them
    // all; the files face still walks the disk
    await waitFor(() => { expect(screen.getByText('0 runs · 0 artifacts')).toBeTruthy() })
    await switchToFiles()
    expect(screen.getByText('run-abcd-old')).toBeTruthy()
    expect(screen.getByText('run-eff0-new')).toBeTruthy()
  })

  it('continues the walk while a cursor rides — More appends, the total stays honest', async () => {
    const calls: string[] = []
    stub((url) => {
      calls.push(url)
      return url.includes('cursor=2')
        ? browsePage({ path: '', total: 5, nextCursor: null, entries: [{ name: 'run-c0de-c', kind: 'dir', mtime: 3 }] })
        : browsePage({ path: '', total: 5, nextCursor: 2, entries: [{ name: 'run-abcd-a', kind: 'dir', mtime: 5 }, { name: 'run-beef-b', kind: 'dir', mtime: 4 }] })
    })
    render(<MediaPanel />)
    await switchToFiles()
    await waitFor(() => { expect(screen.getByText('run-abcd-a')).toBeTruthy() })
    fireEvent.click(screen.getByText('More'))
    await waitFor(() => { expect(screen.getByText('run-c0de-c')).toBeTruthy() })
    // the second page CARRIED the cursor — a walk, never a re-read
    expect(calls.some((u) => u.includes('cursor=2'))).toBe(true)
    // 2 / 5 then 3 / 5 — the counter names what disk holds
    expect(screen.getByText('3 / 5')).toBeTruthy()
    // the walk complete: the verb is gone
    expect(screen.queryByText('More')).toBe(null)
  })

  it('hops into a dir and walks back on the breadcrumb', async () => {
    stub((url) =>
      url.includes('path=run-abcd-1')
        ? browsePage({ path: 'run-abcd-1', total: 1, nextCursor: null, entries: [{ name: 'a.mp4', kind: 'file', size: 2048, mtime: 9 }] })
        : browsePage({ path: '', total: 1, nextCursor: null, entries: [{ name: 'run-abcd-1', kind: 'dir', mtime: 9 }] }))
    render(<MediaPanel />)
    await switchToFiles()
    fireEvent.click(await waitFor(() => screen.getByText('run-abcd-1')))
    await waitFor(() => { expect(screen.getByText('a.mp4')).toBeTruthy() })
    // the crumb names the hop
    expect(screen.getByText('All runs')).toBeTruthy()
    fireEvent.click(screen.getByText('All runs'))
    await waitFor(() => { expect(screen.getByText('run-abcd-1')).toBeTruthy() })
  })

  it('a media file opens THE SAME lightbox, walking the dir\'s media siblings', async () => {
    stub((url) =>
      url.includes('path=run-abcd-1')
        ? browsePage({
            path: 'run-abcd-1', total: 3, nextCursor: null,
            entries: [
              { name: 'notes.txt', kind: 'file', size: 1, mtime: 1 },
              { name: 'film.mp4', kind: 'file', size: 9, mtime: 2 },
              { name: 'still.png', kind: 'file', size: 9, mtime: 3 },
            ],
          })
        : browsePage({ path: '', total: 1, nextCursor: null, entries: [{ name: 'run-abcd-1', kind: 'dir', mtime: 1 }] }))
    render(<MediaPanel />)
    await switchToFiles()
    // the walk starts at the root (every hop re-roots), then digs
    fireEvent.click(screen.getByText('run-abcd-1'))
    fireEvent.click(await waitFor(() => screen.getByText('film.mp4')))
    const video = await waitFor(() => {
      const el = document.querySelector('video[controls]') as HTMLVideoElement | null
      expect(el).toBeTruthy()
      return el as HTMLVideoElement
    })
    // the nested run-relative path rides the artifact door verbatim
    expect(video?.getAttribute('src')).toBe('/infer-gallery/artifact?path=run-abcd-1%2Ffilm.mp4')
    fireEvent.keyDown(document.body, { key: 'Escape' })
  })

  it('an unknown-ext file rides the native door — a link, never a dead row', async () => {
    stub((url) =>
      url.includes('path=run-abcd-1')
        ? browsePage({ path: 'run-abcd-1', total: 1, nextCursor: null, entries: [{ name: 'data.zzz', kind: 'file', size: 5, mtime: 1 }] })
        : browsePage({ path: '', total: 1, nextCursor: null, entries: [{ name: 'run-abcd-1', kind: 'dir', mtime: 1 }] }))
    render(<MediaPanel />)
    await switchToFiles()
    fireEvent.click(screen.getByText('run-abcd-1'))
    const row = await waitFor(() => {
      const el = document.querySelector('a[data-file="run-abcd-1/data.zzz"]') as HTMLAnchorElement | null
      expect(el).toBeTruthy()
      return el as HTMLAnchorElement
    })
    expect(row?.getAttribute('href')).toBe('/infer-gallery/artifact?path=run-abcd-1%2Fdata.zzz')
    expect(row?.getAttribute('target')).toBe('_blank')
  })

  it('a dead browse door banners — never a silent blank', async () => {
    stub(() => Promise.resolve(new Response('{"error":"gateway_browse_unavailable"}', { status: 502 })))
    render(<MediaPanel />)
    await switchToFiles()
    await waitFor(() => { expect(screen.getByText(/browse failed — HTTP 502/)).toBeTruthy() })
  })
})

describe('the all-files scope — EVERY media leaf, not the last 500 runs (operator 2026-11-18)', () => {
  /** The all-files answer shape. */
  const mediaPage = (body: Record<string, unknown>): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

  it("the scope pill swaps the grid's SOURCE: an old image the runs window dropped renders as a tile", async () => {
    stub((url) =>
      url.startsWith('/infer-gallery/media')
        ? mediaPage({
            files: [{ path: 'run-0dd-very-old/gen/still.png', kind: 'image', size: 9, mtime: Date.parse('2026-10-01T00:00:00Z') }],
            total: 1, nextCursor: null,
          })
        : browsePage({ path: '', total: 0, nextCursor: null, entries: [] }))
    render(<MediaPanel />)
    // the runs feed served ZERO rows — the window is empty
    await waitFor(() => { expect(screen.getByText('0 runs · 0 artifacts')).toBeTruthy() })
    fireEvent.click(screen.getByText('All files'))
    // the tile's label carries the walked path (the label law's
    // disk-truth head) — the old image is FOUND, not scrolled to
    await waitFor(() => { expect(screen.getByText(/run-0dd-very-old\/gen\/still.png/)).toBeTruthy() })
    // the stat line speaks the disk walk's honest loaded-of-total
    expect(screen.getByText('1 of 1 file on disk')).toBeTruthy()
  })

  it('More continues the cursor walk and the kind chips re-ask the walk at the source', async () => {
    const calls: string[] = []
    stub((url) => {
      if (!url.startsWith('/infer-gallery/media')) return browsePage({ path: '', total: 0, nextCursor: null, entries: [] })
      calls.push(url)
      if (url.includes('cursor=1')) {
        return mediaPage({ files: [{ path: 'run-beef-2/b.mp4', kind: 'video', size: 9, mtime: 2 }], total: 2, nextCursor: null })
      }
      return mediaPage({ files: [{ path: 'run-abcd-1/a.png', kind: 'image', size: 9, mtime: 1 }], total: 2, nextCursor: 1 })
    })
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('0 runs · 0 artifacts')).toBeTruthy() })
    fireEvent.click(screen.getByText('All files'))
    await waitFor(() => { expect(screen.getByText(/run-abcd-1\/a\.png/)).toBeTruthy() })
    fireEvent.click(screen.getByText('More'))
    await waitFor(() => { expect(screen.getByText(/run-beef-2\/b\.mp4/)).toBeTruthy() })
    expect(screen.getByText('2 of 2 files on disk')).toBeTruthy()
    expect(calls.some((u) => u.includes('cursor=1'))).toBe(true)
    // a kind chip re-asks the walk SERVER-SIDE (the filter rides the
    // route, never a second client-side spelling)
    fireEvent.click(screen.getByText(/Images/))
    await waitFor(() => { expect(calls.some((u) => u.includes('kind=image'))).toBe(true) })
  })

  it('a dead media door banners — never a silent blank grid', async () => {
    stub((url) =>
      url.startsWith('/infer-gallery/media')
        ? Promise.resolve(new Response('{"error":"media_unreadable"}', { status: 502 }))
        : browsePage({ path: '', total: 0, nextCursor: null, entries: [] }))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('0 runs · 0 artifacts')).toBeTruthy() })
    fireEvent.click(screen.getByText('All files'))
    await waitFor(() => { expect(screen.getByText(/HTTP 502/)).toBeTruthy() })
  })
})
