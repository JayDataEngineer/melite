// ci-shellout-portability.spec.ts — THE CLASS B PORTABILITY CENSUS
// (2026-10-31). The windows legs of CI reded in three classes at
// once: shell wrappers cmd.exe cannot parse (`env -u`, `bash -c`,
// `command -v` through /bin/bash), per-item spawn fan-outs (616
// `git diff --numstat` in one arm, per-file `git show` in others),
// and hard-coded POSIX seats (bare `python3`, `pnpm` without the
// .cmd carrier, directory symlinks windows reserves to admins).
// Each cure below has its own behavioral wall; THIS suite is the
// census — it refuses the class's return in one place, per arm, so
// the next shell-out lands red here before it lands on windows.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCommittedBatch } from "../lib/committed-batch.ts";
import { walkFiles } from "../lib/models-lib-sync-judge.ts";

const ROOT = join(import.meta.dirname, "../../../..");
const WALLS = join(ROOT, "tests/walls/ts");
const read = (p: string): string => readFileSync(join(ROOT, p), "utf8");

/** Every line of a walls-tier source file, tagged with its path. */
function wallsLines(): { path: string; line: string }[] {
  const rows: { path: string; line: string }[] = [];
  for (const rel of walkFiles(WALLS)) {
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    for (const line of readFileSync(join(WALLS, rel), "utf8").split("\n")) {
      rows.push({ path: rel, line });
    }
  }
  return rows;
}

describe("the class B portability census (windows CI, 2026-10-31)", () => {
  it("no walls-tier source spawns a shell: bash/sh first args, shell options, && chains", () => {
    // The ship lane and the GPU lane are bash ARTIFACTS — their own
    // syntax-check/launcher spawns carry an inline `census-allow`
    // marker, greppable and diff-reviewable. String literals pinning
    // audited recipes (`.includes("spawnSync('bash'")`) and block
    // comments are stripped before the spawn regex reads a line.
    const offenders = wallsLines()
      .filter(({ line }) => !/census-allow/u.test(line))
      .filter(({ line }) => !/^\s*(?:\*|\/\/)/u.test(line))
      .map(({ path, line }) => ({
        path,
        line: line.replace(/\.includes\(\s*(["'])(.*?)\1\s*\)/gu, ".includes()").replace(/\/\/.*$/u, ""),
      }))
      .filter(({ line }) => /\b(?:execFileSync|execSync|spawnSync)\(\s*["'](?:ba)?sh["']/u.test(line)
        || /shell:\s*(?:true|["']\/bin\/(?:ba)?sh["'])/u.test(line));
    expect(
      offenders.map((o) => `${o.path}: ${o.line.trim()}`),
      "the walls tier must spawn argv-form processes only (cmd.exe parses none of the shell spellings)",
    ).toEqual([]);
  });

  it("the cured platform switches are present — the cure's fingerprint, deleted = red", () => {
    // Each literal is the MINIMAL witness of its cure; removing the
    // cure reds this arm the same run it regresses windows.
    // the witnesses are QUOTED code spellings — a prose mention in a
    // comment must never satisfy the fingerprint
    expect(read("tests/walls/ts/suites/hook-config.spec.ts"), "hook-config rides the per-platform lefthook bin").toContain("'lefthook.cmd'");
    expect(read("tests/walls/ts/suites/gpu-tier-keyless.spec.ts"), "gpu-tier's pnpm seat carries the windows shell").toContain('"pnpm.cmd"');
    expect(read("tests/walls/ts/suites/dep-doctor.spec.ts"), "dep-doctor's synthetic links use a junction on windows").toContain('"junction"');
    expect(read("tests/walls/ts/suites/cold-clone-pack-import.spec.ts"), "cold-clone resolves python through the portable seat").toContain("pythonBin()");
    expect(read("tests/walls/ts/lib/python-bin.ts"), "the python seat probes win32's 'python' (the Store alias stub)").toContain('"python"');
    expect(read("tests/walls/ts/lib/models-lib-sync-judge.ts"), "the judge's emit pins LF").toContain('"--newLine", "lf"');
    expect(read("tools/build-plane.mjs"), "the build plane's face emit pins LF").toContain("'--newLine', 'lf'");
    expect(read("tools/tsc-path.mjs"), "the compiler fallback walks PATH in node").toContain("delimiter");
    expect(read("tools/tsc-path.mjs"), "no `command -v` through /bin/bash remains").not.toContain('"command"');
    expect(read("tools/tsc-path.mjs"), "no `command -v` through /bin/bash remains").not.toContain('shell:');
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const envPrefixed = Object.entries(pkg.scripts).filter(([, v]) => v.startsWith("env -u"));
    expect(envPrefixed, "no package script may carry the `env -u` coreutils-ism").toEqual([]);
    expect(pkg.scripts["test:coverage"], "the coverage gate's shared-reports seat rides the walker's flag").toContain("--coverage-shared");
  });

  it("the per-item fan-outs stay batched: one cat-file spawn for a hundred committed reads", () => {
    // MUTATION KILLED: a per-file `git show` loop regrowing in the
    // batch reader's callers — the class that made the windows legs
    // time out at 81 s. The counting spawn makes the spawn MATH the
    // judged fact: N files, ONE process.
    const tracked = spawnSync("git", ["ls-files", "tests/walls/ts"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
      .stdout.split("\n").filter((p: string) => /\.(ts|json)$/.test(p)).slice(0, 120);
    expect(tracked.length, "the arm needs a real hundred-file batch").toBeGreaterThan(100);
    let calls = 0;
    const counting = ((cmd: string, args: string[], opts: object) => {
      calls += 1;
      return spawnSync(cmd, args, opts);
    }) as typeof spawnSync;
    const bytes = readCommittedBatch(tracked, ROOT, counting);
    expect(calls, "a hundred committed reads must cost ONE spawn").toBe(1);
    expect(bytes.size, "every requested committed byte came back").toBe(tracked.length);
  });

  it("the flap clause's numstat is one whole-tree spawn, never per-row", () => {
    const ratchet = read("tests/walls/ts/suites/coverage-baseline-ratchet.spec.ts");
    expect(ratchet, "the whole-tree numstat (one spawn, parsed once) is present").toContain('["git", "diff", "--numstat", "HEAD"]');
    expect(ratchet, "the per-row numstat fan-out must not regrow").not.toContain('"--numstat", "HEAD", "--", rel]');
  });
});
