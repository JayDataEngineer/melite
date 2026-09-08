/**
 * StudioShell — THE estate studio body (row 5 stroke 1, 2026-09-07;
 * design record docs/design/studio-shell.md §2).
 *
 * One primitive, THREE DECLARED SEAMS — the studio's bones that every
 * genre tenant (3d assembly, video timeline, mask paint, motion) rode
 * hand-rolled before:
 *
 *   RAIL     what the card acts ON (slot rows, entity lists,
 *            producers) — tenant-declared content.
 *   CENTER   what the card sees THROUGH (the viewport PRIMITIVE:
 *            Stage3D, PaintCanvas2D, keyframe canvas) —
 *            tenant-declared, genre-owned.
 *   BOTTOM   what the card scrubs/sequences OVER (MotionTimelineBar,
 *            transports, layer strips) — optional.
 *
 * SHELL-OWNED CHROME (cards never re-implement; §2): the loud error
 * line lives HERE, once. The run button/queue state and the progress
 * fold stay with CardStudio (the outer shell) — the body never
 * duplicates them.
 *
 * GENRE-BLIND BY CONSTRUCTION (the seam law, §0): this module imports
 * no 3d, no video, no mask, no timeline — only layout + the rail
 * portal. A genre import here is a wall failure
 * (tests/walls/suites/test_shell_seams.py), not a review memory.
 *
 * E1 unchanged: the shell renders tenant content; every write still
 * flows through the tenant's onSave channel — the shell owns no
 * card state.
 */
import type { ReactElement, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { StudioRail } from "@melite/slots"
import { cn } from "./utils"

/** One loud failure row (Stage load errors, lane refusals) — the
 *  tenant derives them; the shell renders them as DOM text, never
 *  swallowed into a scene or a toast. */
export interface StudioShellError {
  id: string
  message: string
}

/** The shell's three-seam contract. `rail` and `center` are required
 *  (a studio without a rail or a center is not a studio); `bottom`
 *  is the optional aux bar. Stroke 4 adds the typed seam tables
 *  (ViewportKind/BarKind unions) on top of this shape. */
export interface StudioShellProps {
  /** RAIL seam content (tenant-declared). */
  rail: ReactNode
  /** CENTER seam content (the viewport primitive, tenant-declared). */
  center: ReactNode
  /** BOTTOM seam content (aux bar; omit for none). */
  bottom?: ReactNode
  /** Shell-owned chrome: the loud error line (empty = no line). */
  errors?: StudioShellError[]
  /** Root override (tenant padding/gap/min-h — the shadcn rule:
   *  the base stays, className wins conflicts via twMerge). */
  className?: string
}

/** The loud error line — shell-owned chrome, exported for a tenant
 *  that needs the SAME line outside a full shell (the kimodo rail
 *  adoption pattern). Same DOM the assembly body always rendered. */
export function StudioShellErrorLine({
  errors,
}: {
  errors: StudioShellError[]
}): ReactElement | null {
  if (errors.length === 0) return null
  return (
    <div role="alert" className="mt-2 space-y-1">
      {errors.map((e) => (
        <p
          key={e.id}
          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 font-mono text-[9px] leading-snug break-words whitespace-pre-wrap text-destructive"
        >
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          {e.id}: {e.message}
        </p>
      ))}
    </div>
  )
}

/** The studio body: rail column (portaled into the shell's rail slot
 *  when CardStudio provides one — @melite/slots StudioRail), center
 *  viewport, optional bottom bar, then the error line. Behavior-
 *  preserving with the pre-shell assembly body (same classnames,
 *  same order, same conditional renderings). */
export function StudioShell({
  rail,
  center,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col", className)}>
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
