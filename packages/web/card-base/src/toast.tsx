/**
 * ToastViewport — THE RENDERER FACE of the one toast system
 * (stroke 37). The store lives in ./toastStore.ts (node-safe, no
 * atom); this file re-exports it so UI users keep one import —
 * `@melite/card-base/client` — and mounts the viewport.
 *
 * THE MOUNT-CLAIM LAW: the viewport may mount at every seat — the
 * studio shell, the cards console — and the document still renders
 * toasts exactly ONCE. The first live viewport owns rendering;
 * every other mounted viewport renders nothing; ownership
 * re-broadcasts when owners unmount. No studio wires it, no studio
 * can forget it, no seat can duplicate it.
 *
 * This file is a pure renderer: it holds no subscription
 * machinery — the claim registry and both store hooks live in
 * ./toastStore.ts (the client component law: business components
 * contain no useSyncExternalStore, no manual subscribe wiring).
 *
 * Reached through the `/client` door (`@melite/card-base/client`).
 */
import { useEffect, useRef } from "react"
import { Toast } from "@deepseek-ai/dsh-client-ui-primitives"
import {
  acquireViewport,
  mintViewportId,
  releaseViewport,
  toastHoldMs,
  removeToast,
  useToastStore,
  useViewportIds,
} from "./toastStore.ts"

export * from "./toastStore.ts"

/** Mount anywhere the system needs a renderer — the studio shell,
 *  the cards console, any seat. The claim law guarantees exactly one
 *  live renderer per document: the first-mounted viewport renders,
 *  others render nothing until the owner unmounts. Renders the live
 *  entries through the DSH Toast atom (body-portaled banner, owner
 *  unmounts onDone). */
export function ToastViewport() {
  const idRef = useRef(mintViewportId())
  useEffect(() => {
    const id = idRef.current
    acquireViewport(id)
    return () => {
      releaseViewport(id)
    }
  }, [])
  const ids = useViewportIds()
  const toasts = useToastStore((s) => s.toasts)
  const owner = ids.length === 0 || Math.min(...ids) === idRef.current
  if (!owner || toasts.length === 0) return null
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          text={t.message}
          holdMs={toastHoldMs(t.type)}
          onDone={() => removeToast(t.id)}
        />
      ))}
    </>
  )
}
