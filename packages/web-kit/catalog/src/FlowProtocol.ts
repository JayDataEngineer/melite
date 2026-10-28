// flowProtocol — the ONE generation protocol (Phase C + ONE surface).
//
// POST /v1/flows/start compiles {model, params} → a 1-step flow
// document (catalog form → family mapping) and
// returns {run_id}. The run executes on the server; we poll
// GET /v1/flows/status/{run_id} until terminal, then collect artifact
// URLs from stage.url + stage.gallery[].url.
//
// The flat shape is ONE of four shapes the canonical route dispatches on
// (doc / flat / YAML-spec / auto-routed). /v1/flows/generate and
// /v1/run live on for one release as aliases of the same handler; this
// module posts to the canonical door. Unprovisioned models short-circuit

// before compiling).
//
// The START POST uses raw fetch (NOT apiFetch) — a 504 retry would start a
// SECOND GPU run. The status poll is an idempotent GET, so it goes through
// apiFetch (retry + dedup + liveness).
import { apiFetch } from "./api.ts"
import type { RunStageWire, RunStatusWire } from "./wireTypes.ts"
import type { StageResult } from "@melite/contracts"
import {
  RunStatusContractError,
  hasViolationsSignature,
  validateRunStatusContract,
} from "./runStatusContract.ts"
import { useRunStatusContractStore } from "./runStatusContractStore.ts"
import { sleep } from "./sleep.ts"

/**
 * Extract the backend's error message from a non-2xx body for surfacing.
 *
 * Our backend always answers errors as `{"error": "..."}` — the string
 * carries REAL newlines once parsed (the wire JSON escapes them), which is
 * exactly what a multi-line flow doc parse error / validation report
 * looks like in the drilldown modal. When the body isn't JSON, or has no
 * string `error` field (proxy error page, unexpected shape), the raw text
 * is returned unchanged.
 *
 * 2026-08-10: the error path used to `slice(0, 200)` the body, which cut
 * "Validation failed: N violation(s)" reports mid-sentence — the full
 * error is now surfaced unmodified (user: "full errors in the modals").
 */
export function describeErrorBody(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: unknown }
    if (typeof parsed?.error === "string") return parsed.error
  } catch {
    // not JSON — fall through to the raw text
  }
  return text
}

/** Non-JSON fallback cap: a non-JSON body is a proxy error page or an
 *  unexpected shape, not our error report — showing its start is enough. */
const NON_JSON_BODY_CAP = 2000

/** One wire stage — the RunStageWire CONTRACT CORE in ./wireTypes.ts (id/name/index/status, REQUIRED — declared there, never hand-written). */
/** Plus the view extras the runner tolerates beyond the core and the poll consumes (url / gallery / named_urls / progress / activity). */
/** The core is inherited from the wire type; the extras are documented view fields — a stage from the wire always carries the core, by contract. */
/** A type-alias intersection (NOT an interface): the wire components are intersection aliases, which interfaces cannot extend (TS2499). */
export type FlowRunStage = RunStageWire & {
  url?: string
  gallery?: Array<{ url: string; name?: string }>
  /** name → wireable URL for EVERY artifact the brick produced (Phase 5,
   *  named outputs). Populated by the backend from BrickResult.artifacts;
   *  absent on legacy runs → collectNamedArtifacts returns {}. */
  named_urls?: Record<string, string>
  /** Live KSampler step progress — {value, max, node} while this brick is
   *  sampling (status === "running"), null/absent otherwise. Surfaced from
   *  ComfyUI's WebSocket by the backend's step-progress sink (2026-08-08).
   *  Drives the per-card progress bar built into the cards. */
  progress?: { value: number; max: number; node?: string } | null
  /** Live WS activity (2026-08-10) — one line per consumed ComfyUI frame:
   *  {phase: "queued"|"loading"|"executing"|"sampling"|"output"|"done"|
   *  "waiting"|"error", node, node_class, message, ...} while this brick
   *  is running, null/absent otherwise. Model loads, sampling, previews,
   *  and failure messages — the protocol sink's envelope mapped to the
   *  card's activity line. */
  activity?: {
    phase: string
    node?: string
    node_class?: string
    message?: string
    [k: string]: unknown
  } | null
}

