// @vitest-environment happy-dom
// toast.spec.tsx — THE ONE TOAST SYSTEM (stroke 37 writes the walls
// for the unified store; the duration walls MOVED here from
// web-kit/catalog's private-store spec — walls move, never die).
//
// LAWS PINNED:
//  1. ONE STORE, dual API: the hook selector inside React, the
//     zustand-classic statics (getState/subscribe/setState) for
//     module-level pushers — the contract stores' call shape,
//     verbatim.
//  2. THE DURATION LAW: errors persist 15s, success/info dismiss at
//     5s, removeToast removes. (Migrated walls.)
//  3. THE MOUNT-CLAIM LAW: ToastViewport may mount at every seat —
//     the studio shell, the cards console — and the document still
//     renders toasts exactly ONCE. The first live viewport owns
//     rendering; when the owner unmounts, a survivor claims.
//  4. NO SILENT DROPS: errors also console.error — even with no
//     viewport mounted, the failure is loud somewhere.
import { cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement as h, useEffect } from 'react'

import { ToastViewport, useToastStore } from '../src/toast.tsx'

afterEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.restoreAllMocks()
  cleanup()
  vi.useRealTimers()
})

/** The duration walls fake ONLY setTimeout (the dismissal clock) —
 *  they assert the store with no rendering and no waitFor; the render
 *  walls below run on real time (RTL's waitFor polls on timers of its
 *  own, which faking would starve). */
function withFakedClock(fn: () => void): void {
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    fn()
  } finally {
    vi.useRealTimers()
  }
}

/** A seam that pushes via the hook — the studio call shape. */
function HookSeam({ message }: { message: string }) {
  const add = useToastStore((s) => s.addToast)
  useEffect(() => { add('error', message) }, [add, message])
  return null
}

test('ONE STORE: the static face (getState) serves the module-level pushers verbatim', () => {
  useToastStore.getState().addToast('error', 'catalog contract violation')
  const s = useToastStore.getState()
  expect(s.toasts.length).toBe(1)
  expect(s.toasts[0]!.message).toBe('catalog contract violation')
  expect(typeof s.addToast).toBe('function')
  expect(typeof s.removeToast).toBe('function')
})

test('THE DURATION LAW: errors persist 15s then auto-dismiss (wall migrated from the kit store)', () => {
  withFakedClock(() => {
    useToastStore.getState().addToast('error', 'boom')
    expect(useToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(14_999)
    expect(useToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toEqual([])
  })
})

test('THE DURATION LAW: success auto-dismisses at 5s', () => {
  withFakedClock(() => {
    useToastStore.getState().addToast('success', 'uploaded')
    expect(useToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(4_999)
    expect(useToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toEqual([])
  })
})

test('removeToast removes the entry it names', () => {
  useToastStore.getState().addToast('info', 'one')
  const id = useToastStore.getState().toasts[0]!.id
  useToastStore.getState().removeToast(id)
  expect(useToastStore.getState().toasts).toEqual([])
})

test('NO SILENT DROPS: errors console.error even with no viewport mounted', () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  useToastStore.getState().addToast('error', 'the gateway refused the catalog')
  expect(errSpy).toHaveBeenCalled()
})

test('a toast pushed via the HOOK renders through a mounted viewport', async () => {
  render(h('div', null, h(ToastViewport), h(HookSeam, { message: 'the slot wire refused the pick' })))
  await waitFor(() => {
    expect(document.body.textContent).toContain('the slot wire refused the pick')
  })
})

test('THE MOUNT-CLAIM LAW: two viewports mounted — the toast renders exactly ONCE', async () => {
  // two seats: the studio shell shape and the console shape
  render(h('div', null,
    h('section', { 'data-seat': 'shell' }, h(ToastViewport)),
    h('aside', { 'data-seat': 'console' }, h(ToastViewport)),
    h(HookSeam, { message: 'claim-law toast' }),
  ))
  await waitFor(() => {
    expect(document.body.textContent).toContain('claim-law toast')
  })
  const matches = (document.body.textContent ?? '').match(/claim-law toast/g) ?? []
  expect(matches.length).toBe(1)
})

test('THE MOUNT-CLAIM LAW: when the owning viewport unmounts, the survivor claims', async () => {
  function App({ withShell }: { withShell: boolean }) {
    return h('div', null,
      withShell ? h('section', null, h(ToastViewport)) : null,
      h('aside', null, h(ToastViewport)),
      h(HookSeam, { message: 'ownership-shift toast' }),
    )
  }
  const view = render(h(App, { withShell: true }))
  await waitFor(() => {
    expect(document.body.textContent).toContain('ownership-shift toast')
  })
  // shell unmounts — the console viewport must take over rendering
  view.rerender(h(App, { withShell: false }))
  useToastStore.getState().addToast('error', 'post-shift toast')
  await waitFor(() => {
    expect(document.body.textContent).toContain('post-shift toast')
  })
  const matches = (document.body.textContent ?? '').match(/post-shift toast/g) ?? []
  expect(matches.length).toBe(1)
})

// ── THE TOAST DISMISS (audit 017 C4): every banner carries a dismiss
//    control — the DSH Toast's own inline action seat — inside the
//    banner's bounds; the press retires the toast NOW, ahead of the
//    auto-retire clock (the census entry states both).

test('THE TOAST DISMISS: every banner carries the dismiss control INSIDE its bounds', async () => {
  render(h('div', null, h(ToastViewport), h(HookSeam, { message: 'the gate refused the write' })))
  const banner = await screen.findByRole('alert')
  expect(banner.textContent).toContain('the gate refused the write')
  // PLACEMENT: the control renders INSIDE the banner's own element
  // (the body-portaled alert), never detached from it
  const dismiss = within(banner).getByRole('button', { name: 'Dismiss' })
  expect(banner.contains(dismiss)).toBe(true)
})

test('THE TOAST DISMISS: the press retires the toast immediately — ahead of the error hold', async () => {
  render(h('div', null, h(ToastViewport), h(HookSeam, { message: 'the snapshot refused the patch' })))
  const banner = await screen.findByRole('alert')
  fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(useToastStore.getState().toasts).toEqual([])
  // and the retire is the STORE's: a re-push renders again (the dismissal
  // never eats a fresh refusal)
  useToastStore.getState().addToast('error', 'the snapshot refused the patch')
  await waitFor(() => {
    expect(screen.getByRole('alert').textContent).toContain('the snapshot refused the patch')
  })
})
