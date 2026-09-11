/**
 * Unit tests for lib/modelCatalog.ts — the cached /v1/model-catalog client +
 * pure selectors that drive every model dropdown, family picker, variant
 * toggle, and prompt-guide tooltip in the webform.
 *
 * Mocks apiJson + apiFetch (the network choke points) via vi.hoisted so the
 * mocks exist BEFORE the vi.mock factory runs. The module-level `ensureCatalog()`
 * boot is SKIPPED under Vitest (2026-08-15 — it fired real network + retry
 * timers into unrelated test files; see modelCatalog.ts), so tests that want
 * the loader call it explicitly. The default mockResolvedValue still serves
 * any stray explicit load with a valid empty catalog.
 *
 * Coverage:
 *   - Selectors (pure): familyOf, familyLabel, variantLabel, modelLabel,
 *     modelDescription, promptGuide, dropdownModels, variantSiblings,
 *     hiddenFromDropdown, variantsForRoute, activeVariantForRoute,
 *     familiesForForm, familyPrimaryRoute. All exercised with an EXPLICIT
 *     Catalog — no module-state dependency.
 *   - Loader (stateful): primeCatalog, isCatalogLoaded, getCachedCatalog,
 *     onCatalogReady subscribe/unsubscribe, loadCatalog force-bypass +
 *     endpoint + throw-on-non-2xx.
 *
 * Zero prior coverage. A regression in familyOf's parent-scan would break
 * every quant-tier variant toggle; a regression in familiesForForm's
 * default_model resolution would silently change which model a dropdown seeds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// ── Mocks ───────────────────────────────────────────────────────────────────
// vi.hoisted runs BEFORE the vi.mock factory is evaluated, so the fn refs
// exist when modelCatalog's top-level ensureCatalog() fires on import.
const { apiJsonMock, apiFetchMock } = vi.hoisted(() => ({
  apiJsonMock: vi.fn().mockResolvedValue({ families: {}, models: {} }),
  apiFetchMock: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
}))

vi.mock("@melite/catalog/api", () => ({
  apiJson: (...a: unknown[]) => apiJsonMock(...a),
  apiFetch: (...a: unknown[]) => apiFetchMock(...a),
}))

import {
  loadCatalog, primeCatalog, isCatalogLoaded, getCachedCatalog,
  onCatalogReady,
  familyOf, familyLabel, variantLabel, modelLabel,
  modelDescription, promptGuide,
  dropdownModels, variantSiblings, hiddenFromDropdown,
  variantsForRoute, activeVariantForRoute, presetsForRoute,
  familiesForForm, familyPrimaryRoute,
  composeVariantRoute, axisCellExists,
} from "@melite/catalog"
import type { Catalog } from "@melite/catalog"

// ── Fixture ─────────────────────────────────────────────────────────────────
// A catalog covering every selector branch:
//   - Family "krea" (default_model="krea-2") + family "z-image" (no default)
//   - Variant siblings: krea-2 (base), krea-2-raw (variant_label), krea-2-sd-q8
//     (hidden from dropdown, only reachable via krea-2's variants[].route)
//   - z-qwen-img-edit-2511 is edit_only + form_edit — invisible in the unified dropdown
//   - z-image has a prompt_guide + description on the family entry
const FIXTURE: Catalog = {
  families: {
    "krea": {
      label: "Krea 2",
      description: "Photorealistic generation family.",
      default_model: "krea-2",
    },
    "z-image": {
      label: "Z-Image",
      description: "Balanced speed and quality.",
      prompt_guide: {
        title: "Z-Image Prompting",
        sections: [{ label: "Tips", list: ["Be specific", "Use camera terms"] }],
      },
    },
  },
  models: {
    "krea-2": {
      family: "krea", form: "form_generate", label: "Krea 2 Base",
      variants: [
        { id: "raw", label: "Raw", route: "krea-2-raw", defaults: {} },
        { id: "sd-q8", label: "SD Q8", route: "krea-2-sd-q8", quant: "q8", defaults: {} },
      ],
    },
    "krea-2-raw": {
      family: "krea", form: "form_generate", label: "Krea 2 Raw", variant_label: "Raw",
    },
    "krea-2-sd-q8": {
      family: "krea", form: "form_generate", label: "Krea 2 SD Q8", hide_from_dropdown: true,
    },
    "z-image": {
      family: "z-image", form: "form_generate", label: "Z-Image",
    },
    "z-qwen-img-edit-2511": {
      family: "z-image", form: "form_edit", label: "Z-Image Edit", edit_only: true,
    },
  },
}

beforeEach(() => {
  apiJsonMock.mockReset()
  apiFetchMock.mockReset()
  // Default: valid empty catalog so any stray ensureCatalog retry is harmless.
  apiJsonMock.mockResolvedValue({ families: {}, models: {} })
  // Reset module cache state to a known baseline.
  primeCatalog({ families: {}, models: {} })
})

// ── Selectors: familyOf ─────────────────────────────────────────────────────
describe("modelCatalog — familyOf", () => {
  it("returns the family for a direct top-level model key", () => {
    expect(familyOf("krea-2", FIXTURE)).toBe("krea")
    expect(familyOf("z-image", FIXTURE)).toBe("z-image")
  })
  it("resolves a variant-only route (not top-level) via its parent's variants[].route", () => {
    // krea-2-sd-q8 is NOT in FIXTURE.models as a family carrier — wait, it IS
    // a top-level entry here. To exercise the parent-scan branch, remove it.
    const cat: Catalog = {
      families: { krea: { label: "Krea" } },
      models: {
        "krea-2": {
          family: "krea", form: "form_generate", label: "krea",
          variants: [{ id: "x", label: "X", route: "krea-2-quant", defaults: {} }],
        },
      },
    }
    // krea-2-quant is NOT a top-level models key → parentModelForRoute scans.
    expect(familyOf("krea-2-quant", cat)).toBe("krea")
  })
  it("returns undefined for an unknown route (no direct + no parent)", () => {
    expect(familyOf("does-not-exist", FIXTURE)).toBeUndefined()
  })
  it("returns undefined when catalog has no models", () => {
    expect(familyOf("krea-2", { families: {}, models: {} })).toBeUndefined()
  })
})

// ── Selectors: familyLabel ──────────────────────────────────────────────────
describe("modelCatalog — familyLabel", () => {
  it("returns the family's label for a known route", () => {
    expect(familyLabel("krea-2", FIXTURE)).toBe("Krea 2")
    expect(familyLabel("krea-2-raw", FIXTURE)).toBe("Krea 2")
  })
  it("falls back to the routeKey itself when family is unknown", () => {
    expect(familyLabel("mystery", FIXTURE)).toBe("mystery")
  })
  it("falls back to routeKey when family exists but has no label", () => {
    const cat: Catalog = {
      families: { "no-label": {} as never },
      models: { "m1": { family: "no-label", form: "form_generate", label: "no-label" } },
    }
    expect(familyLabel("m1", cat)).toBe("m1")
  })
})

// ── Selectors: variantLabel + modelLabel ────────────────────────────────────
describe("modelCatalog — variantLabel + modelLabel", () => {
  it("variantLabel prefers variant_label, then label, then the routeKey", () => {
    expect(variantLabel("krea-2-raw", FIXTURE)).toBe("Raw")
    expect(variantLabel("krea-2", FIXTURE)).toBe("Krea 2 Base") // label fallback
    expect(variantLabel("not-in-catalog", FIXTURE)).toBe("not-in-catalog")
  })
  it("modelLabel prefers model.label, then family label, then routeKey", () => {
    expect(modelLabel("krea-2", FIXTURE)).toBe("Krea 2 Base") // own label
    expect(modelLabel("z-image", FIXTURE)).toBe("Z-Image")    // family label
    expect(modelLabel("mystery", FIXTURE)).toBe("mystery")    // key
  })
})

// ── Selectors: modelDescription + promptGuide ───────────────────────────────
describe("modelCatalog — modelDescription + promptGuide", () => {
  it("modelDescription returns the family description", () => {
    expect(modelDescription("krea-2", FIXTURE)).toBe("Photorealistic generation family.")
    expect(modelDescription("z-image", FIXTURE)).toBe("Balanced speed and quality.")
  })
  it("modelDescription returns undefined for unknown routes", () => {
    expect(modelDescription("mystery", FIXTURE)).toBeUndefined()
  })
  it("promptGuide returns the family prompt_guide when declared", () => {
    expect(promptGuide("z-image", FIXTURE)).toEqual({
      title: "Z-Image Prompting",
      sections: [{ label: "Tips", list: ["Be specific", "Use camera terms"] }],
    })
  })
  it("promptGuide returns undefined when the family has no guide", () => {
    expect(promptGuide("krea-2", FIXTURE)).toBeUndefined()
  })
})

// ── Selectors: dropdownModels ───────────────────────────────────────────────
describe("modelCatalog — dropdownModels", () => {
  it("with formTag: returns visible members of that form, sorted, excluding hide_from_dropdown", () => {
    const out = dropdownModels("form_generate", FIXTURE)
    // z-qwen-img-edit-2511 has form=form_edit → excluded; krea-2-sd-q8 is hidden → excluded.
    expect(out).toEqual(["krea-2", "krea-2-raw", "z-image"])
  })
  it("with form_edit: returns only edit-form models", () => {
    expect(dropdownModels("form_edit", FIXTURE)).toEqual(["z-qwen-img-edit-2511"])
  })
  it("with no formTag: excludes edit_only models (unified dropdown is generate-only)", () => {
    const out = dropdownModels(undefined, FIXTURE)
    expect(out).toContain("krea-2")
    expect(out).toContain("z-image")
    expect(out).not.toContain("z-qwen-img-edit-2511") // edit_only excluded
    expect(out).not.toContain("krea-2-sd-q8") // hide_from_dropdown excluded
  })
  it("with no formTag and no edit_only flag, returns all non-hidden models sorted", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "b-model": { family: "b", form: "form_generate", label: "b" },
        "a-model": { family: "a", form: "form_generate", label: "a" },
      },
    }
    expect(dropdownModels(undefined, cat)).toEqual(["a-model", "b-model"])
  })
  it("with form_img_to_mesh: the whole 3D card boards one form — the Model dropdown offers all three arms", () => {
    // Regression pin (2026-09-06): one tag per 3D family rendered a
    // single-option picker (i.e. NO Model zone on the visual card).
    const out = dropdownModels("form_img_to_mesh", THREE_D_CARD)
    expect(out).toEqual(["pixal3d", "transfer_rig", "trellis2-native"])
  })
})

// The shared img-to-mesh form (one tag, three families). Mirrors the
// live catalog rows (models/3d model.py form fields): the lift arms +
// the rig arm board form_img_to_mesh so the card Model dropdown is the
// family switch.
const THREE_D_CARD: Catalog = {
  families: {
    "trellis2-native": { label: "TRELLIS.2 Native" },
    "pixal3d": { label: "Pixal3D" },
    "transfer_rig": { label: "Transfer Rig" },
  },
  models: {
    "trellis2-native": { family: "trellis2-native", form: "form_img_to_mesh", label: "TRELLIS.2 Native" },
    "pixal3d": { family: "pixal3d", form: "form_img_to_mesh", label: "Pixal3D" },
    "transfer_rig": { family: "transfer_rig", form: "form_img_to_mesh", label: "Transfer Rig" },
  },
}

// ── Selectors: variantSiblings + hiddenFromDropdown ─────────────────────────
describe("modelCatalog — variantSiblings + hiddenFromDropdown", () => {
  it("variantSiblings returns every model sharing the family, in declaration order", () => {
    const out = variantSiblings("krea-2", FIXTURE)
    expect(out).toEqual(["krea-2", "krea-2-raw", "krea-2-sd-q8"])
  })
  it("variantSiblings for an unknown non-empty routeKey returns [routeKey]", () => {
    expect(variantSiblings("mystery", FIXTURE)).toEqual(["mystery"])
  })
  it("variantSiblings for an empty routeKey returns []", () => {
    expect(variantSiblings("", FIXTURE)).toEqual([])
  })
  it("hiddenFromDropdown returns a Set of models flagged hide_from_dropdown", () => {
    const out = hiddenFromDropdown(FIXTURE)
    expect(out).toBeInstanceOf(Set)
    expect(out.has("krea-2-sd-q8")).toBe(true)
    expect(out.has("krea-2")).toBe(false)
    expect(out.size).toBe(1)
  })
})

// ── Selectors: variantsForRoute + activeVariantForRoute ─────────────────────
describe("modelCatalog — variantsForRoute + activeVariantForRoute", () => {
  it("variantsForRoute returns the model's own variants list when present", () => {
    const out = variantsForRoute("krea-2", FIXTURE)
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe("raw")
    expect(out[1].route).toBe("krea-2-sd-q8")
  })
  it("variantsForRoute resolves through the parent for a quant-tier sibling", () => {
    // krea-2-raw is a top-level entry with NO own variants → scan parents.
    // krea-2 owns the route "krea-2-raw" in its variants → resolve via parent.
    const out = variantsForRoute("krea-2-raw", FIXTURE)
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe("raw")
  })
  it("variantsForRoute returns [] for a model with no variants and no parent", () => {
    expect(variantsForRoute("z-image", FIXTURE)).toEqual([])
    expect(variantsForRoute("mystery", FIXTURE)).toEqual([])
  })
  it("activeVariantForRoute finds the variant whose route matches (direct hit)", () => {
    const v = activeVariantForRoute("krea-2-sd-q8", FIXTURE)
    expect(v).toBeDefined()
    expect(v?.id).toBe("sd-q8")
    expect(v?.quant).toBe("q8")
  })
  it("activeVariantForRoute global-scan finds variants not in the parent chain", () => {
    const cat: Catalog = {
      families: { x: { label: "X" } },
      models: {
        "m": {
          family: "x", form: "form_generate", label: "x",
          variants: [{ id: "v1", label: "V1", route: "m-v1", defaults: {} }],
        },
      },
    }
    // m-v1 isn't a top-level model; variantsForRoute would resolve via parent.
    // activeVariantForRoute also does a global scan as a fallback.
    const v = activeVariantForRoute("m-v1", cat)
    expect(v).toBeDefined()
    expect(v?.id).toBe("v1")
  })
  it("activeVariantForRoute returns undefined for an unknown route", () => {
    expect(activeVariantForRoute("mystery", FIXTURE)).toBeUndefined()
  })
})

// ── presetsForRoute — the fill handler's data source (2026-08-18, compose model) ─
// The wire carries the LOAD-TIME per-route merge: every route that serves
// presets has its OWN merged dict (head base layer ⊕ owning variant's
// layer, only_routes-filtered at load) — the resolver reads that dict and
// nothing else. The old fallback chain (own → family block → tree-head
// scan) is DELETED: a second precedence would re-derive a merge the
// backend already attached — the exact two-sources drift the composer's
// contract forbids. A route WITHOUT a dict serves none (the backend ships
// no preset field at all). Family id is NOT the tree relation — the
// fixture's shared family deliberately spans TWO trees so the
// family-keyed-scan bug (one tree's recipes leaking onto the other
// family-member's card) has a dedicated regression guard.
const PRESETS: Catalog = {
  families: {
    // The shared family: TWO trees live under it, each with its own
    // merged layers. A family-keyed scan would return whichever tree it
    // hit first — the leak under test. Family blocks CANNOT carry
    // presets anymore (a family block declaring ``presets:`` is refused
    // at load), so tree-less members without a dict serve none.
    enhance_upscale: { label: "Enhance" },
  },
  models: {
    // TREE 1 head — the head route's merged layer (the head's base
    // presets/ layer; the Standard variant does not own the head route).
    "rtx-vsr": {
      family: "enhance_upscale", form: "form_enhance", label: "RTX VSR",
      presets: {
        h3_to_1080: { label: "H3 → 1080p", params: { mode: "rtx_vsr" } },
        restore_old: { label: "Restore Old Footage", params: {} },
      },
      variants: [
        { id: "q8", label: "Q8", route: "rtx-vsr-q8", quant: "q8", defaults: {} },
      ],
    },
    // TREE 1's matrix cell — its OWN wire dict: the load-time merge
    // attached head base layer ⊕ the q8 variant's layer (vq8_native,
    // only_routes-gated to the q8 cell AT LOAD) to THIS route, so the
    // cell serves MORE than the head. The resolver reads this dict
    // directly — no head fallback to derive, no second precedence.
    "rtx-vsr-q8": {
      family: "enhance_upscale", form: "form_enhance", label: "RTX VSR Q8",
      hide_from_dropdown: true,
      presets: {
        h3_to_1080: { label: "H3 → 1080p", params: { mode: "rtx_vsr" } },
        restore_old: { label: "Restore Old Footage", params: {} },
        vq8_native: { label: "VQ8 Native", params: { steps: 4 } },
      },
    },
    // TREE 2 — SAME family, DIFFERENT tree, its own merged layer. The
    // guard: nothing from tree 1 may reach it.
    "seedvr2-video": {
      family: "enhance_upscale", form: "form_enhance", label: "SeedVR2 Video",
      presets: {
        sharp_2x: { label: "Sharp 2×", params: { scale: 2 } },
      },
    },
    // Tree-less family member — no own dict, no variants. The family
    // block can't carry recipes anymore → serves none, exactly like a
    // presetless tree (the old carve-out would have served family_recipe
    // here; the carve-out is deleted).
    "enhance-generic": {
      family: "enhance_upscale", form: "form_enhance", label: "Generic",
    },
    // Presetless model in a presetless family → undefined (the fill no-ops;
    // the backend ships no preset field). krea-2 mirrors production truth
    // (probe-proven presetless on every route).
    "krea-2": { family: "krea", form: "form_generate", label: "Krea 2" },
    // 2026-08-18 ("I have no place where I can change presets!!!!"):
    // z-image's family presets serve on the GENERATE card too — the wire
    // attaches the merged per-route dict, and form_generate now declares
    // the family-gated preset group. Mirrors production.
    "z-image": {
      family: "z-image", form: "form_generate", label: "Z-Image",
      presets: {
        inpaint_lanpaint: { label: "Inpaint (LanPaint)", params: {} },
      },
    },
  },
}

describe("modelCatalog — presetsForRoute", () => {
  it("returns the route's OWN dict — the wire's merged layer (the tree head)", () => {
    const out = presetsForRoute("rtx-vsr", PRESETS)
    expect(Object.keys(out ?? {}).sort()).toEqual(["h3_to_1080", "restore_old"])
  })

  it("reads a matrix-cell route's OWN wire dict — never the head's", () => {
    // The q8 cell route carries its own merged dict (attached at load:
    // head base layer ⊕ the q8 variant's layer). The resolver reads
    // THAT — the cell serves vq8_native which the head route doesn't,
    // and the old head-fallback would have served the head's dict
    // instead (or the reverse drift). Object identity pins the point:
    // this is the wire's dict for THIS route, not a reference into the
    // head's record.
    const out = presetsForRoute("rtx-vsr-q8", PRESETS)
    expect(Object.keys(out ?? {}).sort()).toEqual([
      "h3_to_1080", "restore_old", "vq8_native",
    ])
    expect(out).not.toBe(PRESETS.models["rtx-vsr"]?.presets)
  })

  it("serves no family-block carve-out for tree-less members", () => {
    // The flat family-block carve-out is DELETED (a family block
    // declaring presets is refused at load) — a tree-less member with
    // no dict of its own serves none, exactly like a presetless tree.
    expect(presetsForRoute("enhance-generic", PRESETS)).toBeUndefined()
  })

  it("does NOT leak one tree's presets onto another same-family tree", () => {
    // The regression guard for the family-keyed scan: seedvr2-video shares
    // the enhance_upscale family with rtx-vsr but is a DIFFERENT tree —
    // it must see its OWN recipes, never rtx-vsr's H3 pathways (which set
    // mode: rtx_vsr and would silently switch the engine).
    const out = presetsForRoute("seedvr2-video", PRESETS)
    expect(Object.keys(out ?? {}).sort()).toEqual(["sharp_2x"])
  })

  it("returns undefined for a presetless route (fill no-ops, no empty select)", () => {
    expect(presetsForRoute("krea-2", PRESETS)).toBeUndefined()
    expect(presetsForRoute("mystery", PRESETS)).toBeUndefined()
  })

  it("serves z-image's family recipe on the GENERATE route (2026-08-18)", () => {
    // The graduation pin: z-image left the presetless list — its
    // lanpaint recipe now reaches the generate card's chip row, and
    // the fill reads this same dict.
    const out = presetsForRoute("z-image", PRESETS)
    expect(Object.keys(out ?? {}).sort()).toEqual(["inpaint_lanpaint"])
  })
})

// ── Matrix composition: composeVariantRoute + axisCellExists ────────────────
// The matrix fixture mirrors a promoted tree family (seedvr2-style): every
// route entry carries its (variant, quant) coordinates, and the grid has a
// DELIBERATE hole — 7b has no fp8 cell. That hole is the whole point of
// axisCellExists (2026-08-16, "ONLY show models combinations that exist"):
// the fp8 option under 7b is a phantom the dropdown must not offer.
const MATRIX: Catalog = {
  families: { seedvr2_upscale: { label: "SeedVR2" } },
  models: {
    "seedvr2_ema": {
      family: "seedvr2_upscale", form: "form_upscale", label: "3B FP16",
      variant: "3b", quant: "fp16",
    },
    "seedvr2_ema_3b_fp8": {
      family: "seedvr2_upscale", form: "form_upscale", label: "3B FP8",
      variant: "3b", quant: "fp8",
    },
    "seedvr2_ema_7b_fp16": {
      family: "seedvr2_upscale", form: "form_upscale", label: "7B FP16",
      variant: "7b", quant: "fp16",
    },
    // NO 7b × fp8 route — the phantom cell.
  },
}

describe("modelCatalog — composeVariantRoute + axisCellExists", () => {
  it("composes a real cross-axis cell: 3b+fp16 clicking fp8 → 3b+fp8", () => {
    const next = composeVariantRoute("seedvr2_ema", {
      group: "Quant", quant: "fp8", route: "seedvr2_ema_3b_fp8",
    }, MATRIX)
    expect(next).toBe("seedvr2_ema_3b_fp8")
    expect(axisCellExists("seedvr2_ema", {
      group: "Quant", quant: "fp8", route: "seedvr2_ema_3b_fp8",
    }, MATRIX)).toBe(true)
  })
  it("composes a real variant switch preserving quant: 3b+fp16 clicking 7b → 7b+fp16", () => {
    const next = composeVariantRoute("seedvr2_ema", {
      group: "Variant", route: "seedvr2_ema_7b_fp16",
    }, MATRIX)
    expect(next).toBe("seedvr2_ema_7b_fp16")
    expect(axisCellExists("seedvr2_ema", {
      group: "Variant", route: "seedvr2_ema_7b_fp16",
    }, MATRIX)).toBe(true)
  })
  it("PHANTOM cell: fp8 under 7b exists nowhere — the dropdown must not offer it", () => {
    // The composer falls back to the clicked route (a REAL route, but the
    // 3b cell — it silently switches the Variant axis); the existence
    // check must catch what the composer's return value cannot express.
    const next = composeVariantRoute("seedvr2_ema_7b_fp16", {
      group: "Quant", quant: "fp8", route: "seedvr2_ema_3b_fp8",
    }, MATRIX)
    expect(next).toBe("seedvr2_ema_3b_fp8") // the fallback — same string as a real hit
    expect(axisCellExists("seedvr2_ema_7b_fp16", {
      group: "Quant", quant: "fp8", route: "seedvr2_ema_3b_fp8",
    }, MATRIX)).toBe(false)
  })
  it("the ACTIVE cell always exists (composition resolves to itself)", () => {
    expect(axisCellExists("seedvr2_ema", {
      group: "Quant", quant: "fp16", route: "seedvr2_ema",
    }, MATRIX)).toBe(true)
    expect(axisCellExists("seedvr2_ema_7b_fp16", {
      group: "Variant", route: "seedvr2_ema_7b_fp16",
    }, MATRIX)).toBe(true)
  })
  it("patch-only variants (no route) always exist", () => {
    expect(axisCellExists("seedvr2_ema", {}, MATRIX)).toBe(true) // patch-only: no route key
  })
  it("unknown family (no catalog) → keep: hiding needs positive evidence", () => {
    expect(axisCellExists("mystery", {
      group: "Quant", quant: "fp8", route: "mystery-fp8",
    }, { families: {}, models: {} })).toBe(true)
  })
})

// ── Selectors: familiesForForm ──────────────────────────────────────────────
describe("modelCatalog — familiesForForm", () => {
  it("dedupes visible models by family, one entry per family", () => {
    const out = familiesForForm("form_generate", FIXTURE)
    const famIds = out.map((o) => o.familyId)
    expect(famIds).toEqual(["krea", "z-image"])
    expect(out).toHaveLength(2)
  })
  it("uses the family's declared default_model as primaryRoute when visible", () => {
    const out = familiesForForm("form_generate", FIXTURE)
    const krea = out.find((o) => o.familyId === "krea")
    expect(krea?.primaryRoute).toBe("krea-2") // declared default_model
    expect(krea?.label).toBe("Krea 2")
  })
  it("falls back to the member whose key equals the family id when no default_model", () => {
    const out = familiesForForm("form_generate", FIXTURE)
    const zimg = out.find((o) => o.familyId === "z-image")
    // No default_model declared → member key === "z-image" wins.
    expect(zimg?.primaryRoute).toBe("z-image")
  })
  it("falls back to the first visible member when no default + no key-match", () => {
    const cat: Catalog = {
      families: { "fam-a": { label: "Fam A" } },
      models: {
        "m1": { family: "fam-a", form: "form_generate", label: "fam-a" },
        "m2": { family: "fam-a", form: "form_generate", label: "fam-a" },
      },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out).toHaveLength(1)
    // No declared default, no member key === "fam-a" → first visible member.
    expect(out[0].primaryRoute).toBe("m1")
  })
  it("returns [] for a form with no visible models", () => {
    expect(familiesForForm("form_nonexistent", FIXTURE)).toEqual([])
  })
  it("form_img_to_mesh: three families, key-match primaries (no default_model declared)", () => {
    const out = familiesForForm("form_img_to_mesh", THREE_D_CARD)
    expect(out.map((o) => o.familyId)).toEqual(["pixal3d", "transfer_rig", "trellis2-native"])
    for (const o of out) expect(o.primaryRoute).toBe(o.familyId)
    expect(out.find((o) => o.familyId === "pixal3d")?.label).toBe("Pixal3D")
  })
  it("default_model that is NOT a visible member is ignored (falls through)", () => {
    const cat: Catalog = {
      families: { "fam-a": { label: "Fam A", default_model: "hidden-one" } },
      models: {
        "visible-one": { family: "fam-a", form: "form_generate", label: "fam-a" },
        "hidden-one": { family: "fam-a", form: "form_generate", label: "fam-a", hide_from_dropdown: true },
      },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out[0].primaryRoute).toBe("visible-one")
  })
})

// ── Selectors: familyPrimaryRoute ───────────────────────────────────────────
describe("modelCatalog — familyPrimaryRoute", () => {
  it("prefers the family's declared default_model", () => {
    expect(familyPrimaryRoute("krea-2", FIXTURE)).toBe("krea-2")
    expect(familyPrimaryRoute("krea-2-raw", FIXTURE)).toBe("krea-2")
    expect(familyPrimaryRoute("krea-2-sd-q8", FIXTURE)).toBe("krea-2")
  })
  it("falls back to the member whose key equals the family id", () => {
    expect(familyPrimaryRoute("z-image", FIXTURE)).toBe("z-image")
    expect(familyPrimaryRoute("z-qwen-img-edit-2511", FIXTURE)).toBe("z-image")
  })
  it("falls back to the first family member when no default + no key-match", () => {
    const cat: Catalog = {
      families: { "fam-x": { label: "Fam X" } },
      models: {
        "first": { family: "fam-x", form: "form_generate", label: "fam-x" },
        "second": { family: "fam-x", form: "form_generate", label: "fam-x" },
      },
    }
    expect(familyPrimaryRoute("first", cat)).toBe("first")
    expect(familyPrimaryRoute("second", cat)).toBe("first")
  })
  it("returns the routeKey itself for an unknown family", () => {
    expect(familyPrimaryRoute("mystery", FIXTURE)).toBe("mystery")
  })
  it("does NOT apply the edit_only filter (independent of the Generate dropdown)", () => {
    // z-qwen-img-edit-2511 is edit_only → dropdownModels(undefined, ...) excludes it.
    // But familyPrimaryRoute MUST still resolve to the family primary, per the
    // source comment: family lookup is tag/form driven and independent.
    const out = familyPrimaryRoute("z-qwen-img-edit-2511", FIXTURE)
    expect(out).toBe("z-image") // NOT "z-qwen-img-edit-2511"
  })
})

// ── Loader: primeCatalog + state inspectors ─────────────────────────────────
describe("modelCatalog — primeCatalog + state inspectors", () => {
  it("primeCatalog seeds getCachedCatalog", () => {
    primeCatalog(FIXTURE)
    expect(getCachedCatalog()).toBe(FIXTURE)
  })
  it("isCatalogLoaded is true after primeCatalog", () => {
    expect(isCatalogLoaded()).toBe(true) // beforeEach already primed
  })
  it("onCatalogReady returns an unsubscribe fn that removes the listener", () => {
    const cb = vi.fn()
    const unsub = onCatalogReady(cb)
    expect(typeof unsub).toBe("function")
    // primeCatalog fires listeners (the _notify call).
    primeCatalog(FIXTURE)
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
    primeCatalog(FIXTURE)
    expect(cb).toHaveBeenCalledTimes(1) // no additional call after unsub
  })
  it("a listener that throws is caught (does not break the notify chain)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const good = vi.fn()
    onCatalogReady(() => { throw new Error("listener fault") })
    onCatalogReady(good)
    primeCatalog(FIXTURE)
    // The good listener still fired despite the earlier one throwing.
    expect(good).toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

// ── Loader: loadCatalog ─────────────────────────────────────────────────────
describe("modelCatalog — loadCatalog", () => {
  it("force=true bypasses cache and re-fetches via apiJson", async () => {
    apiJsonMock.mockResolvedValueOnce(FIXTURE)
    const cat = await loadCatalog({ force: true })
    expect(cat).toBe(FIXTURE)
    expect(apiJsonMock).toHaveBeenCalledWith("/v1/model-catalog")
  })
  it("a successful load primes the cache + fires listeners", async () => {
    const cb = vi.fn()
    onCatalogReady(cb)
    apiJsonMock.mockResolvedValueOnce(FIXTURE)
    await loadCatalog({ force: true })
    expect(getCachedCatalog()).toBe(FIXTURE)
    expect(cb).toHaveBeenCalled()
  })
  it("non-2xx response propagates the error (NO silent empty catalog)", () => {
    apiJsonMock.mockRejectedValueOnce(new Error("503 Service Unavailable"))
    return expect(loadCatalog({ force: true })).rejects.toThrow(/503/)
  })
  it("returns the cached catalog without fetching when cache is fresh", async () => {
    primeCatalog(FIXTURE)
    // No apiJsonMock setup → if it fetches, the call returns undefined and breaks.
    const cat = await loadCatalog()
    expect(cat).toBe(FIXTURE)
    expect(apiJsonMock).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// loadCatalog — TTL + inflight dedup
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — loadCatalog TTL + inflight", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the stale cache immediately when TTL expires (background refresh)", async () => {
    // Force-load at t=0 so _cacheTime=0 (primeCatalog does NOT set _cacheTime).
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    expect(getCachedCatalog()).toBe(FIXTURE)
    // Advance past _CACHE_TTL_MS (30s).
    vi.setSystemTime(31_000)
    const fresh: Catalog = { families: {}, models: { "fresh": { family: "f", form: "form_generate", label: "f" } } }
    apiJsonMock.mockResolvedValue(fresh)
    const cat = await loadCatalog()
    // Returns the STALE cache immediately (FIXTURE), not the fresh one.
    expect(cat).toBe(FIXTURE)
    // Background fetch fired.
    expect(apiJsonMock).toHaveBeenCalledTimes(2)
  })

  it("fires listeners when the background refresh completes", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    vi.setSystemTime(31_000)
    const cb = vi.fn()
    onCatalogReady(cb)
    const freshCatalog: Catalog = { families: {}, models: { "fresh": { family: "f", form: "form_generate", label: "f" } } }
    apiJsonMock.mockResolvedValue(freshCatalog)
    await loadCatalog()
    // Flush the background IIFE microtasks.
    await vi.advanceTimersByTimeAsync(0)
    expect(cb).toHaveBeenCalled()
  })

  it("does NOT trigger a background refresh when cache is fresh (within TTL)", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    vi.setSystemTime(10_000) // 10s < 30s TTL
    await loadCatalog()
    // Only the initial force-load fetch; no background refresh.
    expect(apiJsonMock).toHaveBeenCalledTimes(1)
  })

  it("does NOT trigger a background refresh when one is already inflight", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    vi.setSystemTime(31_000)
    await loadCatalog()
    // Background refresh fired once.
    expect(apiJsonMock).toHaveBeenCalledTimes(2)
    // Second call while the background refresh is still inflight → no new fetch.
    await loadCatalog()
    expect(apiJsonMock).toHaveBeenCalledTimes(2)
  })

  it("dedupes concurrent force=true calls into ONE fetch (inflight shared)", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    const [a, b] = await Promise.all([
      loadCatalog({ force: true }),
      loadCatalog({ force: true }),
    ])
    expect(a).toBe(b)
    expect(apiJsonMock).toHaveBeenCalledTimes(1)
  })

  it("clears inflight after success (next force=true re-fetches)", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    await loadCatalog({ force: true })
    expect(apiJsonMock).toHaveBeenCalledTimes(2)
  })

  it("clears inflight after failure (next call can fetch again)", async () => {
    apiJsonMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(FIXTURE)
    await expect(loadCatalog({ force: true })).rejects.toThrow(/boom/)
    const cat = await loadCatalog({ force: true })
    expect(cat).toBe(FIXTURE)
    expect(apiJsonMock).toHaveBeenCalledTimes(2)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// loadCatalog — _loaded flag transitions
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — _loaded flag", () => {
  it("isCatalogLoaded is true after a successful loadCatalog", async () => {
    apiJsonMock.mockResolvedValue(FIXTURE)
    await loadCatalog({ force: true })
    expect(isCatalogLoaded()).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ensureCatalog — background retry logic
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — ensureCatalog retry", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("logs a warning on failure and schedules a 3s retry", async () => {
    vi.resetModules()
    apiJsonMock.mockRejectedValue(new Error("gateway down"))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    // Fresh import → _loaded=false; the boot is Vitest-gated, so fire the
    // loader EXPLICITLY (the production entry point is the module-level boot).
    const mod = await import("@melite/catalog")
    mod.ensureCatalog()
    await vi.advanceTimersByTimeAsync(0)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[modelCatalog]"),
      expect.anything(),
    )
    warn.mockRestore()
  })

  it("does NOT self-boot a fetch at import under Vitest (2026-08-15)", async () => {
    // The module-level ensureCatalog() boot is gated on import.meta.vitest:
    // a fresh import must fire ZERO fetches and schedule NO retry timer.
    // This is the guard that keeps real network + real timers out of the
    // ~250 unrelated test files whose graphs import this module.
    vi.resetModules()
    const callsBefore = apiJsonMock.mock.calls.length
    const mod = await import("@melite/catalog")
    await vi.advanceTimersByTimeAsync(10_000)
    expect(apiJsonMock.mock.calls.length).toBe(callsBefore)
    expect(mod.getCachedCatalog()).toBeNull()
  })

  it("retries after 3s on failure (timer-based)", async () => {
    vi.resetModules()
    let calls = 0
    apiJsonMock.mockImplementation(async () => {
      calls += 1
      if (calls <= 1) throw new Error("first attempt fails")
      return FIXTURE
    })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const mod = await import("@melite/catalog")
    mod.ensureCatalog()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toBe(1) // initial attempt
    // Advance past the 3s retry.
    await vi.advanceTimersByTimeAsync(3000)
    expect(calls).toBe(2) // retried
    warn.mockRestore()
  })

  it("collapses concurrent ensureCatalog calls into one inflight", async () => {
    vi.resetModules()
    apiJsonMock.mockResolvedValue(FIXTURE)
    const mod = await import("@melite/catalog")
    // First explicit call starts the inflight load…
    mod.ensureCatalog()
    // …concurrent calls while it is still pending collapse into it.
    mod.ensureCatalog()
    mod.ensureCatalog()
    await vi.advanceTimersByTimeAsync(0)
    expect(apiJsonMock.mock.calls.length).toBe(1)
  })

  it("is a no-op when _loaded is already true", async () => {
    // beforeEach primes the cache → _loaded=true.
    apiJsonMock.mockResolvedValue(FIXTURE)
    const { ensureCatalog } = await import("@melite/catalog")
    const callsBefore = apiJsonMock.mock.calls.length
    ensureCatalog()
    await vi.advanceTimersByTimeAsync(0)
    expect(apiJsonMock.mock.calls.length).toBe(callsBefore)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// dropdownModels — edit_only + formTag interaction
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — dropdownModels edit_only interaction", () => {
  it("edit_only model WITH matching formTag IS included (edit_only only filters when no formTag)", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "edit-model": { family: "f", form: "form_edit", label: "f", edit_only: true },
        "gen-model": { family: "f", form: "form_generate", label: "f" },
      },
    }
    // formTag="form_edit" → edit_only does NOT exclude (the filter is only
    // applied when formTag is undefined).
    expect(dropdownModels("form_edit", cat)).toEqual(["edit-model"])
  })

  it("model with form mismatch is excluded when formTag is provided", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "gen": { family: "f", form: "form_generate", label: "f" },
        "edit": { family: "f", form: "form_edit", label: "f" },
      },
    }
    expect(dropdownModels("form_generate", cat)).toEqual(["gen"])
    expect(dropdownModels("form_edit", cat)).toEqual(["edit"])
  })

  it("model with no form field is excluded when formTag is provided", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "no-form": { family: "f" } as never, // impossible shape — form is REQUIRED on the wire; tests the defensive branch
        "has-form": { family: "f", form: "form_generate", label: "f" },
      },
    }
    expect(dropdownModels("form_generate", cat)).toEqual(["has-form"])
  })

  it("model with hide_from_dropdown is excluded regardless of form match", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "hidden": { family: "f", form: "form_generate", label: "f", hide_from_dropdown: true },
        "visible": { family: "f", form: "form_generate", label: "f" },
      },
    }
    expect(dropdownModels("form_generate", cat)).toEqual(["visible"])
  })

  it("returns all visible models sorted when no formTag (edit_only filter active)", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "c-edit": { family: "f", form: "form_generate", label: "f", edit_only: true },
        "a-gen": { family: "f", form: "form_generate", label: "f" },
        "b-gen": { family: "f", form: "form_generate", label: "f" },
      },
    }
    // c-edit excluded (edit_only); a-gen + b-gen sorted.
    expect(dropdownModels(undefined, cat)).toEqual(["a-gen", "b-gen"])
  })

  it("returns [] for an empty catalog", () => {
    expect(dropdownModels("form_generate", { families: {}, models: {} })).toEqual([])
    expect(dropdownModels(undefined, { families: {}, models: {} })).toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// familyPrimaryRoute — default_model family-mismatch guard
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — familyPrimaryRoute edge cases", () => {
  it("default_model in a DIFFERENT family is ignored (family-mismatch guard)", () => {
    // The source checks `cat.models[declared]?.family === fam`. If default_model
    // is declared on family A but its model entry actually belongs to family B,
    // the guard rejects it.
    const cat: Catalog = {
      families: {
        "fam-a": { label: "A", default_model: "shared-model" },
        "fam-b": { label: "B" },
      },
      models: {
        // shared-model belongs to fam-b, NOT fam-a.
        "shared-model": { family: "fam-b", form: "form_generate", label: "fam-b" },
        "real-a": { family: "fam-a", form: "form_generate", label: "fam-a" },
      },
    }
    // familyPrimaryRoute for a fam-a member must NOT use "shared-model".
    expect(familyPrimaryRoute("real-a", cat)).toBe("real-a")
  })

  it("returns routeKey when family has NO members at all", () => {
    // familyOf returns a family, but no models match → members is empty → routeKey.
    const cat: Catalog = {
      families: { "ghost": { label: "Ghost" } },
      models: { "unrelated": { family: "other", form: "form_generate", label: "other" } },
    }
    // "ghost-family-model" isn't in cat.models → familyOf returns undefined → routeKey.
    expect(familyPrimaryRoute("ghost-family-model", cat)).toBe("ghost-family-model")
  })

  it("resolves through the parent for a quant-tier sibling route", () => {
    // A variant-only route (not a top-level model) resolved via parentModelForRoute.
    const cat: Catalog = {
      families: { "krea": { label: "Krea", default_model: "krea-2" } },
      models: {
        "krea-2": {
          family: "krea", form: "form_generate", label: "krea",
          variants: [{ id: "q8", label: "Q8", route: "krea-2-q8", defaults: {} }],
        },
      },
    }
    // krea-2-q8 is NOT a top-level model → familyOf scans parents → krea.
    expect(familyPrimaryRoute("krea-2-q8", cat)).toBe("krea-2")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// variantsForRoute — parent-scan + empty-variants edge
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — variantsForRoute parent-scan edges", () => {
  it("returns the OWN variants when the model has them (no parent scan)", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "m": {
          family: "f", form: "form_generate", label: "M",
          variants: [{ id: "own", label: "Own", route: "m-own", defaults: {} }],
        },
      },
    }
    expect(variantsForRoute("m", cat)).toHaveLength(1)
    expect(variantsForRoute("m", cat)[0].id).toBe("own")
  })

  it("parent has EMPTY variants array → returns [] (not undefined)", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "parent": { family: "f", form: "form_generate", label: "f", variants: [] },
      },
    }
    // parent's variants is [] → parentModelForRoute scans but parent.variants=[].
    // But "parent" IS a top-level model, so own=[] (empty array is truthy in `if (own)`...
    // wait — `if (own)` checks the reference, [] is truthy! So own=[] returns [].
    expect(variantsForRoute("parent", cat)).toEqual([])
  })

  it("parent.variants is undefined (not set) → returns []", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "parent": { family: "f", form: "form_generate", label: "f" }, // no variants field
      },
    }
    expect(variantsForRoute("parent", cat)).toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// activeVariantForRoute — first-match + global scan
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — activeVariantForRoute first-match", () => {
  it("returns the FIRST matching variant in the global scan", () => {
    // Two parents both declare a variant with route "shared-q8".
    const cat: Catalog = {
      families: {},
      models: {
        "parent-a": {
          family: "a", form: "form_generate", label: "a",
          variants: [
            { id: "a-q8", label: "A Q8", route: "shared-q8", defaults: {} },
          ],
        },
        "parent-b": {
          family: "b", form: "form_generate", label: "b",
          variants: [
            { id: "b-q8", label: "B Q8", route: "shared-q8", defaults: {} },
          ],
        },
      },
    }
    const v = activeVariantForRoute("shared-q8", cat)
    // Object.entries iterates in insertion order → parent-a first.
    expect(v?.id).toBe("a-q8")
  })

  it("returns undefined for an empty catalog", () => {
    expect(activeVariantForRoute("any", { families: {}, models: {} })).toBeUndefined()
  })

  it("does NOT match on variant id alone (only route matters)", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "m": {
          family: "f", form: "form_generate", label: "f",
          variants: [{ id: "target-id", label: "T", route: "different-route", defaults: {} }],
        },
      },
    }
    // Looking up "target-id" (the id, not the route) → no match.
    expect(activeVariantForRoute("target-id", cat)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// familyOf — empty-string + falsy-family edges
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — familyOf additional edges", () => {
  it("returns undefined for an empty routeKey", () => {
    expect(familyOf("", FIXTURE)).toBeUndefined()
  })

  it("returns undefined when cat.models is undefined (defensive null check)", () => {
    expect(familyOf("krea-2", undefined as unknown as Catalog)).toBeUndefined()
  })

  it("falls through to parent scan when own family is falsy (empty string)", () => {
    // Model entry with family="" (falsy) → `if (own)` fails → parent scan.
    const cat: Catalog = {
      families: { "krea": { label: "Krea" } },
      models: {
        "krea-2": {
          family: "" as string, // falsy — own check fails
          form: "form_generate", label: "krea-2",
          variants: [{ id: "x", label: "X", route: "krea-2-q8", defaults: {} }],
        },
      },
    }
    // krea-2 has family="" → falls through. krea-2-q8 has no own family either.
    // parentModelForRoute("krea-2-q8") finds krea-2, but krea-2.family="" → returns "".
    expect(familyOf("krea-2-q8", cat)).toBe("")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// variantLabel + modelLabel — defensive fallbacks
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — variantLabel + modelLabel fallbacks", () => {
  it("variantLabel returns routeKey when model is not in catalog", () => {
    expect(variantLabel("ghost", { families: {}, models: {} })).toBe("ghost")
  })

  it("variantLabel returns routeKey when model has no variant_label and no label", () => {
    const cat: Catalog = {
      families: {},
      models: { "m": { family: "f" } as never }, // impossible shape — label is REQUIRED on the wire; tests the defensive fallback
    }
    expect(variantLabel("m", cat)).toBe("m")
  })

  it("modelLabel returns routeKey when model not in catalog", () => {
    expect(modelLabel("ghost", { families: {}, models: {} })).toBe("ghost")
  })

  it("modelLabel returns family label when model has no own label", () => {
    const cat: Catalog = {
      families: { "fam": { label: "Family Label" } },
      models: { "m": { family: "fam" } as never }, // impossible shape — label is REQUIRED on the wire; tests the family-label fallback
    }
    expect(modelLabel("m", cat)).toBe("Family Label")
  })

  it("modelLabel returns routeKey when model has no label AND family has no label", () => {
    const cat: Catalog = {
      families: { "fam": {} as never }, // no label
      models: { "m": { family: "fam" } as never }, // impossible shape — label is REQUIRED on the wire; tests the routeKey fallback
    }
    expect(modelLabel("m", cat)).toBe("m")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// familiesForForm — multi-family + edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — familiesForForm additional edges", () => {
  it("dedupes correctly when one family has 3+ members", () => {
    const cat: Catalog = {
      families: { "big": { label: "Big" } },
      models: {
        "big-1": { family: "big", form: "form_generate", label: "big" },
        "big-2": { family: "big", form: "form_generate", label: "big" },
        "big-3": { family: "big", form: "form_generate", label: "big" },
      },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out).toHaveLength(1)
    expect(out[0].familyId).toBe("big")
  })

  it("default_model that IS a visible member is used as primaryRoute", () => {
    const cat: Catalog = {
      families: { "fam": { label: "Fam", default_model: "fam-mid" } },
      models: {
        "fam-first": { family: "fam", form: "form_generate", label: "fam" },
        "fam-mid": { family: "fam", form: "form_generate", label: "fam" },
        "fam-last": { family: "fam", form: "form_generate", label: "fam" },
      },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out[0].primaryRoute).toBe("fam-mid")
  })

  it("label falls back to familyId when family has no label", () => {
    const cat: Catalog = {
      families: { "naked-fam": {} as never },
      models: { "m": { family: "naked-fam", form: "form_generate", label: "naked-fam" } },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out[0].label).toBe("naked-fam")
  })

  it("family with ALL members hidden is NOT in the result", () => {
    const cat: Catalog = {
      families: {
        "visible-fam": { label: "Visible" },
        "hidden-fam": { label: "Hidden" },
      },
      models: {
        "v": { family: "visible-fam", form: "form_generate", label: "visible-fam" },
        "h": { family: "hidden-fam", form: "form_generate", label: "hidden-fam", hide_from_dropdown: true },
      },
    }
    const out = familiesForForm("form_generate", cat)
    expect(out.map((o) => o.familyId)).toEqual(["visible-fam"])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// variantSiblings — parent-scan resolution
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — variantSiblings parent-scan", () => {
  it("resolves siblings for a variant-only route (not top-level)", () => {
    // krea-2-q8 is NOT a top-level model — it's only in krea-2's variants[].route.
    const cat: Catalog = {
      families: { "krea": { label: "Krea" } },
      models: {
        "krea-2": {
          family: "krea", form: "form_generate", label: "krea",
          variants: [{ id: "q8", label: "Q8", route: "krea-2-q8", defaults: {} }],
        },
        "krea-2-raw": { family: "krea", form: "form_generate", label: "krea-2-raw" },
      },
    }
    // familyOf("krea-2-q8") → parentModelForRoute → krea-2 → family "krea".
    const out = variantSiblings("krea-2-q8", cat)
    expect(out).toEqual(["krea-2", "krea-2-raw"])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// hiddenFromDropdown — additional edges
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — hiddenFromDropdown edges", () => {
  it("returns an empty Set when no models are hidden", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "m1": { family: "f", form: "form_generate", label: "f" },
        "m2": { family: "f", form: "form_generate", label: "f" },
      },
    }
    expect(hiddenFromDropdown(cat).size).toBe(0)
  })

  it("returns multiple hidden models", () => {
    const cat: Catalog = {
      families: {},
      models: {
        "h1": { family: "f", form: "form_generate", label: "f", hide_from_dropdown: true },
        "h2": { family: "f", form: "form_generate", label: "f", hide_from_dropdown: true },
        "v1": { family: "f", form: "form_generate", label: "f" },
      },
    }
    const out = hiddenFromDropdown(cat)
    expect(out.size).toBe(2)
    expect(out.has("h1")).toBe(true)
    expect(out.has("h2")).toBe(true)
    expect(out.has("v1")).toBe(false)
  })

  it("returns an empty Set for an empty catalog", () => {
    expect(hiddenFromDropdown({ families: {}, models: {} }).size).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Type shape — VariantEntry + PromptGuideSection fields
// ════════════════════════════════════════════════════════════════════════════
describe("modelCatalog — type shape sanity", () => {
  it("VariantEntry supports all documented optional fields", () => {
    const v = {
      id: "fp8",
      label: "FP8",
      group: "quant",
      hint: "8-bit float",
      defaults: { sampling_steps: 20 },
      route: "model-fp8",
      engine: "diffusers",
      quant: "fp8",
      vram_peak_gb: 12.5,
      note: "Requires Ampere+",
      live: true,
    }
    expect(v.id).toBe("fp8")
    expect(v.vram_peak_gb).toBe(12.5)
    expect(v.live).toBe(true)
  })

  it("PromptGuideSection supports label + body + list + code", () => {
    const s = {
      label: "Tips",
      body: "Be specific.",
      list: ["one", "two"],
      code: "prompt --flag",
    }
    expect(s.label).toBe("Tips")
    expect(s.code).toBe("prompt --flag")
  })

  it("ModelDefaults supports the documented numeric + string fields", () => {
    const d = {
      width: 640,
      height: 480,
      sampling_steps: 25,
      guide_scale: 5.0,
      negative_prompt: "blurry",
      custom_field: "anything", // [k: string]: unknown allows extras
    }
    expect(d.width).toBe(640)
    expect(d.negative_prompt).toBe("blurry")
  })

  it("ModelEntry supports the documented optional fields", () => {
    const m = {
      family: "krea",
      form: "form_generate",
      label: "Krea",
      variant_label: "Base",
      variant: "base",
      quant: "fp8",
      variants: [],
      defaults: { width: 640 },
      edit_only: false,
      canvas_editor: true,
      hide_from_dropdown: false,
    } as const
    expect(m.family).toBe("krea")
    expect(m.canvas_editor).toBe(true)
  })
})
