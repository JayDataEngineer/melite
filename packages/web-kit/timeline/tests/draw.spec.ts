// draw.spec.ts — the viser canvas painters against a recording fake
// context: every geometric arm (cull in/out, circle vs pill, roundRect vs
// manual arcs, fill/border toggles, label loops, overlay rows).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  drawEndFrameLine,
  drawFrameLabels,
  drawHighlightFrameBox,
  drawInterval,
  drawKeyframe,
  drawLabelOverlay,
} from "../src/timeline/viser-timeline/draw.ts";
import { DARK_THEME } from "../src/timeline/viser-timeline/styles.ts";
import type { TimelineTheme } from "../src/timeline/viser-timeline/styles.ts";
import type {
  TimelineCoordinates,
  TimelineKeyframe,
  TimelineTrack,
} from "../src/timeline/viser-timeline/types.ts";

type Call = { name: string; args: unknown[] };

function makeCtx(withRoundRect: boolean): { ctx: any; calls: Call[] } {
  const calls: Call[] = [];
  const rec = (name: string) => (...args: unknown[]) => {
    calls.push({ name, args });
  };
  const gradient = { addColorStop: rec("addColorStop") };
  const ctx: Record<string, unknown> = {
    save: rec("save"),
    restore: rec("restore"),
    beginPath: rec("beginPath"),
    rect: rec("rect"),
    fill: rec("fill"),
    stroke: rec("stroke"),
    arc: rec("arc"),
    moveTo: rec("moveTo"),
    lineTo: rec("lineTo"),
    arcTo: rec("arcTo"),
    fillText: rec("fillText"),
    fillRect: rec("fillRect"),
    createLinearGradient: (...args: unknown[]) => {
      calls.push({ name: "createLinearGradient", args });
      return gradient;
    },
  };
  if (withRoundRect) ctx.roundRect = rec("roundRect");
  return { ctx, calls };
}

function names(calls: Call[]): string[] {
  return calls.map((c) => c.name);
}

const THEME: TimelineTheme = DARK_THEME;
const COLOR: [number, number, number] = [219, 148, 86];

function coords(over: Partial<TimelineCoordinates> = {}): TimelineCoordinates {
  return {
    pixelRange: 10,
    timelineStartX: 80,
    viewStartFrame: 0,
    viewEndFrame: 100,
    visibleFrames: 100,
    minFramePixels: 1,
    frameDelta: 10,
    framesBeforeTimeline: 0,
    firstVisibleFrame: 0,
    endFrame: 100,
    ...over,
  };
}

describe("drawHighlightFrameBox", () => {
  it("uses roundRect when available, rect otherwise", () => {
    const a = makeCtx(true);
    drawHighlightFrameBox(a.ctx, 50, 5.7, 2, 40, 20, 4);
    assert.ok(names(a.calls).includes("roundRect"));
    assert.ok(!names(a.calls).includes("rect"));
    // Math.round on the frame label.
    const text = a.calls.find((c) => c.name === "fillText");
    assert.deepEqual(text?.args.slice(0, 2), ["6", 50]);

    const b = makeCtx(false);
    drawHighlightFrameBox(b.ctx, 50, 5, 2, 40, 20, 4);
    assert.ok(names(b.calls).includes("rect"));
    assert.ok(!names(b.calls).includes("roundRect"));
  });
  it("saves + restores exactly once", () => {
    const { ctx, calls } = makeCtx(true);
    drawHighlightFrameBox(ctx, 10, 1, 0, 30, 16, 3);
    assert.equal(names(calls).filter((n) => n === "save").length, 1);
    assert.equal(names(calls).filter((n) => n === "restore").length, 1);
  });
});

