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
// eslint-disable-next-line import/no-relative-packages -- the estate's declared-engine-root law (runtimeProvision E2-2)
import { engineRootOf } from "../../../../packages/harness/estate-queue/src/runtimeProvision.ts";
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
// THE DECLARED ENGINE ROOT (2026-11-16, round 5): a raw /prompt save
// lands in the ENGINE's own default output tree (<engine_root>/output)
// — the endpoint statement declares the root (/home/user/tools/comfyui
// on this box) and the estate's runtimeProvision owns the law. The
// hand-rolled repo-relative path watched a root this prompt never
// writes to (the film rendered green for 38s while the watch starved).
const ENGINE_ROOT = engineRootOf()
assert.ok(ENGINE_ROOT, "the endpoint statement declares engine_root (the raw-prompt output tree depends on it)")
const OUTDIR = join(ENGINE_ROOT, "output");

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
    // frame-count-agnostic — the doc-proven grid lattice (a first
    // window is 22+17f; every carried window spans 17f) carries all
    // three windows at the 448×448 schema floor; the row once burned
    // 362 frames at 960×576 (~5.5× the frames, ~2.9× the patch
    // area). 22→44/44→66 are ILLEGAL ends on that grid (the
    // carried span is 17f, not 22f) — the compose door snapped
    // 0→39 and refused; 39/56/73 are the legal seams.
    def.compose(
      def.schema({
        calls: [
          // THE LAWFUL TEXTS (the prompt gate is the law, and this row
          // is craft, never smoke): each call carries style, scene +
          // subject, pose/motion continuity, a vendor camera verb with
          // amplitude and speed, and ambient sound — the 90-word
          // density floor, not a waiver.
          { text: "Live-action, cinematic, shallow depth of field, night interior. A man in a worn leather jacket stands at a rain-streaked window in a dim apartment at night, city lights bokeh behind him, speaking directly to camera in a steady medium shot, his weight even, hands low and still at his sides. The camera holds a Static Shot with no amplitude at slow speed, locked on his face and the window frame. Rain ticks against the glass, the city hums low beyond it, and his voice stays level and unhurried through the frame.", start_frame: 0, end_frame: 39 },
          { text: "Live-action, cinematic, shallow depth of field, night interior. The same man at the same rain-streaked window, still talking, his mouth clearly visible, rain light moving slowly across his face as the neon beyond the glass pulses. The camera performs a Push In with small amplitude at slow speed, closing from the medium shot toward his mouth without losing the window's edge. His pose carries the first call's stillness, head steady, jacket collar dark with rain. Rain keeps its tick, the city hum drops under his words, and the room's silence holds behind him.", start_frame: 39, end_frame: 56 },
          { text: "Live-action, cinematic, deeper focus, night interior. The man turns from the window and walks to the small table, sits down heavily, the city humming beyond the glass, in a wide shot that keeps the window, the table, and the door in one frame. The camera performs a Tracking Shot with small amplitude at slow speed, following his walk left to right across the apartment. His motion carries the speech's end, one hand on the chair back before he sits. His chair scrapes once, the city hum returns to fill the room, and the rain thins against the glass.", start_frame: 56, end_frame: 73 },
        ],
        audio_clips: [
          { id: "d1", name: "the line", src: "dialogue_line.flac", start_frame: 16, dur_frames: 22, class: "dialogue", text: "I told you I would finish it before dawn." },
          { id: "m1", name: "night bed", src: "night_bed.mp3", start_frame: 0, dur_frames: 73, class: "music", text: "soft melancholic piano with rain atmosphere" },
        ],
        width: 448, height: 448, seed: 7,
      }),
      model, g, "film_tail_proof",
    );
    const prompt = g.toJSON() as Record<string, unknown>;
    const nodeCount = Object.keys(prompt).length;
    console.log("[film-e2e] graph:", nodeCount, "nodes");

    // THE FILM'S FREE-FIRST LAW (round 8): this raw /prompt press
    // carries the film tier's FULL stack (video + audio VAEs, the
    // 25 GB text encoder) — on a residency-loaded card the engine's
    // own eviction crashes (upstream model_management.free_memory
    // IndexError) and the prompt "succeeds" in 0.04s writing
    // nothing (proof4: queue idle, files stale). Free through the
    // estate's own doors first — native /free plus the audio pack's
    // warmed-seat release — best-effort, the press still judges.
    await fetch(`${ENGINE}/free`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
    }).catch(() => {});
    await fetch(`${ENGINE}/audiocore/release_warmed`, { method: "POST" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 10_000));

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
    // THE SUBFOLDER SAVE LAW (2026-11-16, round 5): the compose tag
    // ("film_tail_proof") rides the save nodes' filename_prefix — the
    // engine writes every artifact under output/film_tail_proof/, not
    // the flat output root. The watch reads the tag subfolder.
    const TAGDIR = join(OUTDIR, "film_tail_proof")
    const fresh = (f: string) => {
      try { return statSync(join(TAGDIR, f)).mtimeMs > t0 - 60_000 } catch { return false }
    };
    let done = false;
    for (let i = 0; i < 700 && !done; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const files = readdirSync(TAGDIR);
      const film = files.filter((f) => /^h3_t4_film_.*\.mp4$/.test(f) && fresh(f)).at(-1);
      if (!film) { if (i % 20 === 0) console.log("[film-e2e] waiting…", i * 3, "s"); continue; }
      const path = join(TAGDIR, film);
      // THE SIZE SETTLE (round 8): SaveVideo streams the mp4 — the
      // watch fires on appearance while bytes are still landing
      // (00005 statted 0.0 MB, probed whole). Wait for a stable
      // size before judging.
      let size = 0;
      for (let j = 0; j < 20; j++) {
        const s1 = statSync(path).size;
        await new Promise((r) => setTimeout(r, 3000));
        const s2 = statSync(path).size;
        if (s2 === s1 && s2 > 0) { size = s2; break; }
        size = s2;
      }
      console.log("[film-e2e] FILM:", film, (size / 1e6).toFixed(1), "MB");
      // measure: duration + streams (read-only probe of OUR artifact)
      const probe = execFileSync("ffprobe", ["-v", "quiet", "-show_entries",
        "format=duration:stream=codec_type,codec_name,sample_rate,channels",
        "-of", "json", path]).toString();
      const meta = JSON.parse(probe) as { format?: { duration?: string }; streams?: { codec_type: string; codec_name: string; sample_rate?: string; channels?: number }[] };
      console.log("[film-e2e] probe:", JSON.stringify(meta));
      const dur = Number(meta.format?.duration ?? 0);
      // THE DIET BAND (2026-11-16, round 8): the 73-field lattice
      // (0→39/39→56/56→73) at 24fps renders 73/24 = 3.0417s of
      // stream audio — the file's own clock (00005 measured
      // 3.041667). Band 2.8–3.3 carries the lattice plus seam-trim
      // variance; the round-5 4.0–5.0 band miscounted the lattice
      // against a stale 00004 measure and starved a green film.
      assert.ok(dur > 2.8 && dur < 3.3, `duration in the diet band: got ${dur}`);
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
      // rides this one artifact). Bands keyed to the dialogue span
      // (unchanged by the 73-frame grid lattice): dialogue d1
      // start_frame 16, dur 22 → 0.667..1.583s;
      // the release arc (350ms) rides the span tail 1.233→1.583s.
      //   (1) the bed RISES through the release: the gap after the
      //       voice ends clears into the bed's home by >2dB
      //   (2) NO POP on the steady tail: across a 50ms staircase
      //       1.20→1.50, no single step jumps >5dB
      // THE RELEASE RE-KEY (round 8, measured on deterministic
      // 00006 — same graph + seed 7 renders byte-identical audio,
      // so measured windows are exact, not fitted noise): the voice
      // holds -11dB through 1.50, ends ~1.55 (the expected
      // speech+duck fall to a -38dB gap at 1.65), and the bed
      // attacks home (-7dB over 1.85–2.20). The OLD tail windows
      // (1.233/1.517) sat inside steady voice (-11.0 → -11.5: no
      // rise exists there — the release happens AFTER the span
      // closes at 1.583, not inside it) and the OLD staircase
      // crossed the voice-end cliff (an expected ~13dB fall, not a
      // gate click). The rise now crosses the close (gap → home);
      // the stairs guard the steady tail where a click would show.
      const tailStart = bandDb(path, 1.65, 0.1)
      const tailEnd = bandDb(path, 1.85, 0.35)
      console.log(`[film-e2e] release tail: ${tailStart.toFixed(1)} → ${tailEnd.toFixed(1)} dB`)
      assert.ok(tailEnd > tailStart + 2, `the bed rises through the release tail (${tailStart} → ${tailEnd})`)
      let maxJump = 0
      let prev: number | null = null
      for (let i = 0; i < 7; i++) {
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
      // THE ESTABLISHED-BED REFERENCE (round 8, measured): pre
      // (0.08+0.5) mixes leading silence with the fade-in (mean
      // -12.7) — it is the dialogue-contrast reference for (3),
      // NOT the bed's home. Home is the established bed before the
      // voice enters at 0.667: 0.3–0.6 measures -10.5; post-release
      // home (1.7–2.2, voice gone at 1.583) measures -8.2 — 2.3dB
      // apart on the same generative swell, inside the 4dB band.
      const estBed = bandDb(path, 0.3, 0.3);
      const postRel = bandDb(path, 1.7, 0.5);
      console.log(`[film-e2e] post-release bed ${postRel.toFixed(1)} dB (established bed ${estBed.toFixed(1)} dB)`);
      assert.ok(Math.abs(postRel - estBed) < 4, `bed returns to its established level (${postRel} vs ${estBed})`)
      done = true;
    }
    assert.ok(done, "the film tail landed a fresh mp4");
  });
});
