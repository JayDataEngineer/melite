/**
 * build-handshake walls — THE STALE-TAB FACE (2026-09-23).
 *
 * The root rot this pins: the dsh loader serves every client plugin
 * under ONE /plugins URL keyed by the plugin LIST (not the bytes)
 * with a year-immutable cache — a rebuilt card bundle NEVER reaches
 * a browser that cached the URL. Fixes landed on disk while the
 * operator's tab ran the museum; every "silently dropped" edit and
 * every "the fix didn't work" night rode the seam, invisible from
 * both sides. These walls pin the CLIENT half of the handshake: a
 * stale tab is UNMISSABLE (banner on every arm, both builds named,
 * the reload instruction), a fresh/unknown verdict is SILENT, and
 * nothing invents a stale verdict out of a network hiccup.
 */
import { afterEach, expect, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { CardsTab } from '../src/client/CardsTab.tsx'
import { buildVerdict, bakedStamp, probeBuild } from '../src/client/build-handshake.ts'
import { mountEstateFakes } from './estate-harness.ts'

type CardsTabProps_ = Parameters<typeof CardsTab>[0]

function mount(): void {
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live', value: undefined }),
  } as CardsTabProps_))
}

function withStamps(baked: string | undefined, served: Record<string, string>, run: () => void): void {
  const g = globalThis as Record<string, unknown>
  if (baked === undefined) delete g['__MELITE_BUILD_STAMP__']
  else g['__MELITE_BUILD_STAMP__'] = baked
  const fetchWas = globalThis.fetch
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ stamps: served }),
  }) as unknown as typeof fetch
  try { run() } finally {
    globalThis.fetch = fetchWas
    delete g['__MELITE_BUILD_STAMP__']
  }
}

afterEach(() => cleanup())

test('the verdict comparator: every arm of the law', () => {
  assert.deepEqual(buildVerdict('abc', { 'melite-card-view': 'abc' }), { kind: 'fresh' })
  assert.deepEqual(buildVerdict('abc', { 'melite-card-view': 'xyz' }),
    { kind: 'stale', baked: 'abc', served: 'xyz' })
  assert.deepEqual(buildVerdict(undefined, { 'melite-card-view': 'xyz' }), { kind: 'unknown' })
  assert.deepEqual(buildVerdict('abc', { 'other-pkg': 'abc' }), { kind: 'unknown' })
})

test('the baked stamp read: present, absent, and empty-string all lawful', () => {
  const g = globalThis as Record<string, unknown>
  g['__MELITE_BUILD_STAMP__'] = 'deadbeef'
  assert.equal(bakedStamp(), 'deadbeef')
  g['__MELITE_BUILD_STAMP__'] = ''
  assert.equal(bakedStamp(), undefined)
  delete g['__MELITE_BUILD_STAMP__']
  assert.equal(bakedStamp(), undefined)
})

test('probeBuild: a lane refusal or network failure stays unknown — stale is never invented', async () => {
  const fetchWas = globalThis.fetch
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
  assert.deepEqual(await probeBuild(), { kind: 'unknown' })
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch
  assert.deepEqual(await probeBuild(), { kind: 'unknown' })
  globalThis.fetch = fetchWas
})

test('probeBuild treats a response without stamps as unknown', async () => {
  const fetchWas = globalThis.fetch
  const g = globalThis as Record<string, unknown>
  g['__MELITE_BUILD_STAMP__'] = 'baked'
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as unknown as typeof fetch
  try {
    assert.deepEqual(await probeBuild(), { kind: 'unknown' })
  } finally {
    globalThis.fetch = fetchWas
    delete g['__MELITE_BUILD_STAMP__']
  }
})

test('a stale probe is refreshed on focus and ignored after unmount', async () => {
  const estate = mountEstateFakes()
  const fetchWas = globalThis.fetch
  const g = globalThis as Record<string, unknown>
  g['__MELITE_BUILD_STAMP__'] = 'baked'
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  const fetchMock = vi.fn(async () => {
    await pending
    return {
      ok: true,
      json: async () => ({ stamps: { 'melite-card-view': 'served' } }),
    }
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  const view = render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live', value: undefined }),
  } as CardsTabProps_))
  window.dispatchEvent(new Event('focus'))
  expect(fetchMock).toHaveBeenCalledTimes(2)
  view.unmount()
  release()
  await new Promise((resolve) => setTimeout(resolve, 0))
  globalThis.fetch = fetchWas
  delete g['__MELITE_BUILD_STAMP__']
  estate.unmount()
})

test('a STALE tab renders the banner naming both builds and the reload instruction', async () => {
  mountEstateFakes()
  withStamps('aaaa1111aaaa', { 'melite-card-view': 'bbbb2222bbbb' }, mount)
  const banner = await waitFor(() => screen.getByTestId('cards-stale-build'))
  expect(banner.textContent).toMatch(/STALE TAB/)
  expect(banner.textContent).toMatch(/aaaa1111/)
  expect(banner.textContent).toMatch(/bbbb2222/)
  expect(banner.textContent).toMatch(/RELOAD/i)
})

test('a FRESH tab renders NO banner (never a nag)', async () => {
  mountEstateFakes()
  withStamps('aaaa1111aaaa', { 'melite-card-view': 'aaaa1111aaaa' }, mount)
  await waitFor(() => { assert.notEqual(screen.queryByText(/cards resource gave no value/), null) })
  assert.equal(screen.queryByTestId('cards-stale-build'), null)
})

test('an UNSTAMPED tab (pre-handshake build) renders NO banner while rolling out', async () => {
  mountEstateFakes()
  withStamps(undefined, { 'melite-card-view': 'bbbb2222bbbb' }, mount)
  await waitFor(() => { assert.notEqual(screen.queryByText(/cards resource gave no value/), null) })
  assert.equal(screen.queryByTestId('cards-stale-build'), null)
})
