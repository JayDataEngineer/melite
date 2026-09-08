/**
 * makeDraft — the backend-shaped draft fixture for store tests.
 *
 * 2026-08-13: build_flow moved to the backend. The store's materializer
 * (buildFlow) is gone — tests that need a flow in the store now feed
 * hydrateDraft with a FULL draft as POST /v1/flows/drafts would persist
 * it. This helper is the STAND-IN for the server: it assigns stage ids
 * (s_xxx), resolves inputIndices → stage ids, and resolves
 * compound.childIndices → childIds — the wire contract the server guarantees.
 *
 * It does NOT do the slot-vocabulary fold / null-seeding — that's backend
 * logic (backend/core/flows/drafts.py, covered by test_flow_drafts.py
 * TestSlotVocabularyFold). Tests that need folded params write them
 * pre-folded in the spec, exactly as the server would return them.
 *
 * Params pass through verbatim — hydrateDraft adopts them AS-IS.
 */
import { padInputs, stageSlots } from "@melite/catalog"
import type {
 BackendDraft,
 BackendStage,
 CompoundDescriptor,
 InlineFlowBody,
 StageDescriptor,
 StudioTarget,
} from "@melite/contracts"

let _draftSeq = 0
let _stageSeq = 0

/** Reset the id counters — call in beforeEach for fully deterministic ids. */
export function resetDraftIds() {
 _draftSeq = 0
 _stageSeq = 0
}

/** The wire only carries studio "body" — drafts.py StageIn.studio is
 * Literal["body"], the faithful port of the old frontend zod enum
 * (z.enum(["body"])). Anything else fails LOUD here instead of silently
 * dropping, exactly as the backend would 422 the whole draft. */
function wireStudio(studio: StudioTarget): "body" {
 if (studio !== "body") {
  throw new Error(
   `makeDraft: studio "${studio}" cannot be authored on the wire — ` +
    "drafts.py StageIn.studio is Literal[\"body\"] (the backend 422s this).",
  )
 }
 return studio
}

/** Resolve a compound descriptor's childIndices → childIds (the server
 * contract: the draft carries ids, never indices). */
function resolveCompound(
 compound: CompoundDescriptor,
 ids: string[],
): BackendStage["compound"] {
 return {
  mode: compound.mode,
  childIds: compound.childIndices.map((i) => ids[i]),
  ...(compound.flowName ? { flowName: compound.flowName } : {}),
  ...(compound.paramKey ? { paramKey: compound.paramKey } : {}),
 }
}

/** Build a backend-shaped draft from a descriptor list. Each call mints a
 * NEW draft id so the store's idempotency guard never skips a rebuild. */
export function makeDraft(
 intent: string,
 specs: StageDescriptor[],
 flow?: InlineFlowBody,
): BackendDraft {
 const ids = specs.map(() => `s_${++_stageSeq}`)
 const stages: BackendStage[] = specs.map((s, i) => ({
  id: ids[i],
  title: s.title,
  ...(s.subtitle ? { subtitle: s.subtitle } : {}),
  kind: s.kind,
  service: s.service,
  params: s.params,
  // Resolve inputIndices → ids, then pad to the declared slot list —
  // the backend's padInputs contract (drafts.py null-seeds the params,
  // so the slot count is derivable from the params keys the spec
  // declares). The store adopts the padded array as-is.
  inputs: padInputs(
   (s.inputIndices ?? []).map((j) => ids[j]),
   stageSlots(s.params),
  ),
  ...(s.flowName ? { flowName: s.flowName } : {}),
  ...(s.studio ? { studio: wireStudio(s.studio) } : {}),
  ...(s.studioContext ? { studioContext: s.studioContext } : {}),
  ...(s.compound ? { compound: resolveCompound(s.compound, ids) } : {}),
  provenance: "agent",
 }))
 return {
  draft_id: `p_test${++_draftSeq}`,
  intent,
  stages,
  status: "ready",
  createdAt: Date.now(),
  completedAt: null,
  // The multi-step compose wire (2026-09-05): build_flow's multi mode
  // persists the compiled typed body on the draft; the card surface
  // posts it as {flow_inline} on Run. Stage ids are SHARED with the
  // body's (the overlay join key) — tests pass the body with matching
  // ids, exactly as the tool writes it.
  ...(flow ? { flow } : {}),
 }
}
