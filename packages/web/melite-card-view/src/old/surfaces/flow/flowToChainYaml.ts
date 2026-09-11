// flowToChainYaml — serialize a composed FlowDoc into the chain-YAML
// steps shape POST /v1/flows/yaml/save accepts (the inverse of
// hydrateSpecSteps in flowStore.ts).
//
// THE MISSING SAVE (2026-08-10): the composed doc lived ONLY in browser
// localStorage. This serializer + the /yaml/save endpoint let the user
// persist their canvas as a named chain YAML in packages/melite-core/flows/ — runnable
// via the /v1/flows/start YAML-spec shape, reloadable as cards via
// loadFlowSpec,
// listed in the Flows sidebar on the next listChains call.
//
// MAPPING (canvas → YAML):
// stage.kind === "generation" → one YAML step (family = stage.service)
// stage.kind !== "generation" → SKIPPED (input/studio-link/body aren't
// runner families). Returned in `skipped`
// so the UI can toast an honest count.
// stage.inputs[i] (upstream id) → step.inputs (ctx keys). Each generation
// stage emits one output ctx key (out_<i>);
// a downstream wired to it declares that key
// in inputs + sets the family's input param
// (inverse-alias fold of normalizeSlotParams)
// to the same ctx key.
// scalar params (prompt, seed…) → verbatim. The slot vocabulary (image1…)
// is folded BACK to the family param name so
// the runner's signature validation accepts
// the step (validate_step_params rejects
// unknown kwargs).
//
// Data URLs / artifact URLs on slot params are DROPPED — a YAML chain wires
// symbolically (ctx keys); the bytes flow at runtime. This mirrors how a
// hand-authored YAML (motion_chain.yaml) expresses wiring.
import type { FlowDoc, FlowStage } from "@melite/contracts"
import { formAliasesFor } from "@melite/catalog"
import { formOf } from "@melite/catalog"

/** A chain-YAML step — exactly the shape POST /yaml/save accepts. */
export interface ChainYamlStep {
 family: string
 title?: string
 params: Record<string, unknown>
 inputs: string[]
 outputs: string[]
 consumes?: string[]
}

/** A stage that was skipped (not a runner family). */
export interface SkippedStage {
 title: string
 kind: string
}

/** Result of serializing a FlowDoc → chain steps. */
export interface FlowToYamlResult {
 steps: ChainYamlStep[]
 skipped: SkippedStage[]
}

/** Build the inverse alias map for a form: {slot → familyParam}.
 * normalizeSlotParams folds familyParam → slot; this inverts it so the
 * serializer emits family-signature param names (validate_step_params
 * rejects unknown kwargs). First family param wins per slot (deterministic);
 * multi-alias forms are rare and the primary input is what wiring needs. */
function inverseAliasesFor(form: string | undefined): Record<string, string> {
 const aliases = formAliasesFor(form) // {familyParam: slot}
 const inv: Record<string, string> = {}
 for (const [familyParam, slot] of Object.entries(aliases)) {
 if (familyParam === slot) continue
 if (!(slot in inv)) inv[slot] = familyParam
 }
 return inv
}

/** The set of slot-vocabulary keys for a form (what normalizeSlotParams
 * folds TO). A param key in here on the canvas is a slot; the serializer
 * renames it back to its family param. */
function slotKeysFor(form: string | undefined): Set<string> {
 return new Set(Object.keys(inverseAliasesFor(form)))
}

/**
 * Serialize a composed FlowDoc into chain-YAML steps. Pure + testable —
 * no store, no network. The POST /yaml/save handler writes the file.
 *
 * One output ctx key per generation stage (out_<i>, i = index among
 * generation stages). Wiring is preserved: a downstream's inputs reference
 * the upstream's ctx key, and the family's input param is set to that key
 * (symbolic — bytes flow at runtime through ctx).
 */
export function flowToChainSteps(doc: FlowDoc): FlowToYamlResult {
 const genStages = doc.stages.filter(
 (s): s is FlowStage => s.kind === "generation",
 )
 const skipped: SkippedStage[] = doc.stages
 .filter((s) => s.kind !== "generation")
 .map((s) => ({ title: s.title, kind: String(s.kind) }))

 // Assign one output ctx key per generation stage (deterministic ordering).
 const stageIdToCtxKey = new Map<string, string>()
 genStages.forEach((s, i) => {
 stageIdToCtxKey.set(s.id, `out_${i}`)
 })

 const steps: ChainYamlStep[] = genStages.map((s) => {
 const form = formOf(s.service)
 const inv = inverseAliasesFor(form)
 const slotKeys = slotKeysFor(form)
 const params: Record<string, unknown> = {}

 // Pass 1: copy every NON-slot param verbatim. These are scalar family
 // params (prompt, seed, width, height, loras…) — the runner accepts
 // them by signature.
 // REPRODUCIBILITY (2026-08-13): when the card's seed is the random
 // sentinel (-1 / 0) AND the stage has run (so we know the actual seed
 // that produced its output), bake the concrete seed into the saved
 // workflow. A seed=-1 card re-runs differently every time; a saved
 // workflow should reproduce byte-identical bytes. No result / no
 // actualSeed → keep the sentinel verbatim (the workflow stays random).
 const actualSeed = typeof s.result?.metadata?.actualSeed === "number"
 ? (s.result!.metadata!.actualSeed as number)
 : undefined
 for (const [k, v] of Object.entries(s.params ?? {})) {
 if (slotKeys.has(k)) continue // slot → handled via wiring below
 if (
 k === "seed" &&
 typeof v === "number" &&
 v <= 0 &&
 actualSeed !== undefined
 ) {
 params[k] = actualSeed
 continue
 }
 params[k] = v
 }

 // Pass 2: wiring. stage.inputs[i] is the upstream stage id for slot i.
 // Collect unique upstream ctx keys, declare them as the step's inputs,
 // and set the family's input param to the first (v1: one symbolic input).
 const upstreamCtxKeys = (s.inputs ?? [])
 .map((id) => (id ? stageIdToCtxKey.get(id) : null))
 .filter((k): k is string => Boolean(k))
 const uniqInputs = [...new Set(upstreamCtxKeys)]

 if (uniqInputs.length > 0) {
 // The family param name for the primary input slot (inverse fold).
 // If unknown (no alias table loaded), fall back to the FIRST slot key
 // on the params — better to emit something than silently drop wiring.
 const familyInputParam =
 Object.values(inv)[0] ?? Object.keys(s.params ?? {}).find((k) => slotKeys.has(k))
 if (familyInputParam) {
 params[familyInputParam] = uniqInputs[0]
 }
 }

 return {
 family: s.service,
 title: s.title,
 params,
 inputs: uniqInputs,
 outputs: [stageIdToCtxKey.get(s.id)!],
 }
 })

 return { steps, skipped }
}
