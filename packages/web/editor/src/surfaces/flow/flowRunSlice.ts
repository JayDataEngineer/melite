// flowRunSlice — hydrateDraft / _healStageResults / updateStageParams /
// applyStageMutation / applyDocMutation / _recomputeKeys (Cut 6 file-size
// pivot). Method bodies verbatim from the origin flowStore.ts create
// call; the slice factory is the only seam. Cross-slice calls go through
// get() exactly as before.

import type { StoreApi } from "zustand"
import type { FlowState } from "./flowStoreTypes"
import { kindDef } from "@melite/slots"
import { applyStageMutation as gateStageMutation, applyDocMutation as gateDocMutation } from "@melite/formats"
import { useToastStore } from "@melite/ui"
import { apiFetch } from "@melite/catalog"
import { sanitizeRevivedResult } from "@melite/catalog"
import { getCachedCatalog } from "@melite/catalog"
import type { FlowStage, FlowStatus, FlowStageStatus, StageResult } from "@melite/contracts"
import { Provenance } from "@melite/contracts"
import { stableStringify, isAdditiveNormalization, computeCacheKey } from "./flowStoreHelpers"
import { enqueueStagePatch } from "./resultOutbox"

type RunSlice = Pick<FlowState, "hydrateDraft" | "_healStageResults" | "updateStageParams" | "applyStageMutation" | "applyDocMutation" | "_recomputeKeys">

