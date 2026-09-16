// @vitest-environment happy-dom
// toast-viewport.spec.ts — THE VIEWPORT's dismissal arm (toast.tsx's
// last uncovered line): the DSH Toast atom's onDone fires after the
// hold + fade and the viewport removes that entry — the banner
// leaves the document AND the store, exactly once (the second
// removal — the store's own auto-dismiss timer — is a no-op, never
// a clear of a live toast).
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'

import { ToastViewport, useToastStore } from '../src/toast.tsx'

afterEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.restoreAllMocks()
  cleanup()
  vi.useRealTimers()
})

test('THE DISMISSAL ARM: the atom hold elapses → onDone removes the entry (banner + store)', () => {
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  useToastStore.getState().addToast('error', 'dismissal-arm toast')
  render(h(ToastViewport))
  expect(document.body.textContent).toContain('dismissal-arm toast')
  // error hold (15s) + the atom fade (1s): both the store timer and
  // the atom timer fire; the entry leaves once, nothing else moves
  act(() => { vi.advanceTimersByTime(16_000) })
  expect(useToastStore.getState().toasts).toEqual([])
  expect(document.body.textContent).not.toContain('dismissal-arm toast')
})

test('THE DISMISSAL ARM: a success toast dismisses at its own hold (5s + fade)', () => {
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  void infoSpy
  useToastStore.getState().addToast('success', 'short hold toast')
  render(h(ToastViewport))
  expect(document.body.textContent).toContain('short hold toast')
  act(() => { vi.advanceTimersByTime(4_999) })
  expect(document.body.textContent).toContain('short hold toast')
  // the STORE timer owns the removal at exactly 5s (the atom's
  // later onDone is the harmless no-op second removal)
  act(() => { vi.advanceTimersByTime(1) })
  expect(useToastStore.getState().toasts).toEqual([])
  expect(document.body.textContent).not.toContain('short hold toast')
})

test('an empty store renders nothing (the viewport is invisible until a push)', () => {
  const { container } = render(h(ToastViewport))
  expect(container.textContent).toBe('')
  expect(document.body.textContent).not.toContain('dismissal-arm toast')
})
