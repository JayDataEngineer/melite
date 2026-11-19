// familyAuthorship.ts — the run→capability authorship join (2026-08-09;
// renamed 2026-11-19, CONTRACTS.md §4 debt 6 — the concept speaks the
// authorship source, never the banned token).
//
// A capability tile (Library) declares ONE default family. A run records
// which families actually executed: list_runs projects a `families` array
// from brick-level family keys (MediaRun.families in @melite/contracts
// mediaTypes.ts — YAML plus inline runs both carry it). Authorship is the
// join: "this capability has produced N completed runs, most recently at T".
// The Library badges tiles that have run before — the archive is a trace of
// what each action has already made.
//
// Pure module: fold + format. The fetch (who owns the runs payload) is the
// caller's business — LibrarySidebar polls listRuns on mediaVersion bump.
import type { MediaRun } from "@melite/contracts";
import { statusOrPendingOf } from "@melite/contracts/stageView";

export interface FamilyAuthorship {
  /** Completed runs that used this family. */
  count: number;
  /** Unix ms of the most recent completed run (0 when none). */
  lastRunAt: number;
}

/** Fold runs into per-family authorship. Only runs that CARRY an
 *  artifact count (the fold's done family: done, cached, reused —
 *  the estate settles success as "completed", which the old raw
 *  `!== "done"` compare never matched, so every real run's
 *  join read "never"). Running / interrupted / stopped runs
 *  haven't produced anything yet. Runs with no families field
 *  (sidecars predating the join) or a family-less brick contribute
 *  nothing (backward compatible by construction). */
export function familyAuthorship(
  runs: MediaRun[],
): Record<string, FamilyAuthorship> {
  const out: Record<string, FamilyAuthorship> = {};
  for (const run of runs) {
    // The view-side read (2026-10-12): a MediaRun.status is a listed
    // wire word no door validated here — an unreadable run simply
    // contributes no entry, never a throw through the barrel.
    const folded = statusOrPendingOf(run.status ?? "");
    if (folded !== "done" && folded !== "cached" && folded !== "reused") continue;
    const fams = run.families ?? [];
    if (fams.length === 0) continue;
    // created_at is unix SECONDS on the server (st_mtime / time.time()).
    const at = typeof run.created_at === "number" ? run.created_at * 1000 : 0;
    // A run counts ONCE per family even if it executed the family in
    // multiple bricks (chain: generate → edit → generate) — the badge
    // counts runs, not bricks.
    const seen = new Set<string>();
    for (const f of fams) {
      if (!f || seen.has(f)) continue;
      seen.add(f);
      const cur = out[f];
      if (cur) {
        cur.count += 1;
        if (at > cur.lastRunAt) cur.lastRunAt = at;
      } else {
        out[f] = { count: 1, lastRunAt: at };
      }
    }
  }
  return out;
}

/** Compact relative time for the tile title — "just now", "5m ago",
 *  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
export function formatLastRun(at: number): string {
  if (!at) return "never";
  const diff = Date.now() - at;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(at).toLocaleDateString();
}
