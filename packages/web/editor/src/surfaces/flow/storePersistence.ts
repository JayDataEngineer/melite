/**
 * ALWAYS-ON flow-store persistence — localStorage, every environment.
 *
 * The flow store is in-memory zustand. Without this module, a browser
 * refresh, tab close, or Vite HMR full-reload wipes the composed flow
 * to `flow: null` and the user's work is GONE. The design rationale
 * (2026-08-09): "SAVE TO DISK. ALL EVERYTHING. ALWAYS. NONE OF THIS
 * EPHEMERAL LOST ON BROWSER REFRESH EVER."
 *
 * FIX: mirror `flow` (the composed doc) to localStorage on every real
 * change. localStorage (not sessionStorage) survives tab close +
 * browser restart, so the flow persists across sessions. ONE store
 * since 2026-08-13 (the agent + library names are the same instance) — a
 * single thread-keyed mirror covers the Library canvas and the chat cards.
 *
 * QUOTA SAFETY: localStorage has a ~5-10MB quota. Flow params can carry
 * large data URLs (embedded images). If the full persist blows the quota,
 * the catch swallows it gracefully — the app never breaks. The flow
 * structure (stages, titles, services, wiring) is the important part; a
 * quota miss on an embedded image is acceptable (the artifact is on disk
 * in the run directory anyway).
 *
 * WHY A SEPARATE MODULE: flowStore.ts is under concurrent WIP edits.
 * This is a pure side-effect import — additive, versioned, fail-safe —
 * so it never collides with refactors to the store itself. If the store's
 * shape changes, bump VERSION to invalidate stale snapshots.
 */
import { useAgentFlowStore } from "./flowStore"
import {
  agentFlowKey,
  LIB_FLOW_KEY,
  touchFlowIndex,
  evictOldestFlowSnapshots,
  readLastCanvasThread,
} from "./flowThreadKeys"

// Bump when the FlowDoc shape changes to invalidate stale snapshots.
// v2 (2026-08-09): switched from DEV-only sessionStorage to ALWAYS-ON
// localStorage — new keys so old DEV snapshots don't collide.
// v2 thread-keying (2026-08-12): the AGENT snapshot key is per-thread
// (`melite:flow:v2:agent:<threadId>`, null → the plain legacy key). No
// version bump: the legacy key remains the null-thread target, so old
// snapshots still read (a thread-less snapshot IS the default-chat one).

// Structural — compatible with both stores (same create() shape) without
// importing zustand's bound-store generics here.
type FlowStoreApi = {
  getState: () => { flow: unknown; threadId: string | null }
  setState: (partial: Record<string, unknown>) => void
  subscribe: (listener: (state: { flow: unknown }) => void) => () => void
}

/**
 * The persisted doc can NEVER carry a LIVE ComfyUI status (operator
 * directive 2026-08-12: "the frontend only receives status and is a proxy
 * for the status ComfyUI sends — it should NEVER dictate"; "frontend
 * should never persist state on the status of comfyui"). "running" is a
 * claim about the live stream; on reload the stream is gone, so a
 * persisted "running" is a lie the moment it's written. Strip it at
 * WRITE time to the honest non-claim: stage "running" → "pending" (did
 * not finish), run-level "running" → "ready" (doc exists, not done, not
 * failed). Terminal statuses ("done"/"error"/"cached"/"failed") are
 * artifact facts, not stream claims — they persist.
 */
export function stripLiveStatus(doc: unknown): unknown {
  if (!doc || typeof doc !== "object") return doc
  const d = doc as Record<string, unknown>
  let dirty = false
  if (d.status === "running") {
    d.status = "ready"
    dirty = true
  }
  if (Array.isArray(d.stages)) {
    for (const s of d.stages) {
      if (s && typeof s === "object" && (s as Record<string, unknown>).status === "running") {
        ;(s as Record<string, unknown>).status = "pending"
        dirty = true
      }
    }
  }
  return dirty ? d : doc
}

/**
 * stripDataUrls — localStorage quota guard (2026-08-12).
 *
 * Flow snapshots carry base64 image data URLs in slot params (the
 * attached preview before a Run uploads the file). A real PNG is hundreds
 * of KB to several MB — well past the ~5-10MB localStorage budget — so a
 * single attach can break EVERY persistence write app-wide (enhancement
 * store, the legacy bridge thread-resume, …). This walks the doc BEFORE the write
 * and nulls any `data:` string over 1KB. Small data URLs (<1KB, e.g. a
 * tiny inline SVG icon) survive; non-data-URL strings survive regardless
 * of size (a 100KB prompt is fine — it's not a quota killer).
 *
 * Idempotent: a second pass changes nothing (nulls aren't `data:`).
 * Primitives pass through untouched.
 */
