/**
 * useMotionUndoStack — the undo/redo cluster, re-homed onto the one-truth
 * doc doors (2026-11-05, nativity audit F7).
 *
 * Snapshots ALL authoring state before each mutation so the user can step
 * back through timeline edits (prompt add/move/resize/delete/split/merge,
 * keyframe add/move/delete) and joint-edit operations (enter edit mode,
 * stamp, repose, discard). The doc channels (prompts, keyframes, payloads)
 * are captured from the SHOWN document and restored through the commit
 * doors — an undo is a stated edit like any gesture, never a mirror
 * write. The joints/kept-edit/deformed-image cluster stays component UI
 * state (viewer-local, not doc state). Read via refs so pushUndo stays
 * stable (zero re-render cascade).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import type * as React from "react"
import type {
  TimelineKeyframe, TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import type { MotionConstraint } from "@melite/formats/motionConstraints"

/** The doc channels' snapshot shape (the shown document, verbatim). */
export type DocSnapshot = {
  prompts: TimelinePrompt[]
  keyframes: TimelineKeyframe[]
  payloads: Record<string, MotionConstraint>
}

export type AuthoringSnapshot = DocSnapshot & {
  editableJoints: Float32Array | null
  keptEdit: { joints: Float32Array; frame: number } | null
  editedDeformedB64: string | null
}

export interface MotionUndoStackArgs {
  /** Read the current SHOWN document (from the one-truth hook's refs). */
  captureDoc: () => DocSnapshot
  /** State the captured doc channels back through the commit doors. */
  restoreDoc: (doc: DocSnapshot) => void
  keptEdit: { joints: Float32Array; frame: number } | null
  editedDeformedB64: string | null
  editableJointsRef: React.MutableRefObject<Float32Array | null>
  setEditableJoints: React.Dispatch<React.SetStateAction<Float32Array | null>>
  setKeptEdit: React.Dispatch<React.SetStateAction<{ joints: Float32Array; frame: number } | null>>
  setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>
}

export function useMotionUndoStack({
  captureDoc, restoreDoc,
  keptEdit, editedDeformedB64,
  editableJointsRef,
  setEditableJoints, setKeptEdit, setEditedDeformedB64,
}: MotionUndoStackArgs) {
  const undoStack = useRef<AuthoringSnapshot[]>([])
  const redoStack = useRef<AuthoringSnapshot[]>([])
  const [undoVersion, setUndoVersion] = useState(0)
  const captureDocRef = useRef(captureDoc)
  const restoreDocRef = useRef(restoreDoc)
  // Sync refs every render (before JSX return — safe, cheap).
  captureDocRef.current = captureDoc
  restoreDocRef.current = restoreDoc
  const keptEditRef = useRef<{ joints: Float32Array; frame: number } | null>(null)
  const editedDeformedB64Ref = useRef<string | null>(null)
  keptEditRef.current = keptEdit
  editedDeformedB64Ref.current = editedDeformedB64

  const captureSnapshot = useCallback((): AuthoringSnapshot => {
    // the only writer clears intervals wholesale — the null arm is the
    // never-edited fence (probe 2026-09-19)
    const editableJoints = /* v8 ignore next -- the only writer clears intervals wholesale; the null arm is the never-edited fence (probe 2026-09-19) */ editableJointsRef.current ? new Float32Array(editableJointsRef.current) : null
    const doc = captureDocRef.current()
    return {
      prompts: doc.prompts.map((p) => ({ ...p })),
      keyframes: doc.keyframes.map((k) => ({ ...k })),
      payloads: Object.fromEntries(
        Object.entries(doc.payloads).map(([k, v]) => [k, { ...v }]),
      ),
      editableJoints,
      keptEdit: keptEditRef.current
        ? { joints: new Float32Array(keptEditRef.current.joints), frame: keptEditRef.current.frame }
        : null,
      editedDeformedB64: editedDeformedB64Ref.current,
    }
  }, [editableJointsRef]) // stable — reads from refs

  /** Snapshot current state before a mutation. Call this FIRST in every
   *  mutation handler (before the setState that changes authoring state). */
  const pushUndo = useCallback(() => {
    undoStack.current.push(captureSnapshot())
    redoStack.current = []
    if (undoStack.current.length > 80) undoStack.current.shift()
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot])

  const restoreSnapshot = useCallback((snap: AuthoringSnapshot) => {
    restoreDocRef.current({
      prompts: snap.prompts.map((p) => ({ ...p })),
      keyframes: snap.keyframes.map((k) => ({ ...k })),
      payloads: Object.fromEntries(
        Object.entries(snap.payloads).map(([k, v]) => [k, { ...v }]),
      ),
    })
    setEditableJoints(snap.editableJoints)
    editableJointsRef.current = snap.editableJoints
    setKeptEdit(snap.keptEdit)
    setEditedDeformedB64(snap.editedDeformedB64)
  }, [
    editableJointsRef,
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
