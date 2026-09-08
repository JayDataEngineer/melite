// card-seam.gate — the gate for the card KIND seam (2026-08-19, the
// second seam cut — DSH-PLUGIN-GAP-ANALYSIS.md §8.1's pattern applied to
// the card kit). The two historical card "modes" (schema form vs studio)
// are two PROVIDERS of one body contract (resolveCardSurface); kind
// behavior is registry data, not scattered `kind ===` literals.
//
// PART A — registry semantics: duplicates loud, unknown kinds fail safe.
// PART B — the first-party flag table pinned EXACTLY (drift = CI failure).
// PART C — the body seam resolves studio/form/fixed.
// PART D — source gates: the closed unions stay dead; the migrated
//          behavior sites stay literal-free.
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  kindDef,
  registerCardKind,
  registeredCardKinds,
} from "@melite/slots"
// Dogfood seed — the wire's truth, synced the way the app boots
// (the setup file does the same for the whole suite).
import { syncPluginKinds } from "@/surfaces/flow/pluginKinds"
import type { KindEntry } from "@/rpc/editorApi"
import { MELITE_CORE_KINDS } from "./fixtures/meliteCoreKinds"

syncPluginKinds(MELITE_CORE_KINDS as KindEntry[])
import {
  resolveCardBody,
  registerCardBody,
  registeredCardBodyProviders,
} from "@melite/slots"
// Dogfood: run the first-party provider registrations exactly as the
// zoom does in production (the host owns the registrations).
import "@/surfaces/flow/cardStudios"
import { kindHasFormSpec, kindHasCompound } from "@melite/slots"
import { cardIsRunnable } from "@/surfaces/flow/flowCardTypes"
import type { CardStage } from "@melite/contracts"
// ── PART A — registry semantics ─────────────────────────────────────────

describe("cardSeam registry", () => {
  it("rejects a duplicate kind registration, loudly", () => {
    expect(() =>
      registerCardKind({
        kind: "generation",
        runnable: true,
        executable: true,
        formSpec: true,
        compound: false,
        opensStudio: false,
        badgeTone: "default",
      }),
    ).toThrow(/already registered/)
  })

  it("unknown kinds fail safe: not runnable, not executable, no form-spec", () => {
    const def = kindDef("some-future-plugin-kind")
    expect(def.runnable).toBe(false)
    expect(def.executable).toBe(false)
    expect(def.formSpec).toBe(false)
    expect(def.compound).toBe(false)
    // The derived guards agree — no silent mislabel as a model route.
    expect(kindHasFormSpec("some-future-plugin-kind")).toBe(false)
    expect(kindHasCompound("some-future-plugin-kind")).toBe(false)
  })

  it("a registration disposes and re-registers cleanly", () => {
    const dispose = registerCardKind({
      kind: "gate-test-temp",
      runnable: true,
      executable: true,
      formSpec: false,
      compound: false,
      opensStudio: false,
      badgeTone: "default",
    })
    expect(registeredCardKinds()).toContain("gate-test-temp")
    dispose()
    expect(registeredCardKinds()).not.toContain("gate-test-temp")
    const again = registerCardKind({
      kind: "gate-test-temp",
      runnable: false,
      executable: false,
      formSpec: false,
      compound: false,
      opensStudio: false,
      badgeTone: "default",
    })
    again()
  })
})

// ── PART B — the first-party table, pinned ──────────────────────────────

