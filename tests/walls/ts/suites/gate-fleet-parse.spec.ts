// gate-fleet-parse.spec.ts — THE GATE FLEET PARSES (the c7444da38
// burn, 2026-11-19): scripts/bump-release-version.mjs sat
// SYNTACTICALLY BROKEN on main for three days — a die() message
// carried unescaped backticks inside a template literal (line 163,
// landed by the tested-versions judge AFTER rc.4), so
// `node scripts/bump-release-version.mjs` died at MODULE LOAD
// (SyntaxError: missing ) after argument line). Every wall judged
// the tool's OUTPUT contract while no wall ever PARSED the tool
// itself; the defect waited silently at the release door until the
// operator-ordered alpha bump tripped it. This wall is the fleet's
// own health check: every .mjs gate script under scripts/ and
// tools/ must parse under `node --check` — a gate tool that cannot
// load can judge nothing, and a broken one must never sit green.
//
// ARM 1 — THE CENSUS: every scripts/*.mjs and tools/*.mjs (read
// from the directories live, never a frozen list — an empty census
// is the wall's loudest red) passes `node --check`.
// ARM 2 — THE CHECKER FIRES (the toggle-red mirror): the burn's
// verbatim die() line, written to a temp .mjs, FAILS
// `node --check` with a SyntaxError. A parse gate that cannot fail
// is a fake wall; this arm re-fires the c7444da38 class every run
// so the census arm can never rot into a no-op.
// ARM 3 — THE SANITY FLOOR: node --check accepts a well-formed
// .mjs — the judge answers both ways, or it is broken itself.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));
const NODE = process.execPath;

/** `node --check <file>` — the real parser, zero reimplementation. */
function check(file: string) {
  return spawnSync(NODE, ["--check", file], { encoding: "utf8" });
}

/** The live .mjs census of one gate directory (never a frozen list). */
function censusMjs(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".mjs")).map((f) => join(ROOT, dir, f)).sort();
}

describe("gate-fleet-parse — the gate fleet parses (the c7444da38 burn)", () => {
  it("ARM 1 — THE CENSUS: every scripts/*.mjs and tools/*.mjs parses under node --check (empty census = loudest red)", () => {
    const fleet = [...censusMjs("scripts"), ...censusMjs("tools")];
    expect(
      fleet.length,
      "the fleet census found no .mjs gate scripts — the census is pointing at nothing, which is the wall's loudest red",
    ).toBeGreaterThan(0);

    const broken = fleet
      .filter((f) => check(f).status !== 0)
      .map((f) => `${f}\n${check(f).stderr ?? ""}`.trim());
    expect(
      broken,
      `gate tools that cannot even parse — they judge nothing and sit green anyway:\n${broken.join("\n")}`,
    ).toEqual([]);
  });

  it("ARM 2 — THE CHECKER FIRES: the c7444da38 die() line (unescaped backticks in a template literal) fails node --check", () => {
    const seat = mkdtempSync(join(tmpdir(), "gate-fleet-parse-"));
    const file = join(seat, "the-burn.mjs");
    try {
      // The burn's verbatim line 163 — unescaped `v…` backticks inside
      // a template literal terminate it early. If node ever makes this
      // parse, this arm reds: the census arm's judge needs a new burn
      // fixture, never a silent pass.
      writeFileSync(file, "const die = (m) => { throw new Error(m) }\nif (!/x/.test(\"x\")) die(`the README's Tested versions table carries no '\\\\| Melite \\\\| `v…`' row to move — restore the table`)\n");
      const r = check(file);
      expect(
        r.status,
        "node --check ACCEPTED the c7444da38 defect — the checker can no longer fire on the burn class",
      ).not.toBe(0);
      expect(String(r.stderr)).toContain("SyntaxError");
    } finally {
      rmSync(seat, { recursive: true, force: true });
    }
  });

  it("ARM 3 — THE SANITY FLOOR: node --check accepts a well-formed .mjs (the judge answers both ways)", () => {
    const seat = mkdtempSync(join(tmpdir(), "gate-fleet-parse-"));
    const file = join(seat, "well-formed.mjs");
    try {
      writeFileSync(file, "export const ok = (s) => `row: ${s}`\n");
      expect(
        check(file).status,
        "node --check refused a well-formed .mjs — the judge itself is broken",
      ).toBe(0);
    } finally {
      rmSync(seat, { recursive: true, force: true });
    }
  });
});
