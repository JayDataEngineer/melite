/**
 * StudioShell + RailSection + defineShellDeclaration — the ONE card
 * chrome owner (founded 2026-09-12, debt extermination: the six
 * studio-local copies — anny/ideo/mask shells, motion/h3 kits, mesh
 * shell.ts — collapsed here, bodies byte-identical). Same props,
 * same declaration shape, DSH-token styling. The rail still projects
 * through the shell-provided slot when one exists.
 *
 * Per-seam subpath: `@melite/card-base/shell` (shell body, rail
 * section, declaration door). Styling rides `./shell.module.css`
 * (the anny rule set — the superset; the kits' shellErrors look
 * unified here: same border/bg, danger-ink text, reset rows,
 * aligned icon).
 */
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { StudioRail } from "@melite/slots"
import { AlertTriangle } from "./icons"
import { cx } from "./chrome"
import styles from "./shell.module.css"

/** One loud failure row — the tenant derives them; the shell
 *  renders them as DOM text. */
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
  /** Root override (tenant gap/min-h). */
  className?: string
}

/** The loud error line — shell-owned chrome. Same DOM the assembly
 *  body always rendered. */
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
          <AlertTriangle className={styles.errorIcon} />
          {e.id}: {e.message}
        </p>
      ))}
    </div>
  )
}

/** The studio body: rail column (projected into the shell rail slot
 *  when one exists), center viewport, optional bottom bar, then the
 *  error line. */
export function StudioShell({
  rail,
  center,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={cx(styles.shell, className)}>
      {/* RAIL — what the card acts ON. */}
      <StudioRail>{rail}</StudioRail>
      {/* CENTER — what the card sees THROUGH. */}
      {center}
      {/* BOTTOM — what the card scrubs OVER. */}
      {bottom}
      {/* LOUD failures — shell-owned chrome, once. */}
      <StudioShellErrorLine errors={errors} />
    </div>
  )
}

/** THE shared rail grouping — one section box + the uppercase
 *  title, verbatim look. Props spread onto the <section>. */
export interface RailSectionProps extends Omit<ComponentProps<"section">, "title"> {
  /** Section title (the uppercase heading). */
  title: React.ReactNode
  /** Optional right-aligned action (button, chip, count). */
  actions?: React.ReactNode
  /** Override for the title line. */
  titleClassName?: string
}

export function RailSection({ title, actions, children, className, titleClassName, ...props }: RailSectionProps) {
  return (
    <section
      data-slot="rail-section"
      aria-label={typeof title === "string" ? title : undefined}
      className={cx(styles.railSection, className)}
      {...props}
    >
      <div className={styles.railHead}>
        <p className={cx(styles.railTitle, titleClassName)}>
          {title}
        </p>
        {actions}
      </div>
      {children}
    </section>
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
