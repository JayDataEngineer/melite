// flowStoreHelpers — the pure helper bank of the flow store (Cut 6
// file-size pivot). Verbatim from the origin flowStore.ts: compound
// revival, ID generation, cache-key hashing, the execution backends
// (generation/chain/input), run-hydration mapping, and the missing-dependency
// closure walk. No behavior changes — only `export` prefixes added.

import { collectStageUrls, collectNamedArtifacts, type ArtifactSource, editorClient } from "@/rpc/editorClient"
import { kindDef } from "@melite/slots"
import { pollFlowRun } from "@melite/catalog"

import type { FlowRunStatus } from "@melite/catalog"
import { normalizeSlotParams, padInputs, stageSlots } from "@melite/catalog"
import { formOf, getCachedCatalog } from "@melite/catalog"
import type {
  FlowDoc,
  FlowStage,
  FlowStageStatus,
  StageResult,
  InlineFlowBody,
} from "@melite/contracts"
import type { CompoundBlock, CompoundMode } from "@melite/contracts"
import { Provenance } from "@melite/contracts"
// ── Compound block revival (2026-08-12 formalization) ─────────────────────
// A persisted flow (IndexedDB sidecar, agent-authored doc, or a run
// hydrated from a stale snapshot) may carry a ``compound`` block on a
// stage. This is the ONE first-class "card holds other cards" concept;
// the block declares the mode + ordered childIds. Revive it defensively:
// drop malformed shapes rather than crashing the whole flow load.
export function reviveCompound(raw: unknown): CompoundBlock | undefined {
 if (!raw || typeof raw !== "object") return undefined
 const obj = raw as Record<string, unknown>
 const mode = obj.mode
 if (mode !== "fanout" && mode !== "flow" && mode !== "modifiers") return undefined
 const childIds = Array.isArray(obj.childIds)
 ? obj.childIds.filter((id): id is string => typeof id === "string" && Boolean(id))
 : []
 if (childIds.length === 0) return undefined
 const block: CompoundBlock = { mode: mode as CompoundMode, childIds }
 if (typeof obj.flowName === "string" && obj.flowName) block.flowName = obj.flowName
 if (typeof obj.paramKey === "string" && obj.paramKey) block.paramKey = obj.paramKey
 return block
}

// ── ID generation ─────────────────────────────────────────────────────────
// Crypto-random IDs so concurrent flows can't collide. The "p" / "s"
// prefixes make IDs greppable in logs and React DevTools.
export function newFlowId(): string {
 return "p_" + Math.random().toString(36).slice(2, 10)
}
export function newStageId(): string {
 return "s_" + Math.random().toString(36).slice(2, 10)
}

// ── Content-hash for cache keys ───────────────────────────────────────────
// Deterministic JSON serialization with sorted keys — so {a:1,b:2} and
// {b:2,a:1} produce the same hash. Uses the SubtleCrypto API for a real
// SHA-256 (not a toy hash) — collisions are cryptographically impossible.
// Falls back to a synchronous JS hash if SubtleCrypto is unavailable (older
// Node test environments).
export async function sha256(s: string): Promise<string> {
 if (typeof crypto !== "undefined" && crypto.subtle) {
 const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
 return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16)
 }
 // Synchronous fallback (djb2) — only used in test envs without SubtleCrypto.
 // Real browsers always have crypto.subtle.
 let h = 5381
 for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
 return (h >>> 0).toString(16)
}

/** Deterministic JSON stringify — sorted keys at every object level. */
export function stableStringify(v: unknown): string {
 if (v === null || typeof v !== "object") return JSON.stringify(v)
 if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]"
 const keys = Object.keys(v as Record<string, unknown>).sort()
 return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k])).join(",") + "}"
}

