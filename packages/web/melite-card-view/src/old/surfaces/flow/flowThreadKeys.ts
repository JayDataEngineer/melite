/**
 * Flow-persistence key helpers (2026-08-12).
 *
 * The AGENT flow store is THREAD-KEYED: each conversation's flow
 * snapshot lives under `melite:flow:v2:agent:<threadId>`. This fixes
 * "flows / cards in the AI history session do not persist" — a single
 * global slot made thread A's flow overwrite thread B's, and a reload
 * restored whatever was last active instead of the opened conversation's.
 *
 * `agentFlowKey(null)` = the plain legacy key — a flow built on the
 * as-yet-unnamed default chat mirrors there until AutoThreadPersister gives
 * the chat an id and setFlowThread() moves it to the thread key.
 *
 * ONE store since 2026-08-13: the library canvas and the agent chat cards
 * are the SAME store (thread-keyed) — a conversation's flow is THE
 * flow, whichever surface renders it. LIB_FLOW_KEY below is the
 * RETIRED pre-merge library slot: nothing writes to it; the one-shot
 * migration in storePersistence reads it once to rescue docs authored on
 * the old library canvas.
 *
 * OWN STANDALONE MODULE so both flowStore.ts and storePersistence.ts can
 * import it without a cycle (they already import each other's concerns).
 */
export const FLOW_VERSION = 2
export const AGENT_FLOW_KEY = `melite:flow:v${FLOW_VERSION}:agent`
export const LIB_FLOW_KEY = `melite:flow:v${FLOW_VERSION}:library`

export function agentFlowKey(threadId: string | null): string {
  return threadId ? `${AGENT_FLOW_KEY}:${threadId}` : AGENT_FLOW_KEY
}

// ── Snapshot LRU index (2026-08-14) ──────────────────────────────────────
// localStorage has no per-key mtime, so the snapshot writers maintain a
// tiny side index {threadKey: lastWriteAt}. Two consumers:
//
// 1. CAP: keep at most MAX_THREAD_SNAPSHOTS thread snapshots — the oldest
//    write goes first. localStorage's ~5-10MB budget cannot hold unbounded
//    base64-ish docs forever; without a cap every write eventually hits
//    QuotaExceededError and (the old behavior) silently skipped, freezing
//    every thread's snapshot at whatever last fit.
//
// 2. QUOTA TRIAGE: the thread-resume key's quota path used to evict ALL
//    `melite:flow:*` keys at once — one full quota moment wiped EVERY
//    conversation's flow. With the index, eviction is oldest-first and
//    NEVER touches the key being saved (the conversation the user is in).
//
// Lives HERE (not storePersistence) because both storePersistence and
// flowStore write snapshots while eviction trims oldest-first —
// importing storePersistence from either would cycle. This module imports
// nothing.

export const FLOW_INDEX_KEY = `melite:flow:v${FLOW_VERSION}:index`
export const MAX_THREAD_SNAPSHOTS = 12

function readIndex(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FLOW_INDEX_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number") out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function writeIndex(index: Record<string, number>): void {
  try {
    localStorage.setItem(FLOW_INDEX_KEY, JSON.stringify(index))
  } catch {
    /* storage disabled — the cap degrades to no-op, never throws */
  }
}

/** Record a snapshot write (threadId null = the legacy default-chat key). */
export function touchFlowIndex(threadId: string | null): void {
  if (typeof localStorage === "undefined") return
  const key = agentFlowKey(threadId)
  const index = readIndex()
  index[key] = Date.now()
  // Prune index entries whose snapshot no longer exists (deleted threads).
  for (const k of Object.keys(index)) {
    if (k !== key && localStorage.getItem(k) === null) delete index[k]
  }
  writeIndex(index)
}

/**
 * Enforce MAX_THREAD_SNAPSHOTS + optionally free headroom: evict the
 * OLDEST thread snapshots (by last write), never `keep` (the conversation
 * being saved/restored) and never the legacy default-chat key. Returns
 * the number evicted. Safe to call repeatedly; never throws.
 */
export function evictOldestFlowSnapshots(
  keepThreadId: string | null,
  freeBytes: number = 0,
): number {
  if (typeof localStorage === "undefined") return 0
  try {
    const index = readIndex()
    const keep = agentFlowKey(keepThreadId)
    const legacy = agentFlowKey(null)
    const entries = Object.entries(index)
      .filter(([k]) => k !== keep && k !== legacy)
      .sort((a, b) => a[1] - b[1]) // oldest first
    let evicted = 0
    // Cap enforcement: drop beyond MAX_THREAD_SNAPSHOTS (legacy + keep
    // don't count against their own survival).
    const over = entries.length + 2 - MAX_THREAD_SNAPSHOTS
    let toEvict = over > 0 ? entries.slice(0, over) : []
    // Quota triage: keep evicting oldest until the estimated footprint
    // (JSON length as a proxy — snapshots are the dominant payload) is
    // under freeBytes of total.
    if (freeBytes > 0) {
      let footprint = 0
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        footprint += (localStorage.getItem(k)?.length ?? 0) + k.length
      }
      for (const e of entries) {
        if (footprint < freeBytes) break
        if (!toEvict.includes(e)) toEvict.push(e)
        footprint -= (localStorage.getItem(e[0])?.length ?? 0) + e[0].length
      }
    }
    for (const [k] of toEvict) {
      localStorage.removeItem(k)
      delete index[k]
      evicted++
    }
    if (evicted > 0) writeIndex(index)
    return evicted
  } catch {
    return 0
  }
}

// ── Last-canvas thread pointer (2026-08-15) ──────────────────────────────
// "When I refresh the page, I would like my last library flow I was
// making in the center view to be preserved." The canvas doc mirrors to
// `agentFlowKey(threadId)` on every change — but WHICH thread's canvas
// was live was never recorded, so a refresh on the LIBRARY tab booted
// an empty store while the doc sat in storage. setFlowThread — the
// single point where the live thread changes — records it here, and
// storePersistence's boot restore reads it back through the SAME
// setFlowThread path (phantom-running sanitize included).
//
// DELIBERATELY NOT `melite:flow:`-prefixed: that namespace is the
// snapshot estate (flow-persistence tests enumerate it and quota
// eviction treats it as expendable). This pointer is tiny session state —
// never evicted, never mistaken for a doc.
export const LAST_CANVAS_THREAD_KEY = "melite:workspace:lastCanvasThread:v1"

/** The thread whose canvas was live when the session ended. null = the
 * default chat (threadless — the legacy snapshot key). Absent key also
 * reads as null: a first visit has nothing to restore. */
export function readLastCanvasThread(): string | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(LAST_CANVAS_THREAD_KEY)
    return raw && raw.length > 0 ? raw : null
  } catch {
    return null
  }
}

/** Record the live-canvas thread ("" = threadless). Never throws. */
export function writeLastCanvasThread(threadId: string | null): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, threadId ?? "")
  } catch {
    // Quota / storage disabled — the boot restore degrades to the default
    // chat's snapshot; never break the thread switch itself.
  }
}
