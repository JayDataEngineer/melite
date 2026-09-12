/**
 * StudioShell + defineShellDeclaration — studio-local copies of the
 * former kit shell seams (those kit imports are dead). Same props,
 * same declaration shape, DSH-token styling.
 */
import type { ReactElement, ReactNode } from "react"
import { StudioRail } from "@melite/slots"
import { cx } from "./cx"
import styles from "./shell.module.css"

/** One loud failure row — the tenant derives them; the shell
 *  renders them as DOM text. */
export interface StudioShellError {
  id: string
  message: string
}

export interface StudioShellProps {
  rail: ReactNode
  center: ReactNode
  bottom?: ReactNode
  errors?: StudioShellError[]
  className?: string
}

export function StudioShellErrorLine({
  errors,
}: {
  errors: StudioShellError[]
}): ReactElement | null {
  if (errors.length === 0) return null
  return (
    <div role="alert" className={styles.errorLine}>
      {errors.map((e) => (
        <p key={e.id} className={styles.errorRow}>
          {e.id}: {e.message}
        </p>
      ))}
    </div>
  )
}

export function StudioShell({
  rail,
  center,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={cx(styles.shell, className)}>
      {/* RAIL — what the card acts ON (projected when a shell slot exists). */}
      <StudioRail>{rail}</StudioRail>
      {/* CENTER — what the card sees THROUGH. */}
      {center}
      {bottom}
      <StudioShellErrorLine errors={errors} />
    </div>
  )
}

/* ── Shell declaration (the typed seam table) ─────────────────── */

export interface CenterSeam {
  kind: string
}

export interface BottomSeam {
  kind: string
}

export interface RailSeam {
  slots: readonly string[]
}

export interface ShellDeclaration {
  center: CenterSeam
  bottom?: BottomSeam
  rail: RailSeam
}

/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}
