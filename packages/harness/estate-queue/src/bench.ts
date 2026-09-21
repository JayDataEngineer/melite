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
import { homedir } from "node:os";

/** One bench stage's picks — the card it composes and the model it
 *  names (the model is unstated unless explicitly put in params). */
export interface StagePick {
  readonly card: string | null;
  readonly model: string | null;
}

/** The process's melite boot instant — pinned once, survives the
 *  estate's re-apply churn (each re-apply re-imports modules; the
 *  globalThis pin keeps ONE cutoff per process). */
export function benchBootMs(): number {
  const g = globalThis as { __meliteBenchBootMs?: number };
  g.__meliteBenchBootMs ??= Date.now();
  return g.__meliteBenchBootMs;
}

/** The cutoff with a 5s grace: mtime sub-ms precision vs the boot
 *  instant's integer ms can eat a same-tick write (probe:
 *  mtimeMs X.484 < bootMs X+1); the grace admits same-instant
 *  writes while dead-session docs (minutes/hours old) still die. */
function liveCutoffMs(): number {
  return benchBootMs() - 5_000;
}

export function benchDir(): string {
  const dshHome = process.env["DSH_HOME"] ?? join(homedir(), ".dsh");
  return join(dshHome, "storages", "drafts", "docs");
}

function benchFiles(): Promise<string[]> {
  return readdir(benchDir()).then(
    (all) => all.filter((f) => f.startsWith("bench-") && f.endsWith(".json")),
    () => [] as string[],
  );
}

/** Cheap change signal — name+mtime+size over EVERY bench doc
 *  (cutoff never applies here: any write, live or stale, must
 *  retrigger the poll so the catalog follows the bench). */
export async function benchFingerprint(): Promise<string> {
  const files = await benchFiles();
  const parts: string[] = [];
  for (const f of files) {
    try {
      const st = await stat(join(benchDir(), f));
      parts.push(`${f}:${st.mtimeMs}:${st.size}`);
    } catch {
      // a vanished doc between readdir and stat contributes nothing
    }
  }
  return parts.sort().join("|");
}

/** The LIVE bench's stage picks — docs written during this
 *  process's life only (the boot cutoff; stale docs from dead
 *  sessions are invisible by law). */
export async function benchPicks(): Promise<StagePick[]> {
  const cutoff = liveCutoffMs();
  const files = await benchFiles();
  const picks: StagePick[] = [];
  for (const f of files) {
    try {
      const full = join(benchDir(), f);
      const st = await stat(full);
      if (st.mtimeMs < cutoff) continue; // stale — a dead session's doc
      const raw = JSON.parse(await readFile(full, "utf8")) as {
        record?: { doc?: { stages?: Array<{ card?: unknown; params?: { model?: unknown } }> } };
        doc?: { stages?: Array<{ card?: unknown; params?: { model?: unknown } }> };
      };
      for (const stg of raw.record?.doc?.stages ?? raw.doc?.stages ?? []) {
        picks.push({
          card: typeof stg.card === "string" && stg.card !== "" ? stg.card : null,
          model:
            typeof stg.params?.model === "string" && stg.params.model !== ""
              ? stg.params.model
              : null,
        });
      }
    } catch {
      // a malformed or racing bench doc contributes nothing — never a crash
    }
  }
  return picks;
}

/** The sync twin of benchPicks — for sync surfaces (buildSkillIndex
 *  rides the seat handler synchronously). Same law: live docs only
 *  (mtime >= the process boot), malformed docs contribute nothing. */
export function benchPicksSync(): StagePick[] {
  const cutoff = liveCutoffMs();
  let files: string[] = [];
  try {
    files = readdirSync(benchDir()).filter(
      (f) => f.startsWith("bench-") && f.endsWith(".json"),
    );
  } catch {
    return [];
  }
  const picks: StagePick[] = [];
  for (const f of files) {
    try {
      const full = join(benchDir(), f);
      if (statSync(full).mtimeMs < cutoff) continue; // stale — dead session
      const raw = JSON.parse(readFileSync(full, "utf8")) as {
        record?: { doc?: { stages?: Array<{ card?: unknown; params?: { model?: unknown } }> } };
        doc?: { stages?: Array<{ card?: unknown; params?: { model?: unknown } }> };
      };
      for (const stg of raw.record?.doc?.stages ?? raw.doc?.stages ?? []) {
        picks.push({
          card: typeof stg.card === "string" && stg.card !== "" ? stg.card : null,
          model:
            typeof stg.params?.model === "string" && stg.params.model !== ""
              ? stg.params.model
              : null,
        });
      }
    } catch {
      // malformed or racing — contributes nothing, never a crash
    }
  }
  return picks;
}
