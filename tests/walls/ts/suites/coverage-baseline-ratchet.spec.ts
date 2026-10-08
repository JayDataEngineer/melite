// coverage-baseline-ratchet.spec.ts — THE RATCHET LAW'S MACHINE
// CHECK (2026-10-13, audit F3).
//
// coverage-baseline.ts states two obligations in prose: every gated
// file HAS a row ("a gated file without a row here would be judged by
// nothing at all"), and floors only move UP ("the gate will not
// demand it, this file's law does"). Until this spec, NEITHER was
// enforced by anything: the only importers of COVERAGE_BASELINE were
// vitest.config.ts's threshold spread. A dropped or duplicated row
// silently exempts a file from the gate — exactly the failure mode
// the baseline file's own header warns about.
//
// This is a textual/structural pin in the gate-regressions.spec.ts
// style: the gate IS the config, and a regression is a config edit.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COVERAGE_BASELINE } from "../../../../scripts/coverage-baseline.ts";

const ROOT = join(__dirname, "..", "..", "..", "..");

// THE FLAP CLAUSE (2026-10-18, the R1 battery; bounded same day per
// the gate-integrity audit's B1). A floor is pinned at a MEASURED
// value, and one measurement can be the HIGH face of a
// load-nondeterministic path: PoseViewer3D.tsx executes 83 of 194
// statements unloaded (5/5 isolated runs) but 82 under worker load
// (the full battery, twice) — a floor at the high face makes the
// GATE flap with CI load. A floor may therefore fall, ONCE per
// row, only through an entry here — and the entry is BOUNDED:
// it excuses exactly the argued transition (the monotonicity arm
// demands was === from and now >= to, per metric, so a later drop
// below `to`, or any second drop after the transition landed,
// still fails), the cited roadmap heading must exist, and a past
// reviewBy re-fails the arm — forcing ratchet-back or a freshly
// argued entry. When the ratchet-back lands (the row reaches `from`
// again), the cleanup arm demands the entry's removal.
const ARGUED_FLOOR_DROPS: Record<string, {
  from: { statements: number, branches: number, functions: number, lines: number },
  to: { statements: number, branches: number, functions: number, lines: number },
  roadmapHeading: string,
  reviewBy: string,
  reason: string,
}> = {
  "**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseViewer3D.tsx": {
    from: { statements: 42.78, branches: 47.54, functions: 33.33, lines: 46.71 },
    to: { statements: 42.26, branches: 46.99, functions: 33.33, lines: 46.71 },
    roadmapHeading: "### H-flap — PoseViewer3D's load-racy coverage path",
    reviewBy: "2026-11-01",
    reason: "the load face of a worker-contention race: 82/194 statements under the full battery (twice) vs 83/194 in 5/5 isolated runs; functions/lines stable on both faces. Ratchet back when the path is deterministic.",
  },
};

// Every .ts/.tsx file under the two-level package src tree — the
// coverage include glob's own shape (vitest.config.ts:465): exactly
// packages/<scope>/<pkg>/src/**. Two levels of package, then src;
// a star-slash in a block comment would close it, so the shape is
// spelled with directory reads instead of a glob string.
function includeGlobFiles(): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    let entries: ReturnType<typeof readdirSync<{ withFileTypes: true }>>;
    try {
      entries = readdirSync(join(ROOT, rel), { withFileTypes: true });
    } catch {
      return; // no src tree (a scripts-only or flat package)
    }
    for (const entry of entries as unknown as { name: string, isDirectory: () => boolean }[]) {
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "lib" || entry.name === "dist") continue;
        walk(`${rel}/${entry.name}`);
      } else if (/\.tsx?$/u.test(entry.name)) {
        out.push(`${rel}/${entry.name}`);
      }
    }
  };
  for (const scope of safeReaddir("packages")) {
    for (const pkg of safeReaddir(`packages/${scope}`)) {
      walk(`packages/${scope}/${pkg}/src`);
    }
  }
  return out;
}