describe("drawInterval", () => {
  /** Minimal full-shape interval fixture (the param is TimelineInterval
   *  now — the viser any-sweep, V5 2026-11-12). */
  const interval = (start: number, end: number, opacity = 1) => ({
    uuid: `spec-${start}-${end}`, track_id: "spec-track",
    start_frame: start, end_frame: end,
    value: null, opacity, locked: false,
  });
  it("draws a single-frame keyframe as a circle", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(ctx, interval(5, 5), coords(), 28, 30, COLOR, THEME, 500);
    assert.ok(names(calls).includes("arc"));
    assert.ok(names(calls).includes("fill"));
    assert.ok(names(calls).includes("stroke"));
  });
  it("draws a single-frame pill when an edge is square", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(
      ctx, interval(5, 5), coords(), 28, 30, COLOR, THEME,
      500, false, true,
    );
    // Equal radii (0/0… wait left=6? no: roundLeft=false → 0, roundRight → 6:
    // unequal → manual path) — assert manual arcs ran, no roundRect.
    assert.ok(names(calls).includes("arcTo"));
    assert.ok(!names(calls).includes("roundRect"));
  });
  it("draws a single-frame pill via roundRect when radii match", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(
      ctx, interval(5, 5), coords(), 28, 30, COLOR, THEME,
      500, false, false,
    );
    assert.ok(names(calls).includes("roundRect"));
  });
  it("draws a multi-frame bar via roundRect when radii match", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(ctx, interval(2, 8), coords(), 28, 30, COLOR, THEME, 500);
    assert.ok(names(calls).includes("roundRect"));
  });
  it("draws a multi-frame bar with manual arcs without roundRect", () => {
    for (const [rl, rr] of [[true, true], [false, false], [true, false], [false, true]] as const) {
      const { ctx, calls } = makeCtx(false);
      drawInterval(
        ctx, interval(2, 8), coords(), 28, 30, COLOR, THEME,
        500, rl, rr,
      );
      assert.ok(names(calls).includes("arcTo") || names(calls).includes("lineTo"));
      assert.ok(names(calls).includes("fill"));
    }
  });
  it("draws the manual path with roundRect present but unequal radii", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(
      ctx, interval(2, 8), coords(), 28, 30, COLOR, THEME,
      500, true, false,
    );
    assert.ok(!names(calls).includes("roundRect"));
    assert.ok(names(calls).includes("arcTo"));
    assert.ok(names(calls).includes("lineTo"));
  });
  it("culls off-screen intervals only when width is known", () => {
    const far = interval(1000, 1010);
    const left = interval(-1000, -990);
    const near = interval(2, 8);
    // Width known: both sides culled (fill never runs).
    for (const iv of [far, left]) {
      const f = makeCtx(true);
      drawInterval(f.ctx, iv, coords(), 28, 30, COLOR, THEME, 500);
      assert.ok(!names(f.calls).includes("fill"), JSON.stringify(iv));
    }
    // Width known but visible: drawn.
    const v = makeCtx(true);
    drawInterval(v.ctx, near, coords(), 28, 30, COLOR, THEME, 500);
    assert.ok(names(v.calls).includes("fill"));
    // Width unknown: cull check skipped, far interval still drawn.
    const u = makeCtx(true);
    drawInterval(u.ctx, far, coords(), 28, 30, COLOR, THEME);
    assert.ok(names(u.calls).includes("fill"));
  });
  it("honors explicit opacity + fill/border toggles", () => {
    const { ctx, calls } = makeCtx(true);
    drawInterval(
      ctx, interval(2, 8, 0.5), coords(), 28, 30,
      COLOR, THEME, 500, true, true, false, false,
    );
    assert.ok(!names(calls).includes("fill"));
    assert.ok(!names(calls).includes("stroke"));
    assert.equal(ctx.fillStyle, "rgba(219, 148, 86, 0.5)");
  });
  it("defaults opacity to 1", () => {
    const { ctx } = makeCtx(true);
    drawInterval(ctx, interval(2, 8), coords(), 28, 30, COLOR, THEME, 500);
    assert.equal(ctx.fillStyle, "rgba(219, 148, 86, 1)");
  });
});

describe("drawKeyframe", () => {
  it("draws an in-view keyframe", () => {
    const { ctx, calls } = makeCtx(true);
    const kf: TimelineKeyframe = { uuid: "k", track_id: "t", frame: 5, value: null };
    drawKeyframe(ctx, kf, coords(), 28, 30, COLOR, THEME, 500);
    assert.ok(names(calls).includes("arc"));
    assert.ok(names(calls).includes("fill"));
    assert.equal(ctx.fillStyle, "rgba(219, 148, 86, 1)");
  });
  it("honors explicit opacity", () => {
    const { ctx } = makeCtx(true);
    drawKeyframe(
      ctx, { uuid: "k", track_id: "t", frame: 5, value: null, opacity: 0.25 },
      coords(), 28, 30, COLOR, THEME, 500,
    );
    assert.equal(ctx.fillStyle, "rgba(219, 148, 86, 0.25)");
  });
  it("culls keyframes past either edge", () => {
    for (const frame of [-500, 500]) {
      const { ctx, calls } = makeCtx(true);
      drawKeyframe(
        ctx, { uuid: "k", track_id: "t", frame, value: null },
        coords(), 28, 30, COLOR, THEME, 500,
      );
      assert.ok(!names(calls).includes("arc"), `frame ${frame}`);
    }
  });
});

