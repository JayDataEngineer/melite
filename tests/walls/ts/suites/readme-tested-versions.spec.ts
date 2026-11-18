// readme-tested-versions.spec.ts — THE TESTED-VERSIONS TABLE IS JUDGED,
// NOT TRUSTED (operator 2026-11-18: "is this automated, or is this
// something that will simply be forgotten?"). Three rows, three
// derivations, one table:
//   - Melite: the workspace stamp — ONE version across every
//     @melite/*@melite-plugin/@infer-media manifest (the same census
//     scripts/bump-release-version.mjs rides, which is the row's ONE
//     WRITER). CI-safe: reads only tracked files.
//   - DSH: the HOST dsh binary the estate lanes run (`dsh --version`,
//     DSH_BIN override). Gated on the binary existing — a CI image
//     with no dsh carries no verdict (the e2e tier's own mixed-gating
//     law: an absent seat is not a green seat, the arm says so).
//   - ComfyUI: the live engine's own /system_stats version
//     (MELITE_COMFYUI_URL override). Gated on the engine answering —
//     an absent engine carries no verdict either.
// A red names the row and the repair: the bump script for Melite, a
// real re-test for the two host rows (the table's own note: it names
// what was TESTED, so moving it without testing is the lie this wall
// exists to refuse).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));
const README = readFileSync(join(ROOT, "README.md"), "utf8");

/** The table's row for a component: the first backticked span after
 *  the pipe (| Melite | `v1.2.3` (…) | → v1.2.3). Absent row = the
 *  wall's loudest red: the table itself is the contract. */
function rowOf(component: string): string | null {
  const m = new RegExp("\\| " + component + " \\| `([^`]+)`").exec(README);
  return m === null ? null : m[1]!;
}

const OURS = ["@melite/", "@melite-plugin/", "@infer-media/"];

/** The workspace stamp: one version across every release-set manifest
 *  (the bump script's own discovery — git ls-files, never a readdir
 *  walk that missed the seven-deep action cards). */
function workspaceStamp(): { version: string; count: number } {
  const listing = execFileSync("git", ["ls-files", "*/package.json"], { cwd: ROOT, encoding: "utf8" });
  const versions = new Map<string, number>();
  for (const rel of listing.split("\n")) {
    if (!rel || rel.includes("node_modules/")) continue;
    try {
      const manifest = JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as
        { name?: string; version?: string; private?: boolean };
      if (typeof manifest.name !== "string" || !OURS.some((s) => manifest.name!.startsWith(s))) continue;
      // the bump script's own census law: a private package WITH a
      // version row IS the release set; only versionless privates sit out
      if (typeof manifest.version !== "string" || manifest.version === "") continue;
      versions.set(manifest.version, (versions.get(manifest.version) ?? 0) + 1);
    } catch { /* an unreadable manifest is not a package (the bump script's own law) */ }
  }
  if (versions.size === 0) throw new Error("the release census found zero stamped packages — the walker rotted");
  if (versions.size > 1) {
    throw new Error("split release stamp: " + [...versions.entries()].map(([v, n]) => `${v} (${String(n)})`).join(", ")
      + " — run scripts/bump-release-version.mjs --to <version> (one number, every manifest)");
  }
  const [version] = [...versions.keys()];
  return { version: version!, count: [...versions.values()][0]! };
}

/** PATH walk — the argv-form `command -v` (the walls-tier portability
 * law: no shell spawns; cmd.exe parses none of the shell spellings). */
function onPath(bin: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir !== "" && existsSync(join(dir, bin))) return true;
  }
  return false;
}

describe("THE TESTED-VERSIONS TABLE (README)", () => {
  it("the table seats all three rows (Melite, DSH, ComfyUI) — the table itself is the contract", () => {
    for (const c of ["Melite", "DSH", "ComfyUI"]) {
      expect(rowOf(c), `the README's Tested versions table lost its ${c} row — restore it (one home for the release trio)`).not.toBeNull();
    }
  });

  it("the Melite row EQUALS the workspace stamp (the bump script is the row's one writer)", () => {
    const stamp = workspaceStamp();
    const row = rowOf("Melite")!.replace(/^v/, "");
    expect(stamp.count).toBeGreaterThanOrEqual(6);
    expect(row, `the README's Melite row (${row}) drifted from the stamped release (${stamp.version})`
      + " — run scripts/bump-release-version.mjs --to <version> (it moves the manifests AND this row)").toBe(stamp.version);
  });

  it("the DSH row EQUALS the host dsh the lanes run (gated: no binary, no verdict — the arm says so)", () => {
    const bin = process.env.DSH_BIN ?? "dsh";
    if (!existsSync(join(ROOT, "node_modules"))) throw new Error("no node_modules — run pnpm install");
    if (!onPath(bin)) {
      console.warn(`readme-tested-versions: no ${bin} binary on this box — the DSH row carries no verdict here (test it where the lanes run)`);
      return;
    }
    const live = execFileSync(bin, ["--version"], { encoding: "utf8" })
      .trim().split("\n")[0]!.trim();
    expect(rowOf("DSH")!, `the README's DSH row says ${rowOf("DSH")} but this box's lanes run dsh ${live}`
      + " — re-test the estate on the new dsh, then move the row (the table names what was TESTED)").toBe(live);
  });

  it("the ComfyUI row EQUALS the live engine's own /system_stats (gated: no engine, no verdict — the arm says so)", async () => {
    const base = process.env.MELITE_COMFYUI_URL ?? "http://127.0.0.1:8188";
    let live: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(base + "/system_stats", { signal: ctrl.signal });
      clearTimeout(timer);
      const stats = await res.json() as { system?: { comfyui_version?: string } };
      live = stats.system?.comfyui_version ?? null;
    } catch { /* an absent engine carries no verdict */ }
    if (live === null) {
      console.warn(`readme-tested-versions: no engine at ${base} — the ComfyUI row carries no verdict here (test it where the engine runs)`);
      return;
    }
    expect(rowOf("ComfyUI")!, `the README's ComfyUI row says ${rowOf("ComfyUI")} but the live engine reports ${live}`
      + " — re-test the estate on the new engine, then move the row (the table names what was TESTED)").toBe(live);
  });
});