const DATA_URL_MAX_LEN = 1024
export function stripDataUrls(doc: unknown): unknown {
  if (typeof doc === "string") {
    return doc.startsWith("data:") && doc.length > DATA_URL_MAX_LEN ? null : doc
  }
  if (!doc || typeof doc !== "object") return doc
  if (Array.isArray(doc)) {
    for (let i = 0; i < doc.length; i++) {
      doc[i] = stripDataUrls(doc[i]) as never
    }
    return doc
  }
  const d = doc as Record<string, unknown>
  for (const k of Object.keys(d)) {
    d[k] = stripDataUrls(d[k])
  }
  return d
}

/**
 * Subscribe + mirror the AGENT flow to the CURRENT thread's key on
 * every real change. The key is resolved at WRITE time from the store's
 * threadId — a flow built on the unnamed default chat mirrors to the
 * legacy key, one built mid-conversation goes straight to that thread's
 * snapshot. (setFlowThread() owns the cross-key MOVES: null→thread
 * when AutoThreadPersister mirrors the chat's id.)
 */
function persistAgent(store: FlowStoreApi): () => void {
  let prevFlow = store.getState().flow
  // MIRROR COALESCING (audit F1, 2026-09-01 — DaVinci-smooth drags): a
  // timeline drag commits stage params ~once per pointermove (60–120 Hz),
  // and each commit used to run the FULL mirror — deep-clone +
  // stripLiveStatus + stripDataUrls walk + JSON.stringify of the whole
  // doc + localStorage.setItem — SYNCHRONOUSLY inside zustand's set().
  // On a doc carrying artifacts that is a per-move main-thread stall: the
  // drag stutter. The mirror now trails: ONE write per quiet gap, and the
  // snapshot is taken from the LIVE store at flush time so the newest
  // state always lands. Never drops the tail: hidden-tab and
  // beforeunload flush immediately. In-memory zustand stays synchronous
  // — Run reads the store, not this mirror, so coalescing is
  // correctness-neutral by construction.
  let mirrorTimer: number | null = null
  const MIRROR_QUIET_MS = 150
  const flushMirror = () => {
    mirrorTimer = null
    const flow = store.getState().flow
    prevFlow = flow
    const tid = store.getState().threadId
    try {
      localStorage.setItem(
        agentFlowKey(tid),
        // stripLiveStatus: never persist ComfyUI's live "running" (directive).
        // stripDataUrls: null base64 data URLs >1KB BEFORE writing — a single
        // attached reference image can be 2-5MB, blowing the ~5-10MB localStorage
        // quota and causing EVERY subsequent write to fail silently (the catch
        // swallows the QuotaExceededError). This is why flow outputs
        // vanished on conversation switch: the snapshot never wrote.
        //
        // NEVER hand the strippers the LIVE state.flow (2026-08-23
        // "I WAS SENDING AN IMAGE"): both MUTATE their argument in place.
        // Deep-clone first: the mirror owns its copy, the live store
        // keeps the attachment.
        JSON.stringify(
          stripDataUrls(stripLiveStatus(JSON.parse(JSON.stringify(flow)))),
        ),
      )
      // LRU (2026-08-14): record the write + enforce the snapshot cap so
      // quota pressure lands on the OLDEST conversations, oldest-first —
      // never silently freezes every thread's snapshot at a stale copy.
      // (Asset URLs are server URLs (/editor/...), so results DO survive
      // the strip and this write is the complete doc.)
      touchFlowIndex(tid)
      evictOldestFlowSnapshots(tid)
    } catch {
      // Quota exceeded / storage disabled — never break the app. The
      // flow lives on in memory; only the disk mirror is skipped.
    }
  }
  const scheduleMirror = () => {
    if (mirrorTimer != null) return
    mirrorTimer = window.setTimeout(flushMirror, MIRROR_QUIET_MS)
  }
  const flushNow = () => {
    if (mirrorTimer == null) return
    clearTimeout(mirrorTimer)
    flushMirror()
  }
  // The tail write must survive a tab hide/close — flush, never drop.
  const onVisibility = () => {
    if (document.visibilityState === "hidden") flushNow()
  }
  window.addEventListener("beforeunload", flushNow)
  document.addEventListener("visibilitychange", onVisibility)
  const unsubscribe = store.subscribe((state) => {
    if (state.flow === prevFlow) return
    prevFlow = state.flow
    scheduleMirror()
  })
  return () => {
    unsubscribe()
    flushNow()
    window.removeEventListener("beforeunload", flushNow)
    document.removeEventListener("visibilitychange", onVisibility)
  }
}

