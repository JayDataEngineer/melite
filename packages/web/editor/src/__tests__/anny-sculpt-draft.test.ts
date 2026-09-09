/**
 * SculptDraft — the finished design's persisted lever draft
 * (2026-09-06, operator order "finish the design"): serialize the
 * live scratchpad, hydrate it back, and never echo-write. Pure —
 * tested without a store.
 */
import { it, expect } from "vitest"
import {
  NEUTRAL_DRAFT,
  draftFromParams,
  sculptNeedsWrite,
  serializeDraft,
} from "@melite/melite-3d-anny/ui/studio/shape"

const COEFFS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
const MORPHS = { "upperarm-fat-incr": 0.25, "thigh-scale-horiz-incr": -0.5 }

it("serializes the wire spelling (snake_case local_changes — the silent-drop class)", () => {
  const draft = serializeDraft({ coeffs: COEFFS, localChanges: MORPHS })
  expect(draft).toEqual({ dialect: "authored", phenotype: COEFFS, local_changes: MORPHS })
  expect("localChanges" in (draft as object)).toBe(false)
})

it("serializes nothing while the levers never took a value (untouched stages stay clean)", () => {
  expect(serializeDraft({ coeffs: null, localChanges: null })).toBeNull()
  expect(serializeDraft({ coeffs: [0.5, 0.5], localChanges: {} })).toBeNull()
})

it("round-trips: draft → params → seed is identical", () => {
  const draft = serializeDraft({ coeffs: COEFFS, localChanges: MORPHS })!
  const seed = draftFromParams({ sculpt: draft })
  expect(seed).toEqual({ coeffs: COEFFS, localChanges: MORPHS })
})

it("hydrates nothing without a draft, and refuses an invalid draft loud (null, never invented numbers)", () => {
  expect(draftFromParams({})).toBeNull()
  expect(draftFromParams({ sculpt: { dialect: "authored", phenotype: [1, 2], local_changes: {} } })).toBeNull()
  expect(draftFromParams({ sculpt: { dialect: "estimated", phenotype: COEFFS, local_changes: {} } })).toBeNull()
})

it("echo-guards: equal drafts never write, diverged drafts always do", () => {
  const draft = serializeDraft({ coeffs: COEFFS, localChanges: MORPHS })!
  expect(sculptNeedsWrite(draft, draft)).toBe(false)
  expect(sculptNeedsWrite(draft, JSON.parse(JSON.stringify(draft)))).toBe(false)
  expect(sculptNeedsWrite(draft, null)).toBe(true)
  expect(sculptNeedsWrite(draft, NEUTRAL_DRAFT)).toBe(true)
})
