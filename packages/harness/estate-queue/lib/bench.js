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
import { readdir, readFile, stat } from "node:fs/promises";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
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
export function benchDir() {
    return dshHomePath("storages", "drafts", "docs");
}
function benchFiles() {
    return readdir(benchDir()).then((all) => all.filter((f) => f.startsWith("bench-") && f.endsWith(".json")), () => []);
}
/** Cheap change signal — name+mtime+size over EVERY bench doc
 *  (cutoff never applies here: any write, live or stale, must
 *  retrigger the poll so the catalog follows the bench). */
export async function benchFingerprint() {
    const files = await benchFiles();
    const parts = [];
    for (const f of files) {
        try {
            const st = await stat(join(benchDir(), f));
            parts.push(`${f}:${st.mtimeMs}:${st.size}`);
        }
        catch {
            // a vanished doc between readdir and stat contributes nothing
        }
    }
    return parts.sort().join("|");
}
/** The LIVE bench's stage picks — docs written during this
 *  process's life only (the boot cutoff; stale docs from dead
 *  sessions are invisible by law). */
export async function benchPicks() {
    const cutoff = liveCutoffMs();
    const files = await benchFiles();
    const picks = [];
    for (const f of files) {
        try {
            const full = join(benchDir(), f);
            const st = await stat(full);
            if (st.mtimeMs < cutoff)
                continue; // stale — a dead session's doc
            const raw = JSON.parse(await readFile(full, "utf8"));
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
            // a malformed or racing bench doc contributes nothing — never a crash
        }
    }
    return picks;
}
/** The sync twin of benchPicks — for sync surfaces (buildSkillIndex
 *  rides the seat handler synchronously). Same law: live docs only
 *  (mtime >= the process boot), malformed docs contribute nothing. */
export function benchPicksSync() {
    const cutoff = liveCutoffMs();
    let files = [];
    try {
        files = readdirSync(benchDir()).filter((f) => f.startsWith("bench-") && f.endsWith(".json"));
    }
    catch {
        return [];
    }
    const picks = [];
    for (const f of files) {
        try {
            const full = join(benchDir(), f);
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
