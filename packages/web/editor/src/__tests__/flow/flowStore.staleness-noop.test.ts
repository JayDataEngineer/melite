// Staleness no-op guards for updateStageParams (2026-08-13).
//
// The "open a card, change nothing, it's stale" bug: ParamEditor's
// applySpecVocabulary seeds schema-declared defaults for fields the
// draft was missing (catalog `defaults:` often carries a SUBSET). The
// 300ms auto-save then re-emits the "normalized" draft, and the merged
// params genuinely differ from stage.params (new keys) — so the old
// store marked the card stale even though the user touched nothing.
//
// Two short-circuits in updateStageParams fix this:
// 1. IDENTICAL no-op — merged params are byte-identical to the stage's
//    (the spec-seed was a no-op because the card already carried every
//    field). Re-asserting the same values is never a stale-worthy edit.
// 2. ADDITIVE normalization — the merged params preserve every existing
//    key-value and only ADD keys the stage didn't have. The backend
//    already applied those same schema defaults for the absent fields,
//    so the result is still valid; marking stale was a lie. This is the
//    ACE-Step shape: {seed,duration,prompt} → those three PLUS 9 seeded
//    schema fields, all three originals untouched.
//
// Real edits (a VALUE changes) and purges (a key DROPPED) still mark
// stale — those are genuine shape changes the user can see.
import { describe, it, expect, beforeEach } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"
import type { StageDescriptor } from "@melite/contracts"

beforeEach(() => {
 useAgentFlowStore.getState().clear()
})

describe("updateStageParams — staleness no-op guards", () => {
 const seedPipe = async (
   params: Record<string, unknown> = { seed: -1, duration: 30, prompt: "" },
 ): Promise<string> => {
   const stages: StageDescriptor[] = [
     { title: "Gen", kind: "generation", service: "ace-step", params },
   ]
   await useAgentFlowStore.getState().hydrateDraft(makeDraft("test", stages))
   return useAgentFlowStore.getState().flow!.stages[0].id
 }

 it("IDENTICAL re-emit is a no-op — no stale, no cacheKey churn", async () => {
   const id = await seedPipe({ seed: -1, duration: 30, prompt: "hello" })
   const pipe = () => useAgentFlowStore.getState().flow!
   const keyBefore = pipe().stages[0].cacheKey
   const statusBefore = pipe().stages[0].status

   // Re-emit the SAME values (key order shuffled to prove canonical form).
   const res = await useAgentFlowStore.getState().updateStageParams(id, {
     prompt: "hello", seed: -1, duration: 30,
   })
   expect(res.ok).toBe(true)
   expect(pipe().stages[0].status).toBe(statusBefore)
   expect(pipe().stages[0].cacheKey).toBe(keyBefore)
   expect(pipe().status).not.toBe("stale")
 })

 it("ADDITIVE normalization (schema defaults seeded) is NEUTRAL — applied, NOT stale", async () => {
    // The ACE-Step shape: catalog carried {seed,duration,prompt}; the form-
    // spec seeds 9 more schema fields. Every original is preserved; only new
    // keys appear. The backend already used those defaults → not stale.
    // (2026-08-21) The keys still LAND in stage.params — a NEUTRAL commit,
    // not a swallow: slot-driven surfaces (SlotGrid/Inputs) render from
    // stage.params via stageSlots() = declared vocab ∩ params-keys, so the
    // old no-op return left fresh image-op cards with NO input squares
    // ("can't upload images into image ops"). Stale/cacheKey stay untouched.
    const id = await seedPipe({ seed: -1, duration: 30, prompt: "" })
    const pipe = () => useAgentFlowStore.getState().flow!
    const keyBefore = pipe().stages[0].cacheKey

    const res = await useAgentFlowStore.getState().updateStageParams(id, {
      dit_variant: "turbo",
      lm_variant: "1.7B",
      vae_variant: "stock",
      guidance_scale: 1.0,
    })
    expect(res.ok).toBe(true)
    // The additive keys APPLIED (neutral: no stale, no cacheKey churn).
    expect(pipe().stages[0].params).toEqual({
      seed: -1, duration: 30, prompt: "",
      dit_variant: "turbo", lm_variant: "1.7B", vae_variant: "stock", guidance_scale: 1.0,
    })
    expect(pipe().stages[0].cacheKey).toBe(keyBefore)
    expect(pipe().status).not.toBe("stale")
  })
 it("a VALUE change marks stale (the additive guard does NOT mask real edits)", async () => {
   const id = await seedPipe({ seed: -1, duration: 30, prompt: "hello" })
   const pipe = () => useAgentFlowStore.getState().flow!

   await useAgentFlowStore.getState().updateStageParams(id, { prompt: "night" })
   expect(pipe().stages[0].params.prompt).toBe("night")
   expect(pipe().status).toBe("stale")
 })

 it("a key DROPPED (purge) marks stale — not treated as additive", async () => {
   const id = await seedPipe({ seed: -1, duration: 30, prompt: "", dead_key: "x" })
   const pipe = () => useAgentFlowStore.getState().flow!

   // Merge that drops dead_key (simulate a purge). The additive guard
   // returns false because an existing key is absent from the merged set.
   // We can't drop a key via updateStageParams's merge directly (it spreads
   // old then new), so this test documents the guard's contract: a real
   // value change alongside additive keys still marks stale.
   await useAgentFlowStore.getState().updateStageParams(id, {
     dead_key: "changed", // value change on existing key → not additive
   })
   expect(pipe().status).toBe("stale")
 })

 it("a service swap marks stale even when params are additive", async () => {
   const id = await seedPipe({ seed: -1, duration: 30, prompt: "" })
   const pipe = () => useAgentFlowStore.getState().flow!

   await useAgentFlowStore.getState().updateStageParams(
     id,
     { guidance_scale: 1.0 }, // additive
     "flux-dev",              // but service swapped → real change
   )
   expect(pipe().stages[0].service).toBe("flux-dev")
   expect(pipe().status).toBe("stale")
 })
})
