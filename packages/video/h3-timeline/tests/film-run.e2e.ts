// film-run.e2e.ts — THE REAL FILM RUN (2026-09-22, the operator's
// "actually make the video"): composes the 3-window film through the
// card's own def.compose (the sanctioned graph source — no
// hand-building), submits it to the engine's /prompt door, polls
// /history until the film tail's SaveVideo lands, and asserts the
// mp4 exists with the right duration + streams.
//
// Self-skips unless FILM_E2E=1 (the estate doors own runs in CI;
// this file exists for the live proof on the test lane).
//
// THE PER-FILE BOOT BRICK (the boot-models law): this suite reads
// the model table at MODULE scope (loadFacts below), so it owns
// the booted world explicitly — the helper's top-level await
// settles before this file's own imports evaluate. Without it the
// suite crashed at import ("models service not booted") on every
// keyless e2e run even though every test inside self-skips.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { ENGINE_FREE } from "../../../../tests/e2e/engine-gate.ts";

/** Mean loudness (dB) of one time band of the film's audio track
 *  (the duck ladder's measuring stick, merged from film-stitch). */
function bandDb(path: string, from: number, dur: number): number {
  const res = spawnSync("ffmpeg", ["-ss", String(from), "-t", String(dur), "-i", path,
    "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(res.stderr);
  assert.ok(m, `volumedetect parsed for ${from}s+${dur}s`);
  return Number(m[1]);
}
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

// THE CEILING (the GPU live-receipt campaign, 2026-11-01 §3
// film-run): a full three-window film composes a 115-node graph that
// SUBMITS clean and the engine RENDERS for real — the render is
// simply longer than the old 35-minute ceiling on this GPU (every
// attempt burned 30+ min and timed out mid-render; the estate's own
// occupancy estimate for a film press is 40–60 min). 60 minutes is
// the honest seat: above the real render, still bounded. This is the
// SUITE-level timeout (the vitest describe option) — film-run and
// film-stitch only; every other suite keeps the tier's 120 s.
// OPERATOR-SIDE: a full film press occupies the shared engine 30+
// min per attempt (×3 with the e2e tier's retry: 2) — schedule the
// shared engine accordingly; a skip is NOT a pass (tests/README).
describe("the film tail, LIVE (engine run)", { timeout: 3_600_000 }, () => {
  it.skipIf(!RUN || !ENGINE_FREE)("3 windows + seam-crossing dialogue + music bed → one mp4", async () => {
    const def = (await loadCardDefs()).get("h3-timeline")!;
    const g = new GraphBuilder();
    // THE GPU DIET (operator 2026-11-17, audit finding 9): the film
    // laws (seam stitching, stream kinds, the window file form) are
    // frame-count-agnostic — 3×22-frame windows at the 448×448 schema
    // floor carry every one of them; the row once burned 362 frames
    // at 960×576 (~5.5× the frames, ~2.9× the patch area).
    def.compose(
      def.schema({
        calls: [
          { text: "A man in a worn leather jacket stands at a rain-streaked window in a dim apartment at night, city lights bokeh behind him, speaking directly to camera, steady medium shot.", start_frame: 0, end_frame: 22 },
          { text: "Slow push in on the man at the window, he is still talking, his mouth clearly visible, rain light moving across his face.", start_frame: 22, end_frame: 44 },
          { text: "He turns from the window and walks to the small table, sits down, the city humming beyond the glass, wide shot.", start_frame: 44, end_frame: 66 },
        ],
        audio_clips: [
          { id: "d1", name: "the line", src: "dialogue_line.flac", start_frame: 16, dur_frames: 22, class: "dialogue", text: "I told you I would finish it before dawn." },
          { id: "m1", name: "night bed", src: "night_bed.mp3", start_frame: 0, dur_frames: 66, class: "music", text: "soft melancholic piano with rain atmosphere" },
        ],
        width: 448, height: 448, seed: 7,
      }),
      model, g, "film_tail_proof",
    );
    const prompt = g.toJSON() as Record<string, unknown>;
    const nodeCount = Object.keys(prompt).length;
    console.log("[film-e2e] graph:", nodeCount, "nodes");

    // submit
    const sub = await fetch(`${ENGINE}/prompt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, client_id: "film-tail-proof" }),
    });
    const subBody = (await sub.json()) as { prompt_id?: string; error?: unknown; node_errors?: unknown };
    if (!sub.ok || !subBody.prompt_id) {
      console.log("[film-e2e] SUBMIT FAILED:", JSON.stringify(subBody).slice(0, 2000));
    }
    assert.ok(subBody.prompt_id, "the engine accepted the prompt");
    console.log("[film-e2e] prompt_id:", subBody.prompt_id);

    // poll the OUTPUT DIR (the artifact is the truth — this build's
    // history row carried no ui.videos for SaveVideo): the film file
    // must appear after three fresh window saves
    const t0 = Date.now();
    const fresh = (f: string) => {
      try { return statSync(join(OUTDIR, f)).mtimeMs > t0 - 60_000 } catch { return false }
    };
    let done = false;
    for (let i = 0; i < 700 && !done; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const files = readdirSync(OUTDIR);
      const film = files.filter((f) => /^h3_t4_film_.*\.mp4$/.test(f) && fresh(f)).at(-1);
      if (!film) { if (i % 20 === 0) console.log("[film-e2e] waiting…", i * 3, "s"); continue; }
      const path = join(OUTDIR, film);
      const size = statSync(path).size;
      console.log("[film-e2e] FILM:", film, (size / 1e6).toFixed(1), "MB");
      // measure: duration + streams (read-only probe of OUR artifact)
      const probe = execFileSync("ffprobe", ["-v", "quiet", "-show_entries",
        "format=duration:stream=codec_type,codec_name,sample_rate,channels",
        "-of", "json", path]).toString();
      const meta = JSON.parse(probe) as { format?: { duration?: string }; streams?: { codec_type: string; codec_name: string; sample_rate?: string; channels?: number }[] };
      console.log("[film-e2e] probe:", JSON.stringify(meta));
      const dur = Number(meta.format?.duration ?? 0);
      // 66f/24 = 2.75s raw; the seam law trims overlap (the same law
      // measured 13.667s of a 15.08s raw at 960×576, 2026-09-22 — a
      // ~9% trim; the band covers raw and trimmed)
      assert.ok(dur > 2.2 && dur < 2.95, `duration in the stitched band: got ${dur}`);
      const kinds = (meta.streams ?? []).map((s) => `${s.codec_name}:${s.codec_type}`).sort();
      assert.ok(kinds.some((k) => k.startsWith("h264:video")), `h264 video stream: ${kinds}`);
      assert.ok(kinds.some((k) => k.includes(":audio")), `audio stream present: ${kinds}`);
      // the windows also saved (file form: h3_t4_w1..3)
      const windows = files.filter((f) => /^h3_t4_w[123]_.*\.mp4$/.test(f) && fresh(f));
      console.log("[film-e2e] window files this run:", windows.length);
      assert.ok(windows.length >= 3, "the three window saves exist (the file form)");

      // THE DUCK LADDER (merged from film-stitch.e2e.ts 2026-11-17 —
      // the no-dupes law: the stitch row rendered the SAME film a
      // second time for assert-only differences; every audio law now
      // rides this one artifact). Bands re-keyed to the 66-frame
      // film: dialogue d1 start_frame 16, dur 22 → 0.667..1.583s;
      // the release arc (350ms) rides the span tail 1.233→1.583s.
      //   (1) the bed RISES through the tail: the mean at the tail's
      //       end clears the mean at its start by >2dB
      //   (2) NO POP at the boundary: across a 50ms staircase
      //       1.20→1.60, no single step jumps >5dB
      const tailStart = bandDb(path, 1.233, 0.06)
      const tailEnd = bandDb(path, 1.517, 0.06)
      console.log(`[film-e2e] release tail: ${tailStart.toFixed(1)} → ${tailEnd.toFixed(1)} dB`)
      assert.ok(tailEnd > tailStart + 2, `the bed rises through the release tail (${tailStart} → ${tailEnd})`)
      let maxJump = 0
      let prev: number | null = null
      for (let i = 0; i < 9; i++) {
        const v = bandDb(path, 1.20 + i * 0.05, 0.05)
        if (prev !== null) maxJump = Math.max(maxJump, Math.abs(v - prev))
        prev = v
      }
      console.log(`[film-e2e] max 50ms step across the boundary: ${maxJump.toFixed(1)} dB`)
      assert.ok(maxJump < 5, `no gate-pop at the span close (max 50ms step ${maxJump}dB)`)
      // the duck itself: dialogue band louder than pre-dialogue bed
      const pre = bandDb(path, 0.08, 0.5);
      const dlg = bandDb(path, 0.8, 0.6);
      console.log(`[film-e2e] bed ${pre.toFixed(1)} vs dialogue band ${dlg.toFixed(1)} dB`);
      assert.ok(dlg > pre, `dialogue rides above the bed (${dlg} > ${pre})`);
      // the bed returns home after the release
      const postRel = bandDb(path, 1.7, 0.5);
      console.log(`[film-e2e] post-release bed ${postRel.toFixed(1)} dB (pre-dialogue ${pre.toFixed(1)})`);
      assert.ok(Math.abs(postRel - pre) < 4, `bed returns to its pre-dialogue level (${postRel} vs ${pre})`)
      done = true;
    }
    assert.ok(done, "the film tail landed a fresh mp4");
  });
});
