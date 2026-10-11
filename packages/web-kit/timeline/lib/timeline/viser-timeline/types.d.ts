export interface TimelinePrompt {
    uuid: string;
    text: string;
    start_frame: number;
    end_frame: number;
    color: [number, number, number] | null;
    /** VideoTimelineStudio Layer B: this clip's beat carries per-call knob
     * overrides (renders a cyan dot — its window departs from the run's
     * global values). Optional — motion surfaces never set it. */
    override?: boolean;
    /** VideoTimelineStudio Layer B (2026-08-31): this call carries a
     * reference-audio guide (calls[i].audio) — renders a violet speaker
     * dot on the clip. Optional; absent = no badge (motion surfaces
     * unchanged). Some calls have reference audio, some don't — the badge
     * is the at-a-glance truth. */
    audio?: boolean;
    /** VideoTimelineStudio Layer B: total reference-image count for this
     * call (guide image + per-call refs.images extras). When > 0 and not
     * editing, renders a small image badge near the audio badge. Optional;
     * absent/0 = no badge (motion surfaces unchanged). */
    refImages?: number;
    /** VideoTimelineStudio: how this call joins the previous one — "cut"
     * re-feeds the previous VIDEO tail as an opener clip; "extend" chains
     * the previous LATENT for seamless motion carry. Rendered as a small
     * glyph at the clip's right edge so the seam mode is visible at a
     * glance on the timeline bar without selecting the call. */
    seam?: "cut" | "extend";
}
export interface TimelineTrack {
    uuid: string;
    name: string;
    track_type: string;
    color: [number, number, number] | null;
    height_scale?: number;
}
export interface TimelineKeyframe {
    uuid: string;
    track_id: string;
    frame: number;
    value: number | null;
    opacity?: number;
    locked?: boolean;
}
export type CanvasSizeState = {
    width: number;
    height: number;
    dpr: number;
};
export interface TimelineCoordinates {
    pixelRange: number;
    timelineStartX: number;
    viewStartFrame: number;
    viewEndFrame: number;
    visibleFrames: number;
    minFramePixels: number;
    frameDelta: number;
    framesBeforeTimeline: number;
    firstVisibleFrame: number;
    endFrame: number;
}
//# sourceMappingURL=types.d.ts.map