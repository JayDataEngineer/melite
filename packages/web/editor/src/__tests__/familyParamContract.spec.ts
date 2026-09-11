import { describe, expect, it, vi, beforeEach } from "vitest"
import { validateParamsAgainstSchema, coerceParamsToSchema, loadFamilySchemas, getFamilySchema, type FamilyParamSchema } from "@melite/catalog"

// A realistic schema (mirrors the shape GET /v1/flows/families/.../param-schema
// returns — Pydantic model_json_schema with extra="forbid").
const KIMODO_SCHEMA: FamilyParamSchema = {
  properties: {
    prompt: { type: "string" },
    motion_constraints: { type: "string", default: "" },
    prev_motion_artifact: { type: "string", default: "" },
    seed: { type: "integer", default: 0 },
    comfy_url: { type: "string" }, // injected from shared — no default
  },
  required: ["prompt", "comfy_url"],
  additionalProperties: false,
}

describe("validateParamsAgainstSchema", () => {
  it("flags a str param sent as an OBJECT (the motion_constraints bug)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      motion_constraints: { keyframes: [] }, // OBJECT — the lie
    })
    expect(v.length).toBeGreaterThanOrEqual(1)
    expect(v.some((x) => x.path.includes("motion_constraints"))).toBe(true)
    expect(v.some((x) => x.message.includes("expected string"))).toBe(true)
  })

  it("passes a clean payload (stringified motion_constraints, null coerced)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      motion_constraints: JSON.stringify({ keyframes: [] }),
      prev_motion_artifact: null, // null + has default → OK
      seed: 42,
    })
    expect(v).toEqual([])
  })

  it("flags null on a field WITHOUT a default (comfy_url)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      comfy_url: null, // no default → violation
    })
    expect(v.some((x) => x.path === "comfy_url")).toBe(true)
  })

  it("flags an unknown param (additionalProperties: false)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      strngth: 0.8, // typo — unknown
    })
    expect(v.some((x) => x.path === "strngth")).toBe(true)
  })

  it("treats integer as valid where number is expected", () => {
    const numberSchema: FamilyParamSchema = {
      properties: { temperature: { type: "number", default: 0.7 } },
      additionalProperties: false,
    }
    const v = validateParamsAgainstSchema(numberSchema, { temperature: 1 })
    expect(v).toEqual([])
  })

  it("does NOT flag required-field absence (deferred to backend — consumes axis)", () => {
    // prompt + comfy_url are required, but the frontend doesn't know comfy_url
    // is injected from shared. So required-checking is NOT done here — zero
    // violations even though comfy_url is absent.
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, { prompt: "walk" })
    expect(v).toEqual([])
  })

  // ── WIRE_RELAXED (2026-08-14 param-vocabulary sweep) ──────────────────
  it("relaxes the alias keys the backend translates (pre-sweep saved cards)", () => {
    // A card SAVED before the sweep carries sampling_steps/guide_scale/
    // num_frames — compile translates them (steps/cfg/frames), so the wire
    // accepts the card; the local gate must not block what the wire accepts.
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      sampling_steps: 30,
      guide_scale: 4.0,
      num_frames: 97,
    })
    expect(v).toEqual([])
  })

  it("relaxes wire-level fields (live consumers only)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      image1: "stage0.png", // edit-card input slot
      model_name: "y.safetensors", // builder weight filename
    })
    expect(v).toEqual([])
  })

  it("throws on the retired transport fossils (no live consumer)", () => {
    // loras_selected: an unread transport fossil — CUT from the
    // relaxed set 2026-09-05 (mod-audit law: an entry needs a live
    // consumer; zero backend readers of this key exist)
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      loras_selected: { add: "x.safetensors" },
    })
    expect(v.length).toBe(1)
    expect(v[0].path).toBe("loras_selected")
  })

  it("still throws on a genuinely unknown key (the set is bounded)", () => {
    const v = validateParamsAgainstSchema(KIMODO_SCHEMA, {
      prompt: "walk",
      strngth: 0.8, // typo — NOT in the relaxed set
    })
    expect(v.some((x) => x.path === "strngth")).toBe(true)
  })
})

