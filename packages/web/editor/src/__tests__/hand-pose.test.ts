/**
 * Unit tests for lib/handPose.ts — finger-joint index tables + wrist-relative
 * offset capture/apply/encode/decode helpers for SOMA-77 hand pose presets.
 *
 * Pure data + pure functions; no React, no fetch. Coverage:
 *   - WRIST_INDEX (left=14, right=42).
 *   - FINGER_JOINTS: thumb=4 joints, other fingers=5 each, 24 total per hand,
 *     disjoint from the wrist, contiguous ranges, left + right offset by 28.
 *   - captureHandPose: every finger joint becomes a wrist-relative offset;
 *     works with Float32Array and number[].
 *   - applyHandPose: re-bases offsets onto the CURRENT wrist position;
 *     returns a new array; does NOT mutate the input; only touches finger
 *     joints.
 *   - encodeHandPose: 77*3 zero-padded array, offsets inline at finger idx.
 *   - decodeHandPose: skips zeros, recovers offset map.
 *   - encode/decode round-trip preserves offsets.
 *
 * Zero prior coverage. A regression in captureHandPose would store presets
 * with absolute positions (non-portable across wrist locations).
 */
import { describe, it, expect } from "vitest"
import {
  WRIST_INDEX, FINGER_JOINTS,
  captureHandPose, applyHandPose,
  encodeHandPose, decodeHandPose,
} from "@melite/formats"

// ── Constants ───────────────────────────────────────────────────────────────
describe("handPose — WRIST_INDEX + FINGER_JOINTS", () => {
  it("WRIST_INDEX maps left=14, right=42 (SOMA-77 skeleton)", () => {
    expect(WRIST_INDEX.left).toBe(14)
    expect(WRIST_INDEX.right).toBe(42)
  })
  it("FINGER_JOINTS has 24 joints per hand (4 thumb + 4 fingers × 5)", () => {
    expect(FINGER_JOINTS.left).toHaveLength(24)
    expect(FINGER_JOINTS.right).toHaveLength(24)
  })
  it("FINGER_JOINTS.left starts at 15 (thumb) and ends at 38 (pinky tip)", () => {
    expect(Math.min(...FINGER_JOINTS.left)).toBe(15)
    expect(Math.max(...FINGER_JOINTS.left)).toBe(38)
  })
  it("FINGER_JOINTS.right starts at 43 and ends at 66", () => {
    expect(Math.min(...FINGER_JOINTS.right)).toBe(43)
    expect(Math.max(...FINGER_JOINTS.right)).toBe(66)
  })
  it("FINGER_JOINTS are disjoint from the wrist index", () => {
    expect(FINGER_JOINTS.left).not.toContain(WRIST_INDEX.left)
    expect(FINGER_JOINTS.right).not.toContain(WRIST_INDEX.right)
  })
  it("left + right finger indices are offset by exactly 28 (joint-mirror symmetry)", () => {
    for (let i = 0; i < 24; i++) {
      expect(FINGER_JOINTS.right[i] - FINGER_JOINTS.left[i]).toBe(28)
    }
  })
  it("FINGER_JOINTS.thumb has 4 joints, the other 4 fingers have 5 each", () => {
    // left thumb = indices 15..18 (4), index 19..23 (5), middle 24..28 (5),
    // ring 29..33 (5), pinky 34..38 (5).
    const left = FINGER_JOINTS.left
    expect(left.slice(0, 4)).toEqual([15, 16, 17, 18])
    expect(left.slice(4, 9)).toEqual([19, 20, 21, 22, 23])
    expect(left.slice(9, 14)).toEqual([24, 25, 26, 27, 28])
    expect(left.slice(14, 19)).toEqual([29, 30, 31, 32, 33])
    expect(left.slice(19, 24)).toEqual([34, 35, 36, 37, 38])
  })
})

