// useInstances — phase B instances (the detect_boxes manifest) + the
// recipe-aware keep writers.
//
// Split from component.tsx (the 2870-line monolith split): the phase-B
// block (manifest fetch, selectedInstances, applyPrimaryKeep ×2,
// toggle/switch), verbatim logic. Owns the boxes state + fetch effect;
// everything else is derived from args.
import { useEffect, useMemo, useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { BoxEntry, RecipeOutput } from "./constants"

export interface InstancesOpts {
  params: Record<string, unknown>
  artifacts: Record<string, string>
  stage: CardStage
  /** The flattening editor write (recipe → []). */
  onSave: (p: Record<string, unknown>) => void
  /** The raw card write (the recipe path refines in place). */
  onSaveProp: (p: Record<string, unknown>) => void
  onRun?: () => void
}

export interface Instances {
  /** The agent's recipe, when one is authored (phase C). Memoized on the
  // param identity — the bar/badges/toggle below all read it. null = the
  // flat form (the editor's own authoring path). */
  recipeOutputs: RecipeOutput[] | null
  /** True when the recipe arms the detect producer (the flat detect_mode
   *  may still say "none" — the recipe OVERRIDES it at the brick). */
  recipeDetect: boolean
  boxesUrl: string | null
  boxes: BoxEntry[] | null
  /** Which instances the current instance_filter selects — derived from
  *  params (agent-writable), never badge-local state. */
  selectedInstances: Set<number>
  filterActive: boolean
  /** The recipe FILTER line while a filter is active: "BBox 1" / "BBox 1,3". */
  instanceLabel: string | null
  /** Badge tap = ONE gesture: write instance_filter, then re-run (the
   *  detect producer is cheap CPU — the bar refills with the filtered
   *  mask). Every-selected or none-selected writes "all" (zero drift);
   *  the empty set is unreachable — an empty mask is not a recipe. */
  /** Write the primary's instance selection — BOTH authoring forms:
   *  flat (instance_filter) and recipe (rewrite the primary entry's
   *  filter; the ride-alongs survive). All-or-none drops the filter —
   *  an absent filter IS the grammar's "all" (an empty mask is not a
   *  recipe). ONE gesture: write + re-run. */
  applyPrimaryKeep: (keep: Set<number>) => void
  /** applyPrimaryKeep WITHOUT the auto re-run — the sidebar's stage-1
  * picks write the filter; the NEXT run (play / ADD / canvas gesture)
  * applies it. The bar chips keep the one-gesture re-run. */
  applyPrimaryKeepSilent: (keep: Set<number>) => void
  /** Badge tap = TOGGLE (symmetric diff) — the canvas interaction. */
  toggleInstance: (idx: number) => void
  /** Chip tap = SWITCH — exactly this instance, one tap. The lone active
   *  chip taps back to all. This is the bar's "ability to switch"
   *  (BBox1 ↔ BBox2) — visible in the FILTER tier, no badge hunt. */
  switchInstance: (idx: number) => void
}

export function useInstances({
  params, artifacts, stage, onSave, onSaveProp, onRun,
}: InstancesOpts): Instances {
  // ── Phase B (2026-08-16): instances — the detect_boxes manifest ────────
  // The run's per-instance manifest, fetched from its artifact URL (run
  // artifacts are /editor/assets URLs — a data: URL never reaches here).
  // The numbered canvas badges + the amber overlays derive from it, and
  // instance_filter is the SAME param the agent writes ("all" |
  // "largest" | "0,2") — one vocabulary, two authors.
  // The agent's recipe, when one is authored (phase C). Memoized on the
  // param identity — the bar/badges/toggle below all read it. null = the
  // flat form (the editor's own authoring path).
  const recipeOutputs = useMemo(
  () =>
  Array.isArray(params.outputs) && params.outputs.length
  ? (params.outputs as RecipeOutput[])
  : null,
  [params.outputs],
  )
  /** True when the recipe arms the detect producer (the flat detect_mode
   *  may still say "none" — the recipe OVERRIDES it at the brick). */
  const recipeDetect = Boolean(recipeOutputs?.some((e) => e.selection?.kind === "detect"))

  const boxesUrl = artifacts.detect_boxes ?? null
  const [boxes, setBoxes] = useState<BoxEntry[] | null>(null)
  useEffect(() => {
  if (!boxesUrl || boxesUrl.startsWith("data:")) { setBoxes(null); return }
  let cancelled = false
  void fetch(boxesUrl)
  .then((r) => (r.ok ? (r.json() as Promise<{ boxes?: BoxEntry[] }>) : null))
  .then((d) => { if (!cancelled) setBoxes(d?.boxes?.length ? d.boxes : null) })
  .catch(() => { if (!cancelled) setBoxes(null) })
  return () => { cancelled = true }
  }, [boxesUrl])
  /** Which instances the current instance_filter selects — derived from
  *  params (agent-writable), never badge-local state. */
  const selectedInstances = useMemo(() => {
  const all = new Set((boxes ?? []).map((b) => b.index))
  if (all.size === 0) return all
  // Phase C: in recipe mode the PRIMARY detect entry's keep is the
  // selection — the agent authored it, the badges read it.
  if (recipeOutputs) {
  const primary = recipeOutputs.find((e) => e.selection?.kind === "detect")
  const f = primary?.filter
  if (!f || f.kind !== "instance") return all
  if (f.keep === "largest") return new Set([0])
  const raw = Array.isArray(f.keep)
  ? f.keep
  : typeof f.keep === "string"
  ? f.keep.split(",")
  : f.keep !== undefined
  ? [f.keep]
  : []
  return new Set(raw.map(Number).filter((n) => all.has(n)))
  }
  const v = params.instance_filter
  if (Array.isArray(v)) {
  return new Set(v.map(Number).filter((n) => all.has(n)))
  }
  const s = typeof v === "string" ? v.trim().toLowerCase() : ""
  if (!s || s === "all") return all
  if (s === "largest") return new Set([0])
  return new Set(
  s.split(",").map((p) => Number(p.trim())).filter((n) => all.has(n)),
  )
  }, [boxes, params.instance_filter, recipeOutputs])
  const filterActive = (boxes?.length ?? 0) > 0 && selectedInstances.size < boxes!.length
  /** The recipe FILTER line while a filter is active: "BBox 1" / "BBox 1,3". */
  const instanceLabel = filterActive
  ? `BBox ${Array.from(selectedInstances).sort((a, b) => a - b).map((i) => i + 1).join(",")}`
  : null
  const applyPrimaryKeep = (keep: Set<number>) => {
  if (!boxes) return
  const keepAll = keep.size === 0 || keep.size === boxes.length
  if (recipeOutputs) {
  const first = recipeOutputs.findIndex((e) => e.selection?.kind === "detect")
  if (first < 0) return
  const outputs = recipeOutputs.map((e, i) => {
  if (i !== first) return e
  if (keepAll) {
  const rest = { ...e }
  delete rest.filter
  return rest
  }
  return {
  ...e,
  filter: { kind: "instance", keep: Array.from(keep).sort((a, b) => a - b) },
  }
  })
  onSaveProp({ ...stage.params, outputs })
  } else {
  const value = keepAll
  ? "all"
  : Array.from(keep).sort((a, b) => a - b).join(",")
  onSave({ ...stage.params, instance_filter: value })
  }
  onRun?.()
  }

  /** Badge tap = TOGGLE (symmetric diff) — the canvas interaction. */
  const toggleInstance = (idx: number) => {
  if (!boxes) return
  const next = new Set(selectedInstances)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  applyPrimaryKeep(next)
  }

  /** Chip tap = SWITCH — exactly this instance, one tap. The lone active
   *  chip taps back to all. This is the bar's "ability to switch"
   *  (BBox1 ↔ BBox2) — visible in the FILTER tier, no badge hunt. */
  const switchInstance = (idx: number) => {
  if (!boxes) return
  if (selectedInstances.size === 1 && selectedInstances.has(idx)) {
  applyPrimaryKeep(new Set())
  return
  }
  applyPrimaryKeep(new Set([idx]))
  }

  /** applyPrimaryKeep WITHOUT the auto re-run — the sidebar's stage-1
  * picks write the filter; the NEXT run (play / ADD / canvas gesture)
  * applies it. The bar chips keep the one-gesture re-run. */
  const applyPrimaryKeepSilent = (keep: Set<number>) => {
  if (!boxes) return
  const keepAll = keep.size === 0 || keep.size === boxes.length
  if (recipeOutputs) {
  const first = recipeOutputs.findIndex((e) => e.selection?.kind === "detect")
  if (first < 0) return
  const outputs = recipeOutputs.map((e, i) => {
  if (i !== first) return e
  if (keepAll) {
  const rest = { ...e }
  delete rest.filter
  return rest
  }
  return {
  ...e,
  filter: { kind: "instance", keep: Array.from(keep).sort((a, b) => a - b) },
  }
  })
  onSaveProp({ ...stage.params, outputs })
  } else {
  const value = keepAll
  ? "all"
  : Array.from(keep).sort((a, b) => a - b).join(",")
  onSave({ ...stage.params, instance_filter: value })
  }
  }

  return {
  recipeOutputs, recipeDetect, boxesUrl, boxes, selectedInstances,
  filterActive, instanceLabel, applyPrimaryKeep, applyPrimaryKeepSilent,
  toggleInstance, switchInstance,
  }
}