export const createRunSlice = (
 set: StoreApi<FlowState>["setState"],
 get: () => FlowState,
): RunSlice => ({
 hydrateDraft: async (draft) => {
 // GUARD: don't blow away a flow that's actively executing (the
 // buildFlow invariant, 2026-08-09). The backend POST always
 // succeeds, so the LLM never sees this error — it only fires when a
 // stale tool result hydrates over a live run (the agent emitted a
 // second build_flow after the user pressed Run). Nothing wipes
 // a running flow without explicit intent.
 const current = get().flow
 const hasRunning = current && current.stages.some((s) => s.status === "running")
 if (hasRunning) {
 useToastStore.getState().addToast(
 "info",
 "Flow is executing — wait for it to finish or press Cancel before building a new one.",
 )
 return { ok: false, error: "Flow is executing — wait for it to finish or press Cancel before building a new one." }
 }
 // Idempotency: the same draft hydrating twice (a re-render of the
 // same tool result, a resume replay) must not rebuild — the first
 // hydration owns the store. A NEW draft always hydrates (its id
 // differs from the flow id).
 // SAME-ID EXCEPTION (2026-08-30, server-authoritative write-backs):
 // the gateway rewrites finished cards server-side (queue write-back
 // stamps result/runStatus/history AND a fresh createdAt — createdAt
 // is the doc version). A same-id doc that is strictly NEWER than
 // what the store hydrated re-hydrates, so an already-open card picks
 // up the run result and any server-side doc fix; same version
 // (re-render) or older still no-ops.
 if (get().flow?.id === draft.draft_id) {
  const hydrated = get().flow?.createdAt
  if (
   draft.createdAt == null ||
   hydrated == null ||
   draft.createdAt <= hydrated
  ) {
   return { ok: true }
  }
  // RESULT-DOWNGRADE GATE (2026-08-30, clip-loss law): a same-id NEWER
  // doc may re-hydrate — unless it LOST clips. When an incoming done
  // stage lists fewer assetUrls than the stored one (a one-clip rewrite
  // of a four-clip card), the stored result wins and the degraded doc
  // is refused: clip loss must be impossible to pass the gates. The
  // heal door remains the recovery path for genuinely richer results.
  const cur = get().flow
  const curClips = cur?.stages.reduce(
   (a, s) => a + ((s.status === "done" || s.status === "cached") ? (s.result?.assetUrls?.length ?? 0) : 0), 0) ?? 0
  const docClips = draft.stages.reduce(
   (a, s) => a + (s.result ? (Array.isArray(s.result.assetUrls) ? s.result.assetUrls.length : 0) : 0), 0)
  if (curClips > 0 && docClips < curClips) {
   console.warn(
    `[hydrateDraft] refused result downgrade for ${draft.draft_id}: stored ${curClips} clips, doc lists ${docClips}`,
   )
   return { ok: true }
  }
 }

 // STALE-DRAFT GUARD (2026-08-13): the agent stack remounts tool renders on
 // scroll / conversation-switch / restore. An OLDER build_flow's
 // InlineFlowCards re-fires its hydration effect (fresh ref, no
 // memory of the prior call) and would REPLACE the current flow
 // with a stale draft — the card the user is looking at flickers to a
 // PREVIOUS flow and results vanish ("history lost a card").
 // createdAt is the ordering: an older draft silently no-ops.
 if (
 current?.createdAt != null &&
 draft.createdAt != null &&
 draft.createdAt < current.createdAt
 ) {
 return { ok: true }
 }

 // CROSS-FLOW CARRY-OVER (2026-08-13): save completed stages from
 // the OLD flow so their results survive the replacement. When the
 // agent rebuilds with the same generate stage (e.g. adding an upscale
 // after the user already ran the generate), the generate's cacheKey
 // matches → result carries over → runAll skips it → the upscale gets
 // the generated image as input_image via collectUpstreamResults.
 // Without this, every build_flow destroys ALL previous results —
 // "generate → run → upscale" loses the image on rebuild.
 const oldDoneByKey = new Map<string, StageResult>()
 if (current) {
 for (const s of current.stages) {
 if (
 (s.status === "done" || s.status === "cached") &&
 s.result &&
 s.cacheKey
 ) {
 oldDoneByKey.set(s.cacheKey, s.result)
 }
 }
 }

 // Adopt the backend's stages AS-IS — the server did capability
 // resolution, slot-vocabulary fold, null-seeding, and
 // inputIndices→inputs resolution. The store fills ONLY render state.
 const stages: FlowStage[] = draft.stages.map((s): FlowStage => ({
 id: s.id,
 title: s.title,
 subtitle: s.subtitle ?? undefined,
 kind: s.kind,
 service: s.service,
 params: s.params,
 inputs: s.inputs,
 ...(Array.isArray(s.inputOutputs)
  ? { inputOutputs: s.inputOutputs.map((v: unknown) => (typeof v === "string" ? v : null)) }
  : {}),
 // Adopt persisted render state from the draft — generated images
 // survive history restore (the PATCH in executeStage stored them).
 result: s.runStatus === "done" && s.result ? s.result : null,
 status: s.runStatus === "done" && s.result
 ? ("done" as FlowStageStatus)
 : ("pending" as FlowStageStatus),
 error: null,
 cacheKey: null,
 flowName: s.flowName,
 studio: s.studio,
 studioContext: s.studioContext,
 ...(s.compound ? { compound: s.compound } : {}),
 // The backend's draft was created by the agent's build_flow —
 // mark it (the card badge renders the agent provenance).
 provenance: Provenance.agent,
 }))

 set({
 flow: {
 id: draft.draft_id,
 intent: draft.intent,
 stages,
 status: "ready" as FlowStatus,
 createdAt: draft.createdAt,
 completedAt: draft.completedAt ?? null,
 // Graph-backed (multi-step compose): adopt the compiled body the
 // draft carries. Its presence flips the doc to ONE typed run at Run
 // time ({flow_inline}) — the whole graph, server-side wiring, never
 // per-stage card runs. Shape is the gateway's own (validated at
 // compose time); a malformed member surfaces as the start door's
 // verbatim 400, never a silent no-op.
 ...(draft.flow ? { inlineFlow: draft.flow } : {}),
 },
 runningStageId: null,
 })
 // Compute initial cacheKeys (all "pending" — nothing executed yet).
 await get()._recomputeKeys()

 // CROSS-FLOW CARRY-OVER post-pass: now that cacheKeys are
 // computed, match new stages against old completed stages. A matching
 // cacheKey means the stage produces the identical output (same service,
 // same params, same upstream chain) — carry over the result and mark
 // "done". runAll skips "done" stages, so only the NEW stages (upscale,
 // edit) actually execute. The downstream stage's
 // collectUpstreamResults finds the carried-over result and injects it
 // as input_image.
 if (oldDoneByKey.size > 0) {
 const p = get().flow
 // Guard: flow unchanged since our set() (no race from another
 // hydrateDraft or a clear() during _recomputeKeys' async digest).
 if (p && p.id === draft.draft_id) {
 let changed = false
 const carried = p.stages.map((s): FlowStage => {
 if (
 s.status === "pending" &&
 s.cacheKey &&
 oldDoneByKey.has(s.cacheKey)
 ) {
 changed = true
 return {
 ...s,
 result: oldDoneByKey.get(s.cacheKey)!,
 status: "done" as FlowStageStatus,
 }
 }
 return s
 })
 if (changed) {
 set({ flow: { ...p, stages: carried } })
 }
 }
 }

 // MISSING-RESULT HEAL (2026-08-14): stages the draft couldn't restore
 // (a result PATCH that never landed, a thread from before the PATCH
 // feature) get one more chance — the backend rebuilds the result from
 // the run registry (every stage-run stashed its pipe + stage id; the
 // sidecar carries url/gallery/named_urls) and the preview comes back.
 // Fire-and-forget BY DESIGN: the cards render now, healed results land
 // a moment later (set → re-render → the persistence mirror re-writes
 // the snapshot, now complete).
 if (get().flow?.id === draft.draft_id) {
 void get()._healStageResults(draft.draft_id)
 }

 return { ok: true }
 },

 _healStageResults: async (draftId) => {
 const p0 = get().flow
 if (!p0 || p0.id !== draftId) return 0
 // Kinds that never execute have nothing to heal — skip the round-trips.
 // CLIP-LOSS TARGETS (2026-08-30): a done stage whose result LOST clips
 // (assetUrls shorter than its own artifact map — the one-clip snapshot
 // of a four-clip run) heals too: the run registry on disk is the SSOT
 // and the heal door rebuilds every clip. Result-less stages keep their
 // original behavior.
 const stageNeedsHeal = (s: FlowStage): boolean => {
  if (!kindDef(s.kind).executable) return false
  if (!s.result) return true
  if (s.status === "done" || s.status === "cached") {
   const urls = s.result.assetUrls
   const arts = s.result.artifacts
   if (!(Array.isArray(urls) && urls.length > 0)) return true
   if (arts && typeof arts === "object") {
    const n = Object.keys(arts).filter((k) => !k.startsWith("seam_")).length
    if (n > urls.length) return true
   }
   // CALLS-AWARE (2026-08-30 "only shows the first clip"): artifacts can
   // be stripped entirely (older snapshots) — then only the PLAN knows
   // the run had multiple calls. Fewer assetUrls than calls = clip loss.
   const rawCalls = (s.params as { calls?: unknown } | undefined)?.calls
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
   if (callCount > 1 && Array.isArray(urls) && urls.length < callCount) return true
  }
  return false
 }
 // RUN-TRUTH VERIFICATION (2026-08-30, user: "prove my case, then fix it
 // for ever"): the plan itself is EDITABLE — the user's card edit collapsed
 // a four-call list to one empty call, and a snapshot with ONE clip, ZERO
 // artifacts and ONE call is indistinguishable from a genuine one-clip
 // run by every content witness above. The only SSOT that knows the run
 // rendered five clips is the run registry on disk. So every done stage
 // WITH a result is a VERIFY target: one local GET against the heal door
 // per open — the fetched truth replaces the snapshot ONLY when disk is
 // STRICTLY richer (never a downgrade, never churn when equal).
 const isVerifyTarget = (s: FlowStage): boolean =>
  kindDef(s.kind).executable &&
  !!s.result &&
  (s.status === "done" || s.status === "cached")
 const targets = p0.stages.filter((s) => stageNeedsHeal(s) || isVerifyTarget(s))
 let healed = 0
 for (const s of targets) {
 try {
 const res = await apiFetch(
 `/v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(s.id)}/result`,
 )
 if (!res.ok) continue
 const data = (await res.json()) as {
 found?: boolean
 result?: unknown
 }
 if (!data.found || !data.result) continue
 const result = sanitizeRevivedResult(data.result)
 if (!result) continue
 // VERIFY-ONLY TARGETS: disk not strictly richer than what the store
 // already holds → keep the snapshot (no downgrade, no persist churn).
 if (!stageNeedsHeal(s) && result.assetUrls.length <= (s.result?.assetUrls?.length ?? 0)) {
  continue
 }
 // Race guard: the flow may have been swapped (another hydrate /
 // clear / thread switch) while we fetched.
 const p = get().flow
 if (!p || p.id !== draftId) return healed
 set({
 flow: {
 ...p,
 stages: p.stages.map((st) =>
 st.id === s.id && (!st.result || stageNeedsHeal(st) || isVerifyTarget(st))
 ? { ...st, result, status: "done" as FlowStageStatus, error: null }
 : st,
 ),
 },
 })
 healed++
 } catch {
 /* best-effort — the stage stays as-is; the next open retries */
 }
 }
 return healed
 },

 updateStageParams: async (stageId, params, service, opts) => {
 const { flow } = get()
 if (!flow) return { ok: false, error: "No flow loaded" }
 const idx = flow.stages.findIndex((s) => s.id === stageId)
 if (idx === -1) {
 const available = flow.stages.map((s) => s.id).join(", ")
 return { ok: false, error: `Stage ${stageId} not found. Available: ${available}` }
 }
 const stage = flow.stages[idx]
 const mergedParams = { ...stage.params, ...params }
 // ROUTE-CARRIER SYNC (2026-08-13): params.model is the ROUTE carrier
 // for family-id services (YAML hydration: service "audio_music",
 // params.model "ace-step"), but merge semantics NEVER delete keys — a
 // variant/model switch that changes the service left the OLD carrier
 // behind (stage.service "ace-step-sft" + params.model "ace-step" → the
 // run-body spread let the stale carrier win → the SFT card loaded turbo
 // weights, with zero validation anywhere). The store is the single
 // mutation point for route switches, so when a NEW catalog route is
 // being applied, the carrier follows it — always. Family-id services
 // keep the carrier untouched (the run body prefers it there). The
 // backend compile layer re-checks the wire and fails loud on any
 // disagreement that still slips through.
 const routeSync = service !== undefined && service !== stage.service
 if (
   routeSync &&
   "model" in mergedParams &&
   getCachedCatalog()?.models?.[service] != null
 ) {
   mergedParams.model = service
 }
 // NO-OP SHORT-CIRCUIT: if neither the merged params nor the service
 // actually changed, do NOTHING — no set(), no _recomputeKeys(), no
 // staleness marking. Several editors re-emit the EXISTING values on
 // card-open: ParamEditor's debounce fires again when the form-spec lands
 // async after mount (bumping specVw — the didMountRef skip only covers
 // the literal first render), plus SubcardGrid / the body studio tenant hydrate
 // write-backs. Merging those is a no-op, so marking the card stale was a
 // lie — "the user changed nothing, but the card is stale." stableStringify
 // is the SAME canonical form computeCacheKey uses, so this is consistent
 // with the staleness detector itself (and tolerant of key-order shifts).
 const paramsChanged = stableStringify(mergedParams) !== stableStringify(stage.params)
 const serviceChanged = service !== undefined && service !== stage.service
 if (!paramsChanged && !serviceChanged) {
 return { ok: true }
 }
 // ADDITIVE-NORMALIZATION SHORT-CIRCUIT: ParamEditor's applySpecVocabulary
 // seeds schema-declared defaults for fields the card was missing (the
 // catalog `defaults:` often carries a SUBSET — ACE-Step seeds only
 // {seed,duration,prompt} while the schema declares 12 fields). The
 // merged params then carry MORE keys than the stage, but every EXISTING
 // key-value is untouched. The backend already applied those same schema
 // defaults for the absent fields, so the result is still valid — this
 // is NOT a user edit, and marking stale was the "open a card, change
 // nothing, it's stale" bug. No-op here (no set(), no _recomputeKeys())
 // so the cacheKey stays computed from the ORIGINAL params (which match
 // the result), keeping staleness in sync. The UI shows the full form
 // from ParamEditor's seeded draft; Run flushes via pendingEditRef.
 // A purge of dead keys (a key DROPPED) falls through to stale — that's a
 // real schema-shape change, and isAdditiveNormalization returns false
 // for it. Value changes also fall through. Only purely-additive seeds
 // are treated as neutral.
 // USER-EDIT BYPASS (2026-08-18: "I CLICK ADD, NOTHING APPEARS!"): the
 // additive swallow exists ONLY for ParamEditor's mount-seed — the
 // schema-defaults fill adds keys the catalog `defaults:` didn't carry,
 // and marking a freshly-opened card stale for that was a lie. But it
 // swallowed REAL additive commits too: adding the FIRST mod to a card
 // whose params carry no `loras` key is purely additive, so the whole
 // commit no-opped WITHOUT set() — the tile never appeared, the store
 // never learned the mod. Zone commits (mods, slot attaches) pass
 // { userEdit: true } through onEditSave; only the ParamEditor seeding
 // path keeps its normalization protection.
 if (!serviceChanged && !opts?.userEdit && isAdditiveNormalization(stage.params, mergedParams)) {
    // NEUTRAL COMMIT — APPLY, don't swallow (2026-08-21: "I can't
    // actually upload images into image ops"). The old no-op return
    // assumed "the UI shows the full form from ParamEditor's seeded
    // draft" — false for slot-driven surfaces: the Inputs section
    // (SlotGrid) renders from STAGE.PARAMS via stageSlots() = declared
    // vocab ∩ params-keys. Swallowing the null-seeded slot keys
    // (input_image/image2/image3) left fresh image-op cards with NO
    // input squares and no upload targets, and the localStorage mirror
    // never carried them either. Still neutral: params shape updates,
    // but NO status:"stale" and NO _recomputeKeys() — the additive keys
    // are schema defaults/null slots the backend applies anyway, so the
    // existing result + cacheKey stay valid (the original point of this
    // branch: never mark a freshly-opened card stale for its own seed).
    const stagesNeutral = flow.stages.map((s, i2) =>
      i2 === idx
        ? {
            ...s,
            params: mergedParams,
          }
        : s,
    )
    set({ flow: { ...flow, stages: stagesNeutral } })
 // SERVER PERSIST (2026-08-22): slot null-seeds and attaches flow
 // through this neutral branch — the server draft must learn them or
 // a rehydrate loses every slot square (same verdict as wires).
 enqueueStagePatch(flow.id, stageId, { params: mergedParams })
 return { ok: true }
 }
 const stages = flow.stages.map((s, i) =>
 i === idx
 ? {
 ...s,
 params: mergedParams,
 ...(service !== undefined ? { service } : {}),
 }
 : s,
 )
 set({ flow: { ...flow, stages, status: "stale" } })
 await get()._recomputeKeys()
 // SERVER PERSIST (2026-08-22): every full params commit (uploads,
 // slot attaches, form edits) mirrors to the draft — the client store
 // is no longer the only place an upload exists.
 enqueueStagePatch(flow.id, stageId, { params: mergedParams })
 return { ok: true }
 },

 applyStageMutation: (stageId, mutation) => {
 const { flow } = get()
 if (!flow) return { ok: false, error: "No flow loaded" }
 if (!flow.stages.some((s) => s.id === stageId)) {
 return { ok: false, error: `No stage ${stageId}` }
 }
 // gateStageMutation (the lib gate, imported) — every mutation passes
 // through the declarative table; rejected = no write.
 const result = gateStageMutation(mutation)
 if (!result.ok) return result
 set({
 flow: {
 ...flow,
 stages: flow.stages.map((s) =>
 s.id === stageId ? { ...s, ...result.patch } : s,
 ),
 },
 })
 return result
 },

 applyDocMutation: (mutation) => {
 const { flow } = get()
 if (!flow) return { ok: false, error: "No flow loaded" }
 // gateDocMutation (the lib gate, imported) — every doc mutation passes
 // through the declarative table; rejected = no write. Cosmetic: no
 // staleness marking, no _recomputeKeys (a rename is not semantic).
 const result = gateDocMutation(mutation)
 if (!result.ok) return result
 set({ flow: { ...flow, ...result.patch } })
 return result
 },

 _recomputeKeys: async () => {
 const { flow } = get()
 if (!flow) return
 // Recompute cacheKeys in topological order (inputs always have lower
 // indices — the agent builds descriptors in order).
 const stages = [...flow.stages]
 for (let i = 0; i < stages.length; i++) {
 const s = stages[i]
 const upstreamKeys = s.inputs.map((id) => stages.find((x) => x.id === id)?.cacheKey ?? null)
 const newKey = await computeCacheKey(s.service, s.params, upstreamKeys)
 const prevKey = s.cacheKey
 if (prevKey !== null && newKey !== prevKey && s.status === "done") {
 // cacheKey changed AND the stage had completed → mark stale so the
 // user knows they need to re-run.
 stages[i] = { ...s, cacheKey: newKey, status: "stale" }
 } else if (prevKey !== newKey && s.status !== "done") {
 stages[i] = { ...s, cacheKey: newKey }
 }
 }
 // The flow may have been cleared or replaced while we were computing
 // (computeCacheKey awaits crypto.subtle.digest — a REAL suspension). A
 // fire-and-forget recompute (canvas drop → void addStage, removeStage,
 // reorderStage) finishing after clear() must NEVER resurrect the stale
 // document. Reference-compare: every flow mutation creates a NEW
 // object or null, so a mismatch means our captured snapshot is dead.
 // (2026-08-08 full-suite flake: capability-drag-populate saw a flow
 // resurrected by a recompute from the previous test.)
 if (get().flow !== flow) return
 set({ flow: { ...flow, stages } })
 },

})