// ── captureHandPose ─────────────────────────────────────────────────────────
describe("handPose — captureHandPose", () => {
  it("returns a wrist-relative offset for every finger joint", () => {
    // Build a 77×3 joint array; place the left wrist at (10, 20, 30).
    const joints = new Array(77 * 3).fill(0)
    joints[14 * 3] = 10; joints[14 * 3 + 1] = 20; joints[14 * 3 + 2] = 30
    // Place the left thumb tip (joint 18) at (11, 21, 32) → offset (1, 1, 2).
    joints[18 * 3] = 11; joints[18 * 3 + 1] = 21; joints[18 * 3 + 2] = 32
    const offsets = captureHandPose("left", joints)
    // Every left finger joint is present.
    for (const idx of FINGER_JOINTS.left) {
      expect(offsets[idx]).toBeDefined()
      expect(offsets[idx]).toHaveLength(3)
    }
    // The thumb tip offset is (1, 1, 2).
    expect(offsets[18]).toEqual([1, 1, 2])
    // A finger joint left at the origin has offset (-10, -20, -30).
    expect(offsets[15]).toEqual([-10, -20, -30])
  })
  it("works identically with a Float32Array input", () => {
    const joints = new Float32Array(77 * 3)
    joints[42 * 3] = 5; joints[42 * 3 + 1] = 6; joints[42 * 3 + 2] = 7  // right wrist
    joints[43 * 3] = 6; joints[43 * 3 + 1] = 6; joints[43 * 3 + 2] = 7  // thumb base → offset (1, 0, 0)
    const offsets = captureHandPose("right", joints)
    expect(offsets[43]).toEqual([1, 0, 0])
  })
})

// ── applyHandPose ───────────────────────────────────────────────────────────
describe("handPose — applyHandPose", () => {
  it("places each finger joint at wrist + offset (left hand)", () => {
    // Start with a flat array; wrist at origin.
    const joints = new Float32Array(77 * 3)
    joints[14 * 3] = 0; joints[14 * 3 + 1] = 0; joints[14 * 3 + 2] = 0
    const offsets: Record<number, [number, number, number]> = {
      15: [1, 2, 3],
      18: [4, 5, 6],
    }
    const out = applyHandPose("left", joints, offsets)
    expect(out[15 * 3]).toBe(1)
    expect(out[15 * 3 + 1]).toBe(2)
    expect(out[15 * 3 + 2]).toBe(3)
    expect(out[18 * 3]).toBe(4)
    expect(out[18 * 3 + 1]).toBe(5)
    expect(out[18 * 3 + 2]).toBe(6)
  })
  it("re-bases offsets onto the CURRENT wrist position (not the original)", () => {
    // Same offsets, but wrist has moved to (100, 200, 300).
    const joints = new Float32Array(77 * 3)
    joints[14 * 3] = 100; joints[14 * 3 + 1] = 200; joints[14 * 3 + 2] = 300
    const offsets: Record<number, [number, number, number]> = { 15: [1, 0, 0] }
    const out = applyHandPose("left", joints, offsets)
    expect(out[15 * 3]).toBe(101)
    expect(out[15 * 3 + 1]).toBe(200)
    expect(out[15 * 3 + 2]).toBe(300)
  })
  it("does NOT mutate the input array", () => {
    const joints = new Float32Array(77 * 3)
    const before = Array.from(joints)
    applyHandPose("left", joints, { 15: [1, 2, 3] })
    expect(Array.from(joints)).toEqual(before)
  })
  it("only touches finger joints — non-finger indices are unchanged", () => {
    // Set a non-finger joint (e.g. head=6, spine=3) to a sentinel value.
    const joints = new Float32Array(77 * 3)
    joints[6 * 3] = 999
    joints[3 * 3 + 1] = 888
    const out = applyHandPose("left", joints, { 15: [1, 2, 3], 18: [4, 5, 6] })
    expect(out[6 * 3]).toBe(999)
    expect(out[3 * 3 + 1]).toBe(888)
  })
  it("skips offsets for joints not in the offsets map", () => {
    // Offsets only for joint 15; joint 16 should be UNCHANGED.
    const joints = new Float32Array(77 * 3)
    joints[16 * 3] = 42  // sentinel
    const out = applyHandPose("left", joints, { 15: [1, 2, 3] })
    expect(out[16 * 3]).toBe(42)
  })
})

