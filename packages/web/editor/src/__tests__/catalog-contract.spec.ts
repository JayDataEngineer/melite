// catalogContract — the catalog half of the NO SILENT DROPS contract.
//
// 2026-08-11: every catalog payload entering the app passes
// validateCatalogContract (in the catalog store's loadCatalog funnel).
// These tests lock the gates, including the FAMILY MODIFIERS gate — the
// exact incident class where the families payload leaked the raw YAML
// lora kind (options: [], upload_dir present, no scan proof) while the
// form-spec shipped 7 enriched options.
import { describe, expect, it } from "vitest"
import { validateCatalogContract } from "@melite/catalog"

// Record<string, any>: fixtures model the wire payload — the gate under
// test is the runtime validator, not static typing (empty `fields: []`
// literals need a contextual type for tsc).
const GOOD_CATALOG: Record<string, any> = {
 families: {
  "z-image": {
   label: "Z-Image",
   modifiers: [
    { kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
      fields: [], options_scanned: true, upload_dir: "z-image", options: [
      { value: "anime.safetensors", label: "anime.safetensors", installed: true },
     ] },
   ],
  },
 },
 models: {
  "z-image": { family: "z-image", form: "image_gen", label: "Z-Image" },
 },
}

describe("validateCatalogContract", () => {
 it("accepts a contract-valid catalog", () => {
  const r = validateCatalogContract(GOOD_CATALOG)
  expect(r.valid).toBe(true)
  expect(r.violations).toEqual([])
 })

 it("SHAPE GATE: an error body (no families/models) is a hard violation", () => {
  const r = validateCatalogContract({ error: "Internal Server Error" })
  expect(r.valid).toBe(false)
  expect(r.violations[0].kind).toBe("catalog")
 })

 it("FAMILY MODIFIERS GATE: zero options + NO upload_dir is a violation (phantom capability)", () => {
  // CATALOG LEVEL: upload_dir is the proof (NOT options_scanned — that
  // flag is emission-time only, set by form_spec.py AFTER the disk scan;
  // it CAN'T exist on the raw catalog). A zero-option lora kind without
  // upload_dir is a phantom — the dropdown would render empty.
  const r = validateCatalogContract({
   families: {
    "z-image": {
     label: "Z-Image",
     modifiers: [
      { kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
        fields: [], options: [] },
     ],
    },
   },
   models: { "z-image": { family: "z-image", form: "image_gen", label: "Z-Image" } },
  })
  expect(r.valid).toBe(false)
  const v = r.violations.find((x) => x.kind === "z-image")
  expect(v).toBeTruthy()
  expect(v!.message).toMatch(/phantom capability/)
 })

 it("FAMILY MODIFIERS GATE: zero options + upload_dir is valid (options are disk-appended at emission)", () => {
  // The catalog-level honest empty: anima/ideogram/qwen-img-edit-2511 declare a
  // lora kind with options: [] and an upload_dir. Options are disk-
  // appended at form_spec emission time (list_model_loras scans the
  // subdir). The upload_dir proves the kind accepts uploads — that's the
  // only proof possible at catalog load time. The ENRICHED emission is
  // separately checked by specContract.ts (which ALSO requires
  // options_scanned === true, a flag the emission sets after the scan).
  const r = validateCatalogContract({
   families: {
    "z-image": {
     label: "Z-Image",
     modifiers: [
      { kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
        fields: [], options: [], upload_dir: "z-image" },
     ],
    },
   },
   models: { "z-image": { family: "z-image", form: "image_gen", label: "Z-Image" } },
  })
  expect(r.valid).toBe(true)
 })

 it("FAMILY MODIFIERS GATE: enriched options (options_scanned) validate", () => {
  const r = validateCatalogContract(GOOD_CATALOG)
  expect(r.valid).toBe(true)
 })

 it("non-array modifiers block is a violation", () => {
  const r = validateCatalogContract({
   families: { "z-image": { label: "Z-Image", modifiers: "leaked" } },
   models: { "z-image": { family: "z-image", form: "image_gen", label: "Z-Image" } },
  })
  expect(r.valid).toBe(false)
  expect(r.violations.some((v) => v.kind === "z-image")).toBe(true)
 })

 it("modifiers: null = no modifier capability declared (contract-valid) — the 2026-08-11 banner regression", () => {
  // THE live-bug regression: /v1/model-catalog serializes through
  // CatalogResponse.model_dump() which emits every declared field with its
  // None default → ALL families carry a `modifiers` key, null for the 31
  // that declare none. The gate treated null as "not an array" and the UI
  // banner fired ("Family moss-tts declares 'modifiers' but it is not an
  // array …and 28 more. Retry"). null is the HONEST no-capability state.
  const r = validateCatalogContract({
   families: {
    "moss-tts": { label: "Moss TTS", modifiers: null },
    "qwen3-tts": { label: "Qwen3 TTS", modifiers: null },
   },
   models: {
    "moss-tts": { family: "moss-tts", form: "speech_tts", label: "Moss TTS" },
    "qwen3-tts": { family: "qwen3-tts", form: "speech_tts", label: "Qwen3 TTS" },
   },
  })
  expect(r.valid).toBe(true)
  expect(r.violations).toEqual([])
 })
})
