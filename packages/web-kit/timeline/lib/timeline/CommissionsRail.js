import { jsx as _jsx } from "react/jsx-runtime";
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
import { clsx as cn } from "clsx";
import css from "./timeline.module.css";
/** The row height every commission row takes (head and body share it
 *  — the LaneHead pairing law). */
export const COMMISSION_H = 30;
/** One commission row's BODY: the span (or the N window segments) the
 *  commission covers, drawn in bar space.
 *  @param props.row the commission
 *  @param props.frameToPx the bar's own frame→pixel scale
 *  @param props.totalFrames the doc's length (the single-span width)
 */
export function CommissionLane(props) {
    const { row, frameToPx, totalFrames } = props;
    const segments = row.segments !== undefined && row.segments.length > 0
        ? row.segments
        : [row.detail ?? row.label];
    const width = Math.max(2, frameToPx(totalFrames) - frameToPx(0));
    return (_jsx("div", { className: css.commissionLane, "data-commission-lane": row.id, style: { height: COMMISSION_H }, children: _jsx("div", { className: cn(css.commissionSpan, segments.length > 1 && css.commissionWindows), style: { width, ...(row.accent ? { borderLeftColor: row.accent } : {}) }, children: segments.map((segment, i) => (_jsx("span", { className: css.commissionSegment, "data-commission-segment": `${row.id}-${String(i)}`, children: segment }, `${row.id}-${String(i)}`))) }) }));
}
//# sourceMappingURL=CommissionsRail.js.map