/**
 * Detect a SPEC-DRIVEN NORMALIZATION: the change is purely ADDITIVE —
 * every key-value the stage already carried is preserved unchanged, and
 * the merged params only ADD keys the stage didn't have. This is what
 * ParamEditor's applySpecVocabulary does on card-open: it seeds schema-
 * declared defaults for fields the draft was missing (e.g. an ACE-Step
 * card whose catalog `defaults:` carries just {seed,duration,prompt}
 * gets the 9 remaining schema fields filled in). The backend already
 * APPLIED those same schema defaults for the absent fields, so the
 * result is still valid — persisting + marking stale would be a lie
 * ("the user changed nothing, but the card is stale"). Returns false
 * when any existing value changed or any existing key was dropped, so a
 * real edit (or a purge of dead keys) still marks stale as intended.
 */
export function isAdditiveNormalization(
 oldParams: Record<string, unknown>,
 newParams: Record<string, unknown>,
): boolean {
 for (const [k, v] of Object.entries(oldParams)) {
  if (!(k in newParams)) return false
  if (stableStringify(newParams[k]) !== stableStringify(v)) return false
 }
 return true
}

/**
 * Compute the cache key for a stage.
 *
 * cacheKey = sha256(service + stable(params) + upstreamCacheKeys)
 *
 * If ANY upstream stage's cacheKey changes (because its params changed),
 * this stage's cacheKey changes too — automatically invalidating it.
 * That's how editing card N marks cards N+1…K as stale.
 */
export async function computeCacheKey(
 service: string,
 params: Record<string, unknown>,
 upstreamKeys: (string | null)[],
): Promise<string> {
 const payload = stableStringify({
 service,
 params,
 upstream: upstreamKeys.filter((k): k is string => k !== null).sort(),
 })
 return sha256(payload)
}

// ── Execution backends ────────────────────────────────────────────────────
// Each stage kind has its own executor. They all return a StageResult.

/**
 * The run-start body for a generation stage — ONE construction for every
 * caller that starts a generation run (executeGeneration).
 */
export function buildGenerationBody(
 stage: FlowStage,
 flow: FlowDoc,
): Record<string, unknown> {
 const upstream = collectUpstreamResults(stage, flow)
 // THE ROUTE IS THE ROUTE (2026-08-13): the wire is {model: <route>,
 // ...params}, and YAML-hydrated cards carry the route AGAIN as
 // params.model (the carrier for family-id services). A stale carrier
 // silently OVERRIDES the route through the spread — the ACE-Step card
 // "switched to SFT but loaded turbo" bug: updateStageParams merged
 // params (never deleting keys), so after the variant switch
 // stage.service was "ace-step-sft" while params.model stayed
 // "ace-step", and the spread let the stale value win. The catalog
 // decides authority: when stage.service IS a catalog route it wins,
 // whatever params.model says (the backend compile guard rejects a
 // lingering mismatch — fail loud, never wrong weights). Family-id
 // services (YAML hydration: service "audio_music", route in
 // params.model) keep the carrier.
 const isCatalogRoute =
 typeof stage.service === "string" &&
 getCachedCatalog()?.models?.[stage.service] != null
 const routeModel = isCatalogRoute
 ? stage.service
 : (typeof stage.params.model === "string" ? stage.params.model : stage.service)
 return {
 ...stage.params,
 model: routeModel,
 ...upstream,
 }
}

// ── DECLARATIVE STAGE RUNNER RESOLUTION (2026-09-05) ────────────────────
//
// The kind's declared `runner` is the SSOT for which executor runs a
// stage of that kind; the stage's own `flowName` declares a named-flow
// reference. The resolver reads BOTH — no hardcoded kind-name branches.
//
// Rule (data-driven, in order):
//   1. !kindDef(kind).executable  → not runnable
//   2.  kindDef(kind).compound    → a container, never runs alone
//   3.  kindDef(kind).runner      → the kind's declared runner family
//                                   (e.g. "input")
//   4.  stage.flowName present    → the stage references a named flow
//   5.  else                      → executable card with a model:
//                                   generation runner
//
// A card-compose card (no flowName) resolves to "generation" — the
// card's model runs through the model/compose path, the QUEUE LANE
// LAW's `{model: mid}` shape. A chain-kind card with flowName resolves
// to "chain". The input kind resolves to "input" via step 3.

