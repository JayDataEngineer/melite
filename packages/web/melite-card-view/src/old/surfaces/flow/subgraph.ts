// subgraph — the ONE first-class "card holds other cards" concept
// (2026-08-12 formalization).
//
// For months this codebase grew THREE separate ad-hoc mechanisms for the
// same idea — a card that holds other cards:
//   • modifier subcards (params arrays + a view layer),
//   • chain stages from YAML specs (flat array + filename + special path),
//   • multi-edit condensation (pure view projection, no storage).
// Each re-invented aggregate status, drag-as-block, an overlay, and a
// "what is this thing" story. Three private vocabularies, zero shared
// primitives. This module is the fix: the single reducer + single
// projection + single helpers every consumer shares. See
// docs/design/modifier-subcards.md and the StageKind "compound" docs in
// FlowTypes.ts for the rationale.
//
// WHAT LIVES HERE (the ONE source of truth):
//   • aggregateStatus(childStages) — the ONE status reducer. Today's
//     ChainCardTile inlines this; the subcard grid never computed it. Both
//     now consume it from here.
//   • isCompoundStage / compoundChildren — typed reads over the compound
//     block.
//   • projectSubgraphs — the compound-aware segment projection. Honors
//     explicit `compound` parents FIRST (first-class identity), then falls
//     back to the legacy consecutive-same-family grouping for flat arrays
//     that pre-date the formalization (backward-compat bridge so old
//     persisted flows + old agent runs still condense).
//
// WHAT DOES NOT LIVE HERE: rendering. The tile + overlay shells live in
// FlowCard.tsx; this module is pure data + types so the projection is
// trivially testable in isolation (multi-edit-group.test.ts).

import type { FlowStage, FlowStageStatus } from "@melite/contracts"
import type { CompoundMode } from "@melite/contracts"
// ── Aggregate status — the ONE reducer ─────────────────────────────────────
//
// Three render sites used to compute "how is the group doing" three
// different ways (ChainCardTile inlined it; the chain-YAML path aggregated
// differently; subcards didn't aggregate at all). One reducer, one truth.
// The inputs are the resolved CHILD stages (use compoundChildren to get
// them from a compound parent).

export interface AggregateStatus {
  total: number
  doneCount: number
  anyRunning: boolean
  anyError: boolean
  anyStale: boolean
  allDone: boolean
  /** The first child with a primary output — the cover thumbnail. null when
   * no child has produced a result yet. */
  coverUrl: string | null
  /** The first child's title — the face label (the group is named after its
   * first member; the chain/subgraph tile shows the family + chips). */
  title: string
}

/** The empty aggregate (a compound parent with zero resolved children).
 * Renders as a placeholder — never throws. */
export const EMPTY_AGGREGATE: AggregateStatus = {
  total: 0,
  doneCount: 0,
  anyRunning: false,
  anyError: false,
  anyStale: false,
  allDone: false,
  coverUrl: null,
  title: "",
}

/**
 * Compute the aggregate status of a group of child stages — the ONE
 * reducer every compound/subgraph consumer uses. Pure: same children in,
 * same AggregateStatus out. Pass the resolved child stages (NOT the
 * parent); use ``compoundChildren`` to resolve them from a parent.
 */
export function aggregateStatus(children: Array<ProjectableStage>): AggregateStatus {
  if (children.length === 0) return EMPTY_AGGREGATE
  let doneCount = 0
  let anyRunning = false
  let anyError = false
  let anyStale = false
  let coverUrl: string | null = null
  for (const s of children) {
    const st = s.status as FlowStageStatus
    if (st === "done" || st === "cached") doneCount += 1
    if (st === "running") anyRunning = true
    if (st === "error") anyError = true
    if (st === "stale") anyStale = true
    if (coverUrl === null) {
      const url = s.result?.assetUrls?.[0]
      if (typeof url === "string" && url) coverUrl = url
    }
  }
  return {
    total: children.length,
    doneCount,
    anyRunning,
    anyError,
    anyStale,
    allDone: doneCount === children.length,
    coverUrl,
    title: children[0]?.title ?? "",
  }
}

