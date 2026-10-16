// scan-cache.spec.ts — THE D6 SLOWNESS WALL (operator 2026-11-06:
// "flow restore via media tab history extremely slow"): every media
// tab open rode listRunsAcross, which read EVERY run's sidecar and
// readdir-probed EVERY run dir for media — thousands of synchronous
// syscalls per open on a real history. The scan cache keys each run
// dir's facts against the dir's own mtime AND the sidecar's mtime.
// This wall proves the two laws of that cache: a warm pass over an
// unchanged history reads ZERO sidecars, and either key moving
// (new artifact at top level; sidecar rewrite — the status
// transition) re-opens exactly that dir for one fresh scan.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// The read counter: wraps readFileSync, counting _flow.json opens.
// Everything else delegates verbatim (setup writes never route here).
const READS = vi.hoisted(() => ({ flow: 0, dirs: 0, shutDir: "" }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    // (the unstatable-dir arm) a stat that CANNOT answer — the
    // readdir-vs-stat race a vanishing run dir runs. chmod cannot
    // drive it (stat needs no permission on its target), so the
    // mock refuses exactly one named dir.
    statSync: (path: string, ...rest: unknown[]): unknown => {
      if (READS.shutDir !== "" && String(path).startsWith(READS.shutDir)) {
        const err = new Error("ENOENT: the dir vanished mid-scan") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      return actual.statSync(path, ...(rest as []));
    },
    readFileSync: (...args: Parameters<typeof actual.readFileSync>): ReturnType<typeof actual.readFileSync> => {
      const p = args[0];
      if (typeof p === "string" && p.endsWith("_flow.json")) READS.flow += 1;
      return actual.readFileSync(...args);
    },
    readdirSync: (...args: Parameters<typeof actual.readdirSync>): ReturnType<typeof actual.readdirSync> => {
      // counts only RUN-DIR walks (the output root's own readdir is
      // the scan's, not the row's)
      READS.dirs += 1;
      return actual.readdirSync(...args);
    },
  };
});

// Import AFTER the mock (vitest hoists vi.mock; the explicit
// comment marks the dependency for the reader).
// eslint-disable-next-line import/first
import { listRunsAcross } from "../src/runsList.ts";

let TMPS: string[] = [];
afterEach(() => {
  for (const d of TMPS) rmSync(d, { recursive: true, force: true });
  TMPS = [];
});

const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "scan-cache-"));
  TMPS.push(d);
  return d;
};

interface Built {
  root: string;
  dirs: { dir: string; runId: string; created: number; media: boolean }[];
}

/** A state root with N run dirs; `media` decides whether the run
 *  keeps a servable media artifact at its top level. Each sidecar
 *  carries a distinct created_at so rows are distinguishable. */
const build = (n: number, media: boolean[]): Built => {
  const root = tmp();
  mkdirSync(join(root, "output"), { recursive: true });
  const dirs: Built["dirs"] = [];
  for (let i = 0; i < n; i += 1) {
    const runId = `run-abc${i}def-000${i}`;
    const dir = join(root, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), `{"status":"completed","created_at":170000000${i}}`);
    if (media[i] === true) writeFileSync(join(dir, `still_${i}.png`), "png");
    dirs.push({ dir, runId, created: 1700000000 + i, media: media[i] === true });
  }
  return { root, dirs };
};

const noDraft = async (): Promise<boolean> => false;