describe("first-party card kinds (pinned)", () => {
  it("registers exactly the eight first-party kinds", () => {
    // card-compose joined 2026-09-05 (cd5e63c — the model-picker-only
    // bug): a compose-arm kind that renders its own card form.
    expect(registeredCardKinds()).toEqual([
      "body",
      "card-compose",
      "chain",
      "compound",
      "generation",
      "input",
      "preview",
      "studio-link",
    ])
  })

  it("preserves the pre-seam semantics EXACTLY as flags", () => {
    // runnable was `kind !== "body"`
    for (const k of ["generation", "chain", "studio-link", "preview", "input", "compound", "card-compose"]) {
      expect(kindDef(k).runnable, k).toBe(true)
    }
    expect(kindDef("body").runnable).toBe(false)
    // executable was !(studio-link || body)
    for (const k of ["generation", "chain", "preview", "input", "compound", "card-compose"]) {
      expect(kindDef(k).executable, k).toBe(true)
    }
    expect(kindDef("studio-link").executable).toBe(false)
    expect(kindDef("body").executable).toBe(false)
    // formSpec was generation | chain (+ card-compose, cd5e63c)
    expect(kindDef("generation").formSpec).toBe(true)
    expect(kindDef("chain").formSpec).toBe(true)
    expect(kindDef("card-compose").formSpec).toBe(true)
    for (const k of ["studio-link", "preview", "input", "body", "compound"]) {
      expect(kindDef(k).formSpec, k).toBe(false)
    }
    // opensStudio was kind === "studio-link" (the last literal, 2026-08-21)
    expect(kindDef("studio-link").opensStudio).toBe(true)
    for (const k of ["generation", "chain", "preview", "input", "body", "compound", "card-compose"]) {
      expect(kindDef(k).opensStudio, k).toBe(false)
    }
    // compound was kind === "compound"
    expect(kindDef("compound").compound).toBe(true)
    for (const k of ["generation", "chain", "studio-link", "preview", "input", "body", "card-compose"]) {
      expect(kindDef(k).compound, k).toBe(false)
    }
    // badge tone: studio-link carried brand
    expect(kindDef("studio-link").badgeTone).toBe("brand")
  })

  it("cardIsRunnable rides the registry (body is the one non-runner)", () => {
    const stage = (kind: string): CardStage =>
      ({ id: "s", title: "t", kind, service: "x", params: {}, inputs: [], inputIndices: [], result: null, status: "done" }) as unknown as CardStage
    expect(cardIsRunnable(stage("body"))).toBe(false)
    expect(cardIsRunnable(stage("generation"))).toBe(true)
  })
})

// ── PART C — the body slot (the studio removal) ─────────────────────────

describe("the card body slot (injections, not classes)", () => {
  const stage = (kind: string): CardStage =>
    ({ id: "s", title: "t", kind, service: "x", params: {}, inputs: [], inputIndices: [], result: null, status: "done" }) as unknown as CardStage

  it("the first-party providers are registered at distinct tiers", () => {
    expect(registeredCardBodyProviders()).toEqual([
      "100:melite-core/studio-tenants",
      "50:melite-core/schema-form",
    ])
  })

  it("a body card claims the wide frame (fullBleed) with an injected body", () => {
    const claim = resolveCardBody(stage("body"))
    expect(claim?.fullBleed).toBe(true)
    expect(claim?.body).toBeTruthy()
  })

  it("a formSpec kind claims the INJECTED schema form — same shape, no wide frame", () => {
    const claim = resolveCardBody(stage("generation"))
    expect(claim).toBeTruthy()
    expect(claim?.fullBleed).toBeUndefined()
    expect(claim?.body).toBeTruthy()
  })

  it("an unclaimed kind falls through the walk to null — the fail-safe terminal", () => {
    expect(resolveCardBody(stage("preview"))).toBeNull()
    expect(resolveCardBody(stage("input"))).toBeNull()
  })

  it("a precedence collision is LOUD with the shadowing hint", () => {
    expect(() =>
      registerCardBody({ id: "gate/shadow", precedence: 100, resolve: () => null }),
    ).toThrow(/shadow/)
  })

  it("a duplicate provider id is LOUD", () => {
    expect(() =>
      registerCardBody({ id: "melite-core/schema-form", precedence: 70, resolve: () => null }),
    ).toThrow(/already registered/)
  })
})

// ── PART D — source gates ───────────────────────────────────────────────

describe("source gates (the unions stay dead)", () => {
  it("the closed unions are not resurrected", () => {
    expect(readFileSync("src/surfaces/flow/flowCardTypes.ts", "utf8")).not.toContain(
      "export type CardKind",
    )
    expect(readFileSync("../../../web/contracts/src/FlowTypes.ts", "utf8")).not.toContain(
      "export type StageKind",
    )
  })

  it("the migrated behavior sites carry no kind literals", () => {
    const types = readFileSync("src/surfaces/flow/flowCardTypes.ts", "utf8")
    expect(types).not.toContain('!== "body"')
    const exec = readFileSync("src/surfaces/flow/flowExecuteSlice.ts", "utf8")
    expect(exec).not.toContain('=== "studio-link"')
    const tile = readFileSync("src/surfaces/flow/flowCardTile.tsx", "utf8")
    expect(tile).not.toContain('=== "body"')
    const badges = readFileSync("src/surfaces/flow/flowCardBadges.tsx", "utf8")
    expect(badges).not.toContain('=== "studio-link"')
    // The spine is consulted, not bypassed.
    expect(types).toContain("kindDef")
    expect(exec).toContain("kindDef")
  })
})
