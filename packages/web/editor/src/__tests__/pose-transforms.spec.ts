/**
 * Unit tests for lib/pose-transforms.ts — the 321-line COCO-18 keypoint
 * transform module that powers Pose Studio's preset + slider UI. Every pose
 * surface mocks this module away (or only uses fetchPosePresets), so the REAL
 * transform flow (crouch / weightShift / spineLean / headTilt / arm-raise /
 * elbow-bend) and the 2D→3D projection had ZERO runtime coverage — a silent
 * change to the crouch pivot or the head-tilt rotation matrix would ship
 * uncaught. These tests pin every transform's math.
 *
 * The keypoint math is pure; only fetchPosePresets/renderCustomPose hit the
 * network (apiFetch is mocked here). blobToDataUrl uses the FileReader global
 * (happy-dom provides it — already exercised by voice-api.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))

import { apiFetch } from "@melite/catalog"
import {
  KP, NUM_KEYPOINTS, FLAT_LENGTH, DEFAULT_ADJUSTMENTS,
  applyAdjustments, flatTo3D, blobToDataUrl,
  fetchPosePresets, renderCustomPose,
} from "@melite/formats"
import type { Keypoints, PoseAdjustments, PosePreset } from "@melite/formats"

// ── Fixtures ────────────────────────────────────────────────────────────────
/**
 * A neutral front-facing T-pose in 1024×1024 image space, subject's right on
 * image-left (X smaller). Every joint has full confidence (1.0). Coordinates
 * chosen so that all transforms produce non-degenerate, checkable deltas.
 */
function neutralPose(): Keypoints {
  const p: Array<[number, number]> = [
    [512, 300], // 0  NOSE
    [512, 400], // 1  NECK
    [412, 410], // 2  R_SHOULDER
    [360, 500], // 3  R_ELBOW
    [330, 600], // 4  R_WRIST
    [612, 410], // 5  L_SHOULDER
    [664, 500], // 6  L_ELBOW
    [694, 600], // 7  L_WRIST
    [462, 600], // 8  R_HIP
    [450, 780], // 9  R_KNEE
    [445, 950], // 10 R_ANKLE
    [562, 600], // 11 L_HIP
    [574, 780], // 12 L_KNEE
    [579, 950], // 13 L_ANKLE
    [500, 285], // 14 R_EYE
    [524, 285], // 15 L_EYE
    [485, 300], // 16 R_EAR
    [539, 300], // 17 L_EAR
  ]
  const flat: Keypoints = []
  for (const [x, y] of p) flat.push(x, y, 1.0)
  return flat
}

/** Build an adjustments object with all fields, defaulting to 0. */
function adj(overrides: Partial<PoseAdjustments> = {}): PoseAdjustments {
  return { ...DEFAULT_ADJUSTMENTS, ...overrides }
}

function mkRes(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } })
}