export type StageRunner = "generation" | "chain" | "input"

export interface StageRunnerRefusal {
 runner: null
 refusal: string
}

export interface StageRunnerResolution {
 runner: StageRunner
 refusal?: undefined
}

export function resolveStageRunner(stage: FlowStage):
  StageRunnerResolution | StageRunnerRefusal
{
 const def = kindDef(stage.kind)
 if (!def.executable) {
  return { runner: null,
   refusal: `stage "${stage.title}" is not runnable (kind=${stage.kind})` }
 }
 if (def.compound) {
  return { runner: null,
   refusal: `stage "${stage.title}" is a container (kind=${stage.kind}) and does not run on its own` }
 }
 // Kind-declared runner family (step 3) — the closed vocabulary lives
 // in python/card_kinds.py; the client mirror is the KindEntry.runner.
 // Today only "input" overrides the default; the closed set is the
 // union of the server SSOT + the resolver's switch below.
 if (def.runner === "input") return { runner: "input" }
 if (def.runner && def.runner !== "input") {
  // The kind declared a runner the resolver doesn't know — refuse
  // loudly (no silent fallback to a runner the kind didn't pick).
  return { runner: null,
   refusal: `stage "${stage.title}" declares unknown runner "${def.runner}" (kind=${stage.kind})` }
 }
 // Stage's own declaration: a named flow reference → chain runner.
 if (stage.flowName) return { runner: "chain" }
 // Default: an executable card with a model — the generation runner.
 return { runner: "generation" }
}

export async function executeGeneration(
 stage: FlowStage,
 flow: FlowDoc,
 signal: AbortSignal,
 onTick?: (status: FlowRunStatus) => void,
 onStart?: (runId: string) => void,
): Promise<StageResult> {
 // Phase C step 4: the flow protocol. POST /v1/flows/start
 // (flat shape — the ONE run-start door) compiles {model, params} into
 // a 1-step flow doc (catalog form → family mapping,
 // core/flows/compile.py) and returns run_id; we poll
 // /status/{run_id} until terminal — the SAME machinery as
 // executeChain. Upstream outputs are injected as data: URLs; the server
 // uploads them to ComfyUI before compilation, so multi-card flows
 // COMPOSE: stage 2's input_image receives stage 1's generated image,
 // the family passes it to the renderer's native LoadImage node, and the
 // chain is real data flow — not just sequential execution.
 //
 // D3 (2026-08-06): every catalog form compiles to a family — a 400
 // "no flow family mapping" / POST /v1/run (b64) fallback is dead.
 //
 // PIPE-CARRY + the 2026-08-13 route-authority rule live in
 // buildGenerationBody — the ONE construction.
 //
 const body = buildGenerationBody(stage, flow)
 const start = performance.now()
 // runGeneration = POST /v1/flows/start (raw fetch — no retry, a
 // retry would start a SECOND GPU run) + poll /status to completion. The
 // protocol collects the artifact URLs and throws on HTTP failure, run
 // error, or 10-min timeout.
 //
 // onTick → live KSampler step progress onto this card (intervalMs 700
 // for a smooth per-card progress bar, 2026-08-08).
 //
 const { runId, urls, status: finalStatus } = await editorClient.runGeneration(
 body, { signal, intervalMs: 700, onTick, onStart },
 )
 const elapsed = (performance.now() - start) / 1000
 return {
 assetUrls: urls,
 // Generation runs go through the same /status payload as chains — the
 // backend sends named_urls when the brick produced multiple outputs.
 artifacts: collectNamedArtifacts(finalStatus.stages),
 metadata: { runId, ...finalStatus, actualSeed: actualSeedFromStatus(finalStatus) },
 completedAt: Date.now(),
 durationSec: elapsed,
 }
}