// ── 2026-09-05 image-edit incident: the served schemas were EMPTY ──────
// envelopes (every family), so this validator deferred ALWAYS and 27
// extra_forbidden errors fired at run time. The backend now derives
// each family's properties from its card's schema row. These tests pin
// the CONTRACT against a realistic derived schema: the editor's own
// full-surface form state must validate clean, and a typo'd mod key
// must throw AT THE CLICK (before any fetch), not after a round-trip.

// The derived shape GET /v1/flows/families/param-schemas serves for
// qwen-img-edit-2511 (abridged: the mod keys that killed the run +
// every wire type the derivation emits).
const IMAGE_EDIT_SCHEMA: FamilyParamSchema = {
  properties: {
    prompt: { type: "string" },
    negative_prompt: { type: "string" },
    input_image: { type: "string" },
    width: { type: "number" },
    height: { type: "number" },
    steps: { type: "number" },
    cfg: { type: "number" },
    seed: { type: "number", default: -1 },
    sampler: { type: "string" },
    scheduler: { type: "string" },
    preset: { type: "string" },
    use_stock_nodes: { type: "boolean" },
    double_reference: { type: "boolean" },
    lanpaint_enabled: { type: "boolean", default: false },
    lanpaint_num_steps: { type: "number", default: 20 },
    lanpaint_step_size: { type: "number", default: 1 },
    lanpaint_prompt_mode: { type: "string", default: "negative" },
    outpaint_top: { type: "number", default: 0 },
    outpaint_overlap: { type: "number", default: 16 },
    reference_images: { type: "array" },
    input_mask: { type: "string" },
    mask_mode: { type: "string", default: "auto" },
    mask_context_pad: { type: "number", default: 64 },
    mask_invert: { type: "boolean", default: false },
  },
  required: [],
  additionalProperties: false,
}

// The editor's plain-call form state: every served field rides with
// its default (useFormController seeding), plus prompt + anchor.
const IMAGE_EDIT_PLAIN_CALL: Record<string, unknown> = {
  prompt: "make it dusk",
  negative_prompt: "",
  input_image: "anchor.png",
  width: 1024,
  height: 1024,
  steps: 8,
  cfg: 1,
  seed: 7,
  sampler: "euler",
  scheduler: "simple",
  preset: "",
  use_stock_nodes: false,
  double_reference: false,
  lanpaint_enabled: false,
  lanpaint_num_steps: 20,
  lanpaint_step_size: 1,
  lanpaint_prompt_mode: "negative",
  outpaint_top: 0,
  outpaint_overlap: 16,
  input_mask: "",
  mask_mode: "auto",
  mask_context_pad: 64,
  mask_invert: false,
}

describe("image-edit incident contract (derived non-empty schemas)", () => {
  it("validates the editor's full-surface plain call CLEAN (no fetch needed)", () => {
    // Against the pre-2026-09-05 EMPTY envelope this returned [] by
    // DEFERRAL (the gate was decorative); against the derived schema
    // it must return [] by DECLARATION (every key known, types match).
    // Either way [] — the difference is the next two tests.
    const v = validateParamsAgainstSchema(
      IMAGE_EDIT_SCHEMA,
      IMAGE_EDIT_PLAIN_CALL,
    )
    expect(v).toEqual([])
  })

  it("throws a TYPO'D mod key at the click (the 27-error class)", () => {
    // lanpaint_enabeld is not a card field — the click-time gate must
    // name it BEFORE any fetch. Against the old empty envelope this
    // returned [] and the run died at the backend with extra_forbidden.
    const v = validateParamsAgainstSchema(IMAGE_EDIT_SCHEMA, {
      ...IMAGE_EDIT_PLAIN_CALL,
      lanpaint_enabeld: false, // typo — NOT in the derived surface
    })
    expect(v.some((x) => x.path === "lanpaint_enabeld")).toBe(true)
  })

  it("admits a FIRING mod key at the click (firing is the backend's call)", () => {
    // lanpaint_enabled: true is DECLARED — the click-time gate admits
    // it (no violation); the backend's firing gate refuses it loudly
    // when the cut can't honor it. Admission ≠ permission.
    const v = validateParamsAgainstSchema(IMAGE_EDIT_SCHEMA, {
      ...IMAGE_EDIT_PLAIN_CALL,
      lanpaint_enabled: true,
    })
    expect(v).toEqual([])
  })

  it("still DEFERS on an empty-properties envelope (unknown family backstop)", () => {
    // Unboarded families serve {properties: {}} — the gate cannot know
    // their vocabulary, so it defers to the backend HARD wire gate
    // rather than false-positive every key. Empty now means "unknown",
    // never "known but undeclared".
    const v = validateParamsAgainstSchema(
      { properties: {}, required: [], additionalProperties: false },
      { prompt: "walk", anything_at_all: 42 },
    )
    expect(v).toEqual([])
  })
})

