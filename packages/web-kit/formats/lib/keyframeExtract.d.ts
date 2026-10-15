/**
 * keyframeExtract — pick anchor frames from a SOMA-77 motion trajectory.
 *
 * Used by Pose Studio's "Auto Keyframes" action (Kimodo-TO (g)) to turn a
 * generated motion into a sparse set of keyframe constraints without the
 * user scrubbing and pinning by hand.
 *
 * Two regimes:
 *
 *   1. Multi-prompt motion → the semantic boundaries are already known:
 *      each prompt segment's start_frame / end_frame is a natural keyframe
 *      (the motion changes intent there). No signal processing needed.
 *
 *   2. Single-prompt motion → run velocity-minima detection on the joint
 *      trajectory. Per-frame velocity = total squared displacement of all
 *      77 joints from the previous frame. Local MINIMA of this signal are
 *      the holds / extremes (top of a reach, contact frame, pause) — clean,
 *      readable anchor poses. Local MAXIMA are mid-motion blur frames and
 *      make BAD anchors, so we explicitly look for minima, not peaks.
 *
 * Both paths return frame indices, deduped and sorted, with endpoints and a
 * minimum spacing enforced.
 */
import type { PromptSegmentOutput } from "./textToPose.js";
export interface ExtractOptions {
    /** Minimum frames between extracted keyframes (anti-clustering). */
    minSpacing?: number;
    /** Always include frame 0 and the last frame as anchors. Default true. */
    includeEndpoints?: boolean;
}
/**
 * Extract keyframe frame indices from a motion's per-frame joint trajectory.
 *
 * @param framesJoints  Per-frame joint positions. Shape: [frame][joint][3].
 *                       (result.motion.frames_soma77_3d from the pose API.)
 * @param segments      Optional prompt segments. When present (>1), their
 *                       boundaries are used directly instead of velocity
 *                       detection — they ARE the semantic keyframes.
 */
export declare function extractKeyframeFrames(framesJoints: number[][][], segments?: PromptSegmentOutput[], opts?: ExtractOptions): number[];
/**
 * Per-frame velocity (total squared joint displacement). Exposed for the
 * optional velocity-curve visualization in the timeline.
 */
export declare function frameVelocities(framesJoints: number[][][]): number[];
//# sourceMappingURL=keyframeExtract.d.ts.map