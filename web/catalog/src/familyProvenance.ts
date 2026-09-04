// familyProvenance.ts — run→capability provenance (2026-08-09).
//
// A capability tile (Library) declares ONE default family. A run records
// which families actually executed: list_runs projects a `families` array
// from brick-level family keys (backend/core/flows/runner.py
// _run_families — YAML + inline runs both carry it). Provenance is the
// join: "this capability has produced N completed runs, most recently at
// T". The Library badges tiles that have run before — the archive is a
// trace of what each action has already made.
//
// Pure module: fold + format. The fetch (who owns the runs payload) is the
// caller's business — LibrarySidebar polls listRuns on mediaVersion bump.
import type { MediaRun } from "@melite/contracts";

export interface FamilyProvenance {
  /** Completed runs that used this family. */
  count: number;
  /** Unix ms of the most recent completed run (0 when none). */
  lastRunAt: number;
}

/** Fold runs into per-family provenance. Only status "done" runs count —
 *  running / interrupted / stopped runs haven't produced anything yet.
 *  Runs with no families field (pre-provenance sidecars) or a family-less
 *  brick contribute nothing (backward compatible by construction). */
export function familyProvenance(
  runs: MediaRun[],
): Record<string, FamilyProvenance> {
  const out: Record<string, FamilyProvenance> = {};
  for (const run of runs) {
    if (run.status !== "done") continue;
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