export async function executeChain(
 stage: FlowStage,
 signal: AbortSignal,
 onTick?: (status: FlowRunStatus) => void,
 onStart?: (runId: string) => void,
): Promise<StageResult> {
 // Named-flow runner: POST /v1/flows/start with {flow: name} — the
 // typed door. The server executes the multi-stage graph, caching
 // each brick's artifacts server-side. We poll /status/{run_id} until
 // done. stage.params does NOT ride as overrides — the gateway drops
 // them (silent-drop class); a chain-kind stage's edits belong to the
 // flow's own declaration surface.
 if (!stage.flowName) {
 // Defense-in-depth: the compile-time guard (resolveStageRunner) now
 // resolves the chain runner ONLY when stage.flowName is present, and
 // executeStage refuses + toasts otherwise. A stage reaching this
 // point without flowName is a bug in the resolver/dispatch, not a
 // user error — surface it loudly as an internal invariant.
 throw new Error(
 `flowStoreHelpers: chain runner reached for stage "${stage.title}" ` +
 `without flowName — resolveStageRunner must ` +
 `have been bypassed (dispatch contract violation)`
 )
 }
 const start = performance.now()
 // startChain: raw-fetch POST /v1/flows/start, YAML-spec shape
 // (no retry — a retry would start a SECOND run); throws a descriptive
 // error on HTTP failure / empty body / non-JSON / missing run_id.
 const { runId } = await editorClient.startChain(stage.flowName, { signal })
 onStart?.(runId)

 // Poll until terminal. The YAML runner caches per-brick artifacts server-side.
 // onTick → live KSampler step progress onto this card (intervalMs 700
 // for a smooth per-card progress bar, 2026-08-08).
 const finalStatus = await pollFlowRun(runId, signal, { intervalMs: 700, onTick })
 const elapsed = (performance.now() - start) / 1000
 const urls = collectStageUrls(finalStatus.stages)
 return {
 assetUrls: urls,
 artifacts: collectNamedArtifacts(finalStatus.stages),
 metadata: { flowRunId: runId, ...finalStatus, actualSeed: actualSeedFromStatus(finalStatus) },
 completedAt: Date.now(),
 durationSec: elapsed,
 }
}

export async function executeInput(
 stage: FlowStage,
 flow: FlowDoc,
 signal: AbortSignal,
 onTick?: (status: FlowRunStatus) => void,
 onStart?: (runId: string) => void,
): Promise<StageResult> {
 // INPUT RUNNER (pipe-carry retirement, 2026-09-05): the input lane is
 // a weightless native MODEL (route "input", families ["input_prep"]) —
 // it runs the SAME {model} door as every card (buildGenerationBody +
 // runGeneration). The retired wire built a 1-step {family:"input"} doc
 // and posted it to the {flow:} door with the pipe/stage_id stowaways —
 // a shape the gateway never honored (load_flow stringifies the doc;
 // FLOW_ID_RE refuses it), so input runs 400'd. collectUpstreamResults
 // (below) injects upstream artifact URLs into stage.params BEFORE this
 // call — so an input card whose `source` names an upstream output
 // (via the attach UI, Phase 3c) resolves by the same data-wiring path
 // every other stage uses.
 const start = performance.now()
 const body = buildGenerationBody(stage, flow)
 const { runId, urls, status: finalStatus } = await editorClient.runGeneration(
 body, { signal, intervalMs: 700, onTick, onStart },
 )
 const elapsed = (performance.now() - start) / 1000
 return {
 assetUrls: urls,
 artifacts: collectNamedArtifacts(finalStatus.stages),
 metadata: { runId, ...finalStatus, actualSeed: actualSeedFromStatus(finalStatus) },
 completedAt: Date.now(),
 durationSec: elapsed,
 }
}

