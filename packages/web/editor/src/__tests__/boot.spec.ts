/**
 * boot wall (row 4, S4b skeleton): the boot SELECTOR in isolation —
 * which branch `bootEditor` takes for a given global scope, and that each
 * branch constructs its entry with the #root mount point.
 *
 * Hermetic by design: the DSH web kernel, react-dom/client, App, the
 * capabilities glob, the store-persistence side effect, and the storage
 * seed are all mocked — this wall asserts WIRING (branch + construction),
 * never the packages' internals. The standalone RENDER path itself is
 * covered by app.spec.tsx + the dev-server smoke.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const render = vi.fn()
  const createRoot = vi.fn(() => ({ render }))
  const run = vi.fn()
  const initBrowserStorage = vi.fn()
  return { render, createRoot, run, initBrowserStorage }
})

vi.mock('@deepseek-ai/dsh-client-web', () => ({
  // Plain function (not arrow): `bootEditor` constructs it with `new`.
  AppWebEntry: vi.fn(function (this: unknown) {
    return { run: mocks.run }
  }),
}))
vi.mock('react-dom/client', () => ({ createRoot: mocks.createRoot }))
vi.mock('../App', () => ({ App: (): null => null }))
vi.mock('../shell/pluginCapabilities', () => ({}))
vi.mock('../surfaces/flow/storePersistence', () => ({}))
vi.mock('@melite/contracts', () => ({ initBrowserStorage: mocks.initBrowserStorage }))

import { AppWebEntry } from '@deepseek-ai/dsh-client-web'
import { createRoot } from 'react-dom/client'
import { bootEditor, isDshHosted } from '../boot'

const MockAppWebEntry = vi.mocked(AppWebEntry)
const mockCreateRoot = vi.mocked(createRoot)

function seedRoot(): HTMLElement {
  document.body.innerHTML = '<div id="root"></div>'
  const el = document.getElementById('root')
  if (el === null) throw new Error('test setup: missing #root')
  return el
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.initBrowserStorage.mockResolvedValue(undefined)
  mocks.run.mockResolvedValue(undefined)
  delete (globalThis as Record<string, unknown>).__DSH_BOOT__
  delete (globalThis as Record<string, unknown>).__ModuleLoader__
})

describe('isDshHosted', () => {
  it('is false on a bare scope', () => {
    expect(isDshHosted({})).toBe(false)
  })

  it('is false with only one host global present', () => {
    expect(isDshHosted({ __DSH_BOOT__: {} })).toBe(false)
    expect(isDshHosted({ __ModuleLoader__: {} })).toBe(false)
  })

  it('is true only when both host globals are present', () => {
    expect(isDshHosted({ __DSH_BOOT__: {}, __ModuleLoader__: {} })).toBe(true)
  })
})

describe('bootEditor', () => {
  it('standalone: renders the App through createRoot on #root', async () => {
    const el = seedRoot()
    await bootEditor()
    expect(MockAppWebEntry).not.toHaveBeenCalled()
    expect(mocks.initBrowserStorage).toHaveBeenCalledTimes(1)
    expect(mockCreateRoot).toHaveBeenCalledTimes(1)
    expect(mockCreateRoot).toHaveBeenCalledWith(el)
    expect(mocks.render).toHaveBeenCalledTimes(1)
  })

  it('hosted: runs AppWebEntry on #root and never touches createRoot', async () => {
    const el = seedRoot()
    ;(globalThis as Record<string, unknown>).__DSH_BOOT__ = { plugins: [] }
    ;(globalThis as Record<string, unknown>).__ModuleLoader__ = {}
    await bootEditor()
    expect(MockAppWebEntry).toHaveBeenCalledTimes(1)
    expect(MockAppWebEntry).toHaveBeenCalledWith(el)
    expect(mocks.run).toHaveBeenCalledTimes(1)
    expect(mockCreateRoot).not.toHaveBeenCalled()
    expect(mocks.initBrowserStorage).not.toHaveBeenCalled()
  })
})