// ── The ONE bulk loader (mirrors loadCatalog) ───────────────────────────

describe("loadFamilySchemas — the one transmission pattern", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it("loads ALL family schemas in ONE fetch + caches + sync lookup works", async () => {
    const fakeBulk = {
      llm_text: {
        properties: { prompt: { type: "string" } },
        required: ["prompt"],
        additionalProperties: false,
      },
      kimodo_motion: {
        properties: { motion_constraints: { type: "string", default: "" } },
        required: [] as string[],
        additionalProperties: false,
      },
    }
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(fakeBulk), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchSpy)

    // First load — ONE fetch.
    const first = await loadFamilySchemas()
    expect(Object.keys(first).length).toBeGreaterThanOrEqual(2)
    expect(first.kimodo_motion.properties.motion_constraints.type).toBe("string")
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second load — cached, NO new fetch (the one-fetch guarantee).
    const second = await loadFamilySchemas()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)

    // Sync lookup works after load.
    const sch = getFamilySchema("llm_text")
    expect(sch?.properties.prompt.type).toBe("string")
    expect(getFamilySchema("nonexistent")).toBeNull()
  })
})

// ── Phase B2: the modifier-entry wire contract (mirrors backend
// validate_modifier_entries — family_schema.py) ─────────────────────────

import { validateModifierEntries } from "@melite/catalog"
import type { ModifierKindSpec } from "@melite/contracts"

const CN_KIND: ModifierKindSpec = {
  kind: "controlnet",
  label: "ControlNet Stack",
  cardinality: "list",
  max_stack: 5,
  param_key: "controlnets",
  fields: [
    { name: "type", type: "select" },
    { name: "image_b64", type: "image" },
    { name: "strength", type: "float", min: 0, max: 2, default: 0.7 },
    { name: "start_percent", type: "float", min: 0, max: 1, default: 0 },
    { name: "end_percent", type: "float", min: 0, max: 1, default: 1 },
  ],
  options: [{ value: "diffsynth_qwen_inpaint", label: "Qwen Inpaint" }],
}

const LORA_KIND: ModifierKindSpec = {
  kind: "lora",
  label: "LoRA Adapters",
  cardinality: "list",
  param_key: "loras",
  fields: [
    { name: "id", type: "string" },
    { name: "strength", type: "float", min: -2, max: 5, default: 1 },
  ],
  options: [
    { value: "style/alpha", label: "Alpha" },
    { value: "style/beta", label: "Beta" },
  ],
}

const DISK_LORA_KIND: ModifierKindSpec = {
  ...LORA_KIND,
  param_key: "disk_loras",
  upload_dir: "wan-vace",
}

const CLIP_KIND: ModifierKindSpec = {
  kind: "clip_skip",
  label: "Clip Skip",
  cardinality: "scalar",
  param_key: "clip_skip",
  fields: [{ name: "count", type: "integer", min: -12, max: 12, default: -1 }],
}