/**
 * Collect results from upstream stages into injected params.
 *
 * This is the DATA WIRING that makes multi-card flows compose. Each
 * upstream stage's first output asset URL is injected under a conventional
 * param key so the downstream /v1/flows/start compile can LoadImage it:
 *
 * - input_image — the UNIVERSAL key. Trellis, SOMAX, LTX I2V, H3 video
 * first-frame, effects, detect, upscale all consume
 * this (grep media/comfyui/builders/*.py).
 * - reference_image — SCAIL-2 character animation (video_scail2.py).
 * - end_image — video last-frame (FLF2V). Injected from the SECOND
 * upstream when a video service has 2 image inputs.
 *
 * Rules:
 * 1. We NEVER override a param the agent/user set explicitly. The escape
 * hatch stays open for special cases (e.g. the agent wires a specific
 * gallery image instead of the upstream's first output).
 * 2. Studio-link upstreams have no result (the user hasn't opened the
 * studio yet) — skipped.
 * 3. Stages still pending/error contribute nothing; runAll's sequential
 * execution guarantees upstream is done before we get here.
 */
export function collectUpstreamResults(
 stage: FlowStage,
 flow: FlowDoc,
): Record<string, unknown> {
 const injected: Record<string, unknown> = {}
 // Walk inputs as the stage's per-slot array: inputs[i] ↔ the i-th slot
 // declared by the params (stageSlots). The FIRST upstream fills slot 0,
 // the second slot 1, etc. Params-derived slots win (real cards null-seed
 // input_image/first_frame/last_frame — video-gen last_frame becomes
 // wireable for the first time); agent-written docs (build_flow
 // inputIndices) don't declare slot params, so their wires fall back to
 // the positional convention (slot 0 → input_image / reference_image for
 // scail, slot 1 → end_image) — the documented agent contract. Inputs
 // beyond the slot count are skipped (rare; the agent wires them
 // explicitly via params).
 //
 // Guard is FALSY (not `in`): cards null-seed their slots
 // (seededParams), so a null-valued slot counts as EMPTY — the wire must
 // inject. A truthy manual attachment (data:/server URL) still wins.
 const slots = stageSlots(stage.params, formOf(stage.service), stage.service)
 const positionalKey = (i: number): string | null =>
 i === 0
 ? (stage.service.includes("scail") ? "reference_image" : "input_image")
 : i === 1
 ? "end_image"
 : null
 // Indexed loop — ``i`` is the POSITION in stage.inputs (↔ slots[i] +
 // inputOutputs[i]), NOT a counter. A for…of + continue would SKIP the
 // i += 1 for empty/no-result upstreams, so a wired slot AFTER empties
 // (e.g. lanpaint_mask at slot 3 with inputs ["","","",wiredId]) would
 // land at slot 0 — the mask→lanpaint_mask regression. The index always
 // tracks position so the correspondence holds regardless of gaps.
 for (let i = 0; i < stage.inputs.length; i++) {
 const upstreamId = stage.inputs[i]
 const upstream = flow.stages.find((s) => s.id === upstreamId)
 if (!upstream?.result || upstream.result.assetUrls.length === 0) continue
 // Named output: inputOutputs[i] selects a specific artifact from the
 // upstream (mask, detection, …). Falls back to the primary (assetUrls[0])
 // when unset or the named artifact isn't present — legacy parity.
 const outputName = stage.inputOutputs?.[i] ?? null
 const namedUrl =
 outputName && upstream.result.artifacts?.[outputName]
 ? upstream.result.artifacts[outputName]
 : null
 const url = namedUrl ?? upstream.result.assetUrls[0]
 const key = slots[i] ?? positionalKey(i)
 if (key && !stage.params[key]) {
 injected[key] = url
 }
 }
 return injected
}

/**
 * The un-executed dependency closure of one stage (2026-08-15).
 *
 * "The system should be smart enough to run the dependency card if it has
 * that dependency" — a single-card Run whose upstream producers never
 * executed compiles WITHOUT its input (collectUpstreamResults has no
 * result to inject) and the boundary 400s ("requires an input image but
 * none was provided"). Walk the card's transitive ``inputs``; every
 * runnable producer that has no servable result is missing.
 *
 * Scope is the card's OWN closure — NEVER the array-wide sweep. The
 * 2026-08-11 rerun-scope rule ("an unrelated never-run card is a
 * surprise") still holds: only stages this card actually consumes run,
 * in flow order (array order = execution order). Studio-link and
 * body stages are never runnable (executeStage skips them too). A
 * visited set bounds the walk — a cyclic wire cannot loop.
 */
