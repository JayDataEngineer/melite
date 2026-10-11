import { statusOrPendingOf } from "@melite/contracts/stageView";
/** Fold runs into per-family provenance. Only runs that CARRY an
 *  artifact count (the fold's done family: done, cached, reused —
 *  the estate settles success as "completed", which the old raw
 *  `!== "done"` compare never matched, so every real run's
 *  provenance read "never"). Running / interrupted / stopped runs
 *  haven't produced anything yet. Runs with no families field
 *  (pre-provenance sidecars) or a family-less brick contribute
 *  nothing (backward compatible by construction). */
export function familyProvenance(runs) {
    const out = {};
    for (const run of runs) {
        // The view-side read (2026-10-12): a MediaRun.status is a listed
        // wire word no door validated here — an unreadable run simply
        // contributes no provenance, never a throw through the barrel.
        const folded = statusOrPendingOf(run.status ?? "");
        if (folded !== "done" && folded !== "cached" && folded !== "reused")
            continue;
        const fams = run.families ?? [];
        if (fams.length === 0)
            continue;
        // created_at is unix SECONDS on the server (st_mtime / time.time()).
        const at = typeof run.created_at === "number" ? run.created_at * 1000 : 0;
        // A run counts ONCE per family even if it executed the family in
        // multiple bricks (chain: generate → edit → generate) — the badge
        // counts runs, not bricks.
        const seen = new Set();
        for (const f of fams) {
            if (!f || seen.has(f))
                continue;
            seen.add(f);
            const cur = out[f];
            if (cur) {
                cur.count += 1;
                if (at > cur.lastRunAt)
                    cur.lastRunAt = at;
            }
            else {
                out[f] = { count: 1, lastRunAt: at };
            }
        }
    }
    return out;
}
/** Compact relative time for the tile title — "just now", "5m ago",
 *  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
export function formatLastRun(at) {
    if (!at)
        return "never";
    const diff = Date.now() - at;
    if (diff < 60_000)
        return "just now";
    if (diff < 3_600_000)
        return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000)
        return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000)
        return `${Math.floor(diff / 86_400_000)}d ago`;
    return new Date(at).toLocaleDateString();
}
//# sourceMappingURL=familyProvenance.js.map