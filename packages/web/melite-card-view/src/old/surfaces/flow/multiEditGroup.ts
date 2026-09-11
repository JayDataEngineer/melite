// multiEditGroup — LEGACY MODULE SHIM (2026-08-12 formalization).
//
// The pure segmentation pass + qwen-img-edit-2511 predicate that drove the old
// "multi-edit condensation" hack. The logic now lives ONE level up, in
// ./subgraph.ts — the canonical first-class "compound" concept that
// replaces the three separate card-holds-cards mechanisms (modifier
// subcards, YAML chains, view-only condensation).
//
// This file keeps the old import surface alive so consumers + tests
// (multi-edit-group.test.ts, multi-edit-chain.test.tsx, FlowTileGrid)
// keep compiling unchanged while the migration lands. New code should
// import from ./subgraph.ts directly.
//
// WHAT CHANGED: segmentFlow is now a thin wrapper over
// projectSubgraphs — it HONORS explicit ``compound`` parents first
// (first-class identity, survives reorder) and only falls back to the
// old consecutive-same-family grouping for flat arrays that pre-date
// the formalization. The signature + output shape are back-compat.

import * as modelCatalog from "@melite/catalog"
import type { CardStage } from "@melite/contracts"
import {
  projectSubgraphs as _project,
  segmentId as _segmentId,
  type Segment, type ProjectableStage,
} from "./subgraph"

// Re-export the shared types so existing imports (`type { ChainSegment }`)
// keep resolving. The chain segment now optionally carries the compound
// parent + mode (present iff the segment came from a real compound parent).
export type { ChainSegment, SingleSegment, Segment, ProjectableStage } from "./subgraph"

/**
 * Split the ordered stage list into segments — maximal consecutive runs of
 * predicate-true stages (length ≥ 2) become chains; everything else passes
 * through as singles. A non-matching stage BREAKS a run (runs never span
 * gaps).
 *
 * DELEGATES to subgraph.projectSubgraphs: explicit ``compound`` parents
 * (kind === "compound", mode="fanout") collapse to ONE segment each BEFORE
 * the predicate runs — their children are owned by id, not by adjacency,
 * so the group survives reorder. The predicate-based fallback is the
 * backward-compat bridge for flat arrays with no compound parent.
 */
export function segmentFlow<S extends ProjectableStage>(
  stages: S[],
  isChainStage: (stage: S) => boolean | string | null | undefined,
): Segment<S>[] {
  // GENERIC since the subgraph cut: the projection preserves the caller's
  // stage type (CardStage here), so the old `as unknown as` bridges at
  // this seam are gone.
  return _project(stages, isChainStage)
}

/** Stable dnd-kit id for a segment. Delegates to subgraph.segmentId so the
 * FIRST-CLASS compound parent id (``compound:<parentId>``) is stable across
 * reorders; the legacy view-projected id (``chain:<id1>|…``) stays the
 * composite-of-members shape the existing tests assert. */
export function segmentId(seg: Segment<ProjectableStage>): string {
  return _segmentId(seg)
}

/** The qwen-img-edit-2511 predicate — the fanout fallback for the multi-angle
 * character-edit pattern. Two sources of truth (unchanged from the original
 * implementation):
 *  • "edit_image" — the YAML brick family id (chain-loaded specs hydrate
 *    stage.service from step.family — hydrateSpecSteps).
 *  • catalog model routes whose family is "qwen-img-edit-2511" (qwen-img-edit-2511,
 *    qwen-img-edit-2511-int8/q5/q8 — the controlnet-union alias was removed
 *    2026-08-14: unloadable VideoX-Fun format) — agent/user- authored
 *    cards pick a route key, not a family id.
 * Catalog reads are best-effort: until /v1/model-catalog loads (or under a
 * test mock that doesn't provide familyOf), the route-key path degrades to
 * "not a chain stage" — the run renders as plain tiles, exactly as before. */
export function isImageEditStage(stage: CardStage): boolean {
  return condensationKey(stage) === "qwen-img-edit-2511"
}

/** The minimal stage shape condensationKey reads — ``service`` only, so the
 * chain renderers can pass a subgraph ``FlowStage`` (ChainSegment.stages
 * is typed FlowStage, which lacks CardStage's inputIndices). */
type CondensableStage = { service: string }

/** The canonical condensation key — consecutive stages sharing a key render
 * as ONE chain tile (the family-scoped legacy run; a key CHANGE breaks the
 * run). Today's condensable families:
 *   • "qwen-img-edit-2511" — the multi-angle edit pass (character_cards.yaml ×8);
 *   • "upscale"    — the Nomos upscale pass (character_cards.yaml ×9 — user
 *     directive 2026-08-13: "upscaling actions … go under the chain card
 *     like the img edit one").
 * Both stage service forms map here: the raw YAML family id ("edit_image" /
 * "upscale_image", chain-loaded bricks) and the catalog route keys
 * (familyOf → "qwen-img-edit-2511", "seedvr2_upscale", "pixel_upscale" — agent/
 * user-authored cards pick a route key, not a family id).
 * Catalog reads are best-effort: until /v1/model-catalog loads (or under a
 * test mock that doesn't provide familyOf), the route-key path degrades to
 * "not a chain stage" — the run renders as plain tiles, exactly as before. */
export function condensationKey(stage: CondensableStage): string | null {
  if (stage.service === "edit_image") return "qwen-img-edit-2511"
  if (stage.service === "upscale_image") return "upscale"
  // Probe the export through `in`, NOT a bare access: a vi.mock factory
  // that omits familyOf makes the MOCK PROXY THROW on access ("No familyOf
  // export is defined") — `in` just checks the key, no throw.
  const familyOf = "familyOf" in modelCatalog ? modelCatalog.familyOf : undefined
  if (typeof familyOf !== "function") return null
  const fam = familyOf(stage.service)
  if (fam === "qwen-img-edit-2511") return "qwen-img-edit-2511"
  // Both upscale subfamilies (diffusion SeedVR2 + pixel Nomos/APISR) are
  // ONE condensation family — a mixed upscale run still condenses.
  if (fam === "seedvr2_upscale" || fam === "pixel_upscale") return "upscale"
  return null
}
