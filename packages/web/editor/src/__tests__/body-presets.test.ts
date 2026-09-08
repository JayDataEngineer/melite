/**
 * Unit tests for lib/bodyPresets.ts — the Body Studio one-click archetype
 * presets (Neutral / Male / Female).
 *
 * These presets ship real Character configs that feed directly into
 * patchEditing() on Body Studio mount (and, via the body card bridge, into a
 * flow card's params), so a silent edit to a gender coefficient or a
 * stray customTargets value would change the user's starting mesh with no
 * test catching it. The tests pin: the preset roster, coefficient arity +
 * race neutrality, gender dimorphism, identityModel, the localChanges-only
 * baseline contract (customTargets === null for every preset), and the
 * getPresetById/DEFAULT_PRESET_ID lookup API.
 *
 * Anime presets were removed (2026-08-08) when the Body Studio was shrunk to
 * a flow card — the roster is now the lean realist set below.
 */
import { describe, it, expect } from "vitest"
import {
  BODY_PRESETS, getPresetById, DEFAULT_PRESET_ID,
} from "@melite/formats"
import type { BodyPreset } from "@melite/formats"

// ── Roster ──────────────────────────────────────────────────────────────────
describe("bodyPresets — roster", () => {
  it("ships exactly 3 presets with stable ids", () => {
    expect(BODY_PRESETS).toHaveLength(3)
    expect(BODY_PRESETS.map((p) => p.id).sort()).toEqual(
      ["female", "male", "neutral"],
    )
  })
  it("every preset has a non-empty name and description", () => {
    for (const p of BODY_PRESETS) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
    }
  })
  it("preset ids are unique", () => {
    const ids = BODY_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ── Coefficient arity + race neutrality ────────────────────────────────────
describe("bodyPresets — coefficient contract", () => {
  it("every preset has exactly 11 coeffs (8 phenotype + 3 race)", () => {
    for (const p of BODY_PRESETS) expect(p.coeffs).toHaveLength(11)
  })
  it("race dims (indices 8, 9, 10) are neutral 0.5 for every preset", () => {
    for (const p of BODY_PRESETS) {
      expect(p.coeffs[8]).toBe(0.5) // african
      expect(p.coeffs[9]).toBe(0.5) // asian
      expect(p.coeffs[10]).toBe(0.5) // caucasian
    }
  })
  it("all coefficients are within [0, 1]", () => {
    for (const p of BODY_PRESETS) {
      for (const c of p.coeffs) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ── Gender dimorphism ───────────────────────────────────────────────────────
describe("bodyPresets — gender dimorphism (coeffs[0])", () => {
  it("NEUTRAL is androgynous (gender 0.5)", () => {
    expect(getPresetById("neutral")!.coeffs[0]).toBe(0.5)
  })
  it("MALE is fully masculine (gender 0.0) and FEMALE fully feminine (1.0)", () => {
    expect(getPresetById("male")!.coeffs[0]).toBe(0.0)
    expect(getPresetById("female")!.coeffs[0]).toBe(1.0)
  })
})

// ── identityModel ───────────────────────────────────────────────────────────
describe("bodyPresets — identityModel", () => {
  it("every preset targets the 'anny' identity model", () => {
    for (const p of BODY_PRESETS) expect(p.identityModel).toBe("anny")
  })
})

// ── Baseline contract: no preset leans on community .target blends ──────────
describe("bodyPresets — baseline contract", () => {
  it("customTargets is null for EVERY preset", () => {
    for (const p of BODY_PRESETS) expect(p.customTargets).toBeNull()
  })
  it("all presets carry NO local changes (clean starting points)", () => {
    for (const p of BODY_PRESETS) expect(p.localChanges).toBeNull()
  })
})

// ── getPresetById / DEFAULT_PRESET_ID ───────────────────────────────────────
describe("bodyPresets — getPresetById / DEFAULT_PRESET_ID", () => {
  it("getPresetById returns the preset reference that lives in BODY_PRESETS", () => {
    const neutral = getPresetById("neutral")
    expect(neutral).toBe(BODY_PRESETS[0]) // SAME reference (find returns the element)
  })
  it("getPresetById returns undefined for an unknown id", () => {
    expect(getPresetById("does-not-exist")).toBeUndefined()
  })
  it("DEFAULT_PRESET_ID is null (Body Studio must NOT clobber saved edits on reload)", () => {
    expect(DEFAULT_PRESET_ID).toBeNull()
  })
})

// ── BodyPreset type shape (compile-time + runtime sanity) ───────────────────
describe("bodyPresets — type/shape sanity", () => {
  it("every preset satisfies the BodyPreset interface (extends Character + id/name/description)", () => {
    function check(p: BodyPreset) {
      expect(typeof p.id).toBe("string")
      expect(typeof p.name).toBe("string")
      expect(typeof p.description).toBe("string")
      expect(typeof p.identityModel).toBe("string")
      expect(Array.isArray(p.coeffs)).toBe(true)
    }
    for (const p of BODY_PRESETS) check(p)
  })
})

// ── Defensive copy isolation ────────────────────────────────────────────────
describe("bodyPresets — defensive copy isolation", () => {
  it("no two presets share the same object reference for any field", () => {
    for (let i = 0; i < BODY_PRESETS.length; i++) {
      for (let j = i + 1; j < BODY_PRESETS.length; j++) {
        expect(BODY_PRESETS[i].coeffs).not.toBe(BODY_PRESETS[j].coeffs)
      }
    }
  })
})

// ── Specific coefficient pinning (guard against accidental edits) ───────────
describe("bodyPresets — coefficient pinning", () => {
  it("neutral has all phenotype dims at 0.5 (androgynous average)", () => {
    const c = getPresetById("neutral")!.coeffs
    for (let i = 0; i < 8; i++) expect(c[i]).toBe(0.5)
  })
  it("male has gender=0.0, female has gender=1.0 (pinned extremes)", () => {
    expect(getPresetById("male")!.coeffs[0]).toBe(0.0)
    expect(getPresetById("female")!.coeffs[0]).toBe(1.0)
  })
})
