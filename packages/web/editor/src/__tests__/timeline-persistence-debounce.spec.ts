/**
 * E2.12 — Debounced timeline persistence.
 *
 * Verifies the contract promised by `schedulePersist`:
 *  - Mutations do NOT write to localStorage synchronously.
 *  - A single trailing write fires after PERSIST_DEBOUNCE_MS (300ms).
 *  - Multiple back-to-back mutations coalesce into ONE write.
 *  - flushPersist() writes any pending state immediately and resolves
 *    the in-flight IDB/localStorage write so tests (and beforeunload)
 *    don't lose data.
 *
 * Uses Vitest fake timers so the debounce window is deterministic and
 * the test doesn't actually sleep.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTimelineStore, flushPersist, _persistRunCount } from "@melite-plugin/timeline/ui/store"

const PERSIST_DEBOUNCE_MS = 300

beforeEach(() => {
  useTimelineStore.getState().reset()
  // Reset module-level counter via the exported live binding. We can't
  // reassign `_persistRunCount` directly (it's a `let` export) but tests
  // read its current value, so we just record a baseline at the start of
  // each test.
})

afterEach(() => {
  // Make sure no timer leaks into the next test.
  vi.useRealTimers()
})

describe('E2.12 — debounced persistence', () => {
  it('mutations do NOT persist synchronously', () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    useTimelineStore.getState().addSegment({ prompt: 'no sync write', duration: 1 })
    // No time has advanced — the debounced write should not have fired.
    expect(_persistRunCount).toBe(before)
    expect(localStorage.getItem('tech_noir_timeline')).toBeNull()
  })

  it('a single trailing write fires after the debounce window', async () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    useTimelineStore.getState().addSegment({ prompt: 'trailing write', duration: 2 })
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1)
    expect(_persistRunCount).toBe(before)  // Still pending.
    vi.advanceTimersByTime(1)
    // The setTimeout callback fires synchronously, but persistTimeline is
    // async (IDB writes). Run any pending microtasks.
    await vi.runAllTimersAsync()
    expect(_persistRunCount).toBe(before + 1)
    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).segments[0].prompt).toBe('trailing write')
  })

  it('back-to-back mutations coalesce into ONE write', async () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    // Simulate a drag: 10 updates in 50ms increments, all within the
    // 300ms debounce window.
    const seg = useTimelineStore.getState().addSegment({ duration: 1 })
    for (let i = 0; i < 10; i++) {
      useTimelineStore.getState().updateSegment(seg.id, { start: i * 0.1 })
      vi.advanceTimersByTime(50)
    }
    // All 10 updates happened within 500ms total but each reset the timer,
    // so the trailing write only fires 300ms after the LAST update.
    expect(_persistRunCount).toBe(before)
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS)
    await vi.runAllTimersAsync()
    // Exactly one persist run for the whole burst.
    expect(_persistRunCount).toBe(before + 1)
    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.segments[0].start).toBe(0.9)  // The last update wins.
  })

  it('flushPersist writes pending state immediately', async () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    useTimelineStore.getState().addSegment({ prompt: 'flush me', duration: 3 })
    // No time has advanced, but flushPersist should write NOW.
    await flushPersist()
    expect(_persistRunCount).toBe(before + 1)
    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).segments[0].prompt).toBe('flush me')
  })

  it('flushPersist is a no-op when nothing is pending', async () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    await flushPersist()
    expect(_persistRunCount).toBe(before)
  })

  it('flushPersist called between mutations cancels the pending debounce', async () => {
    vi.useFakeTimers()
    const before = _persistRunCount
    useTimelineStore.getState().addSegment({ prompt: 'first', duration: 1 })
    await flushPersist()
    expect(_persistRunCount).toBe(before + 1)
    // After flush, advancing time should NOT fire a second write.
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS * 2)
    await vi.runAllTimersAsync()
    expect(_persistRunCount).toBe(before + 1)
  })
})
