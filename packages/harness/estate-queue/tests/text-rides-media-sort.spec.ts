import { describe, it, expect } from "vitest";
import { listRuns } from "../src/runsList.ts";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("text rides the media sort (the 2026-10-12 tagger injury)", () => {
  it("a txt-only run sorts media-class — never below the window cut", async () => {
    // REAL SHAPE: 501 image runs + 1 NEWER txt-only run. Media-first sort
    // with text excluded from the media class buries the txt run at index
    // 501 — outside a 500 window. With galleryText in the class it rides
    // index 0 (newest of the media class).
    const root = mkdtempSync(join(tmpdir(), "runs-text-sort-"));
    const out = join(root, "output");
    mkdirSync(out, { recursive: true });
    for (let i = 0; i < 501; i++) {
      const d = join(out, `run-img${String(i).padStart(4, "0")}-x`);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "img.png"), "x");
      writeFileSync(join(d, "_flow.json"), JSON.stringify({ status: "completed", created_at: 1700000000 + i, pipeline: "p", draft_id: "", seed: 0 }));
    }
    const td = join(out, "run-txt0001-x");
    mkdirSync(td, { recursive: true });
    mkdirSync(join(td, "tagger"), { recursive: true });
    writeFileSync(join(td, "tagger", "SaveText.0_tags_00001.txt"), "1girl, solo");
    writeFileSync(join(td, "_flow.json"), JSON.stringify({ status: "completed", created_at: 1791785776, pipeline: "p", draft_id: "", seed: 0 }));
    try {
      const res = await listRuns(root, 500, async () => true);
      const ids = res.runs.map((r: any) => r.run_id);
      expect(ids).toContain("run-txt0001-x");
      const txt = res.runs.find((r: any) => r.run_id === "run-txt0001-x")!;
      expect((txt.artifacts as any[]).some((a) => a.type === "text")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("the operator's four tagger runs ride the window (seeded — the store is a fixture, never this machine's disk)", async () => {
    // THE INJURY'S OWN IDS (operator 2026-10-12, four re-presses): each
    // is a run with NO media artifact, only tagger/*.txt. They ride a
    // 500 window because a text artifact is media-class for the sort.
    // SEEDED, not read from data/runs: this machine's store outgrew a
    // 500-run recency window (2026-11-13: 2219 run dirs, the four real
    // ids sat outside the newest 500) and the arm red'd on store age
    // with no code drift. The law under test is the CLASS, so the four
    // runs are rebuilt at their real shape and pinned newest.
    const root = mkdtempSync(join(tmpdir(), "runs-tagger-four-"));
    const out = join(root, "output");
    mkdirSync(out, { recursive: true });
    for (let i = 0; i < 501; i++) {
      const d = join(out, `run-img${String(i).padStart(4, "0")}-x`);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "img.png"), "x");
      writeFileSync(join(d, "_flow.json"), JSON.stringify({ status: "completed", created_at: 1700000000 + i, pipeline: "p", draft_id: "", seed: 0 }));
    }
    const four = [
      "run-48a9abf1353d-2ec136ef",
      "run-0b29214cdfb7-2ec10acc",
      "run-0b9fe19e5efc-2ec118fd",
      "run-ab870be63b0b-2ec12dbf",
    ];
    four.forEach((rid, i) => {
      const d = join(out, rid);
      mkdirSync(join(d, "tagger"), { recursive: true });
      writeFileSync(join(d, "tagger", "SaveText.0_tags_00001.txt"), "1girl, solo");
      writeFileSync(join(d, "_flow.json"), JSON.stringify({ status: "completed", created_at: 1791785776 + i, pipeline: "p", draft_id: "", seed: 0 }));
    });
    try {
      const res = await listRuns(root, 500, async () => true);
      const ids = res.runs.map((r: any) => r.run_id);
      for (const rid of four) {
        expect(ids, "a text-only run is media-class — it never sorts below the window cut").toContain(rid);
        const row = res.runs.find((r: any) => r.run_id === rid)!;
        expect((row.artifacts as any[]).some((a) => a.type === "text")).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