// ALWAYS-ON — no DEV gate. The flow persists in every environment.
// ONE store (2026-08-13): the agent + library names are the SAME instance,
// so ONE thread-keyed mirror covers the Library canvas AND the chat cards.
// NO blanket module-eval rehydrate — a fresh session must start EMPTY
// (never resurrect the last session's flow uninvited). The ONE
// sanctioned boot-time exception is restoreBootCanvas() below — the
// EXACT-canvas pointer restore, which the Library canvas has no other
// path for.
persistAgent(useAgentFlowStore)

// ── Boot canvas restore (2026-08-15) ─────────────────────────────────────
// "When I refresh the page, I would like my last library flow I was
// making in the center view to be preserved." The Library canvas only
// mounts when its tab is active, so a refresh restored nothing by itself:
// the store booted empty and the canvas came back blank while the doc sat
// in storage.
//
// THE FIX: setFlowThread records the live thread on every change
// (LAST_CANVAS_THREAD_KEY), so the boot restore can bring back the EXACT
// canvas the refresh interrupted — same doc, same thread, through the
// SAME setFlowThread path (phantom-running sanitize included).
// Self-correcting by construction:
//   • refresh mid-session → the pointer names the live thread; the same
//     id early-returns in setFlowThread and the doc survives (no
//     empty-frame flash); a different id swaps, as thread nav does.
//   • fresh visit / cleared storage → no pointer → no-op. A brand-new
//     chat still starts EMPTY (the standing rule — nothing resurrects
//     without a recorded canvas).
//   • cleared canvas → the mirror wrote null under the pointed key →
//     restore reads null → stays empty (no surprise resurrection).
export function restoreBootCanvas(): void {
  try {
    const tid = readLastCanvasThread()
    if (tid !== null) {
      useAgentFlowStore.getState().setFlowThread(tid)
      return
    }
    // THREADLESS canvas ("" pointer): the default chat's doc lives at the
    // legacy key — adopt it directly, keeping threadId null.
    // setFlowThread(null) is the NEW-CHAT clear (it must wipe, e.g.
    // when the user clicks New Chat) — the wrong semantic for a refresh
    // that left a threadless canvas live. Same phantom-running demotion
    // the store applies on its restore paths; write-time stripLiveStatus
    // means a fresh snapshot never carries "running" anyway.
    const raw = localStorage.getItem(agentFlowKey(null))
    if (!raw) return
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return // corrupted snapshot — fresh canvas, never a boot crash
    }
    if (!parsed || typeof parsed !== "object") return // null doc = cleared
    const doc = stripLiveStatus(parsed) as { threadId?: unknown; stages?: unknown }
    if (doc.stages === undefined || !Array.isArray(doc.stages)) return
    if (
      (doc as { stages?: Array<{ status?: unknown }> }).stages?.some(
        (s) => s && typeof s === "object" && s.status === "running",
      )
    ) {
      console.warn(
        "[storePersistence] boot-restored threadless doc had stuck 'running' stage(s) — demoted to pending",
      )
    }
    useAgentFlowStore.setState({ flow: parsed as never })
  } catch {
    // Storage disabled / corrupted — a fresh canvas, never a boot crash.
  }
}
restoreBootCanvas()

// ONE-SHOT MIGRATION (2026-08-13): the library store merged into the
// thread-keyed agent store. A doc authored on the OLD library canvas sits
// at LIB_FLOW_KEY — move it onto the default chat's legacy key IF that
// slot is empty (never clobber a conversation doc). The library key is
// retired after this: nothing writes to it again, and the migration
// silently no-ops once every pre-merge doc has been moved.
try {
  const legacy = agentFlowKey(null)
  if (localStorage.getItem(legacy) === null) {
    const libDoc = localStorage.getItem(LIB_FLOW_KEY)
    if (libDoc) localStorage.setItem(legacy, libDoc)
  }
} catch {
  // Storage disabled / quota — nothing breaks; the doc stays where it is.
}