/** The status channel's contract core comes from the backend schema
 *  (RunStatusWire: run_id, the 7-value run-level
 *  status, stages) — generated, never hand-written. The view layer
 *  consumes a few documented extras the runner tolerates beyond the core:
 *  the run-level `error` detail, and the richer stage view.
 *
 *  DO NOT switch this back to Omit<RunStatusWire, "stages">: the generated
 *  component is an intersection WITH an index signature ([key: string]:
 *  unknown), so Omit's mapped type degenerates every property to unknown
 *  (keyof includes `string`). Pick with literal keys avoids the poison —
 *  indexed access on the intersection still resolves status to the 7-union. */
export type FlowRunStatus = Pick<
  RunStatusWire,
  "run_id" | "status"
> & {
  stages?: Array<FlowRunStage>
  /** Run-level failure detail — emitted by the runner on failed runs;
   *  not part of the contract core (declared here as a view extra). */
  error?: string
  /** The run's console tail — served when the status door is asked
   *  ?include_log=true (2026-09-06, the studio console drilldown):
   *  run status + queue position, one line per stage (name: status,
   *  live progress/activity), stage errors verbatim, artifact
   *  basenames. Synthesized from real runner/sidecar state — never a
   *  fabricated log. */
  log_tail?: string
  [k: string]: unknown
}

/** The minimal artifact-carrying shape the collectors read. Satisfied by
 *  FlowRunStage AND by the editor's loose run-protocol rows (whose
 *  url/gallery/named_urls are `unknown`) once narrowed through
 *  asArtifactSource — the collectors take the SOURCE, callers stop
 *  double-casting their rows into the strict wire type. */
export type ArtifactSource = {
  url?: string
  gallery?: Array<{ url: string; name?: string }>
  named_urls?: Record<string, string>
}

/** Collect every artifact URL from a run status (stage.url + gallery).
 *  The FLAT list — preserves the legacy wire-by-position behavior (the
 *  primary output is always [0]). Use collectNamedArtifacts when the wire
 *  needs to address a specific named output (mask, detection, …). */
export function collectStageUrls(stages?: Array<ArtifactSource>): string[] {
  const urls: string[] = []
  if (Array.isArray(stages)) {
    for (const s of stages) {
      if (s.url) urls.push(s.url)
      if (Array.isArray(s.gallery)) {
        // Guarded: a gallery item with a non-string url would land undefined
        // in assetUrls and crash every consumer (u.endsWith — motion card
        // 2026-08-10). Skip, never push.
        for (const g of s.gallery) {
          if (g && typeof g.url === "string") urls.push(g.url)
        }
      }
    }
  }
  return urls
}

/** Revived/stashed docs are untrusted (written by any client or session):
 *  artifacts + assetUrls must be STRING-only, or every consumer crashes
 *  (u.endsWith on undefined — motion card 2026-08-10). Filter instead of
 *  casting verbatim; callers still hard-error on structural doc junk.
 *  Missing numeric fields default so downstream guards (assetUrls.length)
 *  behave — never a null result while the result object is present. */
export function sanitizeRevivedResult(raw: unknown): StageResult | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const assetUrls = Array.isArray(r.assetUrls)
    ? r.assetUrls.filter((u): u is string => typeof u === "string" && !!u)
    : []
  const artifacts: Record<string, string> = {}
  if (r.artifacts && typeof r.artifacts === "object" && !Array.isArray(r.artifacts)) {
    for (const [k, v] of Object.entries(r.artifacts as Record<string, unknown>)) {
      if (typeof v === "string" && v) artifacts[k] = v
    }
  }
  return {
    assetUrls,
    artifacts,
    metadata: r.metadata && typeof r.metadata === "object"
      ? (r.metadata as Record<string, unknown>)
      : {},
    completedAt: typeof r.completedAt === "number" ? r.completedAt : Date.now(),
    durationSec: typeof r.durationSec === "number" ? r.durationSec : 0,
  }
}

/** Collect named artifacts from a run status → {name: URL}. The NAMED map
 *  — lets a downstream slot wire a SPECIFIC output (mask → input_mask)
 *  rather than only the primary (assetUrls[0]). Falls back to {} when the
 *  backend didn't send named_urls (legacy runs / single-output bricks). */
