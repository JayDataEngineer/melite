// bench.ts — THE LIVE BENCH (the selection's only source,
// 2026-09-21). THE CATALOG IS THE SELECTION (operator law): no
// surface — skill catalog, skill index, anything — may list craft
// the bench does not hold. The bench docs live in the drafts
// storage (one bench-session-<uuid>.json per chat session);
// a stage landing writes one mid-session.
//
// THE BOOT CUTOFF (the poisoned-session law, 2026-09-21): a bench
// doc is LIVE only when it was written during THIS process's life
// (mtime >= the process's first melite boot). A doc from a dead
// session must NEVER speak into a fresh one — the operator's two
// chats were injected at turn one by exactly such a stale file
// (my own test residue, hours old). The cutoff is pinned ONCE PER
// PROCESS on globalThis so the estate's re-apply churn (fresh
// module instances every ~21s) can never reset it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
/** The process's melite boot instant — pinned once, survives the
 *  estate's re-apply churn (each re-apply re-imports modules; the
 *  globalThis pin keeps ONE cutoff per process). */
export function benchBootMs() {
    const g = globalThis;
    g.__meliteBenchBootMs ??= Date.now();
    return g.__meliteBenchBootMs;
}
/** The cutoff with a 5s grace: mtime sub-ms precision vs the boot
 *  instant's integer ms can eat a same-tick write (probe:
 *  mtimeMs X.484 < bootMs X+1); the grace admits same-instant
 *  writes while dead-session docs (minutes/hours old) still die. */
function liveCutoffMs() {
    return benchBootMs() - 5_000;
}
export function benchDir(storageRoot) {
    // ONE ROOT (audit 004/C1, 2026-10-22 — the bench split-brain cure):
    // the reader follows the WRITER — the drafts store's own storage
    // root (<stateRoot>/storage, the store's default law
    // `data/runs/storage`), never a second tree under the DSH home
    // (the retired seam left 181 files there with no writer). A
    // caller that knows the resolved state root passes it; the
    // default matches the store's own default so a config-free
    // caller and the store resolve the SAME tree.
    return join(storageRoot ?? join("data", "runs", "storage"), "drafts", "docs");
}
// BENCHFINGERPRINT IS GONE (the dry-sweep's J18, 2026-10-20): it fed
// a catalog-follow poll that never landed — the probe found zero
// production importers (the spec alone). BENCHPICKS (async) went
// with it for the same reason: the sync twin is the one live seat
// (skillPlane's buildSkillIndex rides it). benchBootMs and benchDir
// stay exported for the spec's direct-src pins; the index.ts face
// no longer re-exports this module's names.
/** The LIVE bench's stage picks — docs written during this
 *  process's life only (the boot cutoff; stale docs from dead
 *  sessions are invisible by law). Sync by need: buildSkillIndex
 *  rides the seat handler synchronously. Malformed or racing docs
 *  contribute nothing — never a crash.
 *  @param storageRoot the drafts store's resolved storage root —
 *  one root for writer and reader (the C1 law); defaults to the
 *  store's own default law. */
export function benchPicksSync(storageRoot) {
    const cutoff = liveCutoffMs();
    const dir = benchDir(storageRoot);
    let files = [];
    try {
        files = readdirSync(dir).filter((f) => f.startsWith("bench-") && f.endsWith(".json"));
    }
    catch (error) {
        // the roster dir may not exist yet (first bench, nothing
        // persisted) or may be unreadable — both mean "no picks to
        // list", the function's own empty answer, never a crash of a
        // census/read path that must degrade to nothing
        if (error.code !== "ENOENT") {
            console.error("[benchPicksSync] roster read failed:", error);
        }
        return [];
    }
    const picks = [];
    for (const f of files) {
        try {
            const full = join(dir, f);
            if (statSync(full).mtimeMs < cutoff)
                continue; // stale — dead session
            const raw = JSON.parse(readFileSync(full, "utf8"));
            for (const stg of raw.record?.doc?.stages ?? raw.doc?.stages ?? []) {
                picks.push({
                    card: typeof stg.card === "string" && stg.card !== "" ? stg.card : null,
                    model: typeof stg.params?.model === "string" && stg.params.model !== ""
                        ? stg.params.model
                        : null,
                });
            }
        }
        catch {
            // malformed or racing — contributes nothing, never a crash
        }
    }
    return picks;
}
//# sourceMappingURL=bench.js.map