// ── encodeHandPose / decodeHandPose ─────────────────────────────────────────
describe("handPose — encodeHandPose + decodeHandPose", () => {
  it("encodeHandPose returns a 77*3 length array (231 numbers)", () => {
    const arr = encodeHandPose("left", { 15: [1, 2, 3] })
    expect(arr).toHaveLength(77 * 3)
  })
  it("encodeHandPose writes offsets ONLY at finger-joint indices", () => {
    const arr = encodeHandPose("left", {
      15: [1, 2, 3],
      18: [4, 5, 6],
    })
    // joint 15 → indices 45..47
    expect(arr[15 * 3]).toBe(1)
    expect(arr[15 * 3 + 1]).toBe(2)
    expect(arr[15 * 3 + 2]).toBe(3)
    // joint 18 → indices 54..56
    expect(arr[18 * 3]).toBe(4)
    expect(arr[18 * 3 + 1]).toBe(5)
    expect(arr[18 * 3 + 2]).toBe(6)
  })
  it("encodeHandPose zeroes non-finger slots (and un-stored finger slots)", () => {
    const arr = encodeHandPose("left", { 15: [1, 2, 3] })
    // joint 14 (wrist) → indices 42..44 = 0
    expect(arr[14 * 3]).toBe(0)
    // joint 18 (a finger joint with no offset) → indices 54..56 = 0
    expect(arr[18 * 3]).toBe(0)
  })
  it("decodeHandPose skips zero entries and recovers non-zero offsets", () => {
    const arr = new Array(77 * 3).fill(0)
    arr[15 * 3] = 1; arr[15 * 3 + 1] = 2; arr[15 * 3 + 2] = 3
    arr[18 * 3] = 4; arr[18 * 3 + 1] = 5; arr[18 * 3 + 2] = 6
    const out = decodeHandPose(arr)
    expect(Object.keys(out).length).toBe(2)
    expect(out[15]).toEqual([1, 2, 3])
    expect(out[18]).toEqual([4, 5, 6])
  })
  it("encode → decode round-trip preserves the offsets", () => {
    const orig = {
      15: [1.5, 2.5, 3.5] as [number, number, number],
      19: [-1, 0, 1] as [number, number, number],
      38: [10, -10, 0.25] as [number, number, number],
    }
    const arr = encodeHandPose("left", orig)
    const decoded = decodeHandPose(arr)
    expect(decoded[15]).toEqual([1.5, 2.5, 3.5])
    expect(decoded[19]).toEqual([-1, 0, 1])
    expect(decoded[38]).toEqual([10, -10, 0.25])
  })
  it("decode of an all-zero array returns an empty map", () => {
    const arr = new Array(77 * 3).fill(0)
    expect(decodeHandPose(arr)).toEqual({})
  })
})