export function missingDependencyIds(
 stageId: string,
 flow: FlowDoc,
): string[] {
 const byId = new Map(flow.stages.map((s) => [s.id, s] as const))
 const missing = new Set<string>()
 const seen = new Set<string>()
 const walk = (id: string) => {
  if (seen.has(id)) return
  seen.add(id)
  const st = byId.get(id)
  if (!st) return
  for (const upId of st.inputs) {
   const up = byId.get(upId)
   if (!up) continue
   // Satisfied = done/cached AND a result with servable URLs — the exact
   // bar collectUpstreamResults applies when injecting. Anything less
   // contributes nothing to the target's compile, so it must run.
   const satisfied =
    (up.status === "done" || up.status === "cached") &&
    !!up.result &&
    up.result.assetUrls.length > 0
   if (!satisfied) {
    if (kindDef(up.kind).executable) missing.add(upId)
    // Its own deps matter now too — it is about to run.
    walk(upId)
   }
  }
 }
 walk(stageId)
 return flow.stages.filter((s) => missing.has(s.id)).map((s) => s.id)
}

// ── Run hydration (Library sidebar: "click a flow → it populates
// the cards") ────────────────────────────────────────────────────────────
// The run protocol's stages (runner.get_run_status) ARE the flow doc:
// {id, name, family_id, status, params, url, gallery, secs, error, outputs,
// consumes}. This adapter maps them onto the card vocabulary without any
// catalog lookup — the compile-path stages carry `model` in params (the
// SAME route a card would use), and YAML stages fall back to family_id.

/** The server stage shape we read (loose — the wire is a contract). */
export interface RunProtocolStage {
 id?: unknown
 title?: unknown
 name?: unknown
 family_id?: unknown
 /** Catalog card identity (2026-08-12) — kimodo_motion stages resolve to
 * "kimodo" server-side, so a revived run renders the premade Motion card. */
 service?: unknown
 status?: unknown
 params?: unknown
 url?: unknown
 gallery?: unknown
 secs?: unknown
 error?: unknown
 outputs?: unknown
 /** Declared artifact names this stage consumes (wire topology — the
 * hydration below maps them to owning upstream stages). Unknown[] so
 * the filter narrows; the wire is a contract we read loosely. */
 inputs?: unknown[]
 consumes?: unknown
}

/** Server run status → card status. "reused" is a cache hit with artifacts
 * (renders as cached); "skipped" didn't run (pending — re-run executes it);
 * "running" can't resume server-side from the canvas → pending. */
export function serverStatusToCard(s: string): FlowStageStatus {
 switch (s) {
 case "done": return "done"
 case "cached": return "cached"
 case "reused": return "cached"
 case "error": return "error"
 case "queued": return "queued"
 default: return "pending" // skipped / running / pending / unknown
 }
}

/** LIVE-tick mirror (2026-08-12): unlike the hydrate mapper, "running"
 * maps to "running" — the backend is REPORTING an in-flight brick, and
 * the card is a proxy for exactly that. Anything the backend doesn't
 * report → pending: the frontend never invents a status. */
export function serverStatusToLiveCard(s: string): FlowStageStatus {
 switch (s) {
 case "done":
 case "completed": return "done"
 case "cached":
 case "reused": return "cached"
 case "error":
 case "failed": return "error"
 case "running": return "running"
 case "queued": return "queued"
 default: return "pending" // pending / skipped / unknown
 }
}

/**
 * Extract the ACTUAL seed a run resolved (2026-08-13). The backend's
 * `_resolve_seed` writes the concrete positive int it drew back onto each
 * brick's params (runner progress_callback "done"), so the status payload
 * reports the seed that really ran — not the -1 "random" sentinel the card
 * was authored with. Used to bake reproducibility into saved workflows:
 * seed=-1 on the canvas → the actual seed in the YAML. Returns undefined
 * when no positive seed is present (non-generative brick / legacy run).
 */
