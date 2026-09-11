// motionTimelineState.spec.ts — the viser TimelineMessage builder: frame
// clamping, the 96-frame initial window, stable lane identity, id minting.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import {
  MOTION_TIMELINE_TRACKS,
  buildMotionTimelineState,
  makeTimelineId,
} from "../timeline/viser-timeline/motionTimelineState.ts";
import type { MotionTimelineInput } from "../timeline/viser-timeline/motionTimelineState.ts";

function input(over: Partial<MotionTimelineInput> = {}): MotionTimelineInput {
  return {
    fps: 16,
    frameCount: 200,
    currentFrame: 10,
    prompts: [],
    keyframes: [],
    intervals: [],
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MOTION_TIMELINE_TRACKS", () => {
  it("is the six Kimodo lanes with stable uuids", () => {
    assert.equal(MOTION_TIMELINE_TRACKS.length, 6);
    assert.deepEqual(
      MOTION_TIMELINE_TRACKS.map((t) => t.uuid),
      ["fullbody", "root2d", "left-hand", "right-hand", "left-foot", "right-foot"],
    );
    for (const t of MOTION_TIMELINE_TRACKS) {
      assert.equal(t.track_type, "keyframe");
      assert.equal(t.height_scale, 0.5);
      assert.equal(t.color?.length, 3);
    }
  });
});

describe("buildMotionTimelineState", () => {
  it("maps the envelope 1:1 (T frames → end_frame T-1)", () => {
    const s = buildMotionTimelineState(input());
    assert.equal(s.type, "TimelineMessage");
    assert.equal(s.enabled, true);
    assert.equal(s.fps, 16);
    assert.equal(s.start_frame, 0);
    assert.equal(s.end_frame, 199);
    assert.equal(s.current_frame, 10);
    assert.equal(s.mode, "keyframe");
    assert.equal(s.constraints_enabled, true);
    assert.equal(s.tracks, MOTION_TIMELINE_TRACKS);
  });
  it("caps the initial window at 96 frames but keeps full zoom-out", () => {
    const long = buildMotionTimelineState(input({ frameCount: 200 }));
    assert.equal(long.default_num_frames_zoom, 96);
    assert.equal(long.max_frames_zoom, 200);
    const short = buildMotionTimelineState(input({ frameCount: 50 }));
    assert.equal(short.default_num_frames_zoom, 50);
    assert.equal(short.max_frames_zoom, 50);
  });
  it("clamps degenerate frame counts to a single frame", () => {
    for (const frameCount of [0, -12, 0.4]) {
      const s = buildMotionTimelineState(input({ frameCount }));
      assert.equal(s.end_frame, 0);
      assert.equal(s.max_frames_zoom, 1);
    }
  });
  it("clamps + rounds the playhead into range", () => {
    assert.equal(buildMotionTimelineState(input({ currentFrame: -5 })).current_frame, 0);
    assert.equal(buildMotionTimelineState(input({ currentFrame: 9999 })).current_frame, 199);
    assert.equal(buildMotionTimelineState(input({ currentFrame: 5.6 })).current_frame, 6);
  });
  it("passes prompts/keyframes/intervals through untouched", () => {
    const prompts = [{ uuid: "p", text: "hi", start_frame: 0, end_frame: 9, color: null }];
    const keyframes = [{ uuid: "k", track_id: "fullbody", frame: 3, value: null }];
    const intervals = [
      { uuid: "i", track_id: "fullbody", start_frame: 0, end_frame: 4, value: null, opacity: 1, locked: false },
    ];
    const s = buildMotionTimelineState(input({ prompts, keyframes, intervals }));
    assert.equal(s.prompts, prompts);
    assert.equal(s.keyframes, keyframes);
    assert.equal(s.intervals, intervals);
  });
  it("serves the fixed viser chrome (defaults the demo expects)", () => {
    const s = buildMotionTimelineState(input());
    assert.equal(s.default_text, "");
    assert.equal(s.default_duration, 30);
    assert.equal(s.min_prompt_duration, 1);
    assert.equal(s.max_prompt_duration, null);
  });
});

describe("makeTimelineId", () => {
  it("mints unique ids via crypto.randomUUID when available", () => {
    const a = makeTimelineId();
    const b = makeTimelineId();
    assert.equal(typeof a, "string");
    assert.ok(a.length > 0);
    assert.notEqual(a, b);
  });
  it("falls back to tl- ids without crypto", () => {
    vi.stubGlobal("crypto", undefined);
    const id = makeTimelineId();
    assert.ok(id.startsWith("tl-"));
  });
  it("falls back to tl- ids when randomUUID is missing", () => {
    vi.stubGlobal("crypto", {});
    const id = makeTimelineId();
    assert.ok(id.startsWith("tl-"));
  });
});