beforeEach(() => vi.mocked(apiFetch).mockReset())

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — constants", () => {
  it("NUM_KEYPOINTS is 18 (COCO-18) and FLAT_LENGTH is 54 (18×3)", () => {
    expect(NUM_KEYPOINTS).toBe(18)
    expect(FLAT_LENGTH).toBe(54)
  })
  it("KP indices cover all 18 joints 0..17 with no gaps or duplicates", () => {
    const vals = Object.values(KP)
    expect(vals).toHaveLength(18)
    expect(new Set(vals).size).toBe(18)
    expect(Math.min(...vals)).toBe(0)
    expect(Math.max(...vals)).toBe(17)
  })
  it("KP spot-checks: NOSE=0, NECK=1, R_SHOULDER=2, L_ANKLE=13, L_EAR=17", () => {
    expect(KP.NOSE).toBe(0)
    expect(KP.NECK).toBe(1)
    expect(KP.R_SHOULDER).toBe(2)
    expect(KP.L_ANKLE).toBe(13)
    expect(KP.L_EAR).toBe(17)
  })
  it("DEFAULT_ADJUSTMENTS is the identity (all-zero) transform", () => {
    for (const v of Object.values(DEFAULT_ADJUSTMENTS)) expect(v).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// applyAdjustments — purity + identity
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — applyAdjustments purity", () => {
  it("returns a NEW array (does not return the input reference)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj())
    expect(out).not.toBe(base)
  })
  it("does NOT mutate the input array (defensive clone)", () => {
    const base = neutralPose()
    const snapshot = [...base]
    applyAdjustments(base, adj({ crouch: 1, weightShift: 1, headTilt: 1 }))
    expect(base).toEqual(snapshot)
  })
  it("with all-zero adjustments, output is byte-identical to the base", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj())
    expect(out).toEqual(base)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// applyAdjustments — individual transforms (isolation)
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — crouch", () => {
  it("compresses every joint's Y toward the hip pivot by 30% at crouch=1 (X untouched)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ crouch: 1 }))
    const hipY = base[KP.R_HIP * 3 + 1] // 600
    const scale = 1 - 1 * 0.30 // 0.70
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      const origX = base[i * 3]
      const origY = base[i * 3 + 1]
      expect(out[i * 3]).toBe(origX) // X unchanged
      expect(out[i * 3 + 1]).toBeCloseTo(hipY + (origY - hipY) * scale, 5)
    }
  })
  it("compresses less at crouch=0.5 (scale 0.85)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ crouch: 0.5 }))
    const hipY = base[KP.R_HIP * 3 + 1]
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      const origY = base[i * 3 + 1]
      expect(out[i * 3 + 1]).toBeCloseTo(hipY + (origY - hipY) * 0.85, 5)
    }
  })
})

describe("pose-transforms — weightShift", () => {
  it("translates every joint X by +80 at weightShift=1 (Y untouched)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ weightShift: 1 }))
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      expect(out[i * 3]).toBeCloseTo(base[i * 3] + 80, 5)
      expect(out[i * 3 + 1]).toBe(base[i * 3 + 1])
    }
  })
  it("translates by -80 at weightShift=-1", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ weightShift: -1 }))
    expect(out[KP.NOSE * 3]).toBeCloseTo(base[KP.NOSE * 3] - 80, 5)
  })
})

describe("pose-transforms — spineLean", () => {
  it("translates upper-body Y by +60, elbows by +30, wrists by +18 at spineLean=1", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ spineLean: 1 }))
    const upper = [KP.NOSE, KP.NECK, KP.R_SHOULDER, KP.L_SHOULDER,
      KP.R_EYE, KP.L_EYE, KP.R_EAR, KP.L_EAR]
    for (const idx of upper) {
      expect(out[idx * 3 + 1]).toBeCloseTo(base[idx * 3 + 1] + 60, 5)
    }
    expect(out[KP.R_ELBOW * 3 + 1]).toBeCloseTo(base[KP.R_ELBOW * 3 + 1] + 30, 5)
    expect(out[KP.L_ELBOW * 3 + 1]).toBeCloseTo(base[KP.L_ELBOW * 3 + 1] + 30, 5)
    expect(out[KP.R_WRIST * 3 + 1]).toBeCloseTo(base[KP.R_WRIST * 3 + 1] + 18, 5)
    expect(out[KP.L_WRIST * 3 + 1]).toBeCloseTo(base[KP.L_WRIST * 3 + 1] + 18, 5)
    // Hips/knees/ankles are NOT in the upper-body set — unchanged.
    expect(out[KP.R_HIP * 3 + 1]).toBe(base[KP.R_HIP * 3 + 1])
    expect(out[KP.R_ANKLE * 3 + 1]).toBe(base[KP.R_ANKLE * 3 + 1])
    // X untouched for all.
    for (let i = 0; i < NUM_KEYPOINTS; i++) expect(out[i * 3]).toBe(base[i * 3])
  })
})