// ── Compound stage helpers ─────────────────────────────────────────────────

/** True iff ``s`` is a compound parent (the ONE container kind). */
export function isCompoundStage(s: { kind?: string; compound?: unknown }): boolean {
  return s.kind === "compound" && s.compound != null
}

/** Resolve a compound parent's children from the flat ``stages[]`` array.
 * Preserves the parent's declared ``childIds`` order; drops any id that
 * isn't found (defensive — a stale id after a deletion shouldn't crash the
 * projection). Returns ``[]`` for a non-compound stage. */
export function compoundChildren<S extends ProjectableStage>(
  parent: S,
  stages: S[],
): S[] {
  if (!isCompoundStage(parent) || !parent.compound) return []
  const byId = new Map(stages.map((s) => [s.id, s]))
  return parent.compound.childIds
    .map((id) => byId.get(id))
    .filter((s): s is S => Boolean(s))
}

/** The set of stage ids "consumed" by a compound parent (its children).
 * The projection skips these so they don't ALSO render as free tiles. */
export function consumedChildIds(stages: ProjectableStage[]): Set<string> {
  const consumed = new Set<string>()
  for (const s of stages) {
    if (isCompoundStage(s) && s.compound) {
      for (const id of s.compound.childIds) consumed.add(id)
    }
  }
  return consumed
}

// ── The compound-aware segment projection ──────────────────────────────────
//
// ONE projection, TWO grouping sources:
//   1. FIRST-CLASS: an explicit ``compound`` parent (mode="fanout") owns its
//      children by id — group identity survives reorder (the big win over
//      the old pure-view projection, which dissolved the moment a member
//      moved away from its siblings).
//   2. LEGACY FALLBACK: for flat arrays that pre-date the formalization
//      (old persisted flows, old agent runs), maximal consecutive runs
//      of predicate-true stages still condense — exactly the old
//      segmentFlow behavior. The bridge keeps old data rendering while
//      new code emits real compound parents.
//
// The output shape (ChainSegment | SingleSegment) is BACK-COMPAT with the
// old multiEditGroup.ts so every existing consumer (FlowTileGrid, the
// tests) keeps working unchanged. ChainSegment gains optional ``parent``
// and ``mode`` fields (present iff the segment came from a real compound
// parent; absent for legacy view-projected runs).

/** Minimal structural floor the projection actually reads: an id-keyed
 *  stage row that MAY declare a compound parent. Both @melite/contracts
 *  stage interfaces (FlowStage AND CardStage — near-twins that drifted
 *  apart) satisfy it, so the projection is GENERIC over the caller's stage
 *  type and the old `as unknown as` bridges at the seam die. */
export interface ProjectableStage {
  id: string
  kind?: string
  title?: string
  service?: string
  status?: string
  result?: { assetUrls?: string[] } | null
  compound?: { childIds: string[]; mode?: CompoundMode } | null
}

export interface ChainSegment<S extends ProjectableStage = FlowStage> {
  kind: "chain"
  /** The member stages in render order. (Back-compat name — the field the
   * existing tests + ChainCardTile read.) */
  stages: S[]
  /** The compound parent that owns this segment. Present iff this segment
   * came from a FIRST-CLASS compound parent (mode="fanout" / "flow" /
   * "modifiers"). Absent for the legacy view-projected fallback — those
   * runs have no parent in the data model. */
  parent?: S
  /** The compound mode, when ``parent`` is present. */
  mode?: CompoundMode
}

export interface SingleSegment<S extends ProjectableStage = FlowStage> {
  kind: "single"
  stage: S
}

export type Segment<S extends ProjectableStage = FlowStage> =
  | ChainSegment<S>
  | SingleSegment<S>