export function collectNamedArtifacts(stages?: Array<ArtifactSource>): Record<string, string> {
  const out: Record<string, string> = {}
  if (Array.isArray(stages)) {
    for (const s of stages) {
      if (s.named_urls && typeof s.named_urls === "object") {
        for (const [name, url] of Object.entries(s.named_urls)) {
          if (typeof url === "string" && url) out[name] = url
        }
      }
    }
  }
  return out
}

/**
 * Poll a flow run until terminal. Throws on error/timeout/abort.
 *
 * Terminal statuses: "completed"/"done" → success; "error"/"failed" →
 * throws with the run-level error message.
 *
 * `onTick(status)` fires after every successful poll — used by the store
 * to hydrate live KSampler step progress onto the running card BEFORE the
 * run goes terminal (so the per-card progress bar animates during the
 * run, 2026-08-08). Not fired on the terminal tick (the final status is
 * the return value).
 */
export async function pollFlowRun(
  runId: string,
  signal?: AbortSignal,
  opts?: { maxWaitMs?: number; intervalMs?: number; onTick?: (status: FlowRunStatus) => void },
): Promise<FlowRunStatus> {
  // 60 min ceiling. The backend ALWAYS returns a terminal run-level status
  // ("completed" or "failed") when the brick finishes, so this is purely a
  // safety net for a wedged run — it must NOT race the backend's own brick
  // ceiling (video_generate submit_and_fetch_video, 2400s). The old 10-min
  // value killed Wan/LTX video runs that were still rendering happily on
  // the GPU ("timed out at 900 seconds"). Bumped 2026-08-09.
  const maxWaitMs = opts?.maxWaitMs ?? 60 * 60 * 1000 // 60 min ceiling
  const intervalMs = opts?.intervalMs ?? 2000
  const started = performance.now()
  while (performance.now() - started < maxWaitMs) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    const resp = await apiFetch(`/v1/flows/status/${runId}`, { signal })
    if (!resp.ok) {
      // 404 = the run vanished server-side (server restart / crash /
      // DEV_MODE reload killed it mid-flight). Polling on for the rest of
      // the ceiling would be an hour-long fake "running" spinner — the
      // exact "infinite loading" the mask studio kept showing (2026-08-10).
      // Surface the truth; runStage's catch flips the card to error.
      if (resp.status === 404) {
        throw new Error(
          `Flow run ${runId} is gone — the server restarted mid-run. Re-run this card.`,
        )
      }
      // A non-ok body carrying a `violations` array is the status-channel CONTRACT 500 (the refusal ./runStatusContract.ts validates).
      // The server is lying to the poll.
      // Fail VISIBLY — polling on would be a silent fake "running" for the rest of the ceiling.
      let errorBody: unknown = null
      try { errorBody = await resp.json() } catch { errorBody = null }
      if (hasViolationsSignature(errorBody)) {
        const violations = (errorBody as { violations: Array<{ field: string; kind: string; message: string }> }).violations
        useRunStatusContractStore.getState().reportViolation(runId, violations)
        throw new RunStatusContractError(runId, violations)
      }
      // 5xx / gateway blips keep polling: a transient restart during a
      // long video render (2400s bricks) must not kill a healthy run.
      // The sleep takes the loop's signal (audit R-S1, 2026-10-22):
      // a cancel issued just after a tick used to eat the full
      // interval before the loop-top check noticed.
      await sleep(intervalMs, signal)
      continue
    }
    const data = (await resp.json()) as FlowRunStatus
    // ── THE CONTRACT (2026-08-11) ── the status core is checked BEFORE it
    // drives any UI: run_id + the run-level status vocabulary + stages with
    // id/name/index/status. A 200 body failing the core is a backend bug —
    // fail the card VISIBLY (the caller's catch flips it to error), never a
    // silent fake "running" for the rest of the ceiling.
    const { valid, violations } = validateRunStatusContract(data)
    if (!valid) {
      useRunStatusContractStore.getState().reportViolation(runId, violations)
      throw new RunStatusContractError(runId, violations)
    }
    // Terminal branch — the RUN-LEVEL vocabulary only. ("done"/"error"
    // are STAGE values; the contract above rejects them at run level, so
    // comparing against them here would be dead code — run-level success
    // is "completed", run-level failure is "failed".)
    if (data.status === "completed") return data
    if (data.status === "failed") {
      const detail = data.error
      throw new Error(`Flow run ${runId} failed${detail ? `: ${detail}` : ""}`)
    }
    // Non-terminal tick — surface live progress (KSampler steps) to the
    // store before sleeping for the next poll.
    // A throwing onTick must not orphan the LIVE run (audit R-S3,
    // 2026-10-22): the poll keeps going — the run is real and burning
    // GPU whether or not the UI callback survived. The throw is logged
    // loud, never swallowed silently.
    try {
      opts?.onTick?.(data)
    } catch (err) {
      console.error("[flow-protocol] onTick callback failed (poll continues):", err)
    }
    await sleep(intervalMs, signal)
  }
  throw new Error(
    `Flow run ${runId} timed out after ${Math.round(maxWaitMs / 60_000)} min`,
  )
}

