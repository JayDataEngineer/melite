/**
 * ToastViewport — THE RENDERER FACE of the one toast system
 * (stroke 37). The store lives in ./toastStore.ts (node-safe, no
 * atom); this file re-exports it so UI users keep the single
 * `@melite/card-base/toast` import — and mounts the viewport.
 *
 * THE MOUNT-CLAIM LAW: the viewport may mount at every seat — the
 * studio shell, the cards console — and the document still renders
 * toasts exactly ONCE. The first live viewport owns rendering;
 * every other mounted viewport renders nothing; ownership
 * re-broadcasts when owners unmount. No studio wires it, no studio
 * can forget it, no seat can duplicate it.
 *
 * Per-seam subpath: `@melite/card-base/toast`.
 */
import { useEffect, useRef, useSyncExternalStore } from "react"
import { Toast } from "@deepseek-ai/dsh-client-ui-primitives"
import { removeToast, subscribe, getSnapshot } from "./toastStore.ts"

export * from "./toastStore.ts"

/* ── The mount-claim renderer ───────────────────────────────────
 * Live viewport ids; the smallest id renders. Every mount/unmount
 * bumps the epoch so all mounted viewports re-read ownership. */
const liveViewportIds = new Set<number>()
let viewportEpoch = 0
const viewportListeners = new Set<() => void>()

function emitViewportChange() {
  viewportEpoch++
  viewportListeners.forEach((l) => l())
}

function subscribeViewport(l: () => void): () => void {
  viewportListeners.add(l)
  return () => {
    viewportListeners.delete(l)
  }
}

function getViewportEpoch(): number {
  return viewportEpoch
}

let nextViewportId = 1

/** Mount anywhere the system needs a renderer — the studio shell,
 *  the cards console, any seat. The claim law guarantees exactly one
 *  live renderer per document: the first-mounted viewport renders,
 *  others render nothing until the owner unmounts. Renders the live
 *  entries through the DSH Toast atom (body-portaled banner, owner
 *  unmounts onDone). */
export function ToastViewport() {
  const idRef = useRef(nextViewportId++)
  useEffect(() => {
    const id = idRef.current
    liveViewportIds.add(id)
    emitViewportChange()
    return () => {
      liveViewportIds.delete(id)
      emitViewportChange()
    }
  }, [])
  // the epoch read re-renders every viewport when ownership shifts
  useSyncExternalStore(subscribeViewport, getViewportEpoch, getViewportEpoch)
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const owner = liveViewportIds.size === 0 || Math.min(...liveViewportIds) === idRef.current
  if (!owner || toasts.length === 0) return null
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          text={t.message}
          holdMs={t.type === "error" ? 15_000 : 5_000}
          onDone={() => removeToast(t.id)}
        />
      ))}
    </>
  )
}
