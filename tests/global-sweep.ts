// global-sweep.ts — the /tmp ownership net (stroke 13, 2026-09-14).
//
// THE LAW (tests/harness.ts, quoted): "Own each acquired resource
// through its teardown: every helper that mints a temp dir / env
// overlay returns a disposer." Most suites predate the helper and
// mkdtemp freely — a single suite run leaks a few dozen trees, which
// is invisible until a day of iterate-run-fix loops minted ~a million
// inodes and ENOSPC'd the 32G tmpfs for EVERYTHING (bash launches,
// atomic file writes — the whole harness). Two layers now hold it:
//
//   1. this global setup/teardown. TWO mechanisms, because the prefix
//      table alone was measured failing (2026-10-13): it swept 3 dirs
//      while 17,728 minted-but-unswept dirs held 4 GB, and 82 of the
//      tree's minted prefixes were missing from it — the header's
//      "accumulation across runs is impossible" was FALSE.
//
//      1a. THE RUN-SCOPED ROOT (primary, exhaustive by construction):
//          setup mints one directory and points TMPDIR at it, so every
//          mkdtemp in every suite lands inside a tree this file OWNS.
//          Teardown removes it whole. A prefix list cannot miss what
//          never leaves the root; a killed run leaks ONE dir, and the
//          next run's pre-sweep takes it.
//
//      1b. THE LEGACY PREFIX SWEEP (backstop, best-effort): it reclaims
//          what the suites minted BEFORE 1a existed, and runs BEFORE as
//          well as after — a teardown-only sweep structurally cannot
//          clean up a run that was killed.
//   2. per-suite onTestFinished ownership where the hammering happens
//      (drafts/comfyui suites) — the law's own shape, layer 1 is the
//      net under the law, never a replacement for it.
//
// The prefix table is the suites' literal mkdtemp prefixes (audited
// by grep, 2026-09-14); anything else in /tmp is not ours and is
// never touched.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Every prefix a suite in this tree mints under os.tmpdir(). The list
 *  is a BACKSTOP for trees minted before the run-scoped root (1a); it
 *  was 60 short when the audit measured 4 GB of unswept leftovers, and
 *  it is regenerated from the tree by grepping mkdtempSync. */
// the generated table, not a hand list (the flake audit's Option A,
// 2026-10-13): the walk in scripts/tmp-prefixes.mjs derives every
// literal mkdtemp prefix from the tree at load time — the hand table
// was 135 of 232 prefixes short and 12 rows dead when the wall first
// diffed it. The wiring arm (scripts/test-infra-wiring.spec.ts) pins
// the generator itself.
import { suitePrefixes } from "../scripts/tmp-prefixes.mjs";
const SUITE_PREFIXES: readonly string[] = suitePrefixes();

/** vitest globalSetup contract: run start; returns teardown sweep. */
export default function setup(): () => void {
  const runStart = Date.now();
  // (1a) every mint from here on lands inside a tree we own. TMPDIR is
  // re-read per os.tmpdir() call on POSIX, and globalSetup runs before
  // any spec module is imported, so even a module-level tmpdir() sees
  // the scoped root.
  const runRoot = mkdtempSync(join(tmpdir(), "melite-run-"));
  // THE OWNERSHIP MARKER (the flake audit, 2026-10-15): the sweep used
  // to judge a run root by its top-level mtime, but nothing updates a
  // directory's mtime when work happens in NESTED directories — so a
  // run whose suites take more than a minute deleted its OWN tree out
  // from under itself (or under a concurrent run), taking every spec
  // in that run with it. The root now carries its owner's pid, and the
  // sweep removes a root only when no live process claims it.
  writeFileSync(join(runRoot, OWNER_FILE), String(process.pid));
  const previousTmp = process.env["TMPDIR"];
  process.env["TMPDIR"] = runRoot;
  // (1b) BEFORE as well as after: a run that was killed never reaches a
  // teardown, so a teardown-only sweep leaks exactly the trees left by
  // the crash it would have cleaned up.
  sweep(runStart);
  return function teardown(): void {
      if (previousTmp === undefined) delete process.env["TMPDIR"];
      else process.env["TMPDIR"] = previousTmp;
      rmSync(runRoot, { recursive: true, force: true });
      sweep(runStart);
  };
}

