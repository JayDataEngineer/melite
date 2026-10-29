/**
 * CommissionsRail — THE COMMISSION ROW (the studio's mod projection,
 * §9 of the multiwindow unification audit 2026-11-12).
 *
 * WHY IT EXISTS: the four mod bags (replace / repair / extend /
 * reshoot) are agent-authored commissions the compose honors — and
 * the lane rendered as if nothing was armed, so the operator could
 * not see what had been strung together ("it looks default").
 *
 * THE CONTRACT IS OPT-IN AND DUMB: the tenant hands one row per
 * ARMED bag (a label, its named seats, and — for the multi-window
 * extend — the segments to draw); pixelling stays HERE, geometry
 * stays the tenant's. Absent/empty → NO row renders, so a tenant
 * that never arms a mod keeps the byte-identical bar (the
 * audioClipCards/kfLaneCards precedent).
 *
 * READ-ONLY, deliberately: a commission's seats are the agent's
 * statement (and, for the edit arms, a bound media leaf) — the rail
 * shows them, the rail never edits them. Editing is the parity
 * follow-up, not this seat.
 */
import { clsx as cn } from "clsx"
import css from "./timeline.module.css"

/** The row height every commission row takes (head and body share it
 *  — the LaneHead pairing law). */
export const COMMISSION_H = 30

/** One armed commission as the bar draws it. */
export interface CommissionRow {
  /** The bag's key — stable id for tests and the data hook. */
  id: string
  /** The kind's face (Replace / Repair / Extend / Reshoot). */
  label: string
  /** The named seats, already formatted by the tenant ("source_clip
   *  clips/a.mp4 · strength 2"). Absent → the row draws no readout. */
  detail?: string
  /** The window segments to draw across the bar (the extend's N
   *  windows). Absent/one entry → ONE span covering the bar. */
  segments?: string[]
  /** An accent color — any CSS color; tints the glyph and the span's
   *  left edge. Absent → the neutral look, byte-identical. */
  accent?: string
  /** The row's hover voice (the refusal a doomed commission carries,
   *  or what the row means). The tenant hands it to the row's HEAD
   *  (LaneHead's own title seat) — the body draws no native title. */
  title?: string
}

/** One commission row's BODY: the span (or the N window segments) the
 *  commission covers, drawn in bar space.
 *  @param props.row the commission
 *  @param props.frameToPx the bar's own frame→pixel scale
 *  @param props.totalFrames the doc's length (the single-span width)
 */
export function CommissionLane(props: {
  row: CommissionRow
  frameToPx: (f: number) => number
  totalFrames: number
}) {
  const { row, frameToPx, totalFrames } = props
  const segments = row.segments !== undefined && row.segments.length > 0
    ? row.segments
    : [row.detail ?? row.label]
  const width = Math.max(2, frameToPx(totalFrames) - frameToPx(0))
  return (
    <div
      className={css.commissionLane}
      data-commission-lane={row.id}
      style={{ height: COMMISSION_H }}
    >
      <div
        className={cn(css.commissionSpan, segments.length > 1 && css.commissionWindows)}
        style={{ width, ...(row.accent ? { borderLeftColor: row.accent } : {}) }}
      >
        {segments.map((segment, i) => (
          <span
            key={`${row.id}-${String(i)}`}
            className={css.commissionSegment}
            data-commission-segment={`${row.id}-${String(i)}`}
          >
            {segment}
          </span>
        ))}
      </div>
    </div>
  )
}
