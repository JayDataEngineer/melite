/** posterShell — the poster-tile shell (2026-09-05 primitive order).
 *
 *  MotionPoster and MeshPoster shipped byte-adjacent copies of the same
 *  tile lifecycle: URL-keyed cache check → async one-frame scene render
 *  → JPEG snapshot → error / skeleton / <img> states. Per the audit
 *  order ("share most render code"), the lifecycle lives HERE once and
 *  each lane keeps ONLY its scene builder (motion: LBS midpoint frame;
 *  mesh: GLB load + auto-fit — different behaviors, never merged).
 *
 *  Contract:
 *   - usePosterDataUrl(url, store, render): cache-hit serves instantly;
 *     else `render(isCancelled)` runs once per url. A null return is an
 *     abandoned render (unmount won the race — silent, not an error);
 *     a throw is an EXPLICIT failure (never a blank tile).
 *   - PosterShell({src, error, ...}): the three states, byte-identical
 *     to what both lanes served before the fold (same roles, same
 *     classes, same "Preview unavailable" signal).
 */
import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Skeleton } from "./skeleton"
import type { PosterStore } from "./posterStore"

export function usePosterDataUrl(
  url: string,
  store: PosterStore,
  render: (isCancelled: () => boolean) => Promise<string | null>,
): { src: string | null; error: boolean } {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = store.getState().posters[url]
    if (cached) {
      setSrc(cached)
      return
    }
    render(() => cancelled)
      .then((dataUrl) => {
        if (cancelled || !dataUrl) return
        // Persist the snapshot — render once, stash the JPEG data URL
        // keyed by url, reuse on every subsequent open instead of
        // re-rendering. Best-effort: a quota error is caught inside
        // the store and leaves the in-memory copy serving.
        store.getState().setPoster(url, dataUrl)
        setSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return { src, error }
}

interface PosterShellProps {
  src: string | null
  error: boolean
  className?: string
  loadingLabel: string
  alt: string
}

export function PosterShell({ src, error, className, loadingLabel, alt }: PosterShellProps) {
  if (error) {
    // EXPLICIT error — never a blank div. The user must know the preview
    // FAILED, not wonder if the asset is empty.
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-1 ${className ?? "w-full aspect-square"} bg-sidebar-accent/30`}
      >
        <AlertTriangle className="h-5 w-5 text-amber-400/80" />
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Preview unavailable
        </span>
      </div>
    )
  }
  if (!src) {
    // Skeleton fills the same box the <img> will occupy, so the poster
    // tile doesn't pop in. No spinner — a quiet pulse matches the grid.
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={loadingLabel}
        className={className ?? "w-full aspect-square"}
      >
        <Skeleton className="h-full w-full rounded-none bg-sidebar-accent/40" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className ?? "w-full aspect-square object-cover"}
    />
  )
}