describe("validateModifierEntries (Phase B2 mirror)", () => {
  it("accepts the full editor CN entry incl. bookkeeping keys", () => {
    const v = validateModifierEntries([CN_KIND], {
      controlnets: [
        {
          id: "cn1",
          type: "diffsynth_qwen_inpaint",
          model: "cn.safetensors",
          preprocessor: "none",
          image_b64: "data:image/png;base64,A",
          strength: 0.7,
          start_percent: 0,
          end_percent: 1,
          enabled: true,
          source: "tile",
        },
      ],
    })
    expect(v).toEqual([])
  })

  it("flags an out-of-bounds number with the exact entry path", () => {
    const v = validateModifierEntries([LORA_KIND], {
      loras: [{ id: "style/alpha", strength: 9 }],
    })
    expect(v.length).toBe(1)
    expect(v[0].path).toBe("loras[0].strength")
    expect(v[0].message).toContain("above the declared maximum 5")
  })

  it("flags an unknown entry key (typo) with the declared field list", () => {
    const v = validateModifierEntries([LORA_KIND], {
      loras: [{ id: "style/alpha", strenght: 1 }],
    })
    expect(v.some((x) => x.path === "loras[0].strenght")).toBe(true)
    expect(v[0].message).toContain("unknown field 'strenght'")
    expect(v[0].message).toContain("id, strength")
  })

  it("flags a missing required field (lora id has no default)", () => {
    const v = validateModifierEntries([LORA_KIND], { loras: [{ strength: 0.8 }] })
    expect(v.some((x) => x.path === "loras[0].id")).toBe(true)
    expect(v[0].message).toContain("missing required field 'id'")
  })

  it("flags an unknown field-level select option", () => {
    const IP_KIND: ModifierKindSpec = {
      kind: "ip_adapter",
      label: "IP-Adapter",
      cardinality: "list",
      param_key: "ip_adapters",
      fields: [
        { name: "image", type: "image" },
        { name: "kind", type: "select", options: ["style", "composition", "face", "generic"], default: "style" },
        { name: "weight", type: "float", min: 0, max: 2, default: 1 },
      ],
    }
    const v = validateModifierEntries([IP_KIND], {
      ip_adapters: [{ image: "data:image/png;base64,A", kind: "watermark" }],
    })
    expect(v.some((x) => x.path === "ip_adapters[0].kind")).toBe(true)
    expect(v[0].message).toContain("unknown option 'watermark'")
  })

  it("rejects a list where a scalar kind is declared (and vice versa)", () => {
    expect(
      validateModifierEntries([CLIP_KIND], { clip_skip: [3] })[0].message,
    ).toContain("expected a single scalar value")
    expect(
      validateModifierEntries([LORA_KIND], { loras: 5 } as never)[0].message,
    ).toContain("expected a list of entries")
  })

  it("rejects a stack above max_stack", () => {
    const v = validateModifierEntries([CN_KIND], {
      controlnets: Array.from({ length: 6 }, () => ({
        type: "diffsynth_qwen_inpaint",
      })),
    })
    expect(v.some((x) => x.message.includes("stack of 6 exceeds the declared max_stack (5)"))).toBe(true)
  })

  it("rejects an undeclared adapter on a curated kind but allows any name on upload_dir kinds", () => {
    const curated = validateModifierEntries([LORA_KIND], {
      loras: [{ id: "style/gama", strength: 1 }],
    })
    expect(curated.some((x) => x.path === "loras[0].id")).toBe(true)
    expect(curated[0].message).toContain("unknown adapter 'style/gama'")

    const disk = validateModifierEntries([DISK_LORA_KIND], {
      disk_loras: [{ id: "anything.safetensors", strength: 1 }],
    })
    expect(disk).toEqual([])
  })

  it("skips kind-options membership for controlnet types (backend model gate owns it)", () => {
    // "pose" is NOT in the kind's options — but CN types resolve through the
    // model's declared-CN gate (backend validate_step_controlnets), so the
    // frontend must NOT flag it here.
    const v = validateModifierEntries([CN_KIND], {
      controlnets: [{ type: "pose", strength: 0.7 }],
    })
    expect(v).toEqual([])
  })

  it("flags a non-dict entry", () => {
    const v = validateModifierEntries([LORA_KIND], {
      loras: [{ name: "style/alpha" }, "oops"],
    } as never)
    expect(v.some((x) => x.path === "loras[1]" && x.message.includes("expected a dict entry"))).toBe(true)
  })

  it("no-ops on absent kinds, absent params, and scalar bounds", () => {
    expect(validateModifierEntries(null, { loras: [{ x: 1 }] })).toEqual([])
    expect(validateModifierEntries([LORA_KIND], {})).toEqual([])
    expect(validateModifierEntries([CLIP_KIND], { clip_skip: 3 })).toEqual([])
    expect(
      validateModifierEntries([CLIP_KIND], { clip_skip: 99 })[0].path,
    ).toBe("clip_skip.count")
  })
})

