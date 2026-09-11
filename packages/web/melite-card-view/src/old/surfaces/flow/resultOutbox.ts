// resultOutbox — DURABLE result persistence for flow stage runs.
//
// WHY (2026-08-14): the result PATCH (POST-run →
// PATCH /v1/flows/drafts/{id}/stages/{id}) was fire-and-forget —
// `void fetch(...).catch(() => {})`. A tab closed before it landed, a
// gateway hot-reload, a network blip — and the generated output NEVER
// persisted server-side. Reopening that conversation rehydrated the card
// structure with NO output preview ("the img preview on the zoomed-out
// action card is gone"), permanently: the only other copy (localStorage)
// is quota-fragile and machine-local.
//
// THE FIX — a tiny outbox in localStorage:
//   • enqueueResultPatch: stage completion queues the PATCH durably
//     (deduped per draft:stage), then flushes immediately.
//   • flushResultPatches: sequential; a success dequeues, a failure
//     RETAINS (attempts++). Retried by the 30s ticker while anything is
//     pending, and once at module load — a PATCH lost to a reload
//     self-heals on the next app start.
//   • Entries older than MAX_AGE_MS are dropped (bounded growth).
//
// The outbox never throws and never blocks the run: it is durability
// layered ON TOP of best-effort, replacing best-effort alone.
import { apiFetch } from "@melite/catalog"

const OUTBOX_KEY = "melite:flow:outbox:v1"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const TICK_MS = 30_000

export interface ResultPatchBody {
  result: {
    assetUrls: string[]
    artifacts: Record<string, string>
    metadata: Record<string, unknown>
    completedAt: number
    durationSec: number
  }
  runStatus: string
}

/** A PARTIAL stage PATCH body — the 2026-08-22 wire/params persistence.
 * Wires (inputs + parallel inputOutputs) and params edits queue through
 * the SAME durable outbox as results, merged per draft:stage. */
export interface StagePatchBody {
  params?: Record<string, unknown>
  inputs?: string[]
  inputOutputs?: (string | null)[]
  result?: ResultPatchBody["result"]
  runStatus?: string
}

interface OutboxEntry {
  /** `${draftId}:${stageId}` — one pending PATCH per stage, newest wins. */
  id: string
  draftId: string
  stageId: string
  body: StagePatchBody
  enqueuedAt: number
  attempts: number
}

function readEntries(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter(
      (e): e is OutboxEntry =>
        !!e && typeof e === "object" &&
        typeof (e as OutboxEntry).draftId === "string" &&
        typeof (e as OutboxEntry).stageId === "string" &&
        !!(e as OutboxEntry).body &&
        // Bounded growth: a stale entry nobody could deliver for a week
        // is dead (the draft TTL on the server is 7 days too).
        typeof (e as OutboxEntry).enqueuedAt === "number" &&
        now - (e as OutboxEntry).enqueuedAt < MAX_AGE_MS,
    )
  } catch {
    return []
  }
}

function writeEntries(entries: OutboxEntry[]): void {
  try {
    if (entries.length === 0) localStorage.removeItem(OUTBOX_KEY)
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries))
  } catch {
    /* quota/storage disabled — the immediate flush still runs */
  }
}

/** How many PATCHes are pending (0 when drained). */
export function pendingResultPatches(): number {
  return readEntries().length
}

let _ticker: ReturnType<typeof setInterval> | null = null

function ensureTicker(): void {
  if (_ticker !== null || typeof setInterval === "undefined") return
  _ticker = setInterval(() => {
    if (pendingResultPatches() === 0) return
    void flushResultPatches()
  }, TICK_MS)
}

let _flushInFlight: Promise<void> = Promise.resolve()

