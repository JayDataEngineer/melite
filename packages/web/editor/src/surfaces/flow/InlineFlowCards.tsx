// InlineFlowCards — the agent-built flow rendered INSIDE the chat.
//
// is that it is a seamless experience. Not to have different views or stuff
// I got to click through." The flow is AGENT functionality: the agent
// composes it dynamically via its build_flow tool, and the cards
// appear below the chat message, IN ORDER — no segmented views, no tab
// chrome to click.
//
// THE USER OWNS THE RUN: the agent builds the cards and STOPS. The user
// reviews them, adjusts prompts via each card's Edit, and presses Run /
// Run all — "it renders the cards, then I hit go from there so I
// can adjust the prompt". The agent does NOT auto-execute.
//
// ONE CARD DESIGN (2026-08-07): "THERE IS ONLY ONE DESIGN. NEVER EVER TWO.
// THERE IS ONE WAY TO SEE THE CARD. THE LIBRARY WAY… IT IS 1:1 TO WHAT WE
// SEE IN AGENT VIEW." The Library's CardTile rectangles ARE the card; the
// chat renders the SAME FlowTileGrid the Library canvas renders —
// same tiles, same inline expand, same click-to-fiddle. The full-width
// row card that used to live here was the SECOND design — deleted.
//
// the agent stack renders a tool's card at the position of the tool call inside
// the assistant message, so "below the message, in order" falls out
// naturally: message → [card 1] → [card 2] → … as the agent works.
import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkles, Loader2, Play, RotateCw, Square, Library, Plus } from "lucide-react"
import { useFlowCards } from "./flowCards"
import { useAgentFlowStore } from "./flowStore"
import { useTabBridge } from "@/surfaces/shared/tabBridge"
import { FlowTileGrid, StatusPill, FlowProgressBar } from "./FlowCard"
import { ServicePicker } from "./ServicePicker"
import { kindDef } from "@melite/slots"
import { Skeleton } from "@melite/ui/skeleton"
import { apiFetch } from "@melite/catalog"
import {
  CAPABILITY_DRAG_MIME,
  parseCapabilityDrop,
} from "@melite/formats"
import { ASSET_DRAG_MIME, useToastStore } from "@melite/ui"
import { familyAccepts, type SourceMediaType } from "@melite/catalog"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { loadPluginKinds } from "./pluginKinds"
import type { BackendDraft, BackendStage } from "@melite/contracts"

/**
 * parseDraftResult — extract {draftId, slim stages} from the backend
 * build_flow tool result. The tool returns the slim projection
 * (agent/tools/flow.py → POST /v1/flows/drafts):
 * ``{draftId, stages: [{id, title, subtitle?, kind, service}]}``.
 * Accepts a JSON string (replayed tool payloads) or a parsed object;
 * anything without a string draftId → null (NOT a build_flow result
 * — resume replay, unrelated tool). Never throws.
 */
function parseDraftResult(result: unknown): { draftId: string; slim: BackendStage[] } | null {
  if (result === null || result === undefined) return null
  let parsed: unknown = result
  if (typeof result === "string") {
    try { parsed = JSON.parse(result) } catch { return null }
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const { draftId, stages } = parsed as { draftId?: unknown; stages?: unknown }
  if (typeof draftId !== "string" || !Array.isArray(stages)) return null
  const slim: BackendStage[] = stages
    .filter((s): s is { id: string; title: string; kind: string; service: string } =>
      typeof s === "object" && s !== null &&
      typeof (s as { id?: unknown }).id === "string" &&
      typeof (s as { title?: unknown }).title === "string" &&
      typeof (s as { kind?: unknown }).kind === "string" &&
      typeof (s as { service?: unknown }).service === "string")
    .map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind as BackendStage["kind"],
      service: s.service,
      // Slim stages carry no params/inputs — the fallback hydrates
      // empty-slot cards (title + grid tile, no input squares).
      params: {},
      inputs: [] as string[],
      provenance: "agent" as const,
    }))
  return { draftId, slim }
}

