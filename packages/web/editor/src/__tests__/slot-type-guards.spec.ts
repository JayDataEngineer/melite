// slot-type-guards.spec.ts — the FileKind type-guard contract (2026-08-12).
//
// The user's directive: "add zustand + pydantic guards to make sure that
// the input is the right kind of file / type for ALL CARDS WE HAVE."
//
// This pins the FRONTEND half of that contract — the Zustand guard in
// flowStore.setSlotInput calls canWireSlot() before accepting a wire,
// and canWireSlot is built on four pure functions exported from
// inputSlots.ts:
//
//  • slotKind(slotKey) — the declared FileKind for a slot (or "any").
//  • genreToKind(genre) — the output FileKind for a family's catalog genre.
//  • kindsCompatible(producer, consumer) — the compatibility matrix.
//  • canWireSlot(genre, slotKey) — the composite guard.
//
// The matrix mirrors backend/core/flows/slot_kinds.py — both sides of
// the wire enforce the SAME contract. Drift in either direction fails
// these tests AND the backend test_slot_type_guards.py.
import { describe, it, expect, beforeEach } from "vitest"

import {
  setInputVocabulary,
  slotKind,
  genreToKind,
  kindsCompatible,
  canWireSlot,
} from "@melite/catalog"

// Reset the module-local _slotKinds between tests so each test's
// setInputVocabulary is authoritative (inputSlots.ts holds module state).
beforeEach(() => {
  setInputVocabulary({
    slots: ["input_image", "input_glb", "reference_audio", "input_mask"],
    slot_kinds: {
      input_image: "image",
      input_glb: "glb",
      reference_audio: "audio",
      input_mask: "mask",
    },
  })
})

describe("slotKind", () => {
  it("returns the declared kind for known slots", () => {
    expect(slotKind("input_image")).toBe("image")
    expect(slotKind("input_glb")).toBe("glb")
    expect(slotKind("reference_audio")).toBe("audio")
    expect(slotKind("input_mask")).toBe("mask")
  })

  it("returns 'any' for unknown slots (permissive — never blocks)", () => {
    expect(slotKind("totally_made_up_slot")).toBe("any")
  })

  it("returns 'any' when no slot_kinds has been registered yet", () => {
    // Module-state reset: the first call in a fresh module load with no
    // slot_kinds leaves the permissive default. (The catalog ALWAYS ships
    // slot_kinds, so this only happens pre-catalog — the guard stays open.)
    setInputVocabulary({ slots: ["fresh_slot"] }) // not in any prior slot_kinds
    expect(slotKind("fresh_slot")).toBe("any")
  })
})

describe("genreToKind", () => {
  it("maps every catalog genre to its output FileKind", () => {
    expect(genreToKind("image")).toBe("image")
    expect(genreToKind("video")).toBe("video")
    expect(genreToKind("audio")).toBe("audio")
    expect(genreToKind("3d")).toBe("glb")
    expect(genreToKind("motion")).toBe("motion")
    expect(genreToKind("other")).toBe("any")
    expect(genreToKind("text")).toBe("text")
  })

  it("returns 'any' for null/undefined/unknown genres (permissive)", () => {
    expect(genreToKind(null)).toBe("any")
    expect(genreToKind(undefined)).toBe("any")
    expect(genreToKind("")).toBe("any")
    expect(genreToKind("future_unknown_genre")).toBe("any")
  })
})

describe("kindsCompatible", () => {
  it("accepts same kind (reflexive)", () => {
    for (const k of ["image", "glb", "audio", "video", "motion", "mask", "voice", "text"] as const) {
      expect(kindsCompatible(k, k)).toBe(true)
    }
  })

  it("accepts image↔mask symmetrically (a mask is an image)", () => {
    expect(kindsCompatible("image", "mask")).toBe(true)
    expect(kindsCompatible("mask", "image")).toBe(true)
  })

  it("accepts any→everything and everything→any (permissive)", () => {
    for (const k of ["image", "glb", "audio", "motion", "video", "voice", "text", "mask"] as const) {
      expect(kindsCompatible("any", k)).toBe(true)
      expect(kindsCompatible(k, "any")).toBe(true)
    }
  })

  it.each([
    ["glb", "audio"],
    ["audio", "glb"],
    ["video", "image"],
    ["image", "video"],
    ["glb", "motion"],
    ["motion", "glb"],
    ["voice", "audio"],
    ["audio", "motion"],
  ] as const)("rejects %s → %s", (producer, consumer) => {
    expect(kindsCompatible(producer, consumer)).toBe(false)
  })
})

