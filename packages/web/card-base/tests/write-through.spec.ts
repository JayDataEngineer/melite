/** write-through.spec.ts — THE STUDIO'S TRAILING WINDOW, judged at
 *  its own unit seat (the 2026-10-30 COVERAGE audit's F9: five
 *  cells unwalled — coalesce, supersede, flush-merge, rebind,
 *  reset). The consumer walls (studio.spec.tsx) prove the window
 *  through the studio's DOM; this file proves the WINDOW's own
 *  laws against the raw seat, so a window regression cannot hide
 *  behind a green studio suite. */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { resetWriteThrough, writeThroughSeat } from '../src/write-through.ts'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  resetWriteThrough()
})

describe('THE TRAILING WRITE WINDOW (write-through.ts)', () => {
  test('COALESCE: keystroke-class edits merge per key on one delay — one door write per pause, newest value wins', () => {
    const sends: Array<Record<string, unknown>> = []
    const seat = writeThroughSeat('s_0', (p) => { sends.push(p) })
    seat.trailing({ prompt: 'a' })
    seat.trailing({ prompt: 'ab' })
    seat.trailing({ prompt: 'abc' })
    seat.trailing({ steps: 12 })
    // nothing fires before the window closes
    expect(sends).toEqual([])
    vi.advanceTimersByTime(300)
    // ONE merged write — not one per keystroke — carrying the
    // newest value of every key
    expect(sends).toEqual([{ prompt: 'abc', steps: 12 }])
  })

  test('SUPERSEDE: a discrete write fires NOW and kills the queued stale value for its keys', () => {
    const sends: Array<Record<string, unknown>> = []
    const seat = writeThroughSeat('s_0', (p) => { sends.push(p) })
    seat.trailing({ prompt: 'stale', steps: 20 })
    seat.now({ prompt: 'fresh' })
    // the discrete frame fired immediately, alone
    expect(sends).toEqual([{ prompt: 'fresh' }])
    vi.advanceTimersByTime(300)
    // the window's later fire carries ONLY the keys the discrete
    // write did not own — the queued 'stale' prompt is dead
    expect(sends).toEqual([{ prompt: 'fresh' }, { steps: 20 }])
  })

  test('FLUSH-MERGE: the press fires every queued edit as ONE door write, synchronously, and empties the window', () => {
    const sends: Array<Record<string, unknown>> = []
    const seat = writeThroughSeat('s_0', (p) => { sends.push(p) })
    seat.trailing({ prompt: 'abc' })
    seat.trailing({ cfg: 3.5 })
    seat.flush()
    // synchronous: no timer advance needed
    expect(sends).toEqual([{ prompt: 'abc', cfg: 3.5 }])
    // the window is empty: a later flush is a no-op, a later timer
    // fires nothing
    seat.flush()
    vi.advanceTimersByTime(300)
    expect(sends).toEqual([{ prompt: 'abc', cfg: 3.5 }])
  })

  test('REBIND: a freshest mount re-points the pending write — a queued edit from an unmounted view still fires, through the FRESH door', () => {
    const oldSends: Array<Record<string, unknown>> = []
    const newSends: Array<Record<string, unknown>> = []
    const oldSeat = writeThroughSeat('s_0', (p) => { oldSends.push(p) })
    oldSeat.trailing({ prompt: 'carry me' })
    // the view flips: the FRESHEST mount owns the row's send
    const freshSeat = writeThroughSeat('s_0', (p) => { newSends.push(p) })
    freshSeat.flush()
    // the pending write fired through the FRESH door — never lost,
    // never duplicated into the dead one
    expect(newSends).toEqual([{ prompt: 'carry me' }])
    expect(oldSends).toEqual([])
    // and the old seat's trailing now rides the fresh door too (one
    // row, one send, the freshest)
    oldSeat.trailing({ steps: 9 })
    vi.advanceTimersByTime(300)
    expect(newSends).toEqual([{ prompt: 'carry me' }, { steps: 9 }])
    expect(oldSends).toEqual([])
  })

  test('RESET kills queued writes and their timers (spec isolation ONLY — production never calls it)', () => {
    const sends: Array<Record<string, unknown>> = []
    const seat = writeThroughSeat('s_0', (p) => { sends.push(p) })
    seat.trailing({ prompt: 'must not leak' })
    resetWriteThrough()
    vi.advanceTimersByTime(300)
    expect(sends).toEqual([])
    // the window is gone: a NEW seat on the same stage id starts
    // from a fresh row and fires normally
    const reborn = writeThroughSeat('s_0', (p) => { sends.push(p) })
    reborn.trailing({ prompt: 'reborn' })
    vi.advanceTimersByTime(300)
    expect(sends).toEqual([{ prompt: 'reborn' }])
  })
})
