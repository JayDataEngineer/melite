// filmMux.ts — the post-harvest film completion (2026-09-12, the
// 4s-stitch defect): the engine's latent-chain stitch occasionally
// covers only the first window while every window video exists —
// the row's hero then LIES about the timeline (a 4s film over a
// 10.3s doc). This module completes the film registry-side: when a
// stage's artifacts carry BOTH a stitch and windows, and the
// stitch's measured duration falls short of the windows' total, the
// windows are concatenated (ffmpeg concat demuxer, stream copy —
// the GUIDE's own recipe) into `film_video_mux.mp4` beside them and
// the film leads the stage's names.
//
// LOUD, never fake: no ffmpeg/ffprobe on PATH, or any probe/encode
// failure, leaves the engine's own stitch untouched (the stage
// keeps its truth; the defect stays visible, never masked).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** The stitch artifact name shape (the engine's own output stem). */
const STITCH_RE = /^stitch_video_\d+\.mp4$/;

/** The concat plan — pure, decided from run-relative names only. */
export interface FilmMuxPlan {
  /** The engine's stitch (run-relative); null when NO stitch exists
   *  (the merged TS film — the windows ARE the film, concat them). */
  readonly stitch: string | null;
  /** The windows in ordinal order (run-relative). */
  readonly windows: string[];
  /** The mux output name (run-relative). */
  readonly out: string;
}

/** The ENGINE FILM artifact — the TS card's in-graph concat
 *  (MiniMaxH3FilmConcat + one CreateVideo, SaveVideo prefix
 *  h3_t4_film). When the engine composed the film there is nothing
 *  for the harness to mux: the film IS the timeline, assembled where
 *  every other cut is made (the operator's law, 2026-09-17). */
const ENGINE_FILM_RE = /(?:^|\/)h3_t4_film_\d+_\.mp4$/;

/** The engine-composed film's name among a stage's artifacts, if any. */
export function engineFilmName(names: readonly string[]): string | null {
  return names.find((n): boolean => ENGINE_FILM_RE.test(n)) ?? null;
}

/** The window artifact shapes: the py engine's `windowN_video_M.mp4`
 *  AND the TS card's `h3_t4_wN_000MM_.mp4` (SaveVideo prefix
 *  `h3_t4_w${k}` + ComfyUI's counter suffix). Ordinal = window k. */
const WINDOW_RE = /(?:window(\d+)_video_\d+|h3_t4_w(\d+)_\d+)_?\.mp4$/;

/** One window's ordinal from its name (basename-level, stage-dir
 *  agnostic); null when not a window artifact. */
function windowOrdinal(name: string): number | null {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const m = WINDOW_RE.exec(base);
  if (m === null) return null;
  const ord = Number(m[1] ?? m[2]);
  return Number.isInteger(ord) && ord >= 1 ? ord : null;
}

/** Decide the plan from a stage's artifact names: a plan exists when
 *  two or more windows are present — with the engine's stitch (the
 *  py shape: the caller muxes only when the stitch lies short of the
 *  windows' total, the duration probe) or with NO stitch at all (the
 *  merged TS film: there is no engine stitch to keep — the windows
 *  concat unconditionally so ONE film leads the stage). */
export function filmMuxPlan(names: readonly string[]): FilmMuxPlan | null {
  // an engine-composed film answers the question the mux existed to ask
  if (engineFilmName(names) !== null) return null;
  const stitches = names.filter((n): boolean => STITCH_RE.test(n));
  const windows = new Map<number, string>();
  for (const n of names) {
    const ord = windowOrdinal(n);
    // first name per ordinal wins (the suffix shape is stable)
    if (ord !== null && !windows.has(ord)) windows.set(ord, n);
  }
  if (windows.size < 2) return null;
  const ordered = [...windows.entries()].sort((a, b): number => a[0] - b[0]).map(([, n]) => n);
  return { stitch: stitches.length > 0 ? stitches[0]! : null, windows: ordered, out: "film_video_mux.mp4" };
}

/** One file's duration in seconds (ffprobe json); null on any
 * failure — the caller treats a null as "cannot decide" and keeps
 * the engine's stitch. */
export function probeDurationSec(file: string): number | null {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  if (r.status !== 0 || typeof r.stdout !== "string") return null;
  const t = Number(r.stdout.trim());
  return Number.isFinite(t) && t > 0 ? t : null;
}

/** The completion verdict — pure: mux only when the stitch is
 * meaningfully shorter than the windows' total (0.5s tolerance —
 * container rounding, not a seam). */
export function shouldMuxWindows(
  stitchSec: number,
  windowSecs: readonly number[],
): boolean {
  const total = windowSecs.reduce((a, b): number => a + b, 0);
  return stitchSec + 0.5 < total;
}

/** Run the mux: concat the windows (stream copy) into runDir/out.
 * Returns the output's absolute path on success, null on any
 * failure (loud on stderr; the engine's stitch stays the truth). */
export function muxWindows(runDir: string, plan: FilmMuxPlan): string | null {
  const listFile = join(runDir, ".film-mux-list.txt");
  const list = plan.windows.map((w): string => `file '${w}'`).join("\n") + "\n";
  try {
    writeFileSync(listFile, list, "utf8");
  } catch {
    return null;
  }
  const out = join(runDir, plan.out);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", out],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    // LOUD: the failure is visible, the stitch untouched
    console.error(
      "filmMux: window concat failed (keeping the engine stitch):",
      typeof r.stderr === "string"
        ? r.stderr.split("\n").slice(-3).join(" ").slice(0, 300)
        : /* v8 ignore next -- spawn-failure arm: stderr is always a string under encoding utf8; only a missing binary (never in this estate) sets r.error (2026-09-12) */ String(r.error),
    );
    return null;
  }
  return out;
}
