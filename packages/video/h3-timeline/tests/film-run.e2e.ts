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
import { execFileSync } from "node:child_process";
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

describe("the film tail, LIVE (engine run)", { timeout: 2_100_000 }, () => {
  it.skipIf(!RUN)("3 windows + seam-crossing dialogue + music bed → one mp4", async () => {
    const def = (await loadCardDefs()).get("h3-timeline")!;
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [
          { text: "A man in a worn leather jacket stands at a rain-streaked window in a dim apartment at night, city lights bokeh behind him, speaking directly to camera, steady medium shot.", start_frame: 0, end_frame: 124 },
          { text: "Slow push in on the man at the window, he is still talking, his mouth clearly visible, rain light moving across his face.", start_frame: 124, end_frame: 243 },
          { text: "He turns from the window and walks to the small table, sits down, the city humming beyond the glass, wide shot.", start_frame: 243, end_frame: 362 },
        ],
        audio_clips: [
          { id: "d1", name: "the line", src: "dialogue_line.flac", start_frame: 90, dur_frames: 90, class: "dialogue", text: "I told you I would finish it before dawn." },
          { id: "m1", name: "night bed", src: "night_bed.mp3", start_frame: 0, dur_frames: 360, class: "music", text: "soft melancholic piano with rain atmosphere" },
        ],
        width: 960, height: 576, seed: 7,
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
      // 362f/24 = 15.08s raw; the seam law trims overlap (measured
      // 13.667s at 960×576, 2026-09-22) — the band covers both
      assert.ok(dur > 12.5 && dur < 15.7, `duration in the stitched band: got ${dur}`);
      const kinds = (meta.streams ?? []).map((s) => `${s.codec_name}:${s.codec_type}`).sort();
      assert.ok(kinds.some((k) => k.startsWith("h264:video")), `h264 video stream: ${kinds}`);
      assert.ok(kinds.some((k) => k.includes(":audio")), `audio stream present: ${kinds}`);
      // the windows also saved (file form: h3_t4_w1..3)
      const windows = files.filter((f) => /^h3_t4_w[123]_.*\.mp4$/.test(f) && fresh(f));
      console.log("[film-e2e] window files this run:", windows.length);
      assert.ok(windows.length >= 3, "the three window saves exist (the file form)");
      done = true;
    }
    assert.ok(done, "the film tail landed a fresh mp4");
  });
});