/** One delivery pass: oldest-first, sequential, stop on first failure. */
function _deliverPass(): Promise<void> {
  return (async () => {
    for (;;) {
      const entries = readEntries()
      if (entries.length === 0) return
      const entry = entries[0]
      try {
        const res = await apiFetch(
          `/v1/flows/drafts/${encodeURIComponent(entry.draftId)}/stages/${encodeURIComponent(entry.stageId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.body),
          },
        )
        if (res.status === 404 || res.status === 410) {
          // The target is GONE — the draft was rebuilt server-side with
          // new stage ids (or deleted). This entry can NEVER deliver, and
          // the old contract kept it queued: it failed at the head of
          // every pass for the whole MAX_AGE window and STARVED every
          // entry behind it ("stop on first failure"). A 404 is not a
          // retryable failure — drop the zombie, deliver the rest. The
          // result itself still lives in the client store; only the
          // server-side persist is abandoned.
          console.warn(
            `[resultOutbox] dropping permanently-undeliverable patch ` +
              `${entry.draftId}/${entry.stageId} (HTTP ${res.status})`,
          )
          writeEntries(readEntries().filter((e) => e.id !== entry.id))
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Reconcile answer (2026-09-07 — the gateway's stage arms never
        // 404: a gone target answers 200 {delivered:false}). Same drop
        // semantics as the 404 branch above, without a wire misfire.
        let delivered: { delivered?: unknown } | null = null
        try {
          delivered = (await res.json()) as typeof delivered
        } catch {
          delivered = null
        }
        if (delivered?.delivered === false) {
          console.warn(
            `[resultOutbox] dropping permanently-undeliverable patch ` +
              `${entry.draftId}/${entry.stageId} (delivered:false)`,
          )
          writeEntries(readEntries().filter((e) => e.id !== entry.id))
          continue
        }
      } catch {
        const retry = readEntries()
        const still = retry.find((e) => e.id === entry.id)
        if (still) {
          still.attempts += 1
          writeEntries(retry)
        }
        return // stop the pass — ticker/boot retries later
      }
      writeEntries(readEntries().filter((e) => e.id !== entry.id))
    }
  })()
}

/**
 * Queue a stage-result PATCH durably, then try to deliver it now.
 * Dedupes per draft:stage (a re-run replaces the queued result).
 */
export function enqueueResultPatch(
  draftId: string,
  stageId: string,
  body: ResultPatchBody,
): void {
 // p_* guard (see enqueueStagePatch): client-minted flows never have a
 // server draft row to patch — their result PATCHes 404 forever.
 if (!draftId.startsWith("draft-")) return
  // MERGE, not replace: a queued params/inputs patch for the same
  // draft:stage must survive a re-run's result enqueue (one PATCH, all
  // fields — the run result replaces the result fields only).
  const id = `${draftId}:${stageId}`
  const existing = readEntries().find((e) => e.id === id)
  const entry: OutboxEntry = {
    id,
    draftId,
    stageId,
    body: existing
      ? { ...existing.body, result: body.result, runStatus: body.runStatus }
      : body,
    enqueuedAt: Date.now(),
    attempts: 0,
  }
  const entries = readEntries().filter((e) => e.id !== entry.id)
  entries.push(entry)
  writeEntries(entries)
  ensureTicker()
  void flushResultPatches()
}

/**
 * Queue a PARTIAL stage PATCH (wires / params) durably. Merges key-wise
 * into a queued entry for the same draft:stage — a wire + a pending
 * result for one stage deliver as ONE PATCH, nothing replaces anything.
 *
 * DELIVERY COALESCING (audit F1, 2026-09-01): gesture commits (timeline
 * move/trim/extend) enqueue ~once per pointermove; each enqueue used to
 * fire an IMMEDIATE HTTP PATCH + gateway draft-file rewrite — 60–120
 * network+disk round trips per second of drag. The outbox is DURABLE
 * (entries live in localStorage; the boot pass self-heals anything
 * undelivered), so delivery may safely trail the enqueue: one PATCH per
 * quiet gap, newest body merged in first (the merge above keeps the
 * entry current). Result patches stay immediate — they are one-shot,
 * low-frequency, and order-sensitive against stage patches.
 */
let stageFlushTimer: number | null = null
const STAGE_FLUSH_QUIET_MS = 120
const flushStagePatchesSoon = (): void => {
  if (stageFlushTimer != null) clearTimeout(stageFlushTimer)
  stageFlushTimer = window.setTimeout(() => {
    stageFlushTimer = null
    void flushResultPatches()
  }, STAGE_FLUSH_QUIET_MS)
}

export function enqueueStagePatch(
  draftId: string,
  stageId: string,
  patch: StagePatchBody,
): void {
 // p_* flows are CLIENT-MINTED (never saved as a gateway draft) — their
 // stage patches 404 forever and starved the queue head (2026-09-06
 // operator log: "dropping permanently-undeliverable patch
 // p_brdvuuqj/..."). Only server draft ids enqueue; client flow state
 // remains the truth for authored flows until they are saved.
 if (!draftId.startsWith("draft-")) return
  const id = `${draftId}:${stageId}`
  const entries = readEntries()
  const existing = entries.find((e) => e.id === id)
  if (existing) {
    existing.body = {
      ...existing.body,
      ...patch,
      ...(patch.params !== undefined || existing.body.params !== undefined
        ? { params: { ...existing.body.params, ...patch.params } }
        : {}),
    }
    existing.enqueuedAt = Date.now()
    existing.attempts = 0
  } else {
    entries.push({
      id, draftId, stageId,
      // Only carry a params object when the patch HAS one — a wires-only
      // patch must not materialize params:{} on the wire.
      body: patch.params !== undefined
        ? { ...patch, params: { ...patch.params } }
        : { ...patch },
      enqueuedAt: Date.now(),
      attempts: 0,
    })
  }
  writeEntries(entries)
  ensureTicker()
  flushStagePatchesSoon()
}

/**
 * Deliver every queued PATCH, oldest first, sequentially. A failure stops
 * the pass (the failing entry stays queued for the ticker/boot retry) —
 * no throw, no unbounded retry storm.
 *
 * SERIALIZATION (the result-outbox.test.ts double-flush catch): an `async`
 * body here awaits BEFORE it can reassign _flushInFlight, so two calls in
 * one tick (enqueue's void flush + the caller's await) both resumed off the
 * SAME stale resolved promise, clobbered each other's registration, and ran
 * CONCURRENT passes — the PATCH fired twice and attempts incremented twice.
 * The chain is now captured SYNCHRONOUSLY: each call appends its pass to
 * the current tail and immediately publishes the new tail, so passes are
 * strictly sequential no matter how calls interleave.
 */
export function flushResultPatches(): Promise<void> {
  const run = _flushInFlight.then(_deliverPass, _deliverPass)
  _flushInFlight = run
  return run
}

// BOOT FLUSH — a PATCH lost to a reload/tab-close self-heals here.
if (typeof window !== "undefined") void flushResultPatches()

// CLOSE FLUSH (audit F1 companion): a trailing stage patch scheduled but
// not yet delivered at close time is durable in localStorage (the boot
// pass re-delivers it), but firing best-effort NOW shortens the window
// to zero in the common case.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (stageFlushTimer != null) {
      clearTimeout(stageFlushTimer)
      stageFlushTimer = null
    }
    void flushResultPatches()
  })
}
