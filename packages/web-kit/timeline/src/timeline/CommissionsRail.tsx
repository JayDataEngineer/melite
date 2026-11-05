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
  /** Each segment's frame placement (bar space), present when the
   *  tenant positions its windows at its frame offset (the extend's
   *  auto-tile geometry — window k at its start, its own frames, the
   *  carry overlap visible as the seam). Length must match `segments`;
   *  absent → the chip flow, byte-identical. A segment starting at or
   *  past `totalFrames` carries data-commission-planned (it draws in
   *  the armed-but-unrendered tail the tenant's plannedFrames seats). */
  segmentSpans?: CommissionSegmentSpan[]
  /** An accent color — any CSS color; tints the glyph and the span's
   *  left edge. Absent → the neutral look, byte-identical. */
  accent?: string
  /** The row's hover voice (the refusal a doomed commission carries,
   *  or what the row means). The tenant hands it to the row's HEAD
   *  (LaneHead's own title seat) — the body draws no native title. */
  title?: string
}

/** One window segment's frame placement in bar space. */
export interface CommissionSegmentSpan {
  /** The segment's first frame. */
  start: number
  /** The segment's length in frames. */
  frames: number
}

/** One commission row's BODY: the span (or the N window segments) the
 *  commission covers, drawn in bar space.
 *  @param props.row the commission
 *  @param props.frameToPx the bar's own frame→pixel scale
 *  @param props.totalFrames the doc's length (the single-span width,
 *  and the planned-tail boundary for positioned segments)
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
  const spans = row.segmentSpans
  const positioned = spans !== undefined && spans.length === segments.length
  return (
    <div
      className={css.commissionLane}
      data-commission-lane={row.id}
      style={{ height: COMMISSION_H }}
    >
      <div
        className={cn(css.commissionSpan, segments.length > 1 && css.commissionWindows, positioned && css.commissionSpanBody)}
        style={{ width, ...(row.accent ? { borderLeftColor: row.accent } : {}) }}
      >
        {positioned ? null : segments.map((segment, i) => (
          <span
            key={`${row.id}-${String(i)}`}
            className={css.commissionSegment}
            data-commission-segment={`${row.id}-${String(i)}`}
          >
            {segment}
          </span>
        ))}
      </div>
      {positioned ? spans.map((sp, i) => (
        <span
          key={`${row.id}-pos-${String(i)}`}
          className={cn(css.commissionSegment, css.commissionSegmentPos)}
          data-commission-segment={`${row.id}-${String(i)}`}
          data-commission-planned={sp.start >= totalFrames ? "true" : undefined}
          style={{
            left: frameToPx(sp.start),
            width: Math.max(2, frameToPx(sp.start + sp.frames) - frameToPx(sp.start)),
          }}
        >
          {segments[i]}
        </span>
      )) : null}
    </div>
  )
}
