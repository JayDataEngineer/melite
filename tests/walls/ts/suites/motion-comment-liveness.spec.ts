// motion-comment-liveness.spec.ts — THE COMMENT-REFERENCE LIVENESS
// SWEEP (motion-journey wave-2 CURE-2, the dead truth home).
//
// The lesion it kills: a comment that names a mechanism that no
// longer exists. For a month the motion params' own header cited the
// strip law `compile.ts _KNOWN_NON_SIG_PARAMS` — a file purged with
// the Python estate — while the real homes moved to the kimodo DECL's
// studio.writes and the compose door. Every wall stayed green: a
// comment citing a nonexistent mechanism is judged by no compiler and
// no behavior test. By the canon (LAW 4 axis 4, DEPTH) that dead
// citation is a finding in itself: the comment states a truth home,
// the truth home is gone, and the next reader cures against a ghost.
//
// The sweep (the profanity-gate pattern, comments face): every
// leading-comment line under packages/motion is pinned two ways —
//   (a) a file mention (`foo.ts`, `dir/bar.tsx`) resolves to a real
//       file: relative to the mentioning file, relative to the repo
//       root, or by basename anywhere in the maintained trees;
//   (b) a mechanism symbol (`_*UPPER*`, `*_(PARAMS|KEYS|PARAM)`)
//       resolves to a real declaration in the maintained trees.
// Wildcard prose (`motion-studio-*.spec.tsx`) is pattern text, not a
// file claim, and rides the wildcard skip.
//
// Detector liveness is proven on a runtime-built fixture (no dirty
// literals planted in tree files — the profanity-gate fixture law):
// dead file + dead symbol refs must be named, live refs must pass.
//
// Red-proof receipt (2026-11-06): a dead reference
// (`compile.ts _KNOWN_NON_SIG_PARAMS`) re-introduced into
// motionParams.ts reds arm A with both judges naming it; removed,
// the arm greens. The eight baseline cures this wall landed on:
// component.tsx's boundary-test cite (the test was purged; the
// tenant-props contract holds the line) and the seven split-era
// header mentions of the deleted motion-studio.spec.tsx.
import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const MOTION_ROOT = join(ROOT, "packages", "motion");
const SKIP_DIRS = new Set(["node_modules", "lib", "dist", ".turbo"]);
const SOURCE_RE = /\.(tsx?|mts|mjs)$/;
/** Leading-comment lines only: the header/section prose where truth
 *  homes are stated. Trailing code comments name live identifiers the
 *  compiler already judges. */
const COMMENT_LINE_RE = /^\s*(\/\/|\/\*|\*)/;

interface Dead {
  file: string;
  line: number;
  ref: string;
  kind: "file" | "symbol";
  why: string;
}

/** Every maintained source file: packages/, tests/, scripts/ — the
 *  resolution universe (lib/ excluded: a name that survives only in
 *  build output is exactly the dead home this sweep kills). */
function maintainedSources(): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      if (SKIP_DIRS.has(e)) continue;
      const p = join(d, e);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (SOURCE_RE.test(e)) out.push(p);
    }
  };
  for (const top of ["packages", "tests", "scripts"]) {
    const dir = join(ROOT, top);
    if (existsSync(dir)) walk(dir);
  }
  return out;
}

/** The sweep over one root: comment lines pinned to real files and
 *  real declarations. `universe` is injectable so the detector-
 *  liveness arm can sweep a runtime fixture. */