// ════════════════════════════════════════════════════════════════════════════
// captureHandPose — additional edges
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — captureHandPose additional edges", () => {
  it("captures the right hand via number[] input", () => {
    const joints = new Array(77 * 3).fill(0)
    joints[42 * 3] = 100; joints[42 * 3 + 1] = 0; joints[42 * 3 + 2] = 0
    joints[43 * 3] = 103; joints[43 * 3 + 1] = 2; joints[43 * 3 + 2] = -1
    const offsets = captureHandPose("right", joints)
    expect(offsets[43]).toEqual([3, 2, -1])
  })

  it("produces NEGATIVE offsets when a finger joint is below the wrist", () => {
    const joints = new Array(77 * 3).fill(0)
    joints[14 * 3] = 10; joints[14 * 3 + 1] = 20; joints[14 * 3 + 2] = 30
    joints[15 * 3] = 5; joints[15 * 3 + 1] = 15; joints[15 * 3 + 2] = 25
    const offsets = captureHandPose("left", joints)
    expect(offsets[15]).toEqual([-5, -5, -5])
  })

  it("offsets equal absolute positions when the wrist is at the origin", () => {
    const joints = new Array(77 * 3).fill(0)
    // Wrist at (0,0,0); joint 15 at (3,4,5) → offset = (3,4,5).
    joints[15 * 3] = 3; joints[15 * 3 + 1] = 4; joints[15 * 3 + 2] = 5
    const offsets = captureHandPose("left", joints)
    expect(offsets[15]).toEqual([3, 4, 5])
  })

  it("captures all 24 finger joints (left hand)", () => {
    const joints = new Array(77 * 3).fill(0)
    const offsets = captureHandPose("left", joints)
    expect(Object.keys(offsets)).toHaveLength(24)
    for (const idx of FINGER_JOINTS.left) {
      expect(offsets[idx]).toBeDefined()
    }
  })

  it("captures all 24 finger joints (right hand)", () => {
    const joints = new Array(77 * 3).fill(0)
    const offsets = captureHandPose("right", joints)
    expect(Object.keys(offsets)).toHaveLength(24)
    for (const idx of FINGER_JOINTS.right) {
      expect(offsets[idx]).toBeDefined()
    }
  })

  it("does NOT include the wrist joint in the offset map", () => {
    const joints = new Array(77 * 3).fill(0)
    const leftOffsets = captureHandPose("left", joints)
    const rightOffsets = captureHandPose("right", joints)
    expect(leftOffsets[14]).toBeUndefined()
    expect(rightOffsets[42]).toBeUndefined()
  })

  it("handles fractional joint positions", () => {
    const joints = new Float32Array(77 * 3)
    joints[14 * 3] = 0.5; joints[14 * 3 + 1] = 1.5; joints[14 * 3 + 2] = 2.5
    joints[15 * 3] = 1.25; joints[15 * 3 + 1] = 2.75; joints[15 * 3 + 2] = 3.125
    const offsets = captureHandPose("left", joints)
    expect(offsets[15][0]).toBeCloseTo(0.75, 5)
    expect(offsets[15][1]).toBeCloseTo(1.25, 5)
    expect(offsets[15][2]).toBeCloseTo(0.625, 5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// applyHandPose — additional edges
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — applyHandPose additional edges", () => {
  it("applies offsets to the right hand", () => {
    const joints = new Float32Array(77 * 3)
    joints[42 * 3] = 50; joints[42 * 3 + 1] = 60; joints[42 * 3 + 2] = 70
    const out = applyHandPose("right", joints, { 43: [1, 1, 1] })
    expect(out[43 * 3]).toBe(51)
    expect(out[43 * 3 + 1]).toBe(61)
    expect(out[43 * 3 + 2]).toBe(71)
  })

  it("returns a Float32Array (even for number[] input)", () => {
    const joints = new Array(77 * 3).fill(0)
    const out = applyHandPose("left", joints, { 15: [1, 2, 3] })
    expect(out).toBeInstanceOf(Float32Array)
  })

  it("returns a Float32Array for Float32Array input", () => {
    const joints = new Float32Array(77 * 3)
    const out = applyHandPose("left", joints, {})
    expect(out).toBeInstanceOf(Float32Array)
  })

  it("empty offsets map returns a faithful copy (no finger joints touched)", () => {
    const joints = new Float32Array(77 * 3)
    joints[15 * 3] = 42
    joints[20 * 3] = 99
    const out = applyHandPose("left", joints, {})
    expect(out[15 * 3]).toBe(42)
    expect(out[20 * 3]).toBe(99)
  })

  it("offsets with negative values move joints backward from the wrist", () => {
    const joints = new Float32Array(77 * 3)
    joints[14 * 3] = 100; joints[14 * 3 + 1] = 100; joints[14 * 3 + 2] = 100
    const out = applyHandPose("left", joints, { 15: [-10, -20, -30] })
    expect(out[15 * 3]).toBe(90)
    expect(out[15 * 3 + 1]).toBe(80)
    expect(out[15 * 3 + 2]).toBe(70)
  })

  it("ignores offsets for indices NOT in FINGER_JOINTS (e.g. joint 0)", () => {
    const joints = new Float32Array(77 * 3)
    // Offset for joint 0 (head/root, NOT a finger joint).
    const out = applyHandPose("left", joints, { 0: [99, 99, 99] as [number, number, number] })
    // Joint 0 should NOT be modified (it's not in FINGER_JOINTS.left).
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(0)
    expect(out[2]).toBe(0)
  })

  it("ignores offsets for the OPPOSITE hand's joints (left apply ignores right joints)", () => {
    const joints = new Float32Array(77 * 3)
    // Offset for joint 43 (right thumb base) during a LEFT hand apply.
    const out = applyHandPose("left", joints, { 43: [99, 99, 99] as [number, number, number] })
    expect(out[43 * 3]).toBe(0)
  })

  it("applies all 24 finger joints when all offsets are provided", () => {
    const joints = new Float32Array(77 * 3)
    const offsets: Record<number, [number, number, number]> = {}
    for (const idx of FINGER_JOINTS.left) {
      offsets[idx] = [idx, idx * 2, idx * 3]
    }
    const out = applyHandPose("left", joints, offsets)
    for (const idx of FINGER_JOINTS.left) {
      expect(out[idx * 3]).toBe(idx)
      expect(out[idx * 3 + 1]).toBe(idx * 2)
      expect(out[idx * 3 + 2]).toBe(idx * 3)
    }
  })

  it("does NOT modify the wrist position", () => {
    const joints = new Float32Array(77 * 3)
    joints[14 * 3] = 7; joints[14 * 3 + 1] = 8; joints[14 * 3 + 2] = 9
    const out = applyHandPose("left", joints, { 15: [1, 2, 3] })
    expect(out[14 * 3]).toBe(7)
    expect(out[14 * 3 + 1]).toBe(8)
    expect(out[14 * 3 + 2]).toBe(9)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// encodeHandPose — additional edges
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — encodeHandPose additional edges", () => {
  it("encodes the right hand at the correct indices", () => {
    const arr = encodeHandPose("right", { 43: [7, 8, 9] })
    expect(arr[43 * 3]).toBe(7)
    expect(arr[43 * 3 + 1]).toBe(8)
    expect(arr[43 * 3 + 2]).toBe(9)
    // Left-hand finger indices (15-38) should be zero.
    expect(arr[15 * 3]).toBe(0)
  })

  it("ignores offsets for indices NOT in the hand's finger joints", () => {
    // Offset for joint 0 (not a finger joint) during a LEFT encode.
    const arr = encodeHandPose("left", { 0: [99, 99, 99] as [number, number, number] })
    expect(arr[0]).toBe(0) // not written
  })

  it("ignores offsets for the opposite hand's joints (left encode skips right indices)", () => {
    const arr = encodeHandPose("left", { 43: [99, 99, 99] as [number, number, number] })
    expect(arr[43 * 3]).toBe(0)
  })

  it("empty offsets → all zeros", () => {
    const arr = encodeHandPose("left", {})
    expect(arr.every((v) => v === 0)).toBe(true)
  })

  it("encodes all 24 finger joints when all offsets are provided", () => {
    const offsets: Record<number, [number, number, number]> = {}
    for (const idx of FINGER_JOINTS.right) {
      offsets[idx] = [1, 2, 3]
    }
    const arr = encodeHandPose("right", offsets)
    for (const idx of FINGER_JOINTS.right) {
      expect(arr[idx * 3]).toBe(1)
      expect(arr[idx * 3 + 1]).toBe(2)
      expect(arr[idx * 3 + 2]).toBe(3)
    }
  })

  it("returns a regular number[] (not Float32Array)", () => {
    const arr = encodeHandPose("left", { 15: [1, 2, 3] })
    expect(Array.isArray(arr)).toBe(true)
    expect(arr).not.toBeInstanceOf(Float32Array)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// decodeHandPose — additional edges
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — decodeHandPose additional edges", () => {
  it("decodes values at non-finger indices (scans ALL 77 joints)", () => {
    // The decode loop scans idx 0..76. A non-zero at joint 0 (head/root) is included.
    const arr = new Array(77 * 3).fill(0)
    arr[0] = 1; arr[1] = 2; arr[2] = 3
    const out = decodeHandPose(arr)
    expect(out[0]).toEqual([1, 2, 3])
  })

  it("decodes negative values", () => {
    const arr = new Array(77 * 3).fill(0)
    arr[15 * 3] = -1.5; arr[15 * 3 + 1] = -2.5; arr[15 * 3 + 2] = -3.5
    const out = decodeHandPose(arr)
    expect(out[15]).toEqual([-1.5, -2.5, -3.5])
  })

  it("skips entries where ONLY x and y are zero but z is non-zero", () => {
    const arr = new Array(77 * 3).fill(0)
    arr[15 * 3 + 2] = 5 // x=0, y=0, z=5 → NOT all-zero → included
    const out = decodeHandPose(arr)
    expect(out[15]).toEqual([0, 0, 5])
  })

  it("skips entries where ONLY x is non-zero", () => {
    const arr = new Array(77 * 3).fill(0)
    arr[15 * 3] = 9 // x=9, y=0, z=0 → NOT all-zero → included
    const out = decodeHandPose(arr)
    expect(out[15]).toEqual([9, 0, 0])
  })

  it("handles a mix of finger and non-finger non-zero entries", () => {
    const arr = new Array(77 * 3).fill(0)
    arr[0] = 1 // non-finger
    arr[15 * 3] = 2 // left finger
    arr[43 * 3] = 3 // right finger
    const out = decodeHandPose(arr)
    expect(Object.keys(out).length).toBe(3)
    expect(out[0]).toEqual([1, 0, 0])
    expect(out[15]).toEqual([2, 0, 0])
    expect(out[43]).toEqual([3, 0, 0])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Full round-trip: capture → encode → decode → apply
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — full round-trip", () => {
  it("right hand: capture → encode → decode preserves offsets", () => {
    const joints = new Float32Array(77 * 3)
    joints[42 * 3] = 10; joints[42 * 3 + 1] = 20; joints[42 * 3 + 2] = 30
    joints[43 * 3] = 13; joints[43 * 3 + 1] = 22; joints[43 * 3 + 2] = 35
    joints[66 * 3] = 15; joints[66 * 3 + 1] = 25; joints[66 * 3 + 2] = 40
    const captured = captureHandPose("right", joints)
    const encoded = encodeHandPose("right", captured)
    const decoded = decodeHandPose(encoded)
    expect(decoded[43]).toEqual(captured[43])
    expect(decoded[66]).toEqual(captured[66])
  })

  it("capture → apply reproduces the original finger positions (same wrist)", () => {
    // Build a pose with a known wrist position and finger offsets.
    const original = new Float32Array(77 * 3)
    original[14 * 3] = 10; original[14 * 3 + 1] = 20; original[14 * 3 + 2] = 30
    original[15 * 3] = 12; original[15 * 3 + 1] = 23; original[15 * 3 + 2] = 35
    original[38 * 3] = 15; original[38 * 3 + 1] = 28; original[38 * 3 + 2] = 40
    // Capture offsets.
    const offsets = captureHandPose("left", original)
    // Apply to a flat array with the SAME wrist position.
    const target = new Float32Array(77 * 3)
    target[14 * 3] = 10; target[14 * 3 + 1] = 20; target[14 * 3 + 2] = 30
    const result = applyHandPose("left", target, offsets)
    // Finger joints should match the original.
    expect(result[15 * 3]).toBeCloseTo(12, 5)
    expect(result[15 * 3 + 1]).toBeCloseTo(23, 5)
    expect(result[15 * 3 + 2]).toBeCloseTo(35, 5)
    expect(result[38 * 3]).toBeCloseTo(15, 5)
    expect(result[38 * 3 + 1]).toBeCloseTo(28, 5)
    expect(result[38 * 3 + 2]).toBeCloseTo(40, 5)
  })

  it("capture → apply with a DIFFERENT wrist re-bases correctly", () => {
    const original = new Float32Array(77 * 3)
    original[14 * 3] = 0; original[14 * 3 + 1] = 0; original[14 * 3 + 2] = 0
    original[15 * 3] = 3; original[15 * 3 + 1] = 4; original[15 * 3 + 2] = 5
    const offsets = captureHandPose("left", original)
    // Apply at a new wrist position.
    const target = new Float32Array(77 * 3)
    target[14 * 3] = 100; target[14 * 3 + 1] = 200; target[14 * 3 + 2] = 300
    const result = applyHandPose("left", target, offsets)
    // offset (3,4,5) + wrist (100,200,300) = (103, 204, 305).
    expect(result[15 * 3]).toBe(103)
    expect(result[15 * 3 + 1]).toBe(204)
    expect(result[15 * 3 + 2]).toBe(305)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Structural invariants
// ════════════════════════════════════════════════════════════════════════════
describe("handPose — structural invariants", () => {
  it("left and right FINGER_JOINTS are disjoint", () => {
    const leftSet = new Set(FINGER_JOINTS.left)
    for (const r of FINGER_JOINTS.right) {
      expect(leftSet.has(r)).toBe(false)
    }
  })

  it("all FINGER_JOINTS values are in the SOMA-77 range [0..76]", () => {
    for (const idx of [...FINGER_JOINTS.left, ...FINGER_JOINTS.right]) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(76)
    }
  })

  it("FINGER_JOINTS values are sorted ascending within each hand", () => {
    const isSorted = (arr: number[]) => arr.every((v, i) => i === 0 || arr[i - 1] < v)
    expect(isSorted(FINGER_JOINTS.left)).toBe(true)
    expect(isSorted(FINGER_JOINTS.right)).toBe(true)
  })

  it("WRIST_INDEX.left < min(FINGER_JOINTS.left) and WRIST_INDEX.right < min(FINGER_JOINTS.right)", () => {
    expect(WRIST_INDEX.left).toBeLessThan(Math.min(...FINGER_JOINTS.left))
    expect(WRIST_INDEX.right).toBeLessThan(Math.min(...FINGER_JOINTS.right))
  })
})
