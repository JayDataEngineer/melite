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

  it("the real disk: the four tagger runs ride the window", async () => {
    const res = await listRuns("/home/user/Documents/programs/active/inference.cpp/data/runs", 500, async () => true);
    const ids = res.runs.map((r: any) => r.run_id);
    for (const rid of ["run-48a9abf1353d-2ec136ef", "run-0b29214cdfb7-2ec10acc", "run-0b9fe19e5efc-2ec118fd", "run-ab870be63b0b-2ec12dbf"]) {
      expect(ids).toContain(rid);
    }
  });
});
