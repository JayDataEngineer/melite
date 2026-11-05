// committed-batch.ts — the committed plane arrives in ONE spawn (CI
// class F, 2026-10-31: the committed-lib arms used to `git show
// HEAD:<path>` PER FILE — ~1900 sequential spawns per arm over the
// 1252-file tracked lib plane — and windows process creation is
// 10-50× linux cost, so the arms blew the 30 s per-test wall
// deterministically; the def-triage F1/F2/F5 rows). `git cat-file
// --batch` streams every blob in one spawn; the bytes per path are
// the same bytes `git show` returned, so every consumer judges the
// identical verdict at 1/N the spawn tax. Never a silent degrade: a
// path git refuses (untracked, non-blob, shallow clone without the
// blob) throws naming the path.
import { spawnSync } from "node:child_process";

/** Requested path → committed (HEAD) bytes, decoded UTF-8. */
export function readCommittedBatch(
  paths: readonly string[],
  root: string,
  spawn: typeof spawnSync = spawnSync,
): Map<string, string> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const r = spawn("git", ["cat-file", "--batch"], {
    cwd: root,
    // The batch protocol takes OBJECT names — a bare repo-relative
    // path is not one (git answers `missing`), so every line rides
    // the `HEAD:<path>` rev:path spelling `git show` used.
    input: Buffer.from(paths.map((p) => `HEAD:${p}`).join("\n") + "\n", "utf8"),
    maxBuffer: 512 * 1024 * 1024,
  });
  if (r.error !== undefined) throw new Error(`git cat-file --batch failed to spawn: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`git cat-file --batch exited ${String(r.status)}: ${(r.stderr ?? Buffer.alloc(0)).toString("utf8").slice(0, 400)}`);
  const out = r.stdout;
  let off = 0;
  for (const p of paths) {
    const nl = out.indexOf(0x0a, off);
    if (nl < 0) throw new Error(`git cat-file --batch stream ended before ${p} (offset ${String(off)})`);
    const header = out.slice(off, nl).toString("utf8");
    // A miss prints `<path> missing` (no sha, no blob) — that is a
    // corrupt request, not an empty file: the callers batch TRACKED
    // rosters, so a missing row means the roster lied.
    const size = /^[0-9a-f]{40} blob (\d+)$/u.exec(header)?.[1];
    if (size === undefined) throw new Error(`git cat-file --batch: ${p}: ${header} (the committed plane must be complete)`);
    const start = nl + 1;
    const end = start + Number(size);
    map.set(p, out.slice(start, end).toString("utf8"));
    off = end + 1; // the LF cat-file appends after the contents
  }
  return map;
}
