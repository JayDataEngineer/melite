// studio-capabilities.test.ts — the declarative registry of studio-kind
// capabilities (Body, future Pose/Director).
//
// Locks the contract the LibrarySidebar relies on: STUDIO_CAPABILITIES is a
// non-empty readonly array; every entry carries the discriminator + a stable
// id + defaultParams; the Body entry seeds NO legacy bag (scrubbed
// 2026-09-06, operator order "NO LEGACY CODEBASE" — new stages seed only
// family-declared params). A revert that drops the discriminator or
// reintroduces the ray-era keys fails here.
import { describe, it, expect } from "vitest"
import { STUDIO_CAPABILITIES, type StudioCapability } from "@melite/slots"

describe("STUDIO_CAPABILITIES — registry shape", () => {
  it("is a non-empty readonly array", () => {
    expect(Array.isArray(STUDIO_CAPABILITIES)).toBe(true)
    expect(STUDIO_CAPABILITIES.length).toBeGreaterThan(0)
  })

  it("every entry carries kind: 'studio' (the discriminator)", () => {
    for (const cap of STUDIO_CAPABILITIES) {
      expect(cap.kind).toBe("studio")
    }
  })

  it("every entry has a unique id (the React key + data-capability-tile)", () => {
    const ids = STUDIO_CAPABILITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every entry has a non-empty label + description + genre + studio", () => {
    for (const cap of STUDIO_CAPABILITIES) {
      expect(cap.label.length).toBeGreaterThan(0)
      expect(cap.description.length).toBeGreaterThan(0)
      expect(cap.genre.length).toBeGreaterThan(0)
      expect(cap.studio.length).toBeGreaterThan(0)
    }
  })

  it("every entry is a valid StudioCapability (structural)", () => {
    for (const cap of STUDIO_CAPABILITIES) {
      // Asserts the discriminated fields exist + types match the interface.
      const _: StudioCapability = cap
      expect(_).toBe(cap)
    }
  })
})

describe("STUDIO_CAPABILITIES — the Body entry", () => {
  const body = STUDIO_CAPABILITIES.find((c) => c.studio === "body")

  it("exists (Body is a real first-class capability, not experimental)", () => {
    expect(body).toBeTruthy()
  })

  it("seeds NO legacy bag — family-declared params only", () => {
    // The ray-era keys (identityModel/coeffs/localChanges/customTargets)
    // were scrubbed 2026-09-06 ("NO LEGACY CODEBASE"): they used to
    // arrive here stillborn and poison Runs at the gate. New stages
    // seed ONLY family-declared params — the bag must stay empty.
    expect(body!.defaultParams).toEqual({})
    expect(body!.defaultParams.identityModel).toBeUndefined()
    expect(body!.defaultParams.coeffs).toBeUndefined()
    expect(body!.defaultParams.localChanges).toBeUndefined()
    expect(body!.defaultParams.customTargets).toBeUndefined()
  })

  it("is grouped under the '3d' genre (so it lands in the spatial section)", () => {
    expect(body!.genre).toBe("3d")
  })
})
