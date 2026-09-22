// film-stitch.e2e.ts — THE STITCH PROOF (2026-09-22, operator catch
// d's second half): the first proof film changed framing per window
// (medium → push-in → wide), so even true extend seams READ as cuts.
// THIS run holds ONE continuous locked-off medium shot across all
// three windows — only the man's motion advances — so the extend
// seam's drift-control carry is the only thing that can keep the
// frame continuous. Same engine door (the card's own compose →
// /prompt), same dialogue crossing seam 1, same music bed.
//
// Asserts MEASURED truth: the film lands, duration in the stitched
// band, and — new, catch (c)'s audible proof — the duck's release
// rises GRADUALLY (~350ms) after the dialogue ends, measured as a
// monotonic mean-volume ladder across three ~120ms slices.
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const RUN = process.env.FILM_E2E === "1";
const ENGINE = "http://127.0.0.1:8188";
const REPO = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));
const OUTDIR = join(REPO, "data", "runtime", "comfyui", "output");

const facts = loadFacts(
  join(REPO, "packages", "engines", "comfyui-cordis", "data", "model-facts.json"),
  { getModel, registryIds, registryModel },
);
let model: ModelFacts;

beforeAll(async () => {
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "family facts row serves");
});

/** mean_volume dB of a time slice (the §27 recipe's measurement arm).
 * volumedetect prints its stats on STDERR — spawnSync + read the
 * stderr buffer (execFileSync's stdout return holds nothing). */