describe("drawFrameLabels", () => {
  it("labels every visible tick without tick lines", () => {
    const { ctx, calls } = makeCtx(true);
    drawFrameLabels(ctx, coords(), 500, 200, false, THEME);
    const texts = calls.filter((c) => c.name === "fillText");
    // Frames 0..40 land inside [-50, 550]; 50..100 fall right of it.
    assert.equal(texts.length, 5);
    assert.ok(!names(calls).includes("moveTo"));
  });
  it("draws tick lines through the track area", () => {
    const { ctx, calls } = makeCtx(true);
    drawFrameLabels(ctx, coords(), 500, 200, true, THEME);
    assert.ok(names(calls).includes("moveTo"));
    assert.ok(names(calls).includes("stroke"));
  });
  it("skips labels outside the gutter margin", () => {
    // firstVisibleFrame far negative + wide range: early frames land
    // left of -50 and late frames right of width+50.
    const { ctx, calls } = makeCtx(true);
    drawFrameLabels(
      ctx, coords({ firstVisibleFrame: -200, viewEndFrame: 200, frameDelta: 10 }),
      500, 200, false, THEME,
    );
    const xs = calls.filter((c) => c.name === "fillText").map((c) => c.args[1] as number);
    assert.ok(xs.length > 0);
    assert.ok(xs.every((x) => x >= -50 && x <= 550));
  });
  it("draws nothing when the range is empty", () => {
    const { ctx, calls } = makeCtx(true);
    drawFrameLabels(
      ctx, coords({ firstVisibleFrame: 50, viewEndFrame: 40, frameDelta: 10 }),
      500, 200, true, THEME,
    );
    assert.ok(!names(calls).includes("fillText"));
  });
  it("defaults drawTicks to false", () => {
    const { ctx, calls } = makeCtx(true);
    drawFrameLabels(ctx, coords(), 500, 200, undefined, THEME);
    assert.ok(!names(calls).includes("moveTo"));
  });
});

describe("drawEndFrameLine", () => {
  it("stays hidden at or below zoom 1", () => {
    for (const zoom of [1, 0.5, 1.000001]) {
      const { ctx, calls } = makeCtx(true);
      drawEndFrameLine(ctx, coords(), zoom, 500, 200, THEME);
      assert.ok(!names(calls).includes("moveTo"), `zoom ${zoom}`);
    }
  });
  it("marks the envelope end while zoomed", () => {
    const { ctx, calls } = makeCtx(true);
    drawEndFrameLine(ctx, coords({ endFrame: 5 }), 2, 500, 200, THEME);
    assert.ok(names(calls).includes("moveTo"));
  });
  it("skips the mark when the end is off-screen either way", () => {
    // Past the right edge.
    const r = makeCtx(true);
    drawEndFrameLine(r.ctx, coords({ endFrame: 100 }), 2, 500, 200, THEME);
    assert.ok(!names(r.calls).includes("moveTo"));
    // Left of the gutter.
    const l = makeCtx(true);
    drawEndFrameLine(l.ctx, coords({ endFrame: -10 }), 2, 500, 200, THEME);
    assert.ok(!names(l.calls).includes("moveTo"));
  });
});

describe("drawLabelOverlay", () => {
  const tracks: TimelineTrack[] = [
    { uuid: "a", name: "Full-Body", track_type: "keyframe", color: [1, 2, 3], height_scale: 0.5 },
    { uuid: "b", name: "2D Root", track_type: "keyframe", color: null },
  ];
  it("renders the prompts row + track rows", () => {
    const { ctx, calls } = makeCtx(true);
    drawLabelOverlay(ctx, coords(), tracks, true, 500, 200, THEME);
    const texts = calls.filter((c) => c.name === "fillText").map((c) => c.args[0]);
    assert.ok(texts.includes("Prompts"));
    assert.ok(texts.includes("Full-Body"));
    assert.ok(texts.includes("2D Root"));
    assert.ok(names(calls).includes("createLinearGradient"));
  });
  it("skips the prompts row without prompts", () => {
    const { ctx, calls } = makeCtx(true);
    drawLabelOverlay(ctx, coords(), tracks, false, 500, 200, THEME);
    const texts = calls.filter((c) => c.name === "fillText").map((c) => c.args[0]);
    assert.ok(!texts.includes("Prompts"));
    assert.ok(texts.includes("Full-Body"));
  });
  it("renders headers with no tracks", () => {
    const { ctx, calls } = makeCtx(true);
    drawLabelOverlay(ctx, coords(), [], false, 500, 200, THEME);
    assert.ok(!names(calls).includes("fillText"));
    assert.ok(names(calls).includes("createLinearGradient"));
  });
});
