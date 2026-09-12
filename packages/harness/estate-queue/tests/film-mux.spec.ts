// film-mux.spec.ts — the FILM COMPLETION law pinned (2026-09-12,
// the 4s-stitch defect): the plan decides from names alone; the mux
// verdict needs a MEANINGFUL shortfall (0.5s tolerance); the concat
// itself is proven against real files when ffmpeg is on PATH (the
// service host has it; CI without it skips the integration arm
// loudly — the pure arms always run).
import { describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  filmMuxPlan,
  muxWindows,
  probeDurationSec,
  shouldMuxWindows,
} from "../src/filmMux.ts";

const hasFfmpeg = (): boolean =>
  spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;

describe("filmMuxPlan (pure, name-driven)", () => {
  it("plans stitch + ordinal windows + the film output", () => {
    const plan = filmMuxPlan([
      "window3_video_0.mp4",
      "stitch_video_0.mp4",
      "window1_video_0.mp4",
      "window2_video_0.mp4",
      "creature.glb",
    ]);
    expect(plan).not.toBeNull();
    expect(plan!.stitch).toBe("stitch_video_0.mp4");
    expect(plan!.windows).toEqual([
      "window1_video_0.mp4",
      "window2_video_0.mp4",
      "window3_video_0.mp4",
    ]);
    expect(plan!.out).toBe("film_video_mux.mp4");
  });

  it("no stitch or fewer than two windows → no plan", () => {
    expect(filmMuxPlan(["window1_video_0.mp4", "creature.glb"])).toBeNull();
    expect(filmMuxPlan(["stitch_video_0.mp4"])).toBeNull();
    expect(filmMuxPlan(["stitch_video_0.mp4", "window1_video_0.mp4"])).toBeNull();
    expect(filmMuxPlan([])).toBeNull();
  });
});

describe("shouldMuxWindows (the tolerance law)", () => {
  it("short stitch → mux", () => {
    expect(shouldMuxWindows(4, [4.4, 5.9, 5.9, 5.9])).toBe(true);
  });

  it("complete stitch → keep the engine's film", () => {
    expect(shouldMuxWindows(22.1, [4.4, 5.9, 5.9, 5.9])).toBe(false);
  });

  it("rounding-level shortfall (≤0.5s) → keep", () => {
    expect(shouldMuxWindows(21.8, [4.4, 5.9, 5.9, 5.9])).toBe(false);
  });
});

describe("probeDurationSec + muxWindows (real files, ffmpeg-gated)", () => {
  it("measures and concats real mp4s", () => {
    if (!hasFfmpeg()) {
      console.warn("film-mux.spec: ffmpeg absent — integration arm skipped");
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "film-mux-"));
    try {
      // two 1s black/silent mp4s (testsrc + anullsrc, the cheapest real encodes)
      for (const name of ["window1_video_0.mp4", "window2_video_0.mp4"]) {
        const r = spawnSync(
          "ffmpeg",
          ["-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=8",
           "-f", "lavfi", "-i", "anullsrc=duration=1",
           "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
           join(dir, name)],
          { encoding: "utf8" },
        );
        expect(r.status, `ffmpeg encode ${name}: ${r.stderr}`).toBe(0);
      }
      const d1 = probeDurationSec(join(dir, "window1_video_0.mp4"));
      const d2 = probeDurationSec(join(dir, "window2_video_0.mp4"));
      expect(d1).not.toBeNull();
      expect(d2).not.toBeNull();
      // a missing file refuses (null — never a guess)
      expect(probeDurationSec(join(dir, "absent.mp4"))).toBeNull();

      const plan = { stitch: "stitch_video_0.mp4",
        windows: ["window1_video_0.mp4", "window2_video_0.mp4"],
        out: "film_video_mux.mp4" };
      const out = muxWindows(dir, plan);
      expect(out, "mux returns the output path").toBe(join(dir, "film_video_mux.mp4"));
      const film = probeDurationSec(out!);
      expect(film).not.toBeNull();
      expect(film!).toBeGreaterThan(1.5);
      // the concat list names the windows in order
      const list = readFileSync(join(dir, ".film-mux-list.txt"), "utf8");
      expect(list).toContain("file 'window1_video_0.mp4'");
      expect(list.indexOf("window1")).toBeLessThan(list.indexOf("window2"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("filmMux degenerate arms", () => {
  it("duplicate window ordinals keep the FIRST name (the _0 shape is canonical)", () => {
    const plan = filmMuxPlan([
      "stitch_video_0.mp4",
      "window2_video_0.mp4",
      "window1_video_0.mp4",
      "window1_video_1.mp4",
    ]);
    expect(plan!.windows).toEqual(["window1_video_0.mp4", "window2_video_0.mp4"]);
  });

  it("an N/A duration (mpegts, exit 0) refuses — never a guess", () => {
    if (!hasFfmpeg()) {
      console.warn("film-mux.spec: ffmpeg absent — N/A arm skipped");
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "film-mux-na-"));
    try {
      const r = spawnSync(
        "ffmpeg",
        ["-y", "-f", "lavfi", "-i", "testsrc=duration=0.2:size=32x32:rate=4",
         "-c:v", "mpeg2video", "-f", "mpegts", join(dir, "w.ts")],
        { encoding: "utf8" },
      );
      expect(r.status, `mpegts encode: ${r.stderr}`).toBe(0);
      // ffprobe answers N/A with exit 0 — the parse must refuse
      expect(probeDurationSec(join(dir, "w.ts"))).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a list-file write fault returns null (the engine stitch stays)", () => {
    const dir = mkdtempSync(join(tmpdir(), "film-mux-ro-"));
    try {
      // .film-mux-list.txt occupied by a DIRECTORY — writeFileSync throws
      mkdirSync(join(dir, ".film-mux-list.txt"));
      const plan = { stitch: "s.mp4", windows: ["a.mp4"], out: "film.mp4" };
      expect(muxWindows(dir, plan as never)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("garbage windows make the concat fail LOUD (null, stitch untouched)", () => {
    if (!hasFfmpeg()) {
      console.warn("film-mux.spec: ffmpeg absent — concat-fail arm skipped");
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "film-mux-bad-"));
    try {
      writeFileSync(join(dir, "window1_video_0.mp4"), "garbage");
      writeFileSync(join(dir, "window2_video_0.mp4"), "garbage");
      const plan = { stitch: "stitch_video_0.mp4",
        windows: ["window1_video_0.mp4", "window2_video_0.mp4"],
        out: "film_video_mux.mp4" };
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect(muxWindows(dir, plan)).toBeNull();
        expect(errSpy).toHaveBeenCalled();
        expect(String(errSpy.mock.calls[0]!.join(" "))).toContain("filmMux");
      } finally {
        errSpy.mockRestore();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