describe("pose-transforms — headTilt", () => {
  it("rotates the head cluster around the neck (neck itself is the pivot → unchanged)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ headTilt: 1 }))
    // Neck is the pivot: NOT in the rotated set, so it stays exactly fixed.
    expect(out[KP.NECK * 3]).toBe(base[KP.NECK * 3])
    expect(out[KP.NECK * 3 + 1]).toBe(base[KP.NECK * 3 + 1])
    // NOSE moves: original dx=0, dy=-100 (neck at 400, nose at 300).
    // angle = 0.35 rad. new dx = 0*cos - (-100)*sin = 100*sin(0.35) > 0.
    // new dy = 0*sin + (-100)*cos = -100*cos(0.35) (still negative, slightly less).
    const angle = 0.35
    const expectedNoseX = 512 + Math.sin(angle) * 100 // neck.x + |dy|*sin
    // Precisely: nose orig (512,300), pivot (512,400). dx=0, dy=-100.
    // new = (nx + dx*cos - dy*sin, ny + dx*sin + dy*cos)
    //     = (512 + 0 - (-100)*sin, 400 + 0 + (-100)*cos)
    //     = (512 + 100*sin(0.35), 400 - 100*cos(0.35))
    expect(out[KP.NOSE * 3]).toBeCloseTo(512 + 100 * Math.sin(angle), 4)
    expect(out[KP.NOSE * 3 + 1]).toBeCloseTo(400 - 100 * Math.cos(angle), 4)
    // Sanity: the expected helpers above should match (kept for readability).
    expect(expectedNoseX).toBeCloseTo(out[KP.NOSE * 3], 4)
  })
  it("does not affect limbs (only nose/eyes/ears rotate)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ headTilt: 1 }))
    for (const idx of [KP.R_SHOULDER, KP.L_SHOULDER, KP.R_ELBOW, KP.L_ELBOW,
      KP.R_HIP, KP.L_HIP, KP.R_KNEE, KP.L_KNEE]) {
      expect(out[idx * 3]).toBe(base[idx * 3])
      expect(out[idx * 3 + 1]).toBe(base[idx * 3 + 1])
    }
  })
})

describe("pose-transforms — arm raises", () => {
  it("leftArmRaise=1 moves L_WRIST toward (shoulderX, 80) and L_ELBOW partially", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ leftArmRaise: 1 }))
    const shx = base[KP.L_SHOULDER * 3] // 612
    // Wrist lerps fully (amount=1) to (shx, 80).
    expect(out[KP.L_WRIST * 3]).toBeCloseTo(shx, 5)
    expect(out[KP.L_WRIST * 3 + 1]).toBeCloseTo(80, 5)
    // Elbow lerps by amount*0.7 toward (lerp(elbowX, shx, 0.5), lerp(elbowY, 80, 0.5)).
    const ex = base[KP.L_ELBOW * 3]      // 664
    const ey = base[KP.L_ELBOW * 3 + 1]  // 500
    const targetEX = ex + (shx - ex) * 0.5     // lerp(664, 612, 0.5) = 638
    const targetEY = ey + (80 - ey) * 0.5      // lerp(500, 80, 0.5) = 290
    expect(out[KP.L_ELBOW * 3]).toBeCloseTo(ex + (targetEX - ex) * 0.7, 4)
    expect(out[KP.L_ELBOW * 3 + 1]).toBeCloseTo(ey + (targetEY - ey) * 0.7, 4)
  })
  it("leftArmRaise is clamped to ≥0 (negative is a no-op, can't go below 'at side')", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ leftArmRaise: -0.5 }))
    // Left arm unchanged because Math.max(0, -0.5) = 0 → raiseArm returns early.
    expect(out[KP.L_WRIST * 3]).toBe(base[KP.L_WRIST * 3])
    expect(out[KP.L_WRIST * 3 + 1]).toBe(base[KP.L_WRIST * 3 + 1])
    expect(out[KP.L_ELBOW * 3]).toBe(base[KP.L_ELBOW * 3])
  })
  it("leftArmRaise does NOT affect the right arm (independence)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ leftArmRaise: 1 }))
    expect(out[KP.R_WRIST * 3]).toBe(base[KP.R_WRIST * 3])
    expect(out[KP.R_WRIST * 3 + 1]).toBe(base[KP.R_WRIST * 3 + 1])
    expect(out[KP.R_ELBOW * 3]).toBe(base[KP.R_ELBOW * 3])
  })
  it("rightArmRaise=1 moves R_WRIST toward (R_shoulderX, 80) symmetrically", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ rightArmRaise: 1 }))
    const shx = base[KP.R_SHOULDER * 3] // 412
    expect(out[KP.R_WRIST * 3]).toBeCloseTo(shx, 5)
    expect(out[KP.R_WRIST * 3 + 1]).toBeCloseTo(80, 5)
  })
})

