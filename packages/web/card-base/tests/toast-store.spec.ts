// @vitest-environment happy-dom
// toast-store.spec.ts — THE STORE HALF's own arms (the renderer half
// is pinned in toast.spec.tsx; the viewport's dismissal arm rides
// toast-viewport.spec.ts).
//
// LAWS PINNED:
//  1. removeToast names an entry or it is a no-op (unknown ids never
//     emit — a stale dismissal timer cannot clear a live toast).
//  2. THE DUAL FACE: subscribe/unsubscribe is the external-store
//     contract; setState patches addToast and/or the entries (the
//     retry spec's mid-suite stub rides this).
//  3. THE THIRD ARGUMENT (action) is accepted and ignored — the DSH
//     Toast atom ships no action chrome, exactly like the kit store.
//  4. info toasts voice console.info and dismiss at 5s like success.
import { afterEach, expect, test, vi } from 'vitest'

import { getSnapshot, removeToast, subscribe, useToastStore } from '../src/toastStore.ts'

afterEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test('removeToast with an UNKNOWN id is a silent no-op (no emit, no clear)', () => {
  useToastStore.getState().addToast('error', 'live toast')
  let emissions = 0
  const unsub = subscribe(() => { emissions += 1 })
  try {
    removeToast(424_242)
    expect(useToastStore.getState().toasts.length).toBe(1)
    expect(emissions).toBe(0)
  } finally {
    unsub()
  }
})

test('THE DUAL FACE: subscribe hears every mutation; the unsub stops hearing', () => {
  const heard: number[] = []
  const unsub = subscribe(() => { heard.push(useToastStore.getState().toasts.length) })
  try {
    useToastStore.getState().addToast('info', 'one')
    expect(heard).toEqual([1])
    unsub()
    useToastStore.getState().addToast('info', 'two')
    expect(heard).toEqual([1])
  } finally {
    unsub()
  }
})

test('THE DUAL FACE: getSnapshot is the live entries array the hook reads', () => {
  expect(getSnapshot()).toEqual([])
  useToastStore.getState().addToast('success', 'snap')
  expect(getSnapshot().map((t) => t.message)).toEqual(['snap'])
})

test('THE DUAL FACE: setState swaps addToast (the mid-suite stub) and restores it', () => {
  const calls: Array<{ type: string; message: string }> = []
  const real = useToastStore.getState().addToast
  useToastStore.setState({
    addToast: (type, message) => { calls.push({ type, message }) },
  })
  try {
    useToastStore.getState().addToast('error', 'stubbed push')
    expect(calls).toEqual([{ type: 'error', message: 'stubbed push' }])
    // the stub owns the call — nothing lands in the entries
    expect(useToastStore.getState().toasts).toEqual([])
  } finally {
    useToastStore.setState({ addToast: real })
  }
  useToastStore.getState().addToast('error', 'live again')
  expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['live again'])
})

test('THE DUAL FACE: setState replaces the entries wholesale (the test reset)', () => {
  useToastStore.setState({ toasts: [{ id: 7, type: 'info', message: 'welded entry' }] })
  expect(useToastStore.getState().toasts).toEqual([{ id: 7, type: 'info', message: 'welded entry' }])
})

test('THE DUAL FACE: setState with an empty patch emits but changes nothing', () => {
  useToastStore.getState().addToast('info', 'steady')
  let emissions = 0
  const unsub = subscribe(() => { emissions += 1 })
  try {
    useToastStore.setState({})
    expect(emissions).toBe(1)
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['steady'])
  } finally {
    unsub()
  }
})

test('THE THIRD ARGUMENT: an action rides accepted-and-ignored (the atom has no action chrome)', () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  useToastStore.getState().addToast('error', 'with action', { label: 'Retry', onClick: () => {} })
  expect(errSpy).toHaveBeenCalled()
  const entries = useToastStore.getState().toasts
  expect(entries.length).toBe(1)
  expect(entries[0]).toEqual({ id: entries[0]!.id, type: 'error', message: 'with action' })
})

test('info toasts voice console.info and dismiss at 5s', () => {
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    useToastStore.getState().addToast('info', 'quiet note')
    expect(infoSpy).toHaveBeenCalledWith('[toast]', 'quiet note')
    vi.advanceTimersByTime(4_999)
    expect(useToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toEqual([])
  } finally {
    vi.useRealTimers()
  }
})