export function actualSeedFromStatus(status: FlowRunStatus): number | undefined {
 const brick = (status.stages ?? [])[0] as
 | { params?: Record<string, unknown> }
 | undefined
 const seed = brick?.params?.seed
 return typeof seed === "number" && seed > 0 ? seed : undefined
}

/**
 * Read the resolved seed off a single brick (the chain-hydration per-stage
 * companion to actualSeedFromStatus). The runner stamps the concrete int
 * onto brick.params.seed; RunProtocolStage's generated core doesn't declare
 * `params`, so cast defensively. Returns undefined for non-generative
 * bricks / legacy runs without a positive seed.
 */
export function readSeedFromBrick(brick: RunProtocolStage): number | undefined {
 // RunProtocolStage.params is `unknown` (the wire is a contract we read
 // loosely) — narrow it structurally, no verbatim cast.
 const params = brick.params
 const seed =
   params && typeof params === "object" && "seed" in params
     ? (params as Record<string, unknown>).seed
     : undefined
 return typeof seed === "number" && seed > 0 ? seed : undefined
}

/** Narrow a loose run-protocol row (url/gallery/named_urls are `unknown`)
 *  into the catalog's ArtifactSource for the URL/artifact collectors —
 *  the typed replacement for the old `as unknown as FlowRunStage`
 *  double-casts. Non-string junk drops to undefined; the collectors
 *  already skip absent fields. */
export function asArtifactSource(row: {
  url?: unknown
  gallery?: unknown
  named_urls?: unknown
}): ArtifactSource {
 return {
   url: typeof row.url === "string" ? row.url : undefined,
   gallery: Array.isArray(row.gallery)
     ? row.gallery.filter(
         (g): g is { url: string; name?: string } =>
           !!g && typeof g === "object" && typeof (g as { url?: unknown }).url === "string",
       )
     : undefined,
   named_urls:
     row.named_urls && typeof row.named_urls === "object" && !Array.isArray(row.named_urls)
       ? Object.fromEntries(
           Object.entries(row.named_urls as Record<string, unknown>).filter(
             (entry): entry is [string, string] => typeof entry[1] === "string" && !!entry[1],
           ),
         )
       : undefined,
 }
}

/** Materialize flow stages from a run status — results attached for
 * done/cached stages, inputs wired via the run's declared inputs→outputs
 * topology (input name → the stage that declares it as an output).
 * Pure + testable.
 *
 * WIRING SOURCE (2026-08-08): the data flow is `inputs`/`outputs` — the
 * declared artifact names (a step's `inputs: [depth, pose]` reference
 * upstream `outputs: [depth, ...]`). `consumes` is SHARED-CONFIG wiring
 * (comfy_url, controlnets — the parser enforces consumes ⊆ shared), so
 * wiring from consumes produced EMPTY slot wires for every chain run —
 * revives came back as disconnected family cards instead of the authored
 * flow. */
