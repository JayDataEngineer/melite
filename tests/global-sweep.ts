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
//   1. this global setup/teardown: one `vitest run` sweeps every
//      /tmp tree carrying a test-suite prefix that predates the run —
//      accumulation across runs is impossible;
//   2. per-suite onTestFinished ownership where the hammering happens
//      (drafts/comfyui suites) — the law's own shape, layer 1 is the
//      net under the law, never a replacement for it.
//
// The prefix table is the suites' literal mkdtemp prefixes (audited
// by grep, 2026-09-14); anything else in /tmp is not ours and is
// never touched.
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Every prefix a suite in this tree mints under os.tmpdir(). */
const SUITE_PREFIXES = [
  "agents-", "agents-unread-", "bench-spec-", "cards-", "catalog-",
  "comfyui-t-", "disclose-repo-", "disclose-wall-", "drafts-remote-",
  "drafts-store-", "emptybin-", "epcfg-", "estate-composition-wall-",
  "estate-models-", "estate-models-noroot-", "estate-queue-",
  "estate-seam-", "facts-", "fakebin-", "film-mux-", "film-mux-bad-",
  "film-mux-na-", "film-mux-ro-", "flows-", "flows-state-", "leaf-",
  "leaf2-", "ledger-tail-", "manage-", "manage-remote-", "models-svc-",
  "mount-", "place-", "place-out-", "pnpm-health-",
  "provisioner-wall-", "pyvalue-", "queue-", "runs-list-",
  "runs-list-model-", "runs-remote-", "runs-seat-", "runs-start-",
  "runstypes-", "skills-", "skills-seat-", "state-",
  "tool-output-wall-", "upscale-", "upscale-rel-",
] as const;

/** vitest globalSetup contract: run start; returns teardown sweep. */
export default function setup(): () => void {
  const runStart = Date.now();
  return function teardown(): void {
      let swept = 0;
      let names: string[] = [];
      try {
        names = readdirSync(tmpdir());
      } catch {
        return; // no tmpdir to sweep
      }
      for (const name of names) {
        if (!SUITE_PREFIXES.some((p) => name.startsWith(p))) continue;
        const full = join(tmpdir(), name);
        try {
          // only trees that predate this run — a CONCURRENT vitest
          // run owns its own; mtime is the fence
          if (statSync(full).mtimeMs < runStart - 1_000) {
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
  };
}
