// @vitest-environment happy-dom
/**
 * motion studio V — the direct-fallback cancellation pair.
 *
 * Its own file for one reason: loadSomaSkin caches success per session
 * and vitest isolates modules per file, so this file's first skin load
 * is cold — the fallback load can be held in flight, then settled after
 * an unmount to take the cancelled arms. (The convert-fallback pair
 * lives in motion-studio-gate-tails.spec.tsx under the same pattern.)
 * Standard no-act mounting (vi.waitFor polls, resetStudio() after).
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useToastStore } from '@melite/card-base/toast'
import { mounted, resetStudio, stubLoads, mountEditor } from './helpers.ts'

function unmountAll(): void {
  while (mounted.length > 0) mounted.pop()!.unmount()
  document.body.innerHTML = ''
}

function heldGate(): { gate: Promise<Response>; release: (r: Response) => void } {
  let release!: (r: Response) => void
  const gate = new Promise<Response>((resolve) => {
    release = resolve
  })
  return { gate, release }
}

function reStubFetch(
  handler: (url: string) => Promise<Response | null>,
): void {
  const orig = globalThis.fetch as typeof fetch
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    const served = await handler(u)
    if (served) return served
    return orig(input as RequestInfo, init)
  })
}

afterEach(() => resetStudio())

describe('media: direct-fallback cancellation (cold skin cache)', () => {
  test('a direct fallback cancelled inside its catch stays veilless', async () => {
    stubLoads({ bodies: { 'missing.glb': 404 } })
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('/v1/models/kimodo/provisions/skin_standard.npz')) return gate
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no fallback toast yet')
    }, { timeout: 20000 })
    unmountAll()
    release(new Response('bad', { status: 404 }))
    await new Promise((r) => setTimeout(r, 800))
    // the fallback `.catch` saw cancelled and skipped setError — the
    // rejection also clears the skin cache, keeping it cold below.
    const veiled = document.body.textContent?.includes('Failed to load skin') ?? false
    expect(veiled).toBe(false)
  }, 30000)

  test('a direct fallback cancelled at the mannequin load never skins', async () => {
    // cold cache here: the catch row above released a 404, and rejections
    // clear loadSomaSkin's session cache — so this fallback load really
    // flies, gets held, and only resolves after the unmount below.
    stubLoads({ bodies: { 'missing.glb': 404 } })
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('/v1/models/kimodo/provisions/skin_standard.npz')) return gate
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no fallback toast yet')
    }, { timeout: 20000 })
    unmountAll()
    const { skinResponse } = await import('./fixtures.ts')
    release(skinResponse())
    await new Promise((r) => setTimeout(r, 800))
    // the fallback `.then` saw cancelled and skipped setSkin.
    const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
    expect(fell).toBe(true)
  }, 30000)
})
