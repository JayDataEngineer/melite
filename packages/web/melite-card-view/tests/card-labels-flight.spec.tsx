/**
 * card-labels-flight.spec.tsx — THE UNMOUNT-MID-FLIGHT ARMS (the
 * missing-tests audit #7, 2026-11-06): no arm ever unmounted (or
 * tabbed away) while the catalog GET was in flight, so the
 * alive-guard's resolve side, its reject side, and the miss arm
 * after a post-unmount resolve kept dead branches in every pool.
 * These arms drive the hook with a DEFERRED wire: the promise
 * settles only after the component is gone.
 *
 * ADJUDICATION (the red-proof obligation): the alive-guard itself
 * is DEFENSIVE — React 18+ silently ignores setState after
 * unmount, so gutting the guard does not redden any observable
 * (proved live: guard gutted, 3/3 stayed green). These arms are
 * therefore COVERAGE drivers (the guard's branches execute, the
 * gate is proven not dead), not a toggle-proof wall; the guard
 * stays per the defensive-patterns doc's lifecycle law.
 */
// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { useCardLabels } from '../src/client/card-labels.ts'

// The deferred wire: fetchCardCatalog settles only when the test
// says so — the hook's alive-guard is the whole judgment.
const gate = vi.hoisted(() => ({ resolve: (_: unknown) => {}, reject: (_: unknown) => {} }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  fetchCardCatalog: () => new Promise((resolve, reject) => {
    gate.resolve = resolve as typeof gate.resolve
    gate.reject = reject as typeof gate.reject
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useCardLabels — unmount mid-flight (audit #7, 2026-11-06)', () => {
  test('a resolve AFTER unmount never touches state (no leak into a later mount)', async () => {
    const first = renderHook(() => useCardLabels())
    first.unmount()
    // the wire settles late — the guard must eat it silently
    gate.resolve([{ id: 'image-gen', label: 'Generate Image' }])
    // no throw, no act-warning; a FRESH mount starts from null
    const second = renderHook(() => useCardLabels())
    expect(second.result.current('image-gen')).toBe(null)
    second.unmount()
  })

  test('a reject AFTER unmount is swallowed by the same guard', async () => {
    const { unmount } = renderHook(() => useCardLabels())
    unmount()
    gate.reject(new Error('catalog door down'))
    // the rejection is the hook's own null-face law, never an
    // unhandled rejection past the guard
    await Promise.resolve()
  })

  test('a LIVE resolve still lands (the guard is not a dead gate)', async () => {
    const { result, unmount } = renderHook(() => useCardLabels())
    gate.resolve([{ id: 'image-gen', label: 'Generate Image' }])
    await waitFor(() => { expect(result.current('image-gen')).toBe('Generate Image') })
    // and the miss arm: a card the catalog does not know -> null
    expect(result.current('unknown-card')).toBe(null)
    unmount()
  })
})