export type CompiledGenerationResult =
  | { kind: "started"; runId: string; status: FlowRunStatus; urls: string[] }



/**
 * Start a compiled generation and poll it to completion.
 *
 * POSTs {model, ...params} to /v1/flows/start — the canonical run-start
 * door, flat shape (raw fetch — no retry, a retry would duplicate GPU
 * work), then polls /status. CARD BIRTH LAW (operator order
 * 2026-09-06): the card is composed FIRST (POST /v1/flows/drafts —
 * ensureDraftId, ./cardBirth) and the minted draft_id rides the
 * envelope to validate + start; the door 4xxes a start without one. Returns:
 *   - started: run completed — urls are the artifact URLs
 *
 * D3 (2026-08-06): every catalog form compiles to a family
 * (_FORM_CONFIGS), so the "uncompilable" 400 fallback to
 * POST /v1/run (base64) is dead — an uncompilable form now throws here.
 *
 * Throws on any other failure (HTTP error, malformed response, run error).
 */
/** The required-empty resolver seam: (model, body) → required field
 * names visible under the body's current values, or null when unknown.
 * Pushed by the app layer (lib/specContractStore registers at import) —
 * the package never imports app code (no cycle), the app owns the specs. */
export type RequiredEmptyResolver = (
  model: string,
  values: Record<string, unknown>,
) => readonly string[] | null

let _requiredEmptyResolver: RequiredEmptyResolver | null = null

/** Register (or clear) the required-empty resolver. */
export function setRequiredEmptyResolver(
  fn: RequiredEmptyResolver | null,
): void {
  _requiredEmptyResolver = fn
}

/**
 * HARD VALIDATION: no silent parameter drops in the generate request body.
 *
 * JSON.stringify silently drops `undefined` values — `{a: 1, b: undefined}`
 * serializes to `{"a":1}` with ZERO error. This is the TypeScript version
 * of the Python `**kwargs` absorb pattern: a field that was set in the form
 * state, survived into the body object, but vanishes on the wire with no
 * error, no warning. The backend receives defaults and the user sees
 * degraded output they can't diagnose.
 *
 * This function is called before EVERY GPU-starting fetch (generate,
 * startChain — the run doors) —
 * it is the universal gate. It catches:
 *   - `undefined` values (silently dropped by JSON.stringify)
 *   - `NaN` / `Infinity` (serialized as `null` — a value mutation)
 *   - `function` / `symbol` / `bigint` values (dropped or thrown by JSON)
 *   - empty string for known-critical fields (prompt, model)
 *
 * SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE EVER.
 *
 * @param body the request body about to be JSON.stringify'd and POST'd
 * @throws Error listing every field that would be silently dropped or mutated
 */
