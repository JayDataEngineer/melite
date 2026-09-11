/**
 * Pose Studio — keypoint transform utilities.
 *
 * COCO-18 keypoints: 18 joints × (x, y, confidence) = 54 numbers in a flat
 * array. This is the same format DWPose outputs (see media/workflows/utils/dwpose.py)
 * and the same format the /poser/* backend endpoints accept.
 *
 * The Pose Studio UI lets the user pick a base preset, then tweak it with
 * semantic sliders (arm raise, elbow bend, head tilt, etc.). Each slider
 * maps to a transform on the base keypoint array. The result is POSTed to
 * /poser/render, which returns a PNG skeleton image.
 *
 * Convention: subject's RIGHT side = image LEFT (so right-side keypoints
 * have smaller X values than left-side ones).
 */
import { apiFetch } from "@melite/catalog"
import { readAsDataURL } from "@melite/ui"

// ── COCO-18 keypoint indices ─────────────────────────────────────────────
export const KP = {
  NOSE: 0, NECK: 1,
  R_SHOULDER: 2, R_ELBOW: 3, R_WRIST: 4,
  L_SHOULDER: 5, L_ELBOW: 6, L_WRIST: 7,
  R_HIP: 8, R_KNEE: 9, R_ANKLE: 10,
  L_HIP: 11, L_KNEE: 12, L_ANKLE: 13,
  R_EYE: 14, L_EYE: 15, R_EAR: 16, L_EAR: 17,
} as const

export const NUM_KEYPOINTS = 18
export const FLAT_LENGTH = NUM_KEYPOINTS * 3 // 54

export type Keypoints = number[] // flat [x, y, c, x, y, c, ...]

export interface PosePreset {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  render_url: string
  keypoints: Keypoints
}

// ── Slider adjustments ───────────────────────────────────────────────────
// All sliders are normalized to [-1, 1] (or [0, 1] for one-sided like crouch).
// 0 means "no change from base preset".

export interface PoseAdjustments {
  leftArmRaise: number    // -1 (down) .. 1 (straight up)
  rightArmRaise: number
  leftElbowBend: number  // 0 (straight) .. 1 (forearm across chest)
  rightElbowBend: number
  weightShift: number    // -1 (shift left) .. 1 (shift right)
  crouch: number          // 0 (standing) .. 1 (deep crouch)
  headTilt: number        // -1 (tilt left) .. 1 (tilt right)
  spineLean: number       // -1 (lean back) .. 1 (lean forward)
}

export const DEFAULT_ADJUSTMENTS: PoseAdjustments = {
  leftArmRaise: 0,
  rightArmRaise: 0,
  leftElbowBend: 0,
  rightElbowBend: 0,
  weightShift: 0,
  crouch: 0,
  headTilt: 0,
  spineLean: 0,
}

// ── Math helpers ─────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getX(kp: Keypoints, idx: number): number {
  return kp[idx * 3]
}

function getY(kp: Keypoints, idx: number): number {
  return kp[idx * 3 + 1]
}

function setXY(kp: Keypoints, idx: number, x: number, y: number): void {
  kp[idx * 3] = x
  kp[idx * 3 + 1] = y
}

function translate(kp: Keypoints, idx: number, dx: number, dy: number): void {
  kp[idx * 3] += dx
  kp[idx * 3 + 1] += dy
}

// ── Transform flow ───────────────────────────────────────────────────
// Each transform mutates the (already-cloned) keypoint array.
// Order matters: crouch and weight shift move everything; arm/elbow transforms
// then operate on the post-shifted shoulder positions; head tilt and spine
// lean are last because they're independent of limb positions.