/** Stable dnd-kit id for a segment. Singles keep their stage id (so
 * existing drag contracts + tests are untouched); chains get a composite
 * id. For a FIRST-CLASS compound parent the id is ``compound:<parentId>``
 * (stable across renders AND across reorders — the parent's id doesn't
 * change when its children move). For a LEGACY view-projected run the id
 * is ``chain:<id1>|<id2>|…`` (the old shape — composite of member ids,
 * stable only while the membership + order hold). */
export function segmentId(seg: Segment<ProjectableStage>): string {
  if (seg.kind === "single") return seg.stage.id
  if (seg.parent) return `compound:${seg.parent.id}`
  return `chain:${seg.stages.map((s) => s.id).join("|")}`
}

/**
 * The legacy-fallback group function. TWO shapes, normalized inside
 * projectSubgraphs:
 *   • ``boolean`` — back-compat with the old predicate contract (e.g.
 *     isImageEditStage): true maps to ONE constant key, so maximal runs of
 *     predicate-true stages group exactly as before.
 *   • ``string | null`` — family-scoped keys (e.g. condensationKey): only
 *     consecutive stages with the SAME key condense together. A key CHANGE
 *     breaks the run — the edit pass (×8) followed by the upscale pass (×9)
 *     in character_cards.yaml is TWO chains, never one 17-member blob.
 */
export type CondenseFn = (stage: FlowStage) => boolean | string | null | undefined

/**
 * Project the flat ``stages[]`` into ordered segments. Compound parents
 * (kind === "compound") collapse to ONE chain segment each, using their
 * declared ``childIds``; their children are skipped wherever they appear
 * in the array (so a child never double-renders). Free stages run the
 * legacy key-based maximal-run grouping (backward-compat bridge).
 *
 * Pure: the input array is never mutated. Identity-preserving: the stage
 * objects in the output ARE the input objects (no clones).
 *
 * @param stages the flat flow stages array
 * @param isGroupable group function for the legacy fallback — stages that
 *   should condense with their neighbors when no explicit compound parent
 *   owns them (e.g. isImageEditStage, or condensationKey for family-scoped
 *   runs). Stages owned by a compound parent are ALWAYS grouped (the parent
 *   declares them), regardless of this function.
 */
export function projectSubgraphs<S extends ProjectableStage>(
  stages: S[],
  isGroupable: (stage: S) => boolean | string | null | undefined = () => false,
): Segment<S>[] {
  const consumed = consumedChildIds(stages)
  const segments: Segment<S>[] = []
  let run: S[] = []
  let runKey: string | null = null
  // Normalize the two predicate shapes to a single family key. Boolean
  // (back-compat): true → the constant "chain" key — any predicate-true
  // stage joins the run, identical to the old contract. String: used
  // verbatim; null/undefined = never condenses.
  const keyOf = (s: S): string | null => {
    const raw = isGroupable(s)
    if (typeof raw === "boolean") return raw ? "chain" : null
    return raw ?? null
  }
  const flushRun = () => {
    if (run.length >= 2) {
      segments.push({ kind: "chain", stages: run })
    } else {
      for (const stage of run) segments.push({ kind: "single", stage })
    }
    run = []
    runKey = null
  }
  for (const s of stages) {
    // A compound parent → ONE segment (its children, resolved by id). The
    // parent's position in the array is where the segment renders.
    if (isCompoundStage(s) && s.compound) {
      flushRun()
      const children = compoundChildren(s, stages)
      segments.push({
        kind: "chain",
        stages: children,
        parent: s,
        mode: s.compound.mode,
      })
      continue
    }
    // A child owned by a compound parent → SKIP (it renders inside its
    // parent's segment, never as a free tile).
    if (consumed.has(s.id)) continue
    // Free stage — legacy maximal-run grouping. A key CHANGE breaks the
    // run (family-scoped: edit run ends where the upscale run begins).
    const key = keyOf(s)
    if (key !== null) {
      if (run.length > 0 && runKey !== key) flushRun()
      run.push(s)
      runKey = key
    } else {
      flushRun()
      segments.push({ kind: "single", stage: s })
    }
  }
  flushRun()
  return segments
}
