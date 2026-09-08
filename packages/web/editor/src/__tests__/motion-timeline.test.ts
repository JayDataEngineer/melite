/**
 * Unit tests for the motion card's viser-timeline synthesizer
 * (surfaces/motion/viser-timeline/motionTimelineState.ts).
 *
 * The motion card mounts viser's ACTUAL Timeline.tsx (vendored verbatim from
 * site-packages/viser/client/src) and feeds it a synthesized TimelineMessage.
 * These tests pin the 1:1 fidelity with the Kimodo demo:
 *
 *   1. The 6 keyframe tracks match demo/ui.py `build_timeline_tracks()`
 *      EXACTLY — names, colors, track_type, height_scale, order. These
 *      colors ARE the demo's bar; changing them breaks the 1:1.
 *   2. The frame range fits the motion edge-to-edge
 *      (default_num_frames_zoom = max_frames_zoom = T) so the bar IS the
 *      motion, with no empty scroll space beyond T frames.
 *   3. current_frame is clamped to [0, T-1] (the bar never seeks off-motion).
 *   4. constraints_enabled is true — the bar is the demo's live editing
 *      surface (click to add keyframes, drag prompts), not a frozen view.
 */
import { describe, it, expect } from "vitest"
import {
  buildMotionTimelineState,
  MOTION_TIMELINE_TRACKS,
  makeTimelineId,
} from "@melite-plugin/timeline/ui/timeline"

// The demo's build_timeline_tracks() colors, copied from
// vendor/kimodo/kimodo/demo/ui.py:99-167. This is the 1:1 contract.
const DEMO_TRACKS = [
  { name: "Full-Body",  color: [219, 148, 86],  height_scale: 0.5 },
  { name: "2D Root",    color: [150, 100, 200], height_scale: 0.5 },
  { name: "Left Hand",  color: [100, 200, 150], height_scale: 0.5 },
  { name: "Right Hand", color: [200, 100, 150], height_scale: 0.5 },
  { name: "Left Foot",  color: [219, 148, 86],  height_scale: 0.5 },
  { name: "Right Foot", color: [150, 100, 200], height_scale: 0.5 },
] as const

describe("motionTimelineState — 1:1 with the Kimodo demo", () => {
  it("MOTION_TIMELINE_TRACKS matches build_timeline_tracks() exactly (6 lanes, demo colors)", () => {
    expect(MOTION_TIMELINE_TRACKS).toHaveLength(6)
    MOTION_TIMELINE_TRACKS.forEach((t, i) => {
      const demo = DEMO_TRACKS[i]!
      expect(t.name).toBe(demo.name)
      expect(t.color).toEqual(demo.color)
      expect(t.height_scale).toBe(demo.height_scale)
      expect(t.track_type).toBe("keyframe")
      expect(typeof t.uuid).toBe("string")
      expect(t.uuid.length).toBeGreaterThan(0)
    })
  })

  it("track UUIDs are unique (keyframes bind to lanes by uuid)", () => {
    const ids = MOTION_TIMELINE_TRACKS.map((t) => t.uuid)
    expect(new Set(ids).size).toBe(6)
  })

  it("buildMotionTimelineState caps the initial zoom window at 96 (functional scrollbar)", () => {
    const s = buildMotionTimelineState({
      fps: 30, frameCount: 150, currentFrame: 42,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(s.enabled).toBe(true)
    expect(s.fps).toBe(30)
    expect(s.start_frame).toBe(0)
    expect(s.end_frame).toBe(149)
    expect(s.current_frame).toBe(42)
    // Capped at 96 so the horizontal scrollbar is functional (at zoom=1 all
    // 150 frames would fit → nothing to scroll → dragging the thumb is a
    // no-op). max_frames_zoom stays T so the user can zoom to 1-frame detail.
    expect(s.default_num_frames_zoom).toBe(96)
    expect(s.max_frames_zoom).toBe(150)
  })

  it("buildMotionTimelineState fits short motions entirely (no scroll needed)", () => {
    const short = buildMotionTimelineState({
      fps: 30, frameCount: 30, currentFrame: 0,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(short.default_num_frames_zoom).toBe(30)
    expect(short.max_frames_zoom).toBe(30)
  })

  it("constraints_enabled is true — the bar is the demo's live editing surface", () => {
    const s = buildMotionTimelineState({
      fps: 30, frameCount: 10, currentFrame: 0,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(s.constraints_enabled).toBe(true)
    expect(s.mode).toBe("keyframe")
  })

  it("current_frame is clamped to [0, T-1]", () => {
    const overshoot = buildMotionTimelineState({
      fps: 30, frameCount: 10, currentFrame: 9999,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(overshoot.current_frame).toBe(9)
    const negative = buildMotionTimelineState({
      fps: 30, frameCount: 10, currentFrame: -5,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(negative.current_frame).toBe(0)
  })

  it("T=1 (rest pose) yields a degenerate-but-valid single-frame bar", () => {
    const s = buildMotionTimelineState({
      fps: 30, frameCount: 1, currentFrame: 0,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(s.start_frame).toBe(0)
    expect(s.end_frame).toBe(0)
    expect(s.current_frame).toBe(0)
    expect(s.default_num_frames_zoom).toBe(1)
    expect(s.max_frames_zoom).toBe(1)
  })

  it("frameCount=0 is clamped to 1 (never a zero-frame bar)", () => {
    const s = buildMotionTimelineState({
      fps: 30, frameCount: 0, currentFrame: 0,
      prompts: [], keyframes: [], intervals: [],
    })
    expect(s.end_frame).toBe(0)
    expect(s.default_num_frames_zoom).toBe(1)
  })

  it("passes through prompts/keyframes/intervals untouched (the bar renders what it's given)", () => {
    const keyframes: Parameters<typeof buildMotionTimelineState>[0]["keyframes"] = [{ uuid: "kf1", track_id: "fullbody", frame: 5, value: null, opacity: 1, locked: false }]
    const prompts: Parameters<typeof buildMotionTimelineState>[0]["prompts"] = [{ uuid: "p1", text: "walks forward", start_frame: 0, end_frame: 29, color: null }]
    const s = buildMotionTimelineState({
      fps: 30, frameCount: 30, currentFrame: 0,
      prompts, keyframes, intervals: [],
    })
    expect(s.keyframes).toBe(keyframes)
    expect(s.prompts).toBe(prompts)
    expect(s.tracks).toBe(MOTION_TIMELINE_TRACKS)
  })

  it("makeTimelineId returns unique strings", () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeTimelineId()))
    expect(ids.size).toBe(50)
  })
})
