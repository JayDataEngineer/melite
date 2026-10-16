// @vitest-environment happy-dom
/**
 * motion undo stack — the hook's OWN laws (infra-coverage ledger
 * #10, 2026-11-06): the gesture guard, the keyboard cluster, and
 * the restore fence. The doc-door arms (cap-at-eighty, undo/redo
 * through the editor) live in motion-studio-gate-tails /
 * motion-studio-authoring against the mounted editor; THIS file
 * drives the hook directly with real window key events and real
 * timers — the depth law's answer for guards that belong to the
 * hook itself (a mounted repro of "typing in a textarea never
 * hijacks ctrl+z" would test the textarea, not the guard).
 *
 * Harness values follow the real contracts (read before writing,
 * 2026-11-06): TimelinePrompt.color is `[number, number, number] |
 * null` (types.ts:9) and motion surfaces never set it — null here;
 * MotionConstraint is the fullbody/ee/root2d union
 * (motionConstraints.ts:60) — a root2d member rides the payload
 * channel so BOTH restore clone-mappers fire (the nested arrows
 * were the funcs-90 hole).
 */
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useMotionUndoStack, type DocSnapshot } from '../src/ui/studio/useMotionUndoStack.ts'

function harness() {
  const jointsRef = { current: new Float32Array([1, 2, 3]) }
  let doc: DocSnapshot = {
    prompts: [{ uuid: 'p0', text: 'seed', start_frame: 0, end_frame: 4, color: null }],
    keyframes: [{ uuid: 'kf0', track_id: 'fullbody', frame: 1, value: null, opacity: 1, locked: false }],
    payloads: { kf0: { kind: 'root2d', frame: 1, x: 0, z: 0 } },
  }
  const capture = vi.fn((): DocSnapshot => doc)
  const restore = vi.fn((d: DocSnapshot) => { doc = d })
  const Probe = () => {
    const stack = useMotionUndoStack({
      captureDoc: capture,
      restoreDoc: restore,
      keptEdit: null,
      editedDeformedB64: null,
      editableJointsRef: jointsRef,
      setEditableJoints: () => {},
      setKeptEdit: () => {},
      setEditedDeformedB64: () => {},
    })
    ;(window as { __undo?: typeof stack }).__undo = stack
    return null
  }
  const root: Root = createRoot(document.createElement('div'))
  act(() => { root.render(h(Probe)) })
  const stack = () => (window as { __undo?: ReturnType<typeof useMotionUndoStack> }).__undo!
  return { stack, capture, restore, jointsRef, doc: () => doc, unmount() { act(() => { root.unmount() }) } }
}

afterEach(() => { vi.restoreAllMocks() })

describe('useMotionUndoStack (the hook\'s own laws)', () => {
  test('the drag guard pushes once per gesture, again after the window, and once per target', () => {
    vi.useFakeTimers()
    const m = harness()
    // same gesture: two ticks on one target = ONE snapshot
    m.stack().maybePushDragUndo('kf:a')
    m.stack().maybePushDragUndo('kf:a')
    expect(m.capture).toHaveBeenCalledTimes(1)
    // a DIFFERENT target inside the window still earns its undo
    m.stack().maybePushDragUndo('kf:b')
    expect(m.capture).toHaveBeenCalledTimes(2)
    // after the 300ms window the SAME target earns a new gesture
    vi.advanceTimersByTime(301)
    m.stack().maybePushDragUndo('kf:a')
    expect(m.capture).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
    m.unmount()
  }, 10000)

  test('ctrl+y redoes and ctrl+z undoes; typing in a textarea is never hijacked', () => {
    const m = harness()
    // author a second state through the stack's own door: the
    // capture source swaps to a two-prompt doc, then pushUndo
    const twoPrompts: DocSnapshot = {
      ...m.doc(),
      prompts: [...m.doc().prompts, { uuid: 'p1', text: 'second', start_frame: 0, end_frame: 4, color: null }],
    }
    m.capture.mockImplementation(() => twoPrompts)
    m.stack().pushUndo()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(m.restore).toHaveBeenCalledTimes(1)
    // ctrl+y = redo (the second keyboard spelling of the cluster)
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(m.restore).toHaveBeenCalledTimes(2)
    // typing in an input NEVER hijacks the cluster
    const input = document.createElement('textarea')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    expect(m.restore).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(input, { key: 'y', ctrlKey: true })
    expect(m.restore).toHaveBeenCalledTimes(2)
    input.remove()
    m.unmount()
  }, 10000)

  test('a snapshot clones every channel — joints and payloads never alias the live refs', () => {
    const m = harness()
    const { captureSnapshot, restoreSnapshot } = m.stack()
    // the harness doc carries a keyframe + payload: capture walks
    // BOTH clone mappers (the dark-arrow cure, #10)
    const snap = captureSnapshot()
    expect(snap.editableJoints).not.toBeNull()
    // the undo history owns its own bytes: mutating the snapshot's
    // buffer must never bleed into the ref's buffer
    snap.editableJoints![0] = 99
    expect(m.jointsRef.current[0]).toBe(1)
    // restore drives the payload clone mapper too, and the restored
    // payload channel is a fresh object — not the snapshot's own
    restoreSnapshot(snap)
    expect(m.restore).toHaveBeenCalledTimes(1)
    const restored = m.restore.mock.calls[0]![0]
    if (snap.payloads.kf0?.kind !== 'root2d' || restored.payloads.kf0?.kind !== 'root2d') throw new Error('harness payload must be root2d')
    restored.payloads.kf0.frame = 77
    expect(snap.payloads.kf0.frame).not.toBe(77)
    expect(m.doc().prompts[0]!.uuid).toBe('p0')
    m.unmount()
  }, 10000)
})
