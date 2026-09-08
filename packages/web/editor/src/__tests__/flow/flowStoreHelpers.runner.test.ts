// flowStoreHelpers.runner.test.ts — pin the declarative runner
// resolution (2026-09-05). The resolver MUST be data-driven: the
// kind's `runner` flag + the stage's own `flowName`. No hardcoded
// kind-name branches in the dispatch (the SSOT is py/card_kinds.py).
//
// setup.ts registers the MELITE_CORE_KINDS fixture into the kinds
// registry before this suite runs, so resolveStageRunner sees real
// kind defs — but setup.ts must forward `runner` (added in this
// stroke) for the input kind to declare its runner. This test is the
// lockstep pin for that wiring.

import { describe, it, expect } from "vitest"
import { resolveStageRunner } from "@/surfaces/flow/flowStoreHelpers"
import { kindDef } from "@melite/slots"
import type { FlowStage } from "@melite/contracts"

const stage = (over: Partial<FlowStage>): FlowStage => ({
 id: "s1",
 title: "Test",
 kind: "generation",
 service: "krea-2",
 params: {},
 inputs: {},
 outputs: {},
 ...over,
} as FlowStage)

describe("resolveStageRunner — declarative dispatch contract", () => {
 it("card-compose with no flowName → generation runner", () => {
  // The bug: the Image card the operator made (kind=card-compose,
  // no flowName) was dispatched to the chain runner, which then
  // threw at run time. By the rule, card-compose without flowName
  // is an executable card with a model → generation.
  const r = resolveStageRunner(stage({ kind: "card-compose", flowName: undefined }))
  expect(r.runner).toBe("generation")
 })

 it("chain with flowName → chain runner", () => {
  const r = resolveStageRunner(stage({ kind: "chain", flowName: "one_shot.yaml" }))
  expect(r.runner).toBe("chain")
 })

 it("chain without flowName → generation (default rule; the kind's runner is '')", () => {
  // The chain kind does NOT declare runner="chain" — it relies on
  // the stage's flowName declaration. A chain-kind stage without a
  // flowName falls to the default (executable card → generation).
  // Pins the contract: dispatch is data-driven, not kind-name-driven.
  const r = resolveStageRunner(stage({ kind: "chain", flowName: undefined }))
  expect(r.runner).toBe("generation")
 })

 it("input kind → input runner (kind declares runner='input')", () => {
  const r = resolveStageRunner(stage({ kind: "input" }))
  expect(r.runner).toBe("input")
 })

 it("non-executable kind → refusal", () => {
  const r = resolveStageRunner(stage({ kind: "studio-link" }))
  expect(r.runner).toBeNull()
  expect(r.refusal).toMatch(/not runnable/)
 })

 it("compound kind → refusal (containers don't run alone)", () => {
  const r = resolveStageRunner(stage({ kind: "compound" }))
  expect(r.runner).toBeNull()
  expect(r.refusal).toMatch(/container/)
 })

 // (2026-09-05) the "unknown runner" test was removed when the
 // runner vocabulary tightened to a closed union (KindRunner =
 // "" | "input"). An unknown runner is now a CONSTRUCTION
 // refusal — the server's KindRunner enum (py/card_kinds) and the
 // client's KindRunner union both reject it at the source (a
 // typo refuses at registerCardKind / pydantic), so the
 // resolver's defense is unreachable from typed code. The
 // closed-vocab invariant is the test.
})

describe("kinds registry lockstep (client mirror of py/card_kinds.py)", () => {
 it("every first-party kind is registered (fixture fed setup.ts)", () => {
  for (const k of ["generation", "chain", "card-compose", "input",
       "preview", "body", "compound", "studio-link"]) {
   expect(kindDef(k).kind).toBe(k)
  }
 })

 it("the input kind declares runner='input' (setup forwards the fixture)", () => {
  // setup.ts must forward `runner` from MELITE_CORE_KINDS; this
  // test fails loudly if a future refactor drops it (the
  // dispatcher's data-driven resolver would silently misroute).
  expect(kindDef("input").runner).toBe("input")
 })
})
