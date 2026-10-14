/**
 * poster-shell — the poster-tile shell (DSH-pure replacement for
 * the kit posterShell, kept per-lane beside its scene builder).
 *
 * Same contract the kit shell carried: usePosterDataUrl(url, store,
 * render) — cache-hit serves instantly, else render(isCancelled)
 * runs once per url (null = abandoned render, silent; throw =
 * explicit failure); PosterShell({src, error, ...}) — the three
 * states with the same roles and the same "Preview unavailable"
 * signal.
 *
 * The store is typed structurally (the cache record + its write, behind
 * getState) so a surface brings its own cache module.
 */
import { IconWarningTriangleOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useState } from "react"
import { Skeleton } from '@melite/card-base/client'
import styles from "./poster-shell.module.css"

export interface PosterStoreLike {
  getState: () => {
    images: Record<string, string>
    setImage: (key: string, dataUrl: string) => void
  }
}

export function usePosterDataUrl(
  url: string,
  store: PosterStoreLike,
  render: (isCancelled: () => boolean) => Promise<string | null>,
): { src: string | null; error: boolean } {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = store.getState().images[url]
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
        store.getState().setImage(url, dataUrl)
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
        className={className ? `${styles.posterError} ${className}` : `${styles.posterError} ${styles.posterDefault}`}
      >
        <IconWarningTriangleOutlineRegular className={styles.posterErrorIcon} />
        <span className={styles.posterErrorLabel}>
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
        className={className ?? styles.posterDefault}
      >
        <Skeleton className={styles.posterSkeleton} />
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
      className={className ?? styles.posterImgDefault}
    />
  )
}