export function sweepComments(root: string, universe?: string[]): Dead[] {
  const sources = universe ?? maintainedSources();
  const byBasename = new Map<string, string[]>();
  const allText = sources.map((f) => {
    const b = basename(f);
    if (!byBasename.has(b)) byBasename.set(b, []);
    byBasename.get(b)!.push(f);
    return { f, text: readFileSync(f, "utf8") };
  });
  const fileExists = (fromDir: string, ref: string): boolean =>
    existsSync(join(fromDir, ref)) || existsSync(join(ROOT, ref)) || byBasename.has(basename(ref));
  const declares = (sym: string): boolean => {
    const re = new RegExp(`\\b(?:export\\s+)?(?:const|let|var|function|class|type|interface|enum)\\s+${sym}\\b`);
    return allText.some(({ text }) => re.test(text));
  };

  const dead: Dead[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      if (SKIP_DIRS.has(e)) continue;
      const p = join(d, e);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(p);
        continue;
      }
      if (!SOURCE_RE.test(e)) continue;
      const rel = relative(ROOT, p);
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (!COMMENT_LINE_RE.test(line)) return;
        for (const m of line.matchAll(/\b[A-Za-z0-9_][\w./@-]*\.(?:tsx?|mts|mjs)\b/g)) {
          const ref = m[0];
          const start = m.index ?? 0;
          // glob prose ("motion-studio-*.spec.tsx", "*.spec.tsx") is
          // pattern text, not a file claim: the wildcard rides up to
          // two chars before the match (`*.` or `*`).
          if (line[start - 1] === "*" || (line[start - 1] === "." && line[start - 2] === "*")) continue;
          if (!fileExists(dirname(p), ref)) {
            dead.push({ file: rel, line: i + 1, ref, kind: "file", why: "no such file under packages/, tests/, or scripts/" });
          }
        }
        for (const m of line.matchAll(/\b(?:_[A-Z][A-Z0-9_]{2,}|[A-Z][A-Z0-9_]{3,}_(?:PARAMS|KEYS|PARAM))\b/g)) {
          const sym = m[0];
          if (!declares(sym)) {
            dead.push({ file: rel, line: i + 1, ref: sym, kind: "symbol", why: "no declaration in the maintained trees" });
          }
        }
      });
    }
  };
  walk(root);
  return dead;
}

describe("the comment-reference liveness sweep (CURE-2: no dead truth home)", () => {
  it("every file and mechanism reference in packages/motion comments resolves — the compile.ts lesson", () => {
    const scanned: string[] = [];
    const walkCount = (d: string): void => {
      for (const e of readdirSync(d)) {
        if (SKIP_DIRS.has(e)) continue;
        const p = join(d, e);
        const st = statSync(p);
        if (st.isDirectory()) walkCount(p);
        else if (SOURCE_RE.test(e)) scanned.push(p);
      }
    };
    walkCount(MOTION_ROOT);
    expect(scanned.length, "the sweep walked no motion sources — the root or the walker broke (a vacuous green)").toBeGreaterThan(0);
    const dead = sweepComments(MOTION_ROOT);
    expect(
      dead.map((d) => `${d.file}:${d.line} ${d.kind} ref '${d.ref}' — ${d.why}`),
      "dead comment references — a comment naming a mechanism that does not exist is a DEPTH finding (cure the comment to the real home, never the tree to the comment)",
    ).toEqual([]);
  });

  it("the detectors fire: runtime-planted dead refs are named, live refs pass", () => {
    const dir = mkdtempSync(join(tmpdir(), "motion-comment-liveness-"));
    try {
      const live = join(dir, "live.ts");
      writeFileSync(live, 'export const MOTION_BG_IMAGE_PARAM = "motion_bg_image"\n');
      writeFileSync(join(dir, "live2.ts"), 'import { MOTION_BG_IMAGE_PARAM } from "./live.ts"\n');
      writeFileSync(
        join(dir, "dirty.ts"),
        [
          "// strip home (compile.ts _KNOWN_NON_SIG_PARAMS) — both dead",
          "// the live pair: live.ts and MOTION_BG_IMAGE_PARAM resolve",
          "// glob prose rides the skip: motion-studio-*.spec.tsx",
        ].join("\n"),
      );
      const universe = [live, join(dir, "live2.ts"), join(dir, "dirty.ts")];
      const dead = sweepComments(dir, universe);
      const named = dead.map((d) => `${d.kind}:${d.ref}`).sort();
      expect(named).toEqual(["file:compile.ts", "symbol:_KNOWN_NON_SIG_PARAMS"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