export function hydrateRunStages(raw: RunProtocolStage[], status: FlowRunStatus): FlowStage[] {
 // Output name → owning stage id (inputs reference output NAMES).
 const outputOwner = new Map<string, string>()
 const stages: FlowStage[] = raw.map((r): FlowStage => {
 const id = newStageId()
 const rawParams = r.params && typeof r.params === "object"
 ? (r.params as Record<string, unknown>)
 : {}
 const route = String(rawParams.model ?? r.family_id ?? r.name ?? "")
 // Form-aware fold (2026-08-09): the revived run's model route resolves
 // its form, so an edit card's input_artifact folds onto image1 — NOT
 // the global input_image phantom square.
 const params = normalizeSlotParams(rawParams, formOf(route), route)
 // CARD IDENTITY: prefer the server-resolved service (describe + status
 // channels both carry it now); fall back to the model route / family id.
 const service = String(r.service ?? params.model ?? route)
 const title = String(r.title ?? r.name ?? r.family_id ?? id)
 // Watchdog (2026-08-10 "infinite loading" fix): a STORED protocol can
 // never hold a live run — the poll only exists in-session. "running"
 // on disk = a run that died mid-flight (server restart / DEV_MODE
 // reload) and would otherwise hydrate into an eternal loading overlay
 // (pollFlowRun throws on the dead run's 404, but nothing polls a
 // hydrated stage). Demote to pending — the card loads interactive and
 // re-runs cleanly.
 const rawSt = serverStatusToCard(String(r.status ?? "pending"))
 const st = rawSt === "running" ? "pending" : rawSt
 const outputs = Array.isArray(r.outputs) ? r.outputs.filter((o): o is string => typeof o === "string") : []
 for (const out of outputs) {
 if (!outputOwner.has(out)) outputOwner.set(out, id)
 }
 const hasArtifacts = Boolean(r.url) || (Array.isArray(r.gallery) && r.gallery.length > 0)
 const hasResult = (st === "done" || st === "cached") && hasArtifacts
 return {
 id,
 title,
 kind: "generation",
 service,
 params,
 inputs: [],
 result: hasResult
 ? {
 assetUrls: collectStageUrls([asArtifactSource(r)]),
 artifacts: collectNamedArtifacts([asArtifactSource(r)]),
 metadata: { runId: String(status.run_id ?? ""), stageId: String(r.id ?? "") },
 completedAt: Date.now(),
 durationSec: Number(r.secs ?? 0),
 }
 : null,
 status: st,
 error: st === "error" ? (typeof r.error === "string" && r.error ? r.error : "Stage failed") : null,
 cacheKey: null,
 // Hydrated from a past run — not authored in this session.
 provenance: Provenance.imported,
 }
 })
 // Wire inputs via the run's declared topology: a stage's inputs are
 // artifact names owned by upstream stages' outputs. consumes is shared
 // config, NOT data flow — see the header comment.
 raw.forEach((r, i) => {
 const inputs = Array.isArray(r.inputs)
 ? r.inputs.filter((c): c is string => typeof c === "string")
 : []
 const wired = inputs.map((c) => outputOwner.get(c)).filter((id): id is string => Boolean(id))
 stages[i].inputs = padInputs(wired, stageSlots(stages[i].params, formOf(stages[i].service), stages[i].service))
 })
 return stages
}

/**
 * Overlay the doc's CURRENT card params onto the compiled inline body,
 * per stage id (build_flow writes BOTH shapes with the same ids — the
 * join key). This is the no-silent-drops seam of the typed run: a user
 * edit in the card drilldown (or a refine_draft PATCH) must reach the
 * {flow_inline} POST, or the typed run would execute the compose-time
 * params and silently drop the edit.
 *
 * Drift is LOUD both directions: a body stage with no card, or a card
 * with no body stage, means the doc and the compiled flow disagree —
 * re-compose with build_flow. Never a partial run.
 */
export function syncInlineFlow(doc: FlowDoc): InlineFlowBody {
 const body = doc.inlineFlow
 if (!body) {
 throw new Error(
 `flow "${doc.intent}" has no compiled flow body — re-compose it with build_flow`,
 )
 }
 const byId = new Map(doc.stages.map((s) => [s.id, s]))
 const bodyIds = new Set(body.stages.map((s) => s.id))
 const missing = doc.stages
 .filter((s) => s.kind === "generation" && !bodyIds.has(s.id))
 .map((s) => s.id)
 if (missing.length > 0) {
 throw new Error(
 `inline flow "${body.id}" is missing stage(s) ${missing.join(", ")} — `
 + `the draft and the compiled body drifted; re-compose with build_flow`,
 )
 }
 return {
 ...body,
 stages: body.stages.map((fs) => {
 const card = byId.get(fs.id)
 if (!card) {
 throw new Error(
 `inline flow "${body.id}" stage "${fs.id}" has no card — `
 + `the draft and the compiled body drifted; re-compose with build_flow`,
 )
 }
 return { ...fs, params: { ...fs.params, ...card.params } }
 }),
 }
}