function safeReaddir(rel: string): string[] {
  try {
    return (readdirSync(join(ROOT, rel), { withFileTypes: true }) as unknown as { name: string, isDirectory: () => boolean }[])
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// The coverage exclude list, read from the config as TEXT. The config
// is TS and cannot be evaluated here without booting the whole vitest
// config module; the list is a literal array of quoted strings and the
// spec parses exactly those. Entries are GLOBS, not literals — the
// types.ts exclusion is one two-level wildcard — so each becomes a
// matcher the same way a row key does.
function excludedFiles(): RegExp[] {
  const text = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
  const start = text.indexOf("coverage: {");
  assert(start > -1, "the coverage block exists");
  const end = text.indexOf("thresholds:", start);
  const block = text.slice(start, end > start ? end : text.length);
  const out: RegExp[] = [];
  for (const m of block.matchAll(/'((?:packages|scripts)\/[^']+)'/gu)) {
    out.push(globMatcher(m[1]!));
  }
  return out;
}

// A path glob becomes a RegExp: double-star stands for zero or more
// directories, a single star for one segment. Both the baseline row
// keys and the config's exclude entries use this form. The
// double-star is parked on a sentinel FIRST (the vendor glob's
// 2026-10-14 lesson: rebuilding `(?:.*/)?` before the single-star
// pass let that pass re-replace the star INSIDE the insert, so
// `packages/vendor/**/*` silently matched one level only — the wall
// would have blessed a broken exclusion).
function globMatcher(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*\*/gu, "\u0000")
    .replace(/\*/gu, "[^/]*")
    .replace(/\u0000\//gu, "(?:.*/)?")
    .replace(/\u0000/gu, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

// A row key (the baseline's own double-star path form) becomes a
// RegExp: one or more leading directories, then the tail.
function toMatcher(glob: string): RegExp {
  return globMatcher(glob);
}

describe("THE COVERAGE RATCHET LAW (floors only move UP; every gated file has a row)", () => {
  it("every gated file has exactly one baseline row, and every row matches a real file", () => {
    const excluded = excludedFiles();
    const gated = includeGlobFiles().filter((f) => !excluded.some((re) => re.test(f))).sort();
    const keys = Object.keys(COVERAGE_BASELINE);
    expect(keys.length).toBe(gated.length);

    const matchers = keys.map((k) => [k, toMatcher(k)] as const);
    for (const file of gated) {
      const hits = matchers.filter(([, re]) => re.test(file)).map(([k]) => k);
      expect(hits, `${file} has exactly one baseline row`).toHaveLength(1);
    }
    for (const [key, re] of matchers) {
      const hits = gated.filter((f) => re.test(f));
      expect(hits.length, `${key} matches at least one gated file`).toBeGreaterThan(0);
    }
  });

  it("every row carries four finite floors", () => {
    for (const [key, row] of Object.entries(COVERAGE_BASELINE)) {
      for (const metric of ["statements", "branches", "functions", "lines"] as const) {
        const value = (row as Record<string, unknown>)[metric];
        expect(typeof value, `${key} ${metric}`).toBe("number");
        expect(Number.isFinite(value as number), `${key} ${metric} is finite`).toBe(true);
        expect(value as number, `${key} ${metric} is a percentage`).toBeGreaterThanOrEqual(0);
        expect(value as number, `${key} ${metric} is a percentage`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("no floor moved DOWN except where the landing deleted that file's lines or the drop is argued (the flap clause)", (ctx) => {
    // THE REMOVAL CLAUSE (2026-10-13). Floors only move UP — but a
    // landing that DELETES code lowers the measured ratio honestly:
    // removing the hand-rolled clone seat (the extensions law) dropped
    // melite-estate/provisioning.ts below its floor because the removed
    // lines were covered. So a floor may fall exactly once per row, in
    // the landing whose diff deletes lines from that SAME file. The
    // comparison below is against the committed table (HEAD), because
    // the working tree is the landing under test.
    const prev = execFileSyncSafe(["git", "show", "HEAD:scripts/coverage-baseline.ts"]);
    if (prev === null) {
      ctx.skip(true, "no git history available (tarball or shallow clone) — monotonicity unproven here (the row/floor arms above still judged the table)");
      return;
    }
    const before = parseRows(prev);
    for (const [key, row] of Object.entries(COVERAGE_BASELINE)) {
      const was = before[key];
      if (was === undefined) continue; // a NEW row cannot move down
      const rel = key.replace(/^\*\*\//u, "");
      const numstat = execFileSyncSafe(["git", "diff", "--numstat", "HEAD", "--", rel]);
      const deleted = numstat === null ? 0 : Number(numstat.trim().split("\t")[0] ?? "0");
      for (const metric of ["statements", "branches", "functions", "lines"] as const) {
        const now = (row as Record<string, number>)[metric];
        if (now >= was[metric]) continue;
        // the flap clause, BOUNDED: the entry excuses exactly the
        // argued transition — the committed floor must equal the
        // entry's `from` and the working floor must not undercut
        // its `to`. A second drop, a deeper drop, or a drop on any
        // other key fails here as before.
        const argued = ARGUED_FLOOR_DROPS[key];
        if (argued !== undefined
          && was[metric] === argued.from[metric]
          && now >= argued.to[metric]) continue;
        expect(
          deleted,
          `${key} ${metric} moved down from ${was[metric]} to ${now}, and the landing deleted ` +
            `no lines from ${rel} — a floor may only fall when the code it measured is gone`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("every argued drop stays argued: the roadmap row exists, the review date is future, and a landed ratchet-back removes the entry", (ctx) => {
    // B1's other half (the gate-integrity audit, 2026-10-18): an
    // argument that cites nothing and expires never is a permanent
    // floor cut. Each entry's heading must resolve in the roadmap,
    // its reviewBy must not have passed, and once the row climbs
    // back to the argued `from` face the entry is void and must go.
    let roadmap: string;
    try {
      roadmap = readFileSync(join(ROOT, "dev_docs", "ROADMAP.md"), "utf8");
    } catch {
      ctx.skip(true, "dev_docs/ROADMAP.md is absent (a CI tree without developer-local material) — the citation is unproven here (the monotonicity bounds above still judged every drop)");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const [key, entry] of Object.entries(ARGUED_FLOOR_DROPS)) {
      const row = COVERAGE_BASELINE[key];
      expect(row, `${key} has an argued drop but no baseline row`).toBeDefined();
      expect(roadmap.includes(entry.roadmapHeading),
        `${key}'s argued drop cites roadmap heading ${JSON.stringify(entry.roadmapHeading)}, which does not exist in dev_docs/ROADMAP.md`).toBe(true);
      expect(entry.reviewBy, `${key}'s reviewBy must be an ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(entry.reviewBy >= today,
        `${key}'s argued drop expired (reviewBy ${entry.reviewBy} < ${today}) — ratchet the floor back or re-argue with fresh evidence`).toBe(true);
      expect(entry.reason.length, `${key}'s reason carries the evidence`).toBeGreaterThan(20);
      for (const metric of ["statements", "branches", "functions", "lines"] as const) {
        expect(entry.to[metric] <= entry.from[metric],
          `${key} ${metric}: an argued DROP cannot have to > from`).toBe(true);
      }
      if (row !== undefined) {
        const restored = (["statements", "branches", "functions", "lines"] as const)
          .every((m) => (row as Record<string, number>)[m] >= entry.from[m]);
        expect(restored,
          `${key} reached the argued 'from' face again — the ratchet-back landed; remove the ARGUED_FLOOR_DROPS entry in the same commit`).toBe(false);
      }
    }
  });
});

function execFileSyncSafe(cmd: string[]): string | null {
  try {
    // eslint-disable-next-line n/no-sync
    return execFileSync(cmd[0]!, cmd.slice(1), { encoding: "utf8", cwd: ROOT });
  } catch {
    return null;
  }
}

/** The prior table, read back through the module itself so both
 *  sides share one parser (a regex over the source would drift). */
function parseRows(source: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const m of source.matchAll(/'([^']+)':\s*\{\s*statements:\s*([\d.]+),\s*branches:\s*([\d.]+),\s*functions:\s*([\d.]+),\s*lines:\s*([\d.]+)\s*\}/gu)) {
    out[m[1]!] = { statements: Number(m[2]), branches: Number(m[3]), functions: Number(m[4]), lines: Number(m[5]) };
  }
  return out;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
