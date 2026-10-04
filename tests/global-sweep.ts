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
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Every prefix a suite in this tree mints under os.tmpdir(). The list
 *  is a BACKSTOP for trees minted before the run-scoped root (1a); it
 *  was 60 short when the audit measured 4 GB of unswept leftovers, and
 *  it is regenerated from the tree by grepping mkdtempSync. */
const SUITE_PREFIXES = [
  "agents-", "agents-unread-", "bench-spec-", "cards-", "catalog-",
  "comfyui-t-", "disclose-repo-", "disclose-wall-", "drafts-remote-",
  "drafts-store-", "emptybin-", "epcfg-", "estate-composition-wall-",
  "estate-models-", "estate-models-noroot-", "estate-queue-",
  "estate-seam-", "facts-", "fakebin-", "film-mux-", "film-mux-bad-",
  "film-mux-na-", "film-mux-ro-", "flows-", "flows-state-", "leaf-",
  "leaf2-", "ledger-tail-", "manage-", "manage-remote-", "models-svc-",
  "melite-agent-audit-", "mount-", "place-", "place-out-", "pnpm-health-",
  "provisioner-wall-", "pyvalue-", "queue-", "runs-list-",
  "runs-list-model-", "runs-remote-", "runs-seat-", "runs-start-",
  "runstypes-", "skills-", "skills-seat-", "state-",
  "tool-output-wall-", "upscale-", "upscale-rel-",
  "agents-notdir-",
  "bench-home-",
  "bench-picks-",
  "depdoc-red-",
  "estate-bootdoc-home-",
  "estate-bootdoc-repro-",
  "estate-models-edges-",
  "estate-provisioning-",
  "estate-provisioning-artifact-",
  "estate-provisioning-fs-seam-",
  "estate-provisioning-runtime-",
  "estate-provisioning-store-",
  "hint-probe-root-",
  "lane-seat-",
  "ledger-x-",
  "ledger-x-empty-",
  "load-roundtrip-wall-",
  "manage-abort-",
  "manage-cancel-",
  "manage-child-",
  "manage-endpoint-",
  "manage-extra-",
  "manage-halfseat-",
  "manage-linkcancel-",
  "manage-mutate-seatless-",
  "manage-provision-",
  "manage-queue-",
  "manage-snapshot-",
  "manage-status-",
  "manage-status-seatless-",
  "mcp-args-",
  "media-route-",
  "melite-cat-",
  "melite-clear-",
  "melite-dangling-roots-",
  "melite-ext-flag-",
  "melite-ext-verify-",
  "melite-lockaw-",
  "melite-lockboot-",
  "melite-lockd-",
  "melite-lockled-",
  "melite-lockpaths-",
  "melite-lockr-",
  "melite-lockrel-",
  "melite-mll-",
  "melite-resurrect-",
  "melite-sec-",
  "melite-tails-",
  "melite-trunc-",
  "mfs-",
  "model-path-",
  "model-path-empty-",
  "ownmount-",
  "provisioning-service-coverage-",
  "remote-spec-",
  "rootmount-",
  "runs-source-echo-",
  "skill-plane-empty-",
  "skill-registry-empty-",
  "tc-gate-fixture-",
] as const;

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
        // owner's tree is never touched, however long its suites run
        if (name.startsWith("melite-run-")) {
          const full = join(tmpdir(), name);
          try {
            if (ownerAlive(full)) continue;
            rmSync(full, { recursive: true, force: true });
            swept++;
          } catch {
            /* raced */
          }
          continue;
        }
        if (!SUITE_PREFIXES.some((pfx) => name.startsWith(pfx))) continue;
        const full = join(tmpdir(), name);
        try {
          // trees older than the longest suite budget — a CONCURRENT
          // run mints and writes inside nested directories, which
          // leaves the top-level mtime untouched, so a one-second fence
          // deleted a live run's tree (the same defect the run-root
          // arm had). The legacy trees carry no marker, so age is the
          // only fence they have; it must clear a whole suite.
          if (statSync(full).mtimeMs < runStart - LEGACY_STALE_MS) {
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
