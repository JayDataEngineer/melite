// StudioShell — local native port of the shared kit/studioShell.
//
// DSH ships no shell atom: the three-seam studio body (rail / center
// / bottom + the loud error line) as plain layout. Standalone the
// rail renders in place (the StudioRail inline fallback, verbatim:
// without a shell slot there is no portal target, so children render
// where declared). Behavior-preserving: same order, same conditional
// renderings, same role=alert error line.
import type { ReactElement, ReactNode } from "react"
import { clsx } from "clsx"
import { AlertTriangle } from "./icons"
import styles from "./mask.module.css"

/** One loud failure row — the tenant derives them; the shell renders
 * them as DOM text, never swallowed into a scene or a toast. */
export interface StudioShellError {
  id: string
  message: string
}

export interface StudioShellProps {
  /** RAIL seam content (tenant-declared). */
  rail: ReactNode
  /** CENTER seam content (the viewport primitive, tenant-declared). */
  center: ReactNode
  /** BOTTOM seam content (aux bar; omit for none). */
  bottom?: ReactNode
  /** Shell-owned chrome: the loud error line (empty = no line). */
  errors?: StudioShellError[]
  /** Root override. */
  className?: string
}

/** The loud error line — shell-owned chrome. Same DOM the assembly
 * body always rendered. */
export function StudioShellErrorLine({
  errors,
}: {
  errors: StudioShellError[]
}): ReactElement | null {
  if (errors.length === 0) return null
  return (
    <div role="alert" className={styles.shellErrors}>
      {errors.map((e) => (
        <p key={e.id} className={styles.shellError}>
          <AlertTriangle className={styles.sz12} />
          {e.id}: {e.message}
        </p>
      ))}
    </div>
  )
}

/** The studio body: rail column, center viewport, optional bottom
 * bar, then the error line. */
export function StudioShell({
  rail,
  center,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={clsx(styles.shellRoot, className)}>
      {/* RAIL — what the card acts ON. */}
      {rail}
      {/* CENTER — what the card sees THROUGH. */}
      {center}
      {/* BOTTOM — what the card scrubs OVER. */}
      {bottom}
      {/* LOUD failures — shell-owned chrome, once. */}
      <StudioShellErrorLine errors={errors} />
    </div>
  )
}
