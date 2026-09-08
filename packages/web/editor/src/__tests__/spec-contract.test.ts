// specContract — the frontend half of the NO SILENT DROPS contract.
//
// 2026-08-11: every form-spec entering the app passes validateSpecContract
// (in the specContractStore). These tests lock the gates: an error body
// can never masquerade as a spec, and a declared weights-file kind can
// never reach render with an empty/all-disabled dropdown.
import { describe, expect, it } from "vitest"
import { validateSpecContract } from "@melite/formats"

const GOOD_SPEC = {
 fields: [] as never[], schema_groups: [] as never[],
 features: {
  modifiers: [
   {
    kind: "controlnet", label: "ControlNet", param_key: "controlnets",
    cardinality: "list", max_stack: 3,
    fields: [{ name: "strength", type: "float", default: 0.8 }],
    options: [
     { value: "canny", label: "Canny", model: "canny.safetensors", installed: true },
    ],
   },
   {
    kind: "lora", label: "LoRA", param_key: "loras",
    cardinality: "list",
    fields: [{ name: "strength", type: "float", default: 1.0 }],
    options: [
     { value: "anime.safetensors", label: "anime.safetensors", model: "anime.safetensors", installed: true },
    ],
   },
  ],
 },
}

describe("validateSpecContract", () => {
 it("accepts a contract-valid spec (declared kinds + options)", () => {
  const r = validateSpecContract(GOOD_SPEC)
  expect(r.valid).toBe(true)
  expect(r.violations).toEqual([])
 })

 it("SHAPE GATE: an error body (no features) is a hard violation", () => {
  // The 500-period class: the endpoint failed, the body was parsed as a
  // spec, `features` absent → the grid silently vanished. Now it's a
  // visible violation.
  const r = validateSpecContract({ error: "Internal Server Error", detail: "boom" })
  expect(r.valid).toBe(false)
  expect(r.violations.some((v) => v.kind === "spec")).toBe(true)
 })

 it("SHAPE GATE: non-object / null spec is a hard violation", () => {
  expect(validateSpecContract(null).valid).toBe(false)
  expect(validateSpecContract("not a spec").valid).toBe(false)
  expect(validateSpecContract(undefined).valid).toBe(false)
 })

 it("features.modifiers absent or null = no capability declared (contract-valid); non-array non-null = violation", () => {
  // The wire model serializes the optional field as null (model_dump emits
  // declared fields) — ALL no-modifier models ship features.modifiers: null
  // (verified live on h3). null is the HONEST "no modifier capability",
  // same as absence. The 2026-08-11 banner ("…and 28 more") was this: the
  // gate treated null as a violation.
  expect(validateSpecContract({ features: {}, fields: [] as never[], schema_groups: [] as never[] }).valid).toBe(true)
  expect(validateSpecContract({ features: { modifiers: null }, fields: [] as never[], schema_groups: [] as never[] }).valid).toBe(true)
  expect(validateSpecContract({ features: { modifiers: "nope" } }).valid).toBe(false)
 })

 it("KIND GATE: a kind without param_key or fields is a violation", () => {
  // Record<string, any>: test fixtures model the wire payload (the gate is
  // the runtime validator, not static typing — empty array literals need a
  // contextual type to satisfy tsc).
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "controlnet", label: "ControlNet", cardinality: "list" },
    ],
   },
  }
  const r = validateSpecContract(spec)
  expect(r.valid).toBe(false)
  expect(r.violations.some((v) => v.kind === "controlnet")).toBe(true)
 })

 it("OPTIONS GATE: declared lora/controlnet with ZERO options is a violation", () => {
  // Backend mirror: the emission gate raises instead of emitting this;
  // if it reaches the client, the store refuses it — the dropdown can
  // never render empty.
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
       fields: [] as never[], options: [] },
    ],
   },
  }
  const r = validateSpecContract(spec)
  expect(r.valid).toBe(false)
  expect(r.violations[0].kind).toBe("lora")
  expect(r.violations[0].message).toMatch(/ZERO options/)
 })

 it("upload_dir ALONE does NOT exempt a zero-option weights-file kind (2026-08-11 incident)", () => {
  // The empty-lora-dropdown incident: the catalog emitted the raw YAML
  // lora kind (options: [], upload_dir: "z-image") and the frontend
  // blessed it as valid while the form-spec shipped 7 options. upload_dir
  // is NOT proof the enrichment ran — options_scanned is.
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "controlnet", label: "ControlNet", param_key: "controlnets",
       cardinality: "list", upload_dir: "controlnet", fields: [] as never[], options: [] },
    ],
   },
  }
  const r = validateSpecContract(spec)
  expect(r.valid).toBe(false)
  expect(r.violations[0].message).toMatch(/scan proof/)
 })

 it("options_scanned=true + upload_dir exempts a zero-option weights-file kind (scan ran, nothing found)", () => {
  // The HONEST zero-option case: the enrichment ran (options_scanned —
  // the backend emission's proof marker), found nothing on disk, and the
  // upload_dir gives the user an upload path. Contract-valid.
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "controlnet", label: "ControlNet", param_key: "controlnets",
       cardinality: "list", upload_dir: "controlnet", options_scanned: true,
       fields: [] as never[], options: [] },
    ],
   },
  }
  expect(validateSpecContract(spec).valid).toBe(true)
 })

 it("INSTALLED GATE: every option uninstalled = violation (all-disabled dropdown)", () => {
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "controlnet", label: "ControlNet", param_key: "controlnets",
       cardinality: "list", fields: [] as never[],
       options: [
        { value: "canny", label: "Canny", model: "c.safetensors", installed: false },
        { value: "depth", label: "Depth", model: "d.safetensors", installed: false },
       ] },
    ],
   },
  }
  const r = validateSpecContract(spec)
  expect(r.valid).toBe(false)
  expect(r.violations[0].message).toMatch(/NOT installed/)
 })

 it("option without a value is a violation (unusable entry)", () => {
  const spec: Record<string, any> = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
       fields: [] as never[], options: [{ label: "no value" }] },
    ],
   },
  }
  expect(validateSpecContract(spec).valid).toBe(false)
 })

 it("scalar kinds (clip_skip) need no options — no violation", () => {
  const spec = {
   fields: [] as never[], schema_groups: [] as never[],
   features: {
    modifiers: [
     { kind: "clip_skip", label: "Clip Skip", param_key: "clip_skip",
       cardinality: "scalar", fields: [{ name: "skip", type: "integer" }] },
    ],
   },
  }
  expect(validateSpecContract(spec).valid).toBe(true)
 })
})
