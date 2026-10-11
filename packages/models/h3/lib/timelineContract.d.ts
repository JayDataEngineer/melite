export declare const SEAM_OVERLAP_FRAMES = 22;
export declare const GRID_BASE_FRAMES = 22;
export declare const GRID_STEP_FRAMES = 17;
export declare const GRID_MAX_FRAMES = 362;
export declare const GRID_REMAINDER = 5;
export declare const IMAGE_BUS_SLOTS = 9;
export declare const REF_CAPS: {
    readonly images: 8;
    readonly videos: 3;
    readonly audios: 3;
    readonly refmods: 8;
};
export interface TimelineSpan {
    readonly start: number;
    readonly end: number;
    readonly transition?: string;
}
export interface TimelineCallSpan {
    readonly start_frame: number;
    readonly end_frame: number;
    readonly transition?: string;
}
export declare function transitionOverlap(transition?: string): number;
export declare function spanOverlap(span: TimelineSpan): number;
export declare function spanStanzaFrames(span: TimelineSpan, carry?: number): number;
export interface CarriedSpanGrid {
    readonly generatedStart: number;
    readonly generatedEnd: number;
    readonly length: number;
    readonly lowerEnd: number;
    readonly upperEnd: number;
}
export declare function carriedSpanGrid(span: TimelineSpan, carry?: number): CarriedSpanGrid;
export declare function assertCarriedSpanGrid(span: TimelineSpan, where: string, carry?: number): number;
export declare function gridSnap(length: number): number;
/** THE GRID PREDICATE, one owner: a length the engine can render is
 *  22+17k inside [22,362]. Every refusal door asks this question, so
 *  knob pins, single windows, cut windows, and carried windows cannot
 *  drift into different laws. */
export declare function isGridLength(length: number): boolean;
export declare function assertGridLength(length: unknown, where: string): number;
/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
 *  carried window generates span+carry frames, so its authored span
 *  must be 17k; a first or cut window generates its span verbatim, so
 *  it must be 22+17k. Both are the same engine grid — a carried span
 *  used to be the only shape that refused, while single/cut spans
 *  were silently snapped (the old two-law gap, closed 2026-09-25).
 *  `spanStanzaFrames` stays the render/film clock and is a no-op
 *  identity for admitted spans. */
export declare function assertSpanGrid(span: TimelineSpan, where: string, carry?: number): number;
export declare function deliveredFrames(call: TimelineCallSpan, index: number): number;
export declare function imageReferenceCap(hasLastFrame: boolean): number;
export declare function splitRefList(value: string | undefined): string[];
export declare function normalizeDeclaredRefs(value: unknown): string[];
export declare function joinRefList(value: unknown): string | undefined;
export declare function mergeDeclaredRefs(declared: readonly string[], perCall: readonly string[]): string[];
export declare function refGenreOf(name: string, url?: string): 'image' | 'video' | 'audio' | 'other';
export declare const KNOB_ORDER: readonly ["steps", "denoise", "sampler_name", "sched_name", "shift_video", "shift_audio", "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps", "sla_protect_audio", "sla_stabilize_motion", "sla_reference_protection", "sla_dense_backend", "sla_dense_steps", "sla_disable_fp16_accum", "sharpen_enabled", "sharpen_method", "sharpen_strength", "sharpen_radius", "sharpen_threshold", "sharpen_iterations", "interpolate_enabled", "interp_model", "interp_multiplier", "length"];
export type KnobKey = (typeof KNOB_ORDER)[number];
export declare const CALL_KNOB_KEYS: ReadonlySet<string>;
export declare const CALL_KEYS: ReadonlySet<string>;
export declare const LEGACY_KNOB_KEY: {
    readonly sampling_steps: "steps";
    readonly sampler: "sampler_name";
    readonly scheduler: "sched_name";
    readonly h3_sla_sparsity: "sla_sparsity";
    readonly h3_sla_block_size: "sla_block_size";
    readonly h3_sla_min_seq_len: "sla_min_seq_len";
    readonly h3_sla_dense_last_steps: "sla_dense_last_steps";
    readonly h3_sla_protect_audio: "sla_protect_audio";
    readonly h3_sla_stabilize_motion: "sla_stabilize_motion";
    readonly h3_sla_reference_protection: "sla_reference_protection";
    readonly h3_sla_dense_backend: "sla_dense_backend";
    readonly h3_sla_dense_steps: "sla_dense_steps";
    readonly h3_sla_disable_fp16_accum: "sla_disable_fp16_accum";
    readonly interpolate_model: "interp_model";
    readonly interpolate_multiplier: "interp_multiplier";
};
export declare function migrateCallKnobKey(key: string): string;
//# sourceMappingURL=timelineContract.d.ts.map