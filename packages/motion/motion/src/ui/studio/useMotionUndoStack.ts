/**
 * useMotionUndoStack — the undo/redo cluster moved verbatim from
 * `component.tsx` (MotionCardEditor lines ~441–554).
 *
 * Snapshots ALL authoring state before each mutation so the user can step
 * back through timeline edits (prompt add/move/resize/delete/split/merge,
 * keyframe add/move/delete, interval add/move/delete) and joint-edit
 * operations (enter edit mode, stamp, repose, discard). Read via refs so
 * pushUndo stays stable (zero re-render cascade).
 *
 * Free-variable reads became explicit hook args; the verbs + snapshot fn
 * are returned. Behavior is IDENTICAL to the inline block.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import type {
  TimelineInterval, TimelineKeyframe, TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import type { MotionConstraint } from "@melite/formats/motionConstraints"

export type AuthoringSnapshot = {
  tlPrompts: TimelinePrompt[]
  tlKeyframes: TimelineKeyframe[]
  constraintPayloads: Record<string, MotionConstraint>
  tlIntervals: TimelineInterval[]
  editableJoints: Float32Array | null
  keptEdit: { joints: Float32Array; frame: number } | null
  editedDeformedB64: string | null
}

export interface MotionUndoStackArgs {
  tlPrompts: TimelinePrompt[]
  tlKeyframes: TimelineKeyframe[]
  constraintPayloads: Record<string, MotionConstraint>
  tlIntervals: TimelineInterval[]
  keptEdit: { joints: Float32Array; frame: number } | null
  editedDeformedB64: string | null
  editableJointsRef: React.MutableRefObject<Float32Array | null>
  promptsAuthoredRef: React.MutableRefObject<boolean>
  setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>
  setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>
  setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>
  setTlIntervals: React.Dispatch<React.SetStateAction<TimelineInterval[]>>
  setEditableJoints: React.Dispatch<React.SetStateAction<Float32Array | null>>
  setKeptEdit: React.Dispatch<React.SetStateAction<{ joints: Float32Array; frame: number } | null>>
  setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>
}

export function useMotionUndoStack({
  tlPrompts, tlKeyframes, constraintPayloads, tlIntervals,
  keptEdit, editedDeformedB64,
  editableJointsRef, promptsAuthoredRef,
  setTlPrompts, setTlKeyframes, setConstraintPayloads, setTlIntervals,
  setEditableJoints, setKeptEdit, setEditedDeformedB64,
}: MotionUndoStackArgs) {
  const undoStack = useRef<AuthoringSnapshot[]>([])
  const redoStack = useRef<AuthoringSnapshot[]>([])
  const [undoVersion, setUndoVersion] = useState(0)
  // Ref mirrors — pushUndo reads these (stable callback, no deps).
  const tlPromptsRef = useRef(tlPrompts)
  const tlKeyframesRef = useRef(tlKeyframes)
  const constraintPayloadsRef = useRef(constraintPayloads)
  const tlIntervalsRef = useRef(tlIntervals)
  const keptEditRef = useRef<{ joints: Float32Array; frame: number } | null>(null)
  const editedDeformedB64Ref = useRef<string | null>(null)
  // Sync refs every render (before JSX return — safe, cheap).
  tlPromptsRef.current = tlPrompts
  tlKeyframesRef.current = tlKeyframes
  constraintPayloadsRef.current = constraintPayloads
  tlIntervalsRef.current = tlIntervals
  keptEditRef.current = keptEdit
  editedDeformedB64Ref.current = editedDeformedB64

  const captureSnapshot = useCallback((): AuthoringSnapshot => ({
    tlPrompts: tlPromptsRef.current.map((p) => ({ ...p })),
    tlKeyframes: tlKeyframesRef.current.map((k) => ({ ...k })),
    constraintPayloads: Object.fromEntries(
      Object.entries(constraintPayloadsRef.current).map(([k, v]) => [k, { ...v }]),
    ),
    tlIntervals: tlIntervalsRef.current.map((iv) => ({ ...iv })),
    editableJoints: editableJointsRef.current ? new Float32Array(editableJointsRef.current) : null,
    keptEdit: keptEditRef.current
      ? { joints: new Float32Array(keptEditRef.current.joints), frame: keptEditRef.current.frame }
      : null,
    editedDeformedB64: editedDeformedB64Ref.current,
  }), [editableJointsRef]) // stable — reads from refs

  /** Snapshot current state before a mutation. Call this FIRST in every
   *  mutation handler (before the setState that changes authoring state). */
  const pushUndo = useCallback(() => {
    undoStack.current.push(captureSnapshot())
    redoStack.current = []
    if (undoStack.current.length > 80) undoStack.current.shift()
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot])

  const restoreSnapshot = useCallback((snap: AuthoringSnapshot) => {
    promptsAuthoredRef.current = true
    setTlPrompts(snap.tlPrompts)
    setTlKeyframes(snap.tlKeyframes)
    setConstraintPayloads(snap.constraintPayloads)
    setTlIntervals(snap.tlIntervals)
    setEditableJoints(snap.editableJoints)
    editableJointsRef.current = snap.editableJoints
    setKeptEdit(snap.keptEdit)
    setEditedDeformedB64(snap.editedDeformedB64)
  }, [
    promptsAuthoredRef, editableJointsRef,
    setTlPrompts, setTlKeyframes, setConstraintPayloads, setTlIntervals,
    setEditableJoints, setKeptEdit, setEditedDeformedB64,
  ])

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    redoStack.current.push(captureSnapshot())
    restoreSnapshot(undoStack.current.pop()!)
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot, restoreSnapshot])

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return
    undoStack.current.push(captureSnapshot())
    restoreSnapshot(redoStack.current.pop()!)
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot, restoreSnapshot])

  // Keyboard: Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never hijack typing in inputs / textareas / contentEditable.
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el?.isContentEditable) return
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); handleRedo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleUndo, handleRedo])

  // Guard: only push undo once per drag gesture (move handlers fire on every
  // pointermove — pushing on every tick would flood the stack). The ref tracks
  // the current drag target; reset to null after a short timeout so a new
  // gesture on the same target still gets undo.
  const dragUndoRef = useRef<string | null>(null)
  const dragUndoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maybePushDragUndo = useCallback((key: string) => {
    if (dragUndoRef.current === key) return // same gesture — skip
    if (dragUndoTimeout.current) clearTimeout(dragUndoTimeout.current)
    dragUndoRef.current = key
    pushUndo()
    // Reset after 300ms so a NEW gesture on the same target gets undo.
    dragUndoTimeout.current = setTimeout(() => { dragUndoRef.current = null }, 300)
  }, [pushUndo])

  return {
    pushUndo, handleUndo, handleRedo, maybePushDragUndo,
    captureSnapshot, restoreSnapshot, undoVersion,
  }
}
