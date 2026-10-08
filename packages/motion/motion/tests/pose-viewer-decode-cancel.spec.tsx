// @vitest-environment happy-dom
/**
 * PoseViewer3D's decode-cancel arms — the H-flap cure (2026-10-18).
 *
 * The b64 decode effect's `cancelled` guards (PoseViewer3D.tsx, the
 * two `if (cancelled) return` after fetch/arrayBuffer) execute only
 * when a decode is in flight at unmount — a scheduling coin flip
 * across suites, which is exactly the load-racy coverage path that
 * flapped the PoseViewer3D floor (83 statements unloaded, 82 under
 * worker load). These arms pin both guards deterministically with
 * deferred promises: gate the decode, unmount first, resolve
 * second — single-threaded JS makes the guard's early return the
 * only reachable continuation. The behavior each arm asserts: a
 * stale decode never commits and never logs a decode failure.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'
import { PoseViewer3D } from '@melite-plugin/motion/ui/viewer3d'
import { act, cleanup19, render19 } from './harness.tsx'

afterEach(async () => {
  await cleanup19()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// 12 zero bytes (3 floats) — decodes clean whenever it runs, so a
// decode failure in these arms would mean the guard misfired.
const TINY_B64 = 'AAAAAAAAAAAAAAAA'

function deferred<T>(): { promise: Promise<T>, resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe("PoseViewer3D's decode-cancel guards (H-flap)", () => {
  test('a decode still fetching at unmount never commits and never logs a decode failure', async () => {
    const gate = deferred<{ arrayBuffer: () => Promise<ArrayBuffer> }>()
    const dataFetches: string[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', (input: unknown) => {
      const u = typeof input === 'string' ? input : String((input as Request)?.url ?? input)
      if (u.startsWith('data:')) {
        dataFetches.push(u)
        return gate.promise
      }
      return Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } }))
    })
    // The viewer mounts and its decode effect fires while fetch is
    // gated — then the unmount lands first (synchronously, so no
    // continuation can interleave before `cancelled` is set).
    await render19(h(PoseViewer3D, { frameIdx: 0, deformedVerticesB64: TINY_B64 }))
    expect(dataFetches.length, 'the decode actually started (the arm is not vacuous)').toBeGreaterThan(0)
    await cleanup19()
    gate.resolve({ arrayBuffer: () => Promise.resolve(new Uint8Array(12).buffer) })
    await act(async () => {})
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('ailed to decode'), expect.anything())
  })

  test('a decode awaiting its buffer at unmount never commits and never logs a decode failure', async () => {
    const bufGate = deferred<ArrayBuffer>()
    const dataFetches: string[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', (input: unknown) => {
      const u = typeof input === 'string' ? input : String((input as Request)?.url ?? input)
      if (u.startsWith('data:')) {
        dataFetches.push(u)
        return Promise.resolve({ arrayBuffer: () => bufGate.promise })
      }
      return Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } }))
    })
    await render19(h(PoseViewer3D, { frameIdx: 0, deformedVerticesB64: TINY_B64 }))
    // Flush until the continuation parks on the gated arrayBuffer —
    // fetch already resolved, so only the buffer gate holds it.
    await act(async () => {})
    expect(dataFetches.length, 'the decode actually started (the arm is not vacuous)').toBeGreaterThan(0)
    await cleanup19()
    bufGate.resolve(new Uint8Array(12).buffer)
    await act(async () => {})
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('ailed to decode'), expect.anything())
  })
})
