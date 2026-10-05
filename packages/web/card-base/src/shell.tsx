/**
 * StudioShell + RailSection + defineShellDeclaration — the ONE card
 * chrome owner (founded 2026-09-12, debt extermination: the six
 * studio-local copies — anny/ideo/mask shells, motion/h3 kits, mesh
 * shell.ts — collapsed here, bodies byte-identical). Same props,
 * same declaration shape, DSH-token styling. The rail still projects
 * through the shell-provided slot when one exists.
 *
 * Reached through the `/client` door (`@melite/card-base/client`):
 * shell body, rail section, declaration door. Styling rides `./shell.module.css`
 * (the anny rule set — the superset; the kits' shellErrors look
 * unified here: same border/bg, danger-ink text, reset rows,
 * aligned icon).
 */
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { StudioRail } from "./studioRail.tsx"
import { AlertTriangle } from "./icons.tsx"
import { cx } from "./chrome.ts"
import { ToastViewport } from "./toast.tsx"
import styles from "./shell.module.css"

/** One loud failure row — the tenant derives them; the shell
 *  renders them as DOM text. */
export interface StudioShellError {
  id: string
  message: string
}

export interface StudioShellProps {
  /** LEFT slot — parameters (tenant-declared). The uniform shell law
   *  (2026-09-13): every card surface — timeline studio or standard
   *  form — is the same three-slot shape: params LEFT, preview RIGHT,
   *  bottom OPTIONAL (forms leave preview/bottom unclaimed). */
  params: ReactNode
  /** RIGHT slot — preview (the viewport/output primitive, tenant-declared;
   *  unclaimed on form-only cards). */
  preview: ReactNode
  /** BOTTOM slot — optional aux bar (timeline scrub; omit for none). */
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

/** The studio body: params column LEFT (projected into the shell rail
 *  slot when one exists), preview RIGHT, optional bottom bar, then the
 *  error line. The uniform three-slot shape — timeline and form cards
 *  are the same grain, forms simply leave the right/bottom slots empty.
 *
 *  THE TOAST LAW (stroke 36): the shell mounts the ONE toast viewport
 *  — toasts are shell-owned chrome exactly like the error line (the
 *  construction law: no studio wires it, no studio can forget it).
 *  Before: motion hand-mounted a copy in a slot the contract never
 *  had (type drift), anny pushed toasts with NO viewport mounted —
 *  silently dropped — and ideogram4 hand-wired its own outside the
 *  shell. The per-studio mount is DEAD; any toast pushed from any
 *  seam renders here, once. */
export function StudioShell({
  params,
  preview,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={cx(styles.shell, className)}>
      {/* LEFT — parameters: what the card acts ON. */}
      <StudioRail>{params}</StudioRail>
      {/* RIGHT — preview: what the card sees THROUGH. */}
      {preview}
      {/* BOTTOM — what the card scrubs OVER. */}
      {bottom}
      {/* LOUD failures — shell-owned chrome, once. */}
      <StudioShellErrorLine errors={errors} />
      {/* TRANSIENT notices — shell-owned chrome, once (the toast law). */}
      <ToastViewport />
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
  preview: CenterSeam
  bottom?: BottomSeam
  params: RailSeam
}

/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}

export { StudioRail }