export function assertNoParamDrops(body: Record<string, unknown>): void {
  const dropped: string[] = []
  const mutated: string[] = []
  for (const [key, val] of Object.entries(body)) {
    if (val === undefined) {
      dropped.push(key)
    } else if (typeof val === "number" && !Number.isFinite(val)) {
      mutated.push(`${key} (NaN/Infinity → JSON serializes as null)`)
    } else if (typeof val === "function" || typeof val === "symbol") {
      dropped.push(`${key} (${typeof val} value — JSON.stringify drops it)`)
    } else if (typeof val === "bigint") {
      mutated.push(`${key} (bigint → JSON.stringify throws)`)
    }
  }
  // REQUIRED-EMPTY (2026-08-21, the seam flip): a model whose SERVED
  // form-spec declares a field `required: true` must not POST an empty
  // string for it. The truth is PLUGIN DATA (cards/*/form_*.yaml) served
  // through /v1/form-spec — core knows ZERO model ids (the hardcoded
  // audio set died with this change: "audio anything" is the plugin's
  // declaration, not core's). The app layer pushes the resolver in
  // (setRequiredEmptyResolver — the spec-contract store owns the specs);
  // a null resolver or a missing record simply skips the check and the
  // backend's own semantic 400 stands, the same tolerance the old set
  // had for unlisted models.
  if (typeof body.model === "string" && _requiredEmptyResolver) {
    const fields = _requiredEmptyResolver(body.model, body)
    for (const field of fields ?? []) {
      const v = (body as Record<string, unknown>)[field]
      if (typeof v === "string" && v.trim() === "") {
        throw new Error(
          `'${field}' is empty for '${body.model}' — the model's form ` +
            `declares it required (the engine has no conditioning signal ` +
            `without it). Type it before running. (Backend semantic ` +
            `validator would 400 this same run.)`,
        )
      }
    }
  }
  if (dropped.length > 0 || mutated.length > 0) {
    const parts = [
      dropped.length > 0 ? `DROPPED: [${dropped.join(", ")}]` : "",
      mutated.length > 0 ? `MUTATED: [${mutated.join(", ")}]` : "",
    ].filter(Boolean)
    throw new Error(
      `SILENT PARAMETER DROP DETECTED in generate request body — ${parts.join("; ")}. ` +
        `JSON.stringify would silently lose or mutate these values on the wire. ` +
        `SILENT PARAMETER DROPS ARE UNACCEPTABLE. Fix the caller to omit or set these fields explicitly.`,
    )
  }
}

/** Append the door's 400 violation envelope ({violations: [{field,
 * message}]}) as one line per violation — a bare headline would silently
 * DROP the dotted paths (the whole point of a refusal is seeing WHICH
 * param failed). ONE construction, both run doors (compile + start). */
function violationLines(text: string): string {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (Array.isArray(parsed.violations)) {
      const lines = (parsed.violations as Array<Record<string, unknown>>)
        .map((v) => `${String(v.field ?? "?")}: ${String(v.message ?? "")}`)
        .filter((line) => !line.endsWith(": "))
      if (lines.length > 0) return `\n${lines.join("\n")}`
    }
  } catch {
    /* non-JSON body — describeErrorBody already carries it */
  }
  return ""
}