describe("canWireSlot (the composite guard)", () => {
  it("allows image genre → input_image slot", () => {
    expect(canWireSlot("image", "input_image")).toBe(true)
  })

  it("allows 3d genre → input_glb slot (genre maps to glb)", () => {
    expect(canWireSlot("3d", "input_glb")).toBe(true)
  })

  it("allows audio genre → reference_audio slot", () => {
    expect(canWireSlot("audio", "reference_audio")).toBe(true)
  })

  it("allows motion genre → prev_motion_artifact (if declared motion)", () => {
    setInputVocabulary({
      slots: ["prev_motion_artifact"],
      slot_kinds: { prev_motion_artifact: "motion" },
    })
    expect(canWireSlot("motion", "prev_motion_artifact")).toBe(true)
  })

  it("REJECTS audio genre → input_glb slot (the exact bug this prevents)", () => {
    expect(canWireSlot("audio", "input_glb")).toBe(false)
  })

  it("REJECTS motion genre → input_image slot", () => {
    expect(canWireSlot("motion", "input_image")).toBe(false)
  })

  it("REJECTS glb genre → reference_audio slot", () => {
    expect(canWireSlot("3d", "reference_audio")).toBe(false)
  })

  it("allows unknown genre → any slot (permissive)", () => {
    expect(canWireSlot(null, "input_image")).toBe(true)
    expect(canWireSlot("unknown_genre", "input_glb")).toBe(true)
  })

  it("allows known genre → unknown slot (permissive)", () => {
    expect(canWireSlot("image", "totally_unknown_slot")).toBe(true)
  })

  it("allows image genre → input_mask slot (image↔mask compatibility)", () => {
    expect(canWireSlot("image", "input_mask")).toBe(true)
  })
})

describe("setInputVocabulary threads slot_kinds", () => {
  it("a slot never declared in slot_kinds is permissive ('any')", () => {
    // The catalog ships slot_kinds for every known slot. A slot absent from
    // that table — a typo, a brand-new slot the backend forgot to type —
    // resolves to "any" so the guard never FALSE-blocks (permissive on
    // unknowns; DECLARED mismatches are what we reject).
    expect(slotKind("totally_undeclared_slot")).toBe("any")
    expect(canWireSlot("audio", "totally_undeclared_slot")).toBe(true)
  })

  it("updating the vocabulary updates slotKind lookups", () => {
    expect(slotKind("input_image")).toBe("image")
    setInputVocabulary({
      slots: ["input_image"],
      slot_kinds: { input_image: "glb" }, // weird, but tests the wiring
    })
    expect(slotKind("input_image")).toBe("glb")
  })

  it("the full matrix from the backend survives the wire (parity check)", () => {
    // Slot kinds as the backend would deliver them.
    setInputVocabulary({
      slots: [
        "input_image", "image1", "input_glb", "source_glb", "outfit_glb",
        "reference_audio", "voice_file", "input_mask", "lanpaint_mask",
        "prev_motion_artifact", "motion_npz", "first_frame", "last_frame",
      ],
      slot_kinds: {
        input_image: "image",
        image1: "image",
        input_glb: "glb",
        source_glb: "glb",
        outfit_glb: "glb",
        reference_audio: "audio",
        voice_file: "voice",
        input_mask: "mask",
        lanpaint_mask: "mask",
        prev_motion_artifact: "motion",
        motion_npz: "motion",
        first_frame: "image",
        last_frame: "image",
      },
    })
    // Every valid wire:
    expect(canWireSlot("image", "input_image")).toBe(true)
    expect(canWireSlot("image", "image1")).toBe(true)
    expect(canWireSlot("image", "first_frame")).toBe(true)
    expect(canWireSlot("3d", "input_glb")).toBe(true)
    expect(canWireSlot("3d", "source_glb")).toBe(true)
    expect(canWireSlot("3d", "outfit_glb")).toBe(true)
    expect(canWireSlot("audio", "reference_audio")).toBe(true)
    expect(canWireSlot("motion", "motion_npz")).toBe(true)
    expect(canWireSlot("motion", "prev_motion_artifact")).toBe(true)
    // Every invalid wire:
    expect(canWireSlot("audio", "input_glb")).toBe(false)
    expect(canWireSlot("3d", "reference_audio")).toBe(false)
    expect(canWireSlot("motion", "input_image")).toBe(false)
    expect(canWireSlot("image", "input_glb")).toBe(false)
    expect(canWireSlot("audio", "motion_npz")).toBe(false)
    // The image↔mask bridge:
    expect(canWireSlot("image", "input_mask")).toBe(true)
    expect(canWireSlot("image", "lanpaint_mask")).toBe(true)
  })
})