/** Is any entry anywhere under root newer than the fence — one
 *  live write anywhere in the subtree means a live suite owns it.
 *  Walks top-down and stops at the first fresh entry; races with a
 *  concurrent teardown read as not-fresh (their sweep takes it). */
function subtreeFresh(root: string, newerThanMs: number): boolean {
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // a vanished subtree is not live
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      try {
        if (statSync(path).mtimeMs >= newerThanMs) return true;
      } catch {
        continue;
      }
      if (entry.isDirectory()) stack.push(path);
    }
  }
  return false;
}

/** The owner marker a run root carries: its pid. A root whose owner
 *  is still running is never swept, whatever its age. */
const OWNER_FILE = ".melite-run-owner";
/** The legacy (unmarked) tree fence: longer than any single suite, so
 *  a live run's tree is never mistaken for a leftover. */
const LEGACY_STALE_MS = 60_000;

/** Is some live process still the owner of this run root? A pid that
 *  no longer exists (a crashed run, or a recycled one) owns nothing. */
function ownerAlive(root: string): boolean {
  try {
    const pid = Number(readFileSync(join(root, OWNER_FILE), "utf8").trim());
    if (!Number.isInteger(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    // ESRCH: the owner is gone — the tree is a leftover. EPERM on
    // another user's pid still means it EXISTS.
    return (error as { code?: string }).code === "EPERM";
  }
}

/** The legacy backstop sweep (1b). Best-effort by design: it never
 *  touches a tree that is not ours, and a tree a CONCURRENT run owns
 *  survives — by the owner marker for run roots, by age for the
 *  unmarked legacy prefixes. */
function sweep(runStart: number): void {
  {
      let swept = 0;
      let names: string[] = [];
      try {
        names = readdirSync(tmpdir());
      } catch {
        return; // no tmpdir to sweep
      }
      for (const name of names) {
        // a run root belongs to the RUN, not to a timestamp: a live
        // owner's tree is never touched, however long its suites run.
        // An OWNER-LESS melite-run-* tree is NOT a run root — it is a
        // suite's nested mint inside a live run's root (every suite
        // mkdtemp's melite-run-* under TMPDIR): pid-reaping it is the
        // mid-run ENOENT burn (variant-switch GESTURE B, 2026-11-11 —
        // a concurrently-running sweep deleted a live sibling suite's
        // tree out from under its atomic rename). It falls to the
        // age-fenced prefix branch below, which keeps fresh mints.
        if (name.startsWith("melite-run-")) {
          const full = join(tmpdir(), name);
          try {
            const marked = existsSync(join(full, OWNER_FILE));
            if (marked && !ownerAlive(full)) {
              // a marked root with a dead owner is a crashed run's
              // leftover — ownership alone fences it, however fresh
              rmSync(full, { recursive: true, force: true });
              swept++;
            } else if (!marked) {
              // an owner-less mint is age-fenced only (a live suite's
              // tree is fresh; a stale pre-1a leftover is old)
              if (statSync(full).mtimeMs < runStart - LEGACY_STALE_MS) {
                rmSync(full, { recursive: true, force: true });
                swept++;
              }
            }
          } catch {
            /* raced */
          }
          continue;
        }
        if (!SUITE_PREFIXES.some((pfx) => name.startsWith(pfx))) continue;
        const full = join(tmpdir(), name);
        try {
          // LIVE-SUBTREE FENCE (the variant-switch GESTURE B burn,
          // 2026-11-11): the top-level mtime freezes while a suite
          // works for minutes in NESTED directories (drafts/docs) —
          // the 60s age fence then reaped a LIVE sibling suite's
          // whole tree out from under its atomic rename (ENOENT).
          // A tree that wrote anything, anywhere inside it, within
          // the fence is live; only a tree silent throughout is a
          // leftover.
          if (statSync(full).mtimeMs < runStart - LEGACY_STALE_MS && !subtreeFresh(full, runStart - LEGACY_STALE_MS)) {
            rmSync(full, { recursive: true, force: true });
            swept++;
          }
        } catch {
          /* raced a concurrent run's teardown — leave it to theirs */
        }
      }
      if (swept > 0) {
        process.stdout.write(`[tmp-sweep] reclaimed ${swept} pre-run tmp tree(s)\n`);
      }
  }
}
