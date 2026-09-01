/**
 * E2.1 — Magnetic snapping utility.
 *
 * Given a candidate time and a set of "target" times (other segment
 * edges, playhead, in/out points, grid lines), returns the snapped time
 * if any target is within `threshold` seconds; otherwise returns the
 * candidate unchanged.
 *
 * Pure — no React, no DOM. Tests live next to the file.
 */

/** A snap target with its source label (for UI indicator rendering). */
export interface SnapTarget {
  time: number
  label: string
  /** Lower-priority targets lose ties. Default 0. */
  priority?: number
}

/** Result of a snap attempt. */
export interface SnapResult {
  /** The (possibly snapped) time. */
  time: number
  /** The target that won, or null when nothing was within threshold. */
  matched: SnapTarget | null
}

/**
 * Find the closest target within `threshold` seconds of `candidate`.
 *
 * Ties are broken by priority (higher wins), then by absolute distance
 * (closer wins).
 */
export function findSnap(
  candidate: number,
  targets: SnapTarget[],
  threshold: number,
): SnapResult {
  if (threshold <= 0 || targets.length === 0) {
    return { time: candidate, matched: null }
  }
  let best: SnapTarget | null = null
  let bestDist = threshold
  let bestPriority = -Infinity
  for (const t of targets) {
    const d = Math.abs(t.time - candidate)
    if (d > bestDist) continue
    const p = t.priority ?? 0
    // Strictly closer always wins regardless of priority.
    if (d < bestDist || (d === bestDist && p > bestPriority)) {
      best = t
      bestDist = d
      bestPriority = p
    }
  }
  if (!best) return { time: candidate, matched: null }
  return { time: best.time, matched: best }
}

/**
 * Convenience: snap a candidate against many sources at once. Targets
 * from each source are merged; the result picks the single closest.
 */
export function snapTime(
  candidate: number,
  sources: SnapTarget[] | SnapTarget[][],
  threshold: number,
): SnapResult {
  const flat: SnapTarget[] = Array.isArray(sources[0])
    ? (sources as SnapTarget[][]).flat()
    : (sources as SnapTarget[])
  return findSnap(candidate, flat, threshold)
}

/** Build snap targets from the edges of all segments except `excludeId`. */
export function segmentEdgeTargets(
  segments: { id: string; start: number; duration: number }[],
  excludeId?: string,
): SnapTarget[] {
  const out: SnapTarget[] = []
  for (const s of segments) {
    if (s.id === excludeId) continue
    out.push({ time: s.start, label: 'segment start', priority: 1 })
    out.push({ time: s.start + s.duration, label: 'segment end', priority: 1 })
  }
  return out
}

/** Build snap targets at every `grid` seconds up to `maxTime`. */
export function gridTargets(grid: number, maxTime: number): SnapTarget[] {
  if (grid <= 0) return []
  const out: SnapTarget[] = []
  for (let t = 0; t <= maxTime + 1e-6; t += grid) {
    out.push({ time: t, label: 'grid', priority: 0 })
  }
  return out
}