/**
 * assertFullDraft — the recreation gate (2026-09-06, operator order:
 * a draft that won't recreate ERRORS, never renders a degraded
 * studio). The slow-path GET must serve an OBJECT doc with a string
 * draft_id and a stages array. The double-encoded drafts_get door
 * served a JSON STRING here — hydrateDraft(string) threw and the old
 * code slim-fell-back to a blank studio. A corrupt doc throws with
 * its own name; the caller renders the error panel, never cards.
 */
function assertFullDraft(doc: unknown): asserts doc is BackendDraft {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new Error(
      "draft doc is not an object (got " +
      (Array.isArray(doc) ? "array" : typeof doc) +
      ") — the drafts door served text, not a doc",
    )
  }
  const d = doc as { draft_id?: unknown; stages?: unknown }
  if (typeof d.draft_id !== "string" || !Array.isArray(d.stages)) {
    throw new Error("draft doc corrupt: missing draft_id/stages")
  }
}

/**
 * useCardFocus — the ONE card currently zoomed (null = all tiles compact).
 * Same model as the Library canvas: click a tile to open its zoom overlay
 * (the drilldown surface); clicking a sibling collapses the previous.
 * One-at-a-time keeps the grid readable while the user fiddles.
 */
function useCardFocus() {
  const [focusStageId, setFocusStageId] = useState<string | null>(null)
  return { focusStageId, setFocusStageId }
}

/**
 * The agent tool-call status. Passed from BuildFlowRenderer so
 * we can distinguish "agent is actively composing" (inProgress/executing)
 * from "tool completed but store is empty" (complete/error — resume,
 * thread switch, cleared store).
 */
type BuildFlowToolStatus = "inProgress" | "executing" | "complete" | "error"

/**
 * Module-level tracking of the LATEST draft we hydrated (2026-08-13).
 * the agent stack remounts tool renders on scroll / conversation-switch /
 * restore — each remount resets the per-instance hydratedRef, so an
 * OLDER build_flow's InlineFlowCards would re-fire its GET and
 * attempt to hydrate a stale draft over the current flow. The
 * hydrateDraft stale-draft guard catches it server-side, but this
 * client-side guard prevents the wasted network call AND the brief
 * flicker between the GET firing and the guard rejecting.
 *
 * Reset by the store on thread switch via resetHydrationTracking() so a
 * new conversation's drafts aren't blocked by the old conversation's
 * createdAt.
 */
let _latestHydratedCreatedAt = 0

/**
 * COMPLETENESS GATE (2026-08-14) — is a restored flow snapshot a
 * valid substitute for the backend draft? Only when every executed stage
 * (done/cached) carries a result with servable asset URLs — i.e. the
 * output previews are IN the snapshot. A degraded snapshot (quota-
 * swallowed post-run write, the pre-LRU wholesale eviction, a thread
 * from before thread-keying) has the structure but NOT the results, and
 * used to win here forever: the fast path skipped the backend GET, so
 * the zoomed-out cards never got their img previews back. Pure + exported
 * for tests.
 */
export function snapshotResultsComplete(p: {
  stages: Array<{
    status: string
    params?: Record<string, unknown>
    result?: { assetUrls?: string[]; artifacts?: Record<string, string> } | null
  }>
}): boolean {
  return p.stages.every((s) => {
    if (s.status !== "done" && s.status !== "cached") return true
    const urls = s.result?.assetUrls
    if (!(Array.isArray(urls) && urls.length > 0)) return false
    // CLIP-LOSS GATE (2026-08-30, user: "only includes the first clip —
    // this should be impossible to pass the gates"): a done stage whose
    // artifact map carries MORE named outputs than assetUrls lists has
    // LOST links (the one-clip snapshot of a four-clip run). That is a
    // degraded snapshot: heal from the run registry instead of trusting
    // it — the heal door rebuilds every clip from disk.
    const arts = s.result?.artifacts
    if (arts && typeof arts === "object") {
      const n = Object.keys(arts).filter(
        (k) => !k.startsWith("seam_"),
      ).length
      if (n > urls.length) return false
    }
    // CALLS-AWARE GATE (2026-08-30 "it only shows the first clip, never
    // the second"): the artifact map can be ENTIRELY stripped (older
    // bundle eras wrote snapshots without named artifacts) — the check
    // above then sees nothing and a one-clip snapshot of a four-call
    // video passed as "complete". The plan itself is the witness: a
    // done multi-call video card (params.calls — array, or the legacy
    // JSON-string form) must hold at least one output per call. Fewer
    // links than calls = clip loss, always, regardless of artifacts.
    const rawCalls = s.params?.calls
    let callCount = 0
    if (Array.isArray(rawCalls)) callCount = rawCalls.length
    else if (typeof rawCalls === "string" && rawCalls.trim().startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(rawCalls)
        if (Array.isArray(parsed)) callCount = parsed.length
      } catch {
        /* unparseable legacy string — not a witness */
      }
    }
    if (callCount > 1 && urls.length < callCount) return false
    return true
  })
}

