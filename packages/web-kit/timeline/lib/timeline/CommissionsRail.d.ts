/** The row height every commission row takes (head and body share it
 *  — the LaneHead pairing law). */
export declare const COMMISSION_H = 30;
/** One armed commission as the bar draws it. */
export interface CommissionRow {
    /** The bag's key — stable id for tests and the data hook. */
    id: string;
    /** The kind's face (Replace / Repair / Extend / Reshoot). */
    label: string;
    /** The named seats, already formatted by the tenant ("source_clip
     *  clips/a.mp4 · strength 2"). Absent → the row draws no readout. */
    detail?: string;
    /** The window segments to draw across the bar (the extend's N
     *  windows). Absent/one entry → ONE span covering the bar. */
    segments?: string[];
    /** An accent color — any CSS color; tints the glyph and the span's
     *  left edge. Absent → the neutral look, byte-identical. */
    accent?: string;
    /** The row's hover voice (the refusal a doomed commission carries,
     *  or what the row means). The tenant hands it to the row's HEAD
     *  (LaneHead's own title seat) — the body draws no native title. */
    title?: string;
}
/** One commission row's BODY: the span (or the N window segments) the
 *  commission covers, drawn in bar space.
 *  @param props.row the commission
 *  @param props.frameToPx the bar's own frame→pixel scale
 *  @param props.totalFrames the doc's length (the single-span width)
 */
export declare function CommissionLane(props: {
    row: CommissionRow;
    frameToPx: (f: number) => number;
    totalFrames: number;
}): import("react").JSX.Element;
//# sourceMappingURL=CommissionsRail.d.ts.map