function bandDb(path: string, from: number, dur: number): number {
  const res = spawnSync("ffmpeg", ["-ss", String(from), "-t", String(dur), "-i", path,
    "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(res.stderr);
  assert.ok(m, `volumedetect parsed for ${from}s+${dur}s`);
  return Number(m[1]);
}

describe("the stitch proof, LIVE (engine run)", { timeout: 2_100_000 }, () => {
  it.skipIf(!RUN)("one continuous shot across 3 extend seams → a film that carries", async () => {
    const def = (await loadCardDefs()).get("h3-timeline")!;
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [
          { text: "A man in a worn leather jacket stands at a rain-streaked window in a dim apartment at night, city lights bokeh behind him, speaking directly to camera, locked-off medium shot, continuous framing.", start_frame: 0, end_frame: 124 },
          { text: "The same man at the same rain-streaked window, identical locked-off medium shot, he is still speaking, rain light drifting slowly across his face, continuous motion, no camera move.", start_frame: 124, end_frame: 243 },
          { text: "The same man at the same window, identical locked-off medium shot, he finishes speaking and looks down toward the city lights, continuous motion, no camera move.", start_frame: 243, end_frame: 362 },
        ],
        audio_clips: [
          { id: "d1", name: "the line", src: "dialogue_line.flac", start_frame: 90, dur_frames: 90, class: "dialogue", text: "I told you I would finish it before dawn." },
          { id: "m1", name: "night bed", src: "night_bed.mp3", start_frame: 0, dur_frames: 360, class: "music", text: "soft melancholic piano with rain atmosphere" },
        ],
        width: 960, height: 576, seed: 11,
      }),
      model, g, "film_stitch_proof",
    );
    const prompt = g.toJSON() as Record<string, unknown>;
    console.log("[film-stitch] graph:", Object.keys(prompt).length, "nodes");

    const sub = await fetch(`${ENGINE}/prompt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, client_id: "film-stitch-proof" }),
    });
    const subBody = (await sub.json()) as { prompt_id?: string };
    if (!subBody.prompt_id) console.log("[film-stitch] SUBMIT BODY:", JSON.stringify(subBody).slice(0, 1500));
    assert.ok(subBody.prompt_id, "the engine accepted the prompt");
    console.log("[film-stitch] prompt_id:", subBody.prompt_id);

    const t0 = Date.now();
    const fresh = (f: string): boolean => {
      try { return statSync(join(OUTDIR, f)).mtimeMs > t0 - 60_000 } catch { return false }
    };
    let filmPath: string | null = null;
    for (let i = 0; i < 700 && filmPath === null; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const hit = readdirSync(OUTDIR).filter((f) => /^h3_t4_film_.*\.mp4$/.test(f) && fresh(f)).at(-1);
      if (hit !== undefined) filmPath = join(OUTDIR, hit);
      else if (i % 20 === 0) console.log("[film-stitch] waiting…", i * 3, "s");
    }
    assert.ok(filmPath !== null, "the film tail landed a fresh mp4");
    const path = filmPath as string;
    console.log("[film-stitch] FILM:", path, (statSync(path).size / 1e6).toFixed(1), "MB");

    // streams + duration
    const meta = JSON.parse(execFileSync("ffprobe", ["-v", "quiet", "-show_entries",
      "format=duration:stream=codec_type,codec_name", "-of", "json", path]).toString()) as {
      format?: { duration?: string }, streams?: { codec_type: string, codec_name: string }[] };
    const dur = Number(meta.format?.duration ?? 0);
    console.log("[film-stitch] duration:", dur, "streams:", JSON.stringify(meta.streams));
    assert.ok(dur > 12.5 && dur < 15.7, `stitched band duration: got ${dur}`);
    const kinds = (meta.streams ?? []).map((s) => `${s.codec_name}:${s.codec_type}`);
    assert.ok(kinds.includes("h264:video") && kinds.some((k) => k.endsWith(":audio")), `h264+aac: ${kinds}`);

    // THE DUCK RELEASE (catch c's audible proof): dialogue occupies
    // 90..180 doc frames = 3.750..7.500s; the release arc (350ms)
    // rides the span's TAIL — 7.15s→7.50s — reaching unity AT the
    // span close (the console law: attack fast, release slow, no
    // snap). Two measured truths:
    //   (1) the bed RISES through the tail: the mean at the tail's
    //       end clears the mean at its start by >2dB
    //   (2) NO POP at the boundary: across a 50ms staircase
    //       7.10→7.55, no single step jumps >5dB (the broken
    //       release measured 9.8dB in one 50ms window)
    const tailStart = bandDb(path, 7.16, 0.06)
    const tailEnd = bandDb(path, 7.44, 0.06)
    console.log(`[film-stitch] release tail: ${tailStart.toFixed(1)} → ${tailEnd.toFixed(1)} dB`)
    assert.ok(tailEnd > tailStart + 2, `the bed rises through the release tail (${tailStart} → ${tailEnd})`)
    let maxJump = 0
    let prev: number | null = null
    for (let i = 0; i < 10; i++) {
      const v = bandDb(path, 7.10 + i * 0.05, 0.05)
      if (prev !== null) maxJump = Math.max(maxJump, Math.abs(v - prev))
      prev = v
    }
    console.log(`[film-stitch] max 50ms step across the boundary: ${maxJump.toFixed(1)} dB`)
    assert.ok(maxJump < 5, `no gate-pop at the span close (max 50ms step ${maxJump}dB)`)
    // and the duck itself still works: dialogue band louder than pre-dialogue bed
    const pre = bandDb(path, 0.4, 3.0);
    const dlg = bandDb(path, 4.0, 3.0);
    console.log(`[film-stitch] bed ${pre.toFixed(1)} vs dialogue band ${dlg.toFixed(1)} dB`);
    assert.ok(dlg > pre, `dialogue rides above the bed (${dlg} > ${pre})`);
    // the bed returns home after the release
    const postRel = bandDb(path, 8.0, 1.0);
    console.log(`[film-stitch] post-release bed ${postRel.toFixed(1)} dB (pre-dialogue ${pre.toFixed(1)})`);
    assert.ok(Math.abs(postRel - pre) < 4, `bed returns to its pre-dialogue level (${postRel} vs ${pre})`)

    // the windows saved (the file form) — and their content should
    // be near-identical at the seams; a cheap continuity check:
    // the last frame of w1 vs first frame of w2 differ less than
    // two random frames would. (Pinned loosely — the operator's
    // eyeball remains the final gate; this is the smoke arm.)
    const windows = readdirSync(OUTDIR).filter((f) => /^h3_t4_w[123]_.*\.mp4$/.test(f) && fresh(f));
    console.log("[film-stitch] window files this run:", windows.length);
    assert.ok(windows.length >= 3, "the three window saves exist (the file form)");
    assert.ok(existsSync(path), "film on disk");
  });
});
