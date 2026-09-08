// inputCardContract.test.ts — the Input card ON the declarative contract
// stack (Phase A, 2026-08-14).
//
// The backend pins the LIVE served contract: test_input_family_contract.py
// asserts build_form_spec("input") serves EXACTLY the 8-field schema
// vocabulary below and that param_model("input") (extra="forbid") matches
// the family signature. This file pins the EDITOR's side of the same
// contract: what readInputParams emits must be a subset of the served
// vocabulary, the transforms matrix must round-trip the catalog
// declaration verbatim, and the editor's scale-method list must match the
// family's validation list (IMAGE_SCALE_METHODS in builders/input_prep.py).
// One vocabulary, asserted on both sides of the wire.
import { describe, it, expect, beforeAll } from "vitest"
import { readInputParams, SCALE_METHODS } from "../surfaces/flow/InputCardEditor"
import { familyTransformMatrix } from "@melite/catalog"
import { primeCatalog } from "@melite/catalog"

// The served schema vocabulary (build_image_prep.SCHEMA field names — the
// backend test asserts the LIVE set; this mirror is what the editor is
// pinned against so a schema-shrink on either side fails a test).
const SERVED_FIELDS = new Set([
  "source",
  "media_type",
  "crop",
  "scale",
  "trim",
  "volume",
  "filename_prefix",
  "output_artifact",
])

// The editor's declared emit-set (InputCardEditor.tsx readInputParams) —
// the family defaults cover media_type/filename_prefix/output_artifact.
const EDITOR_KEYS = new Set(["source", "crop", "scale", "trim", "volume"])

// The catalog transforms: declaration (input_prep.yaml `transforms:` —
// same block the backend _validate_params_for_media raises from).
const CATALOG_TRANSFORMS = {
  crop: ["image"],
  scale: ["image", "video"],
  trim: ["video", "audio"],
  volume: ["audio"],
} as const

// The family's scale-method validation list (builders/input_prep.py
// IMAGE_SCALE_METHODS) — the editor's method select must match it.
const FAMILY_SCALE_METHODS = new Set([
  "nearest-exact",
  "bilinear",
  "area",
  "bicubic",
  "lanczos",
])

beforeAll(() => {
  primeCatalog({
    families: {
      input: {
        label: "Input Prep",
        genre: "image",
        primary_output: "media",
        transforms: [
          { name: "crop", applies_to: ["image"] },
          { name: "scale", applies_to: ["image", "video"] },
          { name: "trim", applies_to: ["video", "audio"] },
          { name: "volume", applies_to: ["audio"] },
        ],
      },
    },
    models: {},
  } as any)
})

describe("editor emits only declared keys", () => {
  it("readInputParams emits a subset of the served schema vocabulary", () => {
    const p = readInputParams({
      source: "photo.png",
      crop: { width: 512, height: 512 },
    })
    // readInputParams normalizes ALL five editor keys (null when absent) —
    // the key set is fixed and exactly the editor's declared emit-set.
    expect(new Set(Object.keys(p))).toEqual(EDITOR_KEYS)
    // The editor never emits a key the served schema doesn't declare.
    expect([...EDITOR_KEYS].every((k) => SERVED_FIELDS.has(k))).toBe(true)
    // Non-null values carry real data.
    expect(p.source).toBe("photo.png")
    expect(p.crop).toEqual({ width: 512, height: 512 })
    expect(p.trim).toBeNull()
  })

  it("normalizes a partial stage shape (just-seeded {source: null})", () => {
    const p = readInputParams({ source: null })
    expect(p).toEqual({
      source: null,
      crop: null,
      scale: null,
      trim: null,
      volume: null,
    })
  })

  it("never fabricates undeclared keys from garbage params", () => {
    const p = readInputParams({ gamma: 2.2, fps: 30 } as any)
    expect(Object.keys(p).sort()).toEqual(["crop", "scale", "source", "trim", "volume"])
  })
})

describe("transforms matrix round-trips the catalog declaration", () => {
  it("familyTransformMatrix('input') == the catalog transforms verbatim", () => {
    expect(familyTransformMatrix("input")).toEqual(CATALOG_TRANSFORMS)
  })
})

describe("scale methods match the family's validation list", () => {
  it("the editor's method select == IMAGE_SCALE_METHODS (zero drift)", () => {
    expect(new Set(SCALE_METHODS)).toEqual(FAMILY_SCALE_METHODS)
  })
})
