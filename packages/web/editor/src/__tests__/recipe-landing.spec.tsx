// recipe-landing.spec.tsx — the group-default LANDING (operator order,
// 2026-09-06: "you need to fix recpiece. THere should be default, and
// that is what we land on"). applySpecVocabularyToDraft stamps a group's
// declared default variant (VariantGroup.default on the py side — the
// Recipe axis) onto a draft that never carried the group's vocabulary.
// User state is sovereign: an active variant or ANY present override
// key (even a cleared [] bag) means no landing.
import { describe, it, expect, vi } from "vitest"
import { applySpecVocabularyToDraft } from "../surfaces/flow/flowParamSync"
import type { FormSpec } from "@melite/contracts"

vi.mock("@melite/catalog", () => ({
 inputSlots: vi.fn(() => []),
 cardSlotsFor: vi.fn(() => []),
 isUndeclaredWireSlot: vi.fn(() => false),
}))

// The krea-2 seam, trimmed: Recipe group default=realism; the realism
// row stamps the loras pick (exactly what the live spec serves).
function spec(withDefault: boolean): FormSpec {
 return {
 model: "krea-2", form: "image-gen", service: "krea-2", label: "Image",
 fields: [
 { name: "prompt", type: "textarea", label: "Prompt" },
 { name: "loras", type: "loras", label: "LoRAs" },
 ],
 schema_groups: [
 { id: "prompt", label: "Prompt", order: 0, zone: "params",
 fields: [{ name: "prompt", type: "textarea", label: "Prompt", order: 0 }] },
 ],
 features: {
 variant_groups: {
 Recipe: { label: "Recipe", ...(withDefault ? { default: "realism" } : {}) },
 },
 modifiers: [],
 },
 variants: [
 { id: "realism", label: "Realism", group: "Recipe",
 defaults: { loras: [{ id: "krea2_realism_lora" }] } },
 ],
 guide: null,
 } as unknown as FormSpec
}

describe("recipe landing — LAND ON THE DECLARED DEFAULT", () => {
 it("a fresh draft (no loras key) LANDS on the default recipe: the pick is stamped", () => {
 const out = applySpecVocabularyToDraft({ prompt: "" }, spec(true), "krea-2", new Set(["prompt"]))
 expect(out.loras).toEqual([{ id: "krea2_realism_lora" }])
 })

 it("a draft that already carries the vocabulary is NEVER re-stamped", () => {
 const out = applySpecVocabularyToDraft(
 { prompt: "", loras: [{ id: "krea2_darkbrush", strength: 0.8 }] },
 spec(true), "krea-2", new Set(["prompt"]),
 )
 expect(out.loras).toEqual([{ id: "krea2_darkbrush", strength: 0.8 }])
 })

 it("a CLEARED bag (loras: []) stays cleared — the group was touched", () => {
 const out = applySpecVocabularyToDraft(
 { prompt: "", loras: [] }, spec(true), "krea-2", new Set(["prompt"]),
 )
 expect(out.loras).toEqual([])
 })

 it("no declared default → no landing (nothing array-shaped is stamped)", () => {
 const out = applySpecVocabularyToDraft({ prompt: "" }, spec(false), "krea-2", new Set(["prompt"]))
 expect(Array.isArray(out.loras)).toBe(false)  // "" — the inert seed, no recipe
 })

 it("landing is idempotent: a landed draft derives as the active variant and is not re-stamped", () => {
 const first = applySpecVocabularyToDraft({ prompt: "" }, spec(true), "krea-2", new Set(["prompt"]))
 const second = applySpecVocabularyToDraft(first, spec(true), "krea-2", new Set(["prompt"]))
 expect(second).toEqual(first)
 })
})
