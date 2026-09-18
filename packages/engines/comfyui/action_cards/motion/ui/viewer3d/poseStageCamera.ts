import { azimuthCameraPos } from "@melite/formats"
import type { CameraFraming } from "./poseStageTypes"

// ── Camera math (verbatim; re-exported by PoseViewer3D for the studio) ────
export function cameraPosFor(view: string): [number, number, number] {
  switch (view) {
    case "side": return [3.2, 1.2, 0.01]
    case "three-quarter": return [2.4, 1.4, 2.4]
    case "front": return [0, 1.2, 3.4]
    default:
      if (view.startsWith("az-")) return azimuthCameraPos(view as Parameters<typeof azimuthCameraPos>[0])
      return [2.74, 1.88, 5.68] // "demo"
  }
}

const FRAMING: Record<CameraFraming, { dist: number; camY: number; targetY: number }> = {
  full: { dist: 2.6, camY: 1.15, targetY: 0.92 },
  upper: { dist: 1.25, camY: 1.5, targetY: 1.3 },
}
const LEGACY_TARGET_Y: Record<CameraFraming, number> = { full: 0.9, upper: 1.32 }
const LEGACY_DIST_SCALE: Record<CameraFraming, number> = { full: 1, upper: 0.5 }

export function framedCameraPos(
  view: string, framing: CameraFraming,
): [[number, number, number], number] {
  const base = cameraPosFor(view)
  if (view.startsWith("az-")) {
    const angle = Math.atan2(base[0], base[2])
    const f = FRAMING[framing]
    return [[Math.sin(angle) * f.dist, f.camY, Math.cos(angle) * f.dist], f.targetY]
  }
  const ty = LEGACY_TARGET_Y[framing]
  const s = LEGACY_DIST_SCALE[framing]
  const dir: [number, number, number] = [base[0], base[1] - 0.9, base[2]]
  return [[dir[0] * s, ty + dir[1] * s, dir[2] * s], ty]
}