/**
 * Reset the latest-hydrated tracking — called on thread switch so a new
 * conversation's drafts can hydrate (the old conversation's createdAt
 * no longer blocks them).
 */
export function resetHydrationTracking(): void {
  _latestHydratedCreatedAt = 0
}

export function InlineFlowCards({
  toolStatus,
  result,
}: {
  toolStatus?: BuildFlowToolStatus
  /** The build_flow tool result — ``{draftId, stages}`` slim projection.
   * The backend persisted the draft; we fetch the FULL doc and hydrate.
   * Absent (resume replay, unrelated tool) → no hydration — the pinned
   * resume behavior (agent-flow.test.tsx:296-306). */
  result?: unknown
}) {
  const { flow, stages, runningStageId, hasRunningStage, actions, reorderRange, runAll, reRunFrom, cancelRun } = useFlowCards(useAgentFlowStore)
  const { focusStageId, setFocusStageId } = useCardFocus()
  // ── Add-card affordance (2026-08-15): the same "+ Add a card" tile the
  // Library canvas renders, so the user can extend an agent-built flow
  // IN the conversation — the store is ONE instance (the Library canvas
  // renders this same doc), so the added stage is everywhere at once.
  // The picker is the SAME ServicePicker; canGroup stays false here — the
  // grouping selection sub-view is a canvas affordance (Library), not a
  // chat one.
  const [pickerOpen, setPickerOpen] = useState(false)
  // ── Capability-drop surface (2026-08-22): the DSH right sidebar's Melite
  // Assets tab drags model tiles with the SAME MIME the Library canvas
  // speaks — dropping one here lands it as a new action card (identical
  // contract to FlowCanvas.onCanvasDrop; the drag may cross the iframe
  // boundary from the DSH shell, same-origin).
  const [capOver, setCapOver] = useState(false)
  const draggable = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME) ||
    e.dataTransfer.types.includes(ASSET_DRAG_MIME)
  const onCardsDragOver = useCallback((e: React.DragEvent) => {
    if (!draggable(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setCapOver(true)
  }, [])
  const onCardsDragLeave = useCallback((e: React.DragEvent) => {
    if (e.relatedTarget === null) setCapOver(false)
  }, [])
  const onCardsDrop = useCallback(async (e: React.DragEvent) => {
    if (!draggable(e)) return
    e.preventDefault()
    setCapOver(false)
    // Capability tile -> an action card (generation or input kind).
    if (e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)) {
      const cap = parseCapabilityDrop(e.dataTransfer.getData(CAPABILITY_DRAG_MIME))
      if (!cap) return
      await useAgentFlowStore.getState().addStage({
        kind: cap.kind === "input" ? "input" : "generation",
        service: cap.service,
        title: cap.title,
        params: cap.params,
      })
      const st = useAgentFlowStore.getState().flow?.stages ?? []
      const newest = st[st.length - 1]
      if (newest) setFocusStageId(newest.id)
      return
    }
    // Made-asset tile (ASSET_DRAG_MIME payload {url, type}) -> an Ops input
    // card. The SAME gate the canvas asset branch uses: the asset type must
    // be in the input family accepts vocabulary, else a HARD FAIL toast
    // (never a silent swallow) — 1:1 with FlowCanvas.
    const raw = e.dataTransfer.getData(ASSET_DRAG_MIME)
    let payload: { url?: string; type?: string } = {}
    try {
      payload = raw ? (JSON.parse(raw) as { url?: string; type?: string }) : {}
    } catch {
      payload = {}
    }
    if (!payload.url) return
    const accepts = familyAccepts("input")
    const mt = (accepts as readonly string[]).includes(payload.type ?? "")
      ? (payload.type as SourceMediaType)
      : null
    if (!mt) {
      useToastStore.getState().addToast(
        "error",
        payload.type
          ? "Input cards don’t accept " + payload.type + " assets"
          : "That asset isn’t supported — drop an image, video, or audio asset",
      )
      return
    }
    await useAgentFlowStore.getState().addStage({
      kind: "input",
      service: "input",
      title: mt === "image" ? "Image Ops" : mt === "video" ? "Video Ops" : "Audio Ops",
      params: { source: payload.url },
    })
    const st2 = useAgentFlowStore.getState().flow?.stages ?? []
    const newest2 = st2[st2.length - 1]
    if (newest2) setFocusStageId(newest2.id)
  }, [setFocusStageId])
  const handlePick = async (card: {
    service: string
    title: string
    params: Record<string, unknown>
    kind?: string
  }) => {
    await useAgentFlowStore.getState().addStage({
      kind: card.kind ?? "generation",
      service: card.service,
      title: card.title,
      params: card.params,
    })
    // Auto-open the new card — the SAME behavior the Library canvas gives
    // a picked card (FlowCanvas.handlePick): the user types the prompt
    // immediately, in the zoom drilldown, not a mystery tile.
    const st = useAgentFlowStore.getState().flow?.stages ?? []
    const newest = st[st.length - 1]
    if (newest) setFocusStageId(newest.id)
  }

  // Auto-scroll the cards into view when they FIRST render after a build
  // (2026-08-13: "A CARD IS HIDING AND DOWN"). the legacy bridge scrolls on new
  // messages but not when a tool RENDER transitions from skeleton to
  // cards — the cards can land below the fold. One-shot: fires only on
  // the null→non-null transition (prevHadFlow ref), never on every
  // re-render. gentle: block:"nearest" avoids jumping if already visible.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevHadFlow = useRef(false)
  useEffect(() => {
    const hasFlow = !!flow
    if (hasFlow && !prevHadFlow.current && containerRef.current) {
      // Defer one frame so the DOM has the card tiles painted.
      requestAnimationFrame(() =>
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      )
    }
    prevHadFlow.current = hasFlow
  }, [flow])

  // ── Hydration (2026-08-13): build_flow moved to the backend. When
  // the tool completes, the backend holds the draft — GET the full doc
  // and hydrate the store (a DUMB renderer: it adopts, never constructs).
  // NO SLIM FALLBACK (2026-09-06, operator order): a draft that won't
  // recreate ERRORS — the error panel below names the draft and the
  // reason with a Retry. The old best-effort slim hydrate mounted
  // input-less ghost cards (the blank Cards studio): a lie shaped
  // like a flow. Idempotent: hydrateDraft no-ops on the same draft
  // id, and hydratedRef bounds the GET to one attempt per mount.
  const parsedDraft = parseDraftResult(result)
  const hydratedRef = useRef<string | null>(null)
  // Hydration-failure state: named error + retry nonce (the nonce
  // re-fires the effect; the ref reset re-arms the one-attempt guard).
  const [hydrateError, setHydrateError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  useEffect(() => {
    if (toolStatus !== "complete" || !parsedDraft) return
    if (hydratedRef.current === parsedDraft.draftId) return
    const draftId = parsedDraft.draftId
    setHydrateError(null)
    const hydrate = async () => {
      const store = useAgentFlowStore.getState()

      // FAST PATH (2026-08-13, CONDITIONAL since 2026-08-14): the store
      // already holds THIS draft — selectFlowThread loaded it from
      // thread-keyed localStorage on the thread switch. When the snapshot
      // is COMPLETE (snapshotResultsComplete) skip the GET entirely; the
      // cards render straight from the store with zero network
      // round-trip. Also stamp _latestHydratedCreatedAt so concurrent
      // instances mounting OLDER drafts short-circuit their own GETs
      // (they'll render null via the superseded-draft guard below). This
      // is the biggest old-chat speedup: for a thread with N builds, N−1
      // instances bail here AND skip their GETs — no N stacked card
      // copies, no N simultaneous draft fetches. An INCOMPLETE snapshot
      // (results lost — the old "preview gone on thread load" bug) heals
      // from the backend instead of trusting the degraded copy.
      const existing = store.flow
      if (existing && existing.id === draftId) {
        hydratedRef.current = draftId
        const ca = existing.createdAt ?? 0
        if (ca > _latestHydratedCreatedAt) _latestHydratedCreatedAt = ca
        // SERVER-REWRITE CHECK (2026-08-30): createdAt IS the doc version —
        // the gateway stamps a fresh one on every server-side rewrite
        // (queue write-back of result/runStatus/history, contract fixes).
        // The fast path used to trust the snapshot unconditionally, so a
        // card opened before a write-back NEVER picked it up (stale calls,
        // missing run result until the whole store was wiped). One cheap
        // conditional GET (drafts are local reads, served no-store): newer
        // server doc → full re-hydrate (hydrateDraft's same-id gate admits
        // strictly-newer versions); same/older or offline → snapshot wins,
        // exactly the old behavior.
        try {
          const vr = await apiFetch(`/v1/flows/drafts/${encodeURIComponent(draftId)}`)
          if (vr.ok) {
            const vdoc = (await vr.json()) as BackendDraft
            if (vdoc.createdAt != null && vdoc.createdAt > ca) {
              _latestHydratedCreatedAt = vdoc.createdAt
              await store.hydrateDraft(vdoc)
              return
            }
          }
        } catch {
          /* offline → trust the snapshot */
        }
        // COMPLETENESS GATE (2026-08-14): a snapshot that lost its run
        // results must NOT win by default. Complete → skip the network
        // (the original fast path). Incomplete → heal from the backend
        // (per-stage result resolution: draft PATCH result, else the run
        // registry) — the snapshot's structure + the user's param edits
        // stay; only the missing results are resolved server-side. No
        // full hydrateDraft: that would rebuild the doc from the draft
        // and clobber local edits.
        // RUN-TRUTH VERIFY TRIGGER (2026-08-30): a snapshot can pass every
        // content gate and still be the one-clip remnant of a multi-clip
        // run (plan edited down, artifacts stripped). Done stages with a
        // result are always verified against the run registry — one local
        // GET per open, replace only when disk is strictly richer.
        const hasDone = existing.stages.some(
          (s) => (s.status === "done" || s.status === "cached") && s.result,
        )
        if (snapshotResultsComplete(existing) && !hasDone) {
          return
        }
        // KINDS-LANE RACE (2026-08-30): _healStageResults filters targets
        // through kindDef().executable — and before the FIRST /v1/kinds
        // sync lands, kindDef() reads UNKNOWN ("never executable"), so a
        // heal fired at boot found ZERO targets and clip loss survived
        // the reload. Await the lane (coalesced — one fetch per boot)
        // before healing.
        await loadPluginKinds()
        await store._healStageResults(draftId)
        return
      }

      try {
        const res = await apiFetch(`/v1/flows/drafts/${encodeURIComponent(draftId)}`)
        if (!res.ok) throw new Error(`draft GET failed: HTTP ${res.status}`)
        const full: unknown = await res.json()
        // RECREATION GATE: a non-doc payload (the double-encoded door
        // served a string) refuses HERE with its own name — never
        // adopted, never slim-fallen-back.
        assertFullDraft(full)
        // Stale-draft guard (client side): skip hydrating an older draft
        // when a newer one already owns the store. Prevents the wasted
        // hydrate attempt AND the flicker between GET and the server-side
        // guard. Module-level so remounts (which reset hydratedRef) don't
        // re-fire. Reset by resetHydrationTracking() on thread switch.
        if (full.createdAt < _latestHydratedCreatedAt) return
        _latestHydratedCreatedAt = full.createdAt
        await store.hydrateDraft(full)
      } catch (e) {
        // RECREATION FAILURE: error panel, never ghost cards. The
        // draft is still saved server-side — Retry re-fires the GET.
        // hydratedRef still marks the attempt (one GET per mount, no
        // fetch storm on scroll remounts); Retry re-arms it.
        setHydrateError(
          e instanceof Error ? e.message : "unknown hydration failure",
        )
      }
      hydratedRef.current = draftId
    }
    void hydrate()
  }, [toolStatus, parsedDraft, retryNonce])

  // Show the skeleton when the agent is ACTIVELY building a new flow
  // (toolStatus inProgress/executing) — even if an OLD flow lingers
  // in the store from a prior build. Without this, the user sees a flash
  // of the OLD cards before the new ones land — the "clunky loading"
  // complaint. The skeleton is the truthful "building something new" state.
  const isActivelyBuilding =
    toolStatus === "inProgress" || toolStatus === "executing"

  // No flow in the store. Only show the composing skeleton when the
  // build_flow tool call is ACTUALLY in flight (the agent is composing
  // right now) — or it JUST completed and we're fetching the draft (the
  // cards land within a render or two). On thread resume / tool-error /
  // complete-without-result, the store may be null because a different
  // conversation was restored or the store was cleared — a placeholder
  // that never resolves is a lie. Show nothing; the user can continue
  // chatting and the agent will build a new flow.
  if (!flow || isActivelyBuilding) {
    // RECREATION FAILURE (2026-09-06, operator order): the draft
    // wouldn't recreate — a NAMED error with Retry, never ghost
    // cards, never an eternal skeleton. Precedence over the
    // composing skeleton: the fetch already failed exactly once.
    if (hydrateError && !flow && parsedDraft) {
      return (
        <div
          data-flow-hydrate-error
          role="alert"
          className="space-y-1.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
        >
          <div className="flex items-center gap-1.5 px-1">
            <span className="truncate text-[11px] font-semibold text-destructive">
              Couldn&apos;t recreate the flow cards
            </span>
          </div>
          <p className="px-1 text-[11px] text-muted-foreground">
            Draft {parsedDraft.draftId} is still saved — {hydrateError}
          </p>
          <button
            type="button"
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-sidebar-border/40 px-2 py-1 text-[11px] font-medium"
            onClick={() => {
              hydratedRef.current = null
              setHydrateError(null)
              setRetryNonce((n) => n + 1)
            }}
          >
            <RotateCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }
    const isComposing =
      isActivelyBuilding ||
      (toolStatus === "complete" && parsedDraft !== null && !flow)
    if (!isComposing) return null
    // Skeleton mirrors a single composing card row: a label, a tile grid
    // placeholder, and a footer — same shapes the real FlowTileGrid
    // will render. Reads as "the agent is building this" without a spinner.
    // The sr-only text keeps the status announced for screen readers (and
    // mirrors what the old visible label said) without cluttering the skeleton.
    return (
      <div
        data-flow-skeleton
        role="status"
        aria-busy="true"
        aria-label="Agent is composing the flow"
        className="space-y-1.5 pointer-events-none"
      >
        <span className="sr-only">Agent is composing the flow…</span>
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="h-3 w-3 shrink-0 text-brand" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-md border border-sidebar-border/40 bg-sidebar/20 p-2">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // SUPERSEDED-DRAFT GUARD (2026-08-13): a conversation with MULTIPLE
  // build_flow calls mounts an InlineFlowCards for EACH tool call
  // in the message history — all reading the SAME store. Without this
  // guard, N builds render N copies of the current flow stacked in the
  // chat (the "buggy, slow, janky" old-chat experience). Only the instance
  // whose draftId matches the store's CURRENT flow renders; all others
  // were superseded by a newer build → null. Combined with the fast-path
  // above (store-already-has-draft → skip GET), opening a thread with N
  // flows does ONE hydrate (the newest, from localStorage) + zero GETs
  // for the rest — instant cards, no duplicates, no fetch storm.
  if (parsedDraft && flow && parsedDraft.draftId !== flow.id) {
    return null
  }

  const queued = stages.some((s) => s.status === "queued")
  // FEEDBACK FIX (2026-08-14): runAll sets runningStageId=null (it runs
  // ALL stages, no single "running stage"), but sets every stage to
  // "running"/"queued". The old check (runningStageId !== null || queued)
  // missed the "running" case → button stayed "Run all" with no spinner →
  // "I GET NO FEEDBACK AT ALL". hasRunningStage already checks both
  // "running" and "queued" stage statuses — use it here too.
  const isRunning = runningStageId !== null || hasRunningStage
 // The Cancel button the gates promise ("press Cancel") — visible for a
 // live run AND a phantom stuck status (stage "running" without a live
 // controller). cancelRun handles both arms (2026-08-12).
 const canCancel = hasRunningStage
  const doneCount = flow.stages.filter((s) => s.status === "done" || s.status === "cached").length
  // executable is a KIND FLAG (cardSeam), not a literal list — plugins can
 // add non-executing kinds without editing this file.
 const allDone = doneCount === flow.stages.filter((s) => kindDef(s.kind).executable).length

  return (
    <div
    ref={containerRef}
    data-flow-instance
    onDragOver={onCardsDragOver}
    onDragLeave={onCardsDragLeave}
    onDrop={onCardsDrop}
    className={cn("space-y-1.5 rounded-lg transition-all", capOver && "ring-2 ring-brand/40 ring-inset p-1")}
  >
      {/* Intent header + progress + the GO button — the user presses Run */}
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-3 w-3 shrink-0 text-brand" />
        <span className="truncate text-[11px] font-semibold text-foreground">
          {flow.intent}
        </span>
        {/* Open in Library — pure tab switch (2026-08-13): the store is ONE
            instance, so the Library canvas already shows THIS doc; the
            button just takes the user there to view/edit from the canvas.
            (Named "Open", not "Edit" — the ONE-UI drilldown contract pins
            that no Edit-named button exists in this surface.) */}
        <Tip tip="Open this flow in the Library canvas for full editing">
        <button
          onClick={() => useTabBridge.getState().navigateToTab("library")}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-brand/40 hover:text-brand"
        >
          <Library className="h-3 w-3" />
          Open in Library
        </button>
        </Tip>
        <span className="shrink-0">
          <StatusPill flow={flow} />
        </span>
      </div>

      <div className="flex items-center gap-2 px-1">
        <FlowProgressBar flow={flow} />
        {!allDone ? (
          <>
          <button
            onClick={() => runAll()}
            disabled={isRunning}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md border border-brand/40 bg-brand/15 px-2.5 py-1 text-[11px] font-medium text-brand",
              "transition-all hover:bg-brand/25 hover:shadow-[0_0_12px_-3px_color-mix(in_srgb,var(--brand)_45%,transparent)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {isRunning ? (queued ? "Queued…" : "Running…") : "Run all"}
          </button>
          {canCancel && (
            <Tip tip="Stop the run and free the flow (also interrupts ComfyUI)">
            <button
              onClick={() => cancelRun()}
              className="flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive transition-all hover:bg-destructive/20 hover:shadow-[0_0_12px_-3px_color-mix(in_srgb,var(--destructive)_45%,transparent)]"
            >
              <Square className="h-3 w-3 fill-current" />
              Cancel
            </button>
            </Tip>
          )}
          </>
        ) : (
          <button
            onClick={() => reRunFrom(flow.stages[0].id)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-brand/40 hover:text-brand"
          >
            <RotateCw className="h-3 w-3" />
            Re-run all
          </button>
        )}
      </div>

      {/* THE cards — the same tiling grid the Library canvas renders (1:1,
          one design). Click a tile to expand it inline and fiddle with its
          params; Escape collapses. The trailing + tile is the SAME add-card
          affordance the Library grid has (one design, never two) — hidden
          while a card is zoomed. Mid-run it stays ENABLED (2026-08-22:
          "generating blocks me from adding new cards" — appending is safe:
          composer runAll iterates a snapshot; chain runs map bricks by index
          and ignore index-less stages). */}
      <FlowTileGrid
        stages={stages}
        runningStageId={runningStageId}
        actions={actions}
        onRemove={(id) => useAgentFlowStore.getState().removeStage(id)}
        onReorderRange={(fromIds, toId) => reorderRange(fromIds, toId)}
        focusStageId={focusStageId}
        onFocusStageId={setFocusStageId}
        addTile={!focusStageId && (
          <button
            onClick={() => setPickerOpen(true)}
            aria-label="Add a card"
            className={cn(
              "flex min-h-[120px] basis-[200px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 text-muted-foreground/60 transition-all",
              "hover:border-brand/40 hover:text-brand",
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Add a card</span>
          </button>
        )}
      />
      {/* The card picker (the "+ Add a card" flow) — the SAME ServicePicker
          the canvas opens. Grouping is canvas-only (canGroup=false). */}
      <ServicePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
      />
    </div>
  )
}