export function applyAdjustments(base: Keypoints, adj: PoseAdjustments): Keypoints {
  const kp = [...base] // shallow clone — numbers are immutable so this is enough

  // 1. Crouch — compress Y of all keypoints around the hip pivot.
  if (adj.crouch !== 0) {
    const hipY = getY(kp, KP.R_HIP) // pivot at hip height
    const scale = 1 - adj.crouch * 0.30 // up to 30% compression
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      const y = getY(kp, i)
      setXY(kp, i, getX(kp, i), hipY + (y - hipY) * scale)
    }
  }

  // 2. Weight shift — translate all keypoints horizontally.
  if (adj.weightShift !== 0) {
    const dx = adj.weightShift * 80
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      translate(kp, i, dx, 0)
    }
  }

  // 3. Spine lean — translate head/neck/shoulders forward (down in image space)
  // or backward (up in image space). Arms follow shoulders partially.
  if (adj.spineLean !== 0) {
    const dy = adj.spineLean * 60
    const upperBody = [
      KP.NOSE, KP.NECK, KP.R_SHOULDER, KP.L_SHOULDER,
      KP.R_EYE, KP.L_EYE, KP.R_EAR, KP.L_EAR,
    ]
    for (const idx of upperBody) translate(kp, idx, 0, dy)
    // Elbows and wrists trail the shoulder motion (less, since arms have inertia)
    translate(kp, KP.R_ELBOW, 0, dy * 0.5)
    translate(kp, KP.L_ELBOW, 0, dy * 0.5)
    translate(kp, KP.R_WRIST, 0, dy * 0.3)
    translate(kp, KP.L_WRIST, 0, dy * 0.3)
  }

  // 4. Head tilt — rotate the head cluster (nose, eyes, ears) around the neck.
  if (adj.headTilt !== 0) {
    const nx = getX(kp, KP.NECK)
    const ny = getY(kp, KP.NECK)
    const angle = adj.headTilt * 0.35 // ~20° max
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    for (const idx of [KP.NOSE, KP.R_EYE, KP.L_EYE, KP.R_EAR, KP.L_EAR]) {
      const dx = getX(kp, idx) - nx
      const dy = getY(kp, idx) - ny
      setXY(kp, idx, nx + dx * cos - dy * sin, ny + dx * sin + dy * cos)
    }
  }

  // 5. Arm raises — pull elbow + wrist toward a "raised above head" target.
  // Slider > 0 raises; slider < 0 is a no-op (can't go lower than "at side").
  raiseArm(kp, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST, Math.max(0, adj.leftArmRaise))
  raiseArm(kp, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST, Math.max(0, adj.rightArmRaise))

  // 6. Elbow bends — draw wrist toward the midline (neck X).
  bendElbow(kp, KP.L_WRIST, KP.NECK, adj.leftElbowBend)
  bendElbow(kp, KP.R_WRIST, KP.NECK, adj.rightElbowBend)

  return kp
}

function raiseArm(
  kp: Keypoints,
  shoulderIdx: number,
  elbowIdx: number,
  wristIdx: number,
  amount: number, // 0 to 1
): void {
  if (amount === 0) return
  const shx = getX(kp, shoulderIdx)
  // Target wrist position: directly above shoulder, near top of frame.
  const targetWristX = shx
  const targetWristY = 80
  // Target elbow position: halfway between current and target wrist.
  const targetElbowX = lerp(getX(kp, elbowIdx), targetWristX, 0.5)
  const targetElbowY = lerp(getY(kp, elbowIdx), targetWristY, 0.5)

  // Lerp wrist fully, elbow partially (it trails).
  setXY(
    kp,
    wristIdx,
    lerp(getX(kp, wristIdx), targetWristX, amount),
    lerp(getY(kp, wristIdx), targetWristY, amount),
  )
  setXY(
    kp,
    elbowIdx,
    lerp(getX(kp, elbowIdx), targetElbowX, amount * 0.7),
    lerp(getY(kp, elbowIdx), targetElbowY, amount * 0.7),
  )
}

function bendElbow(
  kp: Keypoints,
  wristIdx: number,
  neckIdx: number,
  amount: number, // 0 to 1
): void {
  if (amount === 0) return
  const targetX = lerp(getX(kp, wristIdx), getX(kp, neckIdx), 0.65)
  const targetY = lerp(getY(kp, wristIdx), getY(kp, neckIdx), 0.30)
  setXY(
    kp,
    wristIdx,
    lerp(getX(kp, wristIdx), targetX, amount),
    lerp(getY(kp, wristIdx), targetY, amount),
  )
}

