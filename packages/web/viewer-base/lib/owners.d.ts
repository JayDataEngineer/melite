/** Owner currency of the timeline seam: one run's chronological facts. */
export interface TimelineOwnerProps {
    /** The gateway run id this timeline renders. */
    runId: string;
    /** Last-known status word (queued/running/completed/failed/stopped). */
    status: string;
}
/** One natural-size pixel fact a size negotiation carries. */
export interface PixelSize {
    width: number;
    height: number;
}
/**
 * Owner currency of the size seam: the box being negotiated. Either a
 * named mode (`tile` | `full`) or an explicit pixel size is stated —
 * a claim reads what it needs and ignores the rest.
 */
export interface SizeOwnerProps {
    mode: 'tile' | 'full';
    /** Natural pixel size when known (omitted before the media reports). */
    natural?: PixelSize;
}
/** Owner currency of the window seam: one panel's binding. */
export interface WindowOwnerProps {
    /** Panel id (the keyed dispatch value; minted by the windows extension). */
    panelId: string;
    /** The run whose artifacts the panel shows, when bound. */
    runId?: string;
}
//# sourceMappingURL=owners.d.ts.map