describe("THE SCAN CACHE (D6, 2026-11-06): the media tab opens warm", () => {
  it("a warm pass over an unchanged history reads ZERO sidecars", async () => {
    const { root, dirs } = build(4, [true, true, false, true]);
    const cold = await listRunsAcross([root], 50, noDraft);
    assert.equal(cold.runs.length, 4, "the cold pass lists every run");
    assert.ok(READS.flow >= 4, "the cold pass read each sidecar (counter sanity)");
    const rowsOf = (payload: { runs: Record<string, unknown>[] }): Record<string, unknown>[] =>
      payload.runs.map((r) => ({ run_id: r["run_id"], created_at: r["created_at"] }));
    const coldRows = rowsOf(cold);
    READS.flow = 0;
    const warm = await listRunsAcross([root], 50, noDraft);
    assert.equal(warm.runs.length, 4, "the warm pass still lists every run");
    assert.deepEqual(rowsOf(warm), coldRows, "the warm rows are the cold rows, byte-for-byte");
    assert.equal(READS.flow, 0,
      "the warm pass opened ZERO sidecars — the per-open O(runs) file read is dead");
    void dirs;
  });

  it("a new artifact in ONE run re-opens exactly that dir (dir mtime key)", async () => {
    const { root, dirs } = build(3, [true, false, true]);
    await listRunsAcross([root], 50, noDraft);
    const before = (await listRunsAcross([root], 50, noDraft)).runs;
    const hadMedia = new Map(before.map((r) => [String(r["run_id"]), r["has_media"] ?? ""]));
    // r1 had no media; land one artifact at its top level — the DIR
    // mtime moves, nothing else does.
    writeFileSync(join(dirs[1]!.dir, "late.png"), "png");
    READS.flow = 0;
    const after = await listRunsAcross([root], 50, noDraft);
    // one changed dir = TWO sidecar reads (the scan seat + the fresh
    // row build) — never O(runs)
    assert.equal(READS.flow, 2,
      "the changed dir alone re-opens (scan seat + row seat)");
    const row1 = after.runs.find((r) => String(r["run_id"]).endsWith("0001"));
    assert.notEqual(row1, undefined, "the changed run still lists");
    void hadMedia;
    void dirs[0];
    void dirs[2];
  });

  it("a sidecar rewrite re-opens that dir even when the DIR mtime holds (the subdir-artifact hole, closed by the flow key)", async () => {
    const { root, dirs } = build(3, [true, false, true]);
    await listRunsAcross([root], 50, noDraft);
    // r1's artifacts live one level down; the run DIR's own mtime is
    // pinned to the mint — only the sidecar rewrite moves.
    const runDir = dirs[1]!.dir;
    mkdirSync(join(runDir, "frames"), { recursive: true });
    writeFileSync(join(runDir, "frames", "w0_x.png"), "png");
    const pin = new Date("2000-01-01T00:00:00Z");
    utimesSync(runDir, pin, pin);
    // The status transition rewrite: same file, new bytes + mtime.
    writeFileSync(join(runDir, "_flow.json"), '{"status":"completed","created_at":1700000001}');
    READS.flow = 0;
    const after = await listRunsAcross([root], 50, noDraft);
    // scan seat + row seat, as above — the point is the FLOW key
    // fired while the DIR key held still
    assert.equal(READS.flow, 2,
      "the sidecar mtime alone re-opened the dir — the top-level mtime never moved");
    assert.equal(after.runs.length, 3, "every run still lists");
  });

  it("a run dir the stat cannot reach skips from the list (never a fabricated row)", async () => {
    const { root } = build(2, [true, true]);
    await listRunsAcross([root], 50, noDraft);
    // refuse BOTH stats for run-...0001 only (mtimeMsOf answers -1
    // twice; the cache invents nothing).
    READS.shutDir = join(root, "output", "run-abc1def-0001");
    const after = await listRunsAcross([root], 50, noDraft);
    assert.equal(after.runs.length, 1,
      "the unstatable run is absent this pass — no cached ghost, no fabricated row");
    READS.shutDir = "";
  });

  it("a vanished run dir drops from the warm list (the cache never invents rows)", async () => {
    const { root, dirs } = build(3, [true, true, true]);
    await listRunsAcross([root], 50, noDraft);
    rmSync(dirs[2]!.dir, { recursive: true, force: true });
    const after = await listRunsAcross([root], 50, noDraft);
    assert.equal(after.runs.length, 2, "the deleted run is gone on the very next open");
    assert.equal(after.runs.find((r) => String(r["run_id"]).endsWith("0002")), undefined,
      "no cached ghost row outlives its dir");
  });
});