// ── Preset fetch / render helpers ────────────────────────────────────────

export async function fetchPosePresets(): Promise<PosePreset[]> {
  const res = await apiFetch("/poser/presets")
  if (!res.ok) throw new Error(`Failed to fetch pose presets: ${res.status}`)
  return res.json()
}

/**
 * Render keypoints to a PNG skeleton image via the backend.
 * Returns a Blob (image/png) suitable for object URLs.
 */
export async function renderCustomPose(
  keypoints: Keypoints,
  opts: { width?: number; height?: number } = {},
): Promise<Blob> {
  const res = await apiFetch("/poser/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keypoints,
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      line_width: 5,
      point_radius: 6,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Pose render failed: ${res.status} ${txt}`)
  }
  return res.blob()
}

/**
 * Convert a Blob to a base64 data URL — for saving to the asset store
 * (which expects data URLs, not object URLs, for persistence).
 * Delegates to the shared readAsDataURL (@melite/ui SlotSquare — the
 * ONE read path every slot-shaped attach uses).
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return readAsDataURL(blob)
}

// ── 2D → approximate 3D projection ──────────────────────────────────────────

/** SOMA coordinate space constants. */
const SOMA_SCALE = 0.6 // maps 1024px width to ~0.6 SOMA units (hip-to-hip)
const SOMA_CENTER_X = 0.5 // image center as fraction of width
const SOMA_CENTER_Y = 0.55 // approximate hip center as fraction of height

/** Default z-depths per COCO-18 joint (in SOMA units). Negative = toward viewer. */
const DEFAULT_Z: Record<number, number> = {
  [KP.NOSE]: 0.10,
  [KP.NECK]: 0.08,
  [KP.R_SHOULDER]: 0.05,
  [KP.R_ELBOW]: 0.02,
  [KP.R_WRIST]: 0.00,
  [KP.L_SHOULDER]: 0.05,
  [KP.L_ELBOW]: 0.02,
  [KP.L_WRIST]: 0.00,
  [KP.R_HIP]: -0.05,
  [KP.R_KNEE]: -0.02,
  [KP.R_ANKLE]: 0.00,
  [KP.L_HIP]: -0.05,
  [KP.L_KNEE]: -0.02,
  [KP.L_ANKLE]: 0.00,
  [KP.R_EYE]: 0.15,
  [KP.L_EYE]: 0.15,
  [KP.R_EAR]: 0.12,
  [KP.L_EAR]: 0.12,
}

/**
 * Convert 2D flat COCO-18 keypoints to approximate 3D positions.
 *
 * The 2D keypoints are flattened [x, y, confidence, ...] in image-pixel space
 * (typically 1024×1024). This function maps them into the SOMA coordinate
 * frame: +X = subject's left, +Y = up, +Z = forward.
 *
 * Z-values are estimated from joint category (shoulders forward, hips back).
 * The result is suitable for the 3D PoseViewer — not physically accurate but
 * visually coherent for preset poses.
 */
export function flatTo3D(flat: number[]): [number, number, number][] {
  const result: [number, number, number][] = []

  for (let i = 0; i < NUM_KEYPOINTS; i++) {
    const x = flat[i * 3] ?? 0
    const y = flat[i * 3 + 1] ?? 0
    const c = flat[i * 3 + 2] ?? 0

    if (c < 0.1) {
      // Low confidence — place joint at a neutral position
      result.push([0, 0, 0])
      continue
    }

    // Normalize from image coords to SOMA coords
    const sx = (x / 1024 - SOMA_CENTER_X) * SOMA_SCALE * 2
    // Y is inverted in image coords (0 = top)
    const sy = (SOMA_CENTER_Y - y / 1024) * SOMA_SCALE * 2
    // Every COCO-18 joint 0..17 is tabled in DEFAULT_Z above (the loop
    // bound is NUM_KEYPOINTS = 18), so the lookup is always present —
    // no fallback to cover. Keep the table and loop in lockstep.
    const sz = DEFAULT_Z[i] as number

    result.push([sx, sy, sz])
  }

  return result
}