describe("coerceParamsToSchema — the typed run body (2026-09-05 compile-time incident)", () => {
  // The operator's exact failing shape: form state / stale drafts carry
  // strings for numbers/booleans and "" for empty arrays + nulls for
  // defaulted slots. The class admits the canonical forms — the boundary
  // normalizes them instead of refusing what the backend takes.
  const EDIT_SCHEMA: FamilyParamSchema = {
    properties: {
      reference_images: { type: "array", default: [] },
      width: { type: "number" },
      steps: { type: "number" },
      cfg: { type: "number" },
      use_stock_nodes: { type: "boolean" },
      double_reference: { type: "boolean" },
      input_mask: { type: "string", default: "" },
      loras: {},
      mask: {},
    },
    additionalProperties: false,
  }

  it("coerces the operator's payload to the class-admitted body", () => {
    const { params, violations } = coerceParamsToSchema(EDIT_SCHEMA, {
      reference_images: "",
      width: "1024",
      steps: "30",
      cfg: "4.5",
      use_stock_nodes: "false",
      double_reference: "false",
      input_mask: null,
    })
    expect(violations).toEqual([])
    expect(params).toMatchObject({
      reference_images: [],
      width: 1024,
      steps: 30,
      cfg: 4.5,
      use_stock_nodes: false,
      double_reference: false,
    })
    // null for a TYPED field with a default is OMITTED (absent rides the
    // backend default — the class refuses explicit null on every row,
    // so the boundary must never POST one — 2026-09-06):
    expect(params).not.toHaveProperty("input_mask")
    // ...and the TYPED body validates clean (mirror never stricter):
    expect(validateParamsAgainstSchema(EDIT_SCHEMA, params)).toEqual([])
  })

  it("passes tile bags through untouched (the compose door owns them)", () => {
    const bags = { loras: [{ id: "krea2_realism_lora" }], mask: [{ input_mask: "m.png" }] }
    const { params, violations } = coerceParamsToSchema(EDIT_SCHEMA, bags)
    expect(violations).toEqual([])
    expect(params).toEqual(bags)
  })

  it('"" for a number is UNSET, never 0 (empty means no value stated)', () => {
    const { params, violations } = coerceParamsToSchema(EDIT_SCHEMA, { width: "" })
    expect(violations).toEqual([])
    expect(params.width).toBeNull() // → null path: default-or-refuse
    // width has NO default → the validator still refuses (honest):
    expect(validateParamsAgainstSchema(EDIT_SCHEMA, params).some((x) => x.path === "width")).toBe(true)
  })

  it("refuses non-canonical strings loudly (never NaN, never guesses)", () => {
    expect(coerceParamsToSchema(EDIT_SCHEMA, { width: "abc" }).violations.some((x) => x.path === "width")).toBe(true)
    expect(coerceParamsToSchema(EDIT_SCHEMA, { steps: "30.5x" }).violations.some((x) => x.path === "steps")).toBe(true)
    expect(coerceParamsToSchema(EDIT_SCHEMA, { use_stock_nodes: "yes" }).violations.some((x) => x.path === "use_stock_nodes")).toBe(true)
    expect(coerceParamsToSchema(EDIT_SCHEMA, { reference_images: "a.png" }).violations.some((x) => x.path === "reference_images")).toBe(true)
  })

  it("refuses fractions for integer fields", () => {
    const s: FamilyParamSchema = { properties: { seed: { type: "integer", default: 0 } }, additionalProperties: false }
    expect(coerceParamsToSchema(s, { seed: "7.5" }).violations.some((x) => x.path === "seed")).toBe(true)
    expect(coerceParamsToSchema(s, { seed: "7" }).params.seed).toBe(7)
  })

  it("never String()-collapses or JSON.parse-guesses", () => {
    const s: FamilyParamSchema = {
      properties: { prompt: { type: "string" }, doc: { type: "object" } },
      additionalProperties: false,
    }
    // a NUMBER for a string field refuses (strict both ways):
    expect(coerceParamsToSchema(s, { prompt: 1024 }).violations.some((x) => x.path === "prompt")).toBe(true)
    // a string for an object field refuses (JsonParamField commits parsed):
    expect(coerceParamsToSchema(s, { doc: '{"a":1}' }).violations.some((x) => x.path === "doc")).toBe(true)
  })

  it("passes untyped null bags through (the class's own None-coercion owns them)", () => {
    const s: FamilyParamSchema = {
      properties: { loras: { default: null }, width: { type: "number", default: 1024 } },
      additionalProperties: false,
    }
    const { params, violations } = coerceParamsToSchema(s, { loras: null, width: null })
    expect(violations).toEqual([])
    expect(params.loras).toBeNull() // untyped → forwarded, class coerces to []
    expect(params).not.toHaveProperty("width") // typed + default → omitted
  })
})