export async function runCompiledGeneration(
  body: Record<string, unknown>,
  signal?: AbortSignal,
  opts?: {
    intervalMs?: number
    /** Fires with the run_id immediately after the start response (before the
     * first status poll) — lets callers correlate the run (e.g. cancel). */
    onStart?: (runId: string) => void
    onTick?: (status: FlowRunStatus) => void
  },
): Promise<CompiledGenerationResult> {
  // ── Fossil lora migration at the SEND boundary (2026-09-06) ────────
  // A pre-flip bag may still carry `{name, strength}` rows (client
  // state that predates the id flip). They leave as id rows — the
  // compile door refuses the fossil key loudly; migrating here heals
  // the card on the next click without operator action.
  if (Array.isArray(body.loras)) {
    const { normalizeLoraEntry } = await import("@melite/contracts")
    type Wire = Parameters<typeof normalizeLoraEntry>[0]
    body = { ...body, loras: (body.loras as unknown[]).map((e) =>
      (e && typeof e === "object") ? normalizeLoraEntry(e as Wire) : e) }
  }
  assertNoParamDrops(body)
  // ── Family-param contract gate (2026-08-14) ─────────────────────────
  // Validate params against the family's param schema BEFORE the fetch —
  // catches type mismatches (the motion_constraints object bug) + unknown
  // fields at click time, not after a round-trip. Resolves model→family via
  // the cached catalog, fetches+caches the per-family schema. No-ops when
  // the family/schema can't be resolved (the backend's HARD wire gate is
  // the backstop — a bad shape 400s at the POST regardless).
  // The gate returns THE TYPED RUN BODY (2026-09-05 compile-time
  // incident) — the POSTs below send it, never the raw draft. A gate
  // that passes but ships the untyped original is false confidence.
  let typedBody: Record<string, unknown> = body
  if (typeof body.model === "string") {
    const { assertParamsMatchFamilySchema } = await import("./familyParamContract.ts")
    // Strip the envelope field the backend also strips (model) — it is
    // not a family param and would false-positive as "unknown
    // parameter" against additionalProperties: false. debug_id passes
    // through (declared family vocabulary in some families). (The
    // 2026-08-10 pipe/stage_id stowaways died with the pipe-carry —
    // the senders no longer emit them; the gateway refuses them.)
    const paramOnly: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (k === "model") continue
      paramOnly[k] = v
    }
    const typedParams = await assertParamsMatchFamilySchema(body.model, paramOnly)
    // The typed body is EXACTLY {model} + the coerced params — never a
    // spread-merge with the raw body (2026-09-06 frontend-impossible
    // incident: coerce OMITS null/UNSET-"" for defaulted fields, and a
    // {...body, ...typed} merge would resurrect the raw ""/null under
    // the omitted keys — the click passes, the compile 400s).
    // typedParams already carries every non-stripped key (unknown and
    // transport keys pass through untouched), so nothing is lost. The
    // route stays authoritative last (the route-authority rule: a stale
    // params.model carrier never overrides the resolved route).
    typedBody = { ...typedParams, model: body.model }
    // CARD BIRTH LAW (operator order 2026-09-06): the start door
    // 4xxes any body without a valid draft_id, so the card is born
    // FIRST — stamped from the TYPED body (what runs, not the raw
    // draft) — and the same envelope rides validate + start. Paste
    // after the coerce: an early stamp would leak into paramOnly
    // above and false-positive as "unknown parameter".
    const { ensureDraftId } = await import("./cardBirth.ts")
    typedBody.draft_id = await ensureDraftId(typedBody, signal)
    // COMPILE FIRST (pipe-carry retirement, 2026-09-05): the card body
    // compiles at POST /v1/flows/validate BEFORE any run registers —
    // the SAME phase-1 chain a start runs (strict body, artifact
    // sweep, card requires, frozen card row), verbatim refusals, no
    // queue slot, no GPU claim, no sidecar. A refusal throws HERE and
    // no run is attempted ("caught compile time, not inference time").
    const compileRes = await fetch("/v1/flows/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typedBody),
      signal,
    })
    if (!compileRes.ok) {
      const text = await compileRes.text()
      throw new Error(
        `card failed to compile: HTTP ${compileRes.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`,
      )
    }
  }
  // CARD BIRTH LAW (operator order 2026-09-06): non-model starts
  // (named {flow}, inline bodies) ride the same envelope rule — the
  // start door 4xxes a start without a doc-backed draft_id.
  if (typeof typedBody.draft_id !== "string" || typedBody.draft_id === "") {
    const { ensureDraftId } = await import("./cardBirth.ts")
    typedBody.draft_id = await ensureDraftId(typedBody, signal)
  }
  const res = await fetch("/v1/flows/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(typedBody),
    signal,
  })
  const text = await res.text()
  if (res.ok) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(
        `generate failed: /v1/flows/start returned non-JSON body: ${text.slice(0, NON_JSON_BODY_CAP)}`,
      )
    }
    const runId = data.run_id
    if (typeof runId !== "string") {
      throw new Error(
        `generate failed: /v1/flows/start returned no run_id: ${describeErrorBody(text)}`,
      )
    }
    // Same law as onTick (audit R-S3): the run EXISTS now — runId is
    // in hand and the GPU is working. A throwing onStart must not
    // abandon it; the caller still receives {kind:"started", runId}.
    try {
      opts?.onStart?.(runId)
    } catch (err) {
      console.error("[flow-protocol] onStart callback failed (run continues):", err)
    }
    const status = await pollFlowRun(runId, signal, {
      intervalMs: opts?.intervalMs,
      onTick: opts?.onTick,
    })
    return { kind: "started", runId, status, urls: collectStageUrls(status.stages) }
  }
  // Violation detail (Phase C, 2026-08-14 — one construction, both
  // doors): the door's 400 envelopes carry the exact dotted paths
  // ({violations: [{field, message}]}) — appended as lines by the
  // violationLines helper above.
  throw new Error(
    `generate failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`,
  )
}
