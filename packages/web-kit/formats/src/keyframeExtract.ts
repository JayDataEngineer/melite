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
import type { PromptSegmentOutput } from "@melite/catalog"

export interface ExtractOptions {
  /** Minimum frames between extracted keyframes (anti-clustering). */
  minSpacing?: number
  /** Always include frame 0 and the last frame as anchors. Default true. */
  includeEndpoints?: boolean
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
export function extractKeyframeFrames(
  framesJoints: number[][][],
  segments?: PromptSegmentOutput[],
  opts: ExtractOptions = {},
): number[] {
  if (!framesJoints?.length) return []
  const total = framesJoints.length
  const minSpacing = opts.minSpacing ?? Math.max(2, Math.floor(total / 12))
  const includeEndpoints = opts.includeEndpoints ?? true

  let raw: Set<number>

  if (segments && segments.length > 1) {
    // Multi-prompt: segment boundaries are the keyframes.
    raw = new Set<number>()
    for (const seg of segments) {
      raw.add(seg.start_frame)
      raw.add(seg.end_frame)
    }
    // Also include the peak if provided — it's often a strong anchor.
  } else {
    // Single-prompt (or no segments): velocity-minima detection.
    raw = new Set(velocityMinima(framesJoints))
  }

  // Enforce endpoints.
  if (includeEndpoints) {
    raw.add(0)
    raw.add(total - 1)
  }

  // Dedupe + sort + enforce min spacing (greedy — keep first, skip too-close).
  const sorted = Array.from(raw).sort((a, b) => a - b)
    .filter(f => f >= 0 && f < total)
  const out: number[] = []
  for (const f of sorted) {
    if (out.length === 0 || f - out[out.length - 1] >= minSpacing) {
      out.push(f)
    } else if (f === total - 1) {
      // Always keep the last frame even if close to the previous — it's
      // the end-anchor. Replace the previous if it's very close.
      const prev = out[out.length - 1]
      if (total - 1 - prev < minSpacing) out[out.length - 1] = f
      else out.push(f)
    }
  }
  return out
}

/**
 * Per-frame velocity (total squared joint displacement). Exposed for the
 * optional velocity-curve visualization in the timeline.
 */
export function frameVelocities(framesJoints: number[][][]): number[] {
  const v = new Array<number>(framesJoints.length).fill(0)
  for (let f = 1; f < framesJoints.length; f++) {
    const a = framesJoints[f - 1]
    const b = framesJoints[f]
    let sum = 0
    const n = Math.min(a.length, b.length)
    for (let j = 0; j < n; j++) {
      const aj = a[j], bj = b[j]
      const dx = bj[0] - aj[0]
      const dy = bj[1] - aj[1]
      const dz = bj[2] - aj[2]
      sum += dx * dx + dy * dy + dz * dz
    }
    v[f] = sum
  }
  v[0] = v[1] ?? 0
  return v
}

/** Local minima of the velocity curve → holds / extremes = good anchors. */
function velocityMinima(framesJoints: number[][][]): number[] {
  const v = frameVelocities(framesJoints)
  const minima: number[] = []
  // A frame is a local minimum if it's lower than its neighbors. Use a
  // smoothing window of 2 to avoid jitter-induced false minima.
  for (let f = 2; f < v.length - 2; f++) {
    if (v[f] < v[f - 1] && v[f] < v[f + 1] && v[f] < v[f - 2] && v[f] < v[f + 2]) {
      minima.push(f)
    }
  }
  return minima
}