describe("coerceParamsToSchema — the frontend-impossible stroke (2026-09-06)", () => {
  // The served music3 envelope (schema.py projection — defaults
  // included) against the exact draft the editor builds for untouched
  // knobs ("" for untouched numerics/strings, null for null-seeded
  // slots). Before the stroke this failed the click with "duration is
  // null but has no default" while the backend row defaults it — all
  // tests green, every untouched knob 400ing. After: the typed body
  // carries NO nulls (defaulted fields omit → absent rides the
  // backend default) and validates clean.
  const MUSIC_SCHEMA: FamilyParamSchema = {
    properties: {
      prompt: { type: "string", default: "" },
      lyrics: { type: "string", default: "" },
      duration: { type: "number", default: 30.0 },
      guidance_scale: { type: "number", default: 1.7 },
      n_diffusion_steps: { type: "number", default: 30 },
      lm_cfg_scale: { type: "number", default: 1.7 },
      seed: { type: "number", default: 0 },
    },
    additionalProperties: false,
  }

  it("an untouched music draft coerces to a null-free body that validates clean", () => {
    const { params, violations } = coerceParamsToSchema(MUSIC_SCHEMA, {
      prompt: "funk, pop, soul, guitar, 105 BPM",
      lyrics: "",
      duration: "",
      guidance_scale: null,
      n_diffusion_steps: "",
      lm_cfg_scale: null,
      seed: -1,
    })
    expect(violations).toEqual([])
    expect(params).toEqual({
      prompt: "funk, pop, soul, guitar, 105 BPM",
      lyrics: "",
      seed: -1,
    })
    expect(validateParamsAgainstSchema(MUSIC_SCHEMA, params)).toEqual([])
  })

  it('"" for a defaulted number omits (absent rides the default), without a default it refuses', () => {
    const withDefault = coerceParamsToSchema(MUSIC_SCHEMA, { duration: "" })
    expect(withDefault.violations).toEqual([])
    expect(withDefault.params).not.toHaveProperty("duration")
    const noDefault: FamilyParamSchema = {
      properties: { width: { type: "number" } },
      additionalProperties: false,
    }
    const bare = coerceParamsToSchema(noDefault, { width: "" })
    expect(bare.params.width).toBeNull()
    expect(validateParamsAgainstSchema(noDefault, bare.params).some((x) => x.path === "width")).toBe(true)
  })

  it("garbage numerics still refuse loudly (omit is for null/UNSET only)", () => {
    const { params, violations } = coerceParamsToSchema(MUSIC_SCHEMA, { duration: "fast" })
    expect(violations.some((x) => x.path === "duration")).toBe(true)
    // the raw value rides through, but the TYPED body still refuses —
    // the gate throws on violations, so garbage never POSTs:
    expect(validateParamsAgainstSchema(MUSIC_SCHEMA, params).some((x) => x.path === "duration")).toBe(true)
  })
})