describe("pose-transforms — elbow bends", () => {
  it("leftElbowBend=1 draws L_WRIST toward the neck X (65% of the way) and Y (30%)", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ leftElbowBend: 1 }))
    const wx = base[KP.L_WRIST * 3]      // 694
    const wy = base[KP.L_WRIST * 3 + 1]  // 600
    const nx = base[KP.NECK * 3]         // 512
    const ny = base[KP.NECK * 3 + 1]     // 400
    // targetX = lerp(wx, nx, 0.65); targetY = lerp(wy, ny, 0.30); then full lerp by amount=1.
    const targetX = wx + (nx - wx) * 0.65
    const targetY = wy + (ny - wy) * 0.30
    expect(out[KP.L_WRIST * 3]).toBeCloseTo(targetX, 4)
    expect(out[KP.L_WRIST * 3 + 1]).toBeCloseTo(targetY, 4)
  })
  it("elbowBend does NOT move the elbow joint itself — only the wrist", () => {
    const base = neutralPose()
    const out = applyAdjustments(base, adj({ leftElbowBend: 1, rightElbowBend: 1 }))
    expect(out[KP.L_ELBOW * 3]).toBe(base[KP.L_ELBOW * 3])
    expect(out[KP.L_ELBOW * 3 + 1]).toBe(base[KP.L_ELBOW * 3 + 1])
    expect(out[KP.R_ELBOW * 3]).toBe(base[KP.R_ELBOW * 3])
    expect(out[KP.R_ELBOW * 3 + 1]).toBe(base[KP.R_ELBOW * 3 + 1])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// flatTo3D — 2D→3D projection
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — flatTo3D", () => {
  it("returns exactly 18 joints for a full 54-number flat array", () => {
    const out = flatTo3D(neutralPose())
    expect(out).toHaveLength(18)
    for (const j of out) expect(j).toHaveLength(3)
  })
  it("maps the image center (512,512) to sx=0, sy=0.06 (SOMA_CENTER_Y offset)", () => {
    // Build a flat where NOSE is at (512, 512) with confidence 1.
    const flat = new Array(54).fill(0)
    flat[0] = 512; flat[1] = 512; flat[2] = 1.0
    const [sx, sy] = flatTo3D(flat)[KP.NOSE]
    // sx = (512/1024 - 0.5) * 0.6 * 2 = 0
    // sy = (0.55 - 512/1024) * 0.6 * 2 = 0.06
    expect(sx).toBeCloseTo(0, 6)
    expect(sy).toBeCloseTo(0.06, 6)
  })
  it("places low-confidence joints (c < 0.1) at the origin [0,0,0]", () => {
    const flat = new Array(54).fill(0)
    flat[0] = 100; flat[1] = 100; flat[2] = 0.05 // NOSE low-confidence
    flat[3] = 200; flat[4] = 200; flat[5] = 1.0   // NECK full
    const out = flatTo3D(flat)
    expect(out[KP.NOSE]).toEqual([0, 0, 0])
    expect(out[KP.NECK][0]).not.toBe(0) // NECK projected normally
  })
  it("assigns per-joint Z depths from the DEFAULT_Z table (NOSE=0.10, R_HIP=-0.05)", () => {
    const out = flatTo3D(neutralPose())
    expect(out[KP.NOSE][2]).toBeCloseTo(0.10, 6)
    expect(out[KP.R_HIP][2]).toBeCloseTo(-0.05, 6)
    expect(out[KP.R_WRIST][2]).toBeCloseTo(0.00, 6)
    expect(out[KP.R_EYE][2]).toBeCloseTo(0.15, 6)
  })
  it("treats a truncated flat array (missing trailing joints) as zero-confidence → [0,0,0]", () => {
    // Only 6 numbers = 2 joints worth; joints 2..17 are undefined → ?? 0 → c=0 < 0.1.
    const out = flatTo3D([512, 300, 1.0, 512, 400, 1.0])
    expect(out).toHaveLength(18)
    expect(out[KP.NOSE][2]).toBeCloseTo(0.10, 6) // NOSE full confidence
    expect(out[KP.NECK][2]).toBeCloseTo(0.08, 6) // NECK full confidence
    expect(out[KP.R_SHOULDER]).toEqual([0, 0, 0]) // missing → 0
    expect(out[KP.L_EAR]).toEqual([0, 0, 0])
  })
  it("inverts image Y (0=top) into SOMA Y (up=positive): lower image Y → higher SOMA Y", () => {
    const flat = new Array(54).fill(0)
    flat[0] = 512; flat[2] = 1.0
    flat[3] = 512; flat[5] = 1.0
    flat[0 * 3 + 1] = 100  // NOSE high up in image
    flat[1 * 3 + 1] = 900  // NECK low in image
    const out = flatTo3D(flat)
    expect(out[KP.NOSE][1]).toBeGreaterThan(out[KP.NECK][1])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// blobToDataUrl — FileReader (happy-dom global)
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — blobToDataUrl", () => {
  it("round-trips a Blob's bytes through a data: URL (FileReader)", async () => {
    const payload = "hello-pose"
    const blob = new Blob([payload], { type: "text/plain" })
    const url = await blobToDataUrl(blob)
    expect(url.startsWith("data:")).toBe(true)
    expect(url).toContain("base64,")
    // Decode the base64 payload back to text.
    const b64 = url.slice(url.indexOf("base64,") + "base64,".length)
    const decoded = atob(b64)
    expect(decoded).toBe(payload)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// NETWORK — fetchPosePresets / renderCustomPose (apiFetch mocked)
// ════════════════════════════════════════════════════════════════════════════
describe("pose-transforms — fetchPosePresets", () => {
  it("GETs /poser/presets and returns the parsed PosePreset[]", async () => {
    const presets: PosePreset[] = [{
      id: "tpose", name: "T-Pose", category: "basic", description: "arms out",
      tags: ["basic"], render_url: "/render/tpose.png",
      keypoints: new Array(54).fill(0),
    }]
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes(JSON.stringify(presets)))
    const out = await fetchPosePresets()
    expect(out).toEqual(presets)
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe("/poser/presets")
  })
  it("throws with the status on a non-OK response", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes("nope", 503))
    await expect(fetchPosePresets()).rejects.toThrow(/503/)
  })
})

describe("pose-transforms — renderCustomPose", () => {
  it("POSTs keypoints + render defaults and resolves to a Blob on success", async () => {
    const blob = new Blob(["png-bytes"], { type: "image/png" })
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(blob, { status: 200 }))
    const kp = new Array(54).fill(0)
    const out = await renderCustomPose(kp)
    expect(out).toBeInstanceOf(Blob)
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/render")
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ "Content-Type": "application/json" })
    const body = JSON.parse(init?.body as string)
    expect(body.keypoints).toHaveLength(54)
    expect(body.width).toBe(1024) // default
    expect(body.height).toBe(1024) // default
    expect(body.line_width).toBe(5)
    expect(body.point_radius).toBe(6)
  })
  it("honours custom width/height when provided", async () => {
    const blob = new Blob(["x"], { type: "image/png" })
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(blob, { status: 200 }))
    await renderCustomPose(new Array(54).fill(0), { width: 768, height: 512 })
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string)
    expect(body.width).toBe(768)
    expect(body.height).toBe(512)
  })
  it("throws with status + response text on a non-OK response", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes("render boom", 500))
    await expect(renderCustomPose(new Array(54).fill(0)))
      .rejects.toThrow(/500.*render boom/)
  })
})