describe("assertParamsMatchFamilySchema — the gate returns the typed body (2026-09-06)", () => {
  // Full gate path (catalog resolve → bulk schema → coerce → return):
  // the operator's music3 draft must PASS the click and come back
  // null-free — the exact body runCompiledGeneration POSTs. Fresh
  // modules per test (both caches are module-level singletons).
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const GATE_MUSIC_SCHEMA: FamilyParamSchema = {
    properties: {
      prompt: { type: "string", default: "" },
      lyrics: { type: "string", default: "" },
      duration: { type: "number", default: 30.0 },
      guidance_scale: { type: "number", default: 1.7 },
      n_diffusion_steps: { type: "number", default: 30 },
      lm_cfg_scale: { type: "number", default: 1.7 },
      seed: { type: "number", default: 0 },
    },
    additionalProperties: false,
  }

  async function freshGate(schema: FamilyParamSchema = GATE_MUSIC_SCHEMA) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(input)
        const body: Record<string, unknown> | null = url.includes("/v1/model-catalog")
          ? {
              families: { music: { label: "Music", modifiers: null } },
              models: { music3: { family: "music", form: "music", label: "Music" } },
            }
          : url.includes("/v1/flows/families/param-schemas")
            ? { music: schema }
            : null
        if (!body) return Promise.reject(new Error("unexpected fetch " + url))
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
      }),
    )
    const mod = await import("@melite/catalog")
    await mod.loadCatalog({ force: true })
    return mod
  }

  it("an untouched music draft passes the click and returns a null-free body", async () => {
    const mod = await freshGate()
    const typed = await mod.assertParamsMatchFamilySchema("music3", {
      prompt: "funk, pop, soul, guitar, 105 BPM",
      lyrics: "",
      duration: "",
      guidance_scale: null,
      n_diffusion_steps: "",
      lm_cfg_scale: null,
      seed: -1,
    })
    expect(typed).toEqual({
      prompt: "funk, pop, soul, guitar, 105 BPM",
      lyrics: "",
      seed: -1,
    })
  })

  it("defers passthrough when the catalog cache is cold (backend owns the run)", async () => {
    const mod = await import("@melite/catalog")
    const draft = { prompt: "x", whatever: 1 }
    await expect(mod.assertParamsMatchFamilySchema("music3", draft)).resolves.toBe(draft)
  })

  it("still THROWS on the operator's original incident (pre-fix envelope, nulls without defaults)", async () => {
    // The meta-tripwire: the exact payload from the incident report,
    // against the exact envelope that produced it (no defaults). The
    // gate caught it THEN; if coerce ever regresses to passing nulls
    // through, the gate must still refuse them HERE.
    const prefixEnvelope: FamilyParamSchema = {
      properties: {
        prompt: { type: "string" },
        duration: { type: "number" },
        guidance_scale: { type: "number" },
        n_diffusion_steps: { type: "number" },
        lm_cfg_scale: { type: "number" },
      },
      additionalProperties: false,
    }
    const mod = await freshGate(prefixEnvelope)
    await expect(
      mod.assertParamsMatchFamilySchema("music3", {
        prompt: "funk",
        duration: null,
        guidance_scale: null,
        n_diffusion_steps: null,
        lm_cfg_scale: null,
      }),
    ).rejects.toThrow(/has no default/)
  })
})
