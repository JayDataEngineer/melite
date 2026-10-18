/**
 * @melite/harness-tools/doors — the HOST ROUTE plane of the melite
 * tool package (split 2026-09-10: "Fix the gap, I need this to
 * function like a server that accepts jobs and lumps them in the
 * queue").
 *
 * WHY THE SPLIT: cordis injects are ALL required — the runtime has no
 * optional-service marker (Inject.resolve normalizes every declared
 * name to a hard wait). The estate/sdk compositions boot with NO
 * webServer service, so a plugin that injects webServer can never
 * activate there — which left the TOOL plane (profile-agnostic, the
 * run doors melite_flow / run_status) hostage to a web-only service.
 * The two planes now live as two loader entries from one package:
 *
 *   infer-tools        src/index.ts   inject ['tools']          — every
 *                      profile, headless included.
 *   infer-tools-doors  src/doors.ts   inject ['webServer','llm',
 *                      'tools'] — web profiles only (the editor ✦
 *                      buttons' same-origin doors); the estate patch
 *                      disables the row.
 *
 * The code is the door block of index.ts verbatim (2026-09-05 restore
 * + 2026-09-06 route law): /melite-tools/catalog serves the LIVE tool
 * schema + llm route list; /melite-tools/enhance is the ✦ Enhance
 * door (one-shot + agent-sweep forms). One execution core,
 * llm-complete.ts, shared with everything else.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { LlmStreamSeam } from './llm-complete.ts'
import { contentTypeForArtifact, segmentConfined } from '@melite/contracts/mediaKinds'
import { harnessEnhance, resolveHarnessRoutes, routeName } from './llm-complete.ts'
import { agenticSweep } from './enhance-agent.ts'
import {
  formSpecArm,
  formsArm,
  kindsDoorArm,
  modelCatalogArm,
  cardToolsArm,
} from './discovery.ts'
import { makeEstateRequest, seatFamilyForPath, type EstateMethod } from './estate.ts'
// The protocol refusal discrimination (the false-death fix,
// 2026-10-08): a seat's NAMED refusal is a 4xx answer about the
// CALLER's request — never the seat-absent 502.
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
// The /poser door's outbound seam — cordis's own HTTP primitive +
// engine base resolution (COMFYUI_URL / the endpoint config file):
// the same seam every other Layer-A→B call resolves through.
import { loadEndpointConfig, resolveEngineBaseUrl, sdkClient } from '@melite/comfyui-cordis'
import { LORA_BYTES_CAP } from '@melite/comfyui-cordis/user-loras'
import { buildSkillIndex, disclosureRoot } from '@melite/estate-queue'
import { agentFormDoc, agentCardFormDoc } from '@melite/engine-agent'
import { craftFormDoc } from '@melite/engine-craft'
// the SUBPATH import (not the bare barrel): formDoc's graph is
// schemastery-only — the barrel pulls mcp-engine's dsh-llm/dsh-tools
// d.ts into rolldown's declaration walk and the emit dies.
import { mcpFormDoc } from '@melite/engine-mcp/formDoc'

/** The tool-row shape, DERIVED from the contract's own signature
 *  (rolldown's dts emit chokes on cross-package type-only imports —
 *  the agent/craft precedent is value-only imports; this keeps the
 *  single-source law without a second declaration). */
type McpToolRows = Parameters<typeof mcpFormDoc>[0]['tools']

export const inject = ['webServer', 'llm', 'tools']

/** Door config — same spelling as the tool plane's. */
export interface Config {
  /**
   * The card LLM preference (operator order: "muse-spark-1.3-contributor
   * i want to use over glm-5v-turbo"): the route the ✦ enhance door
   * prefers BETWEEN the caller's explicit llm and the host default
   * model. An ordered candidate, never a contract — a name absent
   * from the live list falls to the default arm (llm-complete's
   * resolution law). An explicit empty string disables the arm.
   */
  enhancePreference?: string
}

/** The shipped default: the operator's named card model. */
export const DEFAULT_ENHANCE_PREFERENCE = 'muse-spark-1.3-contributor'

/** The seated MCP servers (folded LIVE from the tools seat's
 *  schemas: every mcp__<server>__<tool> name contributes its
 *  server; sorted for deterministic serving). Empty when none are
 *  seated — the census IS the truth, never a config copy. */
export function seatedMcpServers(c: CtxView): string[] {
  const servers = new Set<string>()
  for (const t of c.tools.schemas()) {
    // STRIP THE PREFIX, TAKE THE REMAINDER (the MCP audit's H6): the
    // split-by-count form dropped a server whose TOOL name contains
    // "__" (four parts) from the census while the executor still
    // composed it — so the picker omitted a tool the executor could
    // run. The wire name is `mcp__<server>__<tool>`; everything
    // after the first separator run is the tool.
    if (!t.name.startsWith(MCP_WIRE_PREFIX)) continue
    const rest = t.name.slice(MCP_WIRE_PREFIX.length)
    const cut = rest.indexOf('__')
    if (cut <= 0) continue
    servers.add(rest.slice(0, cut))
  }
  return [...servers].sort()
}

/** The wire prefix of an mcp tool name (the executor composes the
 *  same string — one spelling, here). */
const MCP_WIRE_PREFIX = 'mcp__' 

/** The prefix of an opted-in MCP engine id (the engines contract's
 *  own vocabulary: `mcp:<server>` — packages/engines/contract's
 *  ENGINE ID GRAMMAR; the seat's engineIdOk refuses a bare `mcp:`
 *  at registration, so it never reaches this census). */
const MCP_ENGINE_PREFIX = 'mcp:'

/** The raw opt-in read: the 'engines' seat's ids (null when the seat
 *  is absent, its ids face is not a function, or the read is not an
 *  array — the caller folds nothing on null). */
function probeMcpEngines(c: CtxView): string[] | null {
  const seat = c.get('engines') as { ids?: () => unknown } | undefined
  if (seat == null || typeof seat.ids !== 'function') return null
  const listed: unknown = seat.ids()
  if (!Array.isArray(listed)) return null
  return listed
    .filter((id): id is string => typeof id === 'string' && id.startsWith(MCP_ENGINE_PREFIX))
    .map((id) => id.slice(MCP_ENGINE_PREFIX.length))
    .sort()
}

/** The OPTED-IN MCP servers (the estate's own engines seat: the
 *  config's mcpEngines field seats ids 'mcp:<server>' — the
 *  2026-10-12 operator law makes the MCP card EXPERIMENTAL OPT-IN,
 *  so /v1/forms + /v1/model-catalog fold the card on the estate's
 *  opt-in, NEVER on the ambient tools census: the operator's DSH
 *  lane always carries harness mcp__<server>__<tool> schemas, and
 *  ambient presence is not intent (error j2,
 *  dev_docs/ERRORS.md:86). The card's TILES (the MCPs plus-box —
 *  mcpToolsOf) and the per-server form-spec docs ride the ambient
 *  seatedMcpServers still: the spawned subagent is a DSH harness
 *  spawn, ambient servers are what it can actually be granted — only
 *  the card's PRESENCE is opt-in. The probe never propagates: a
 *  throw from get() or ids() folds nothing (the doors 200 with no
 *  card rather than 500 on a half-mounted seat). */
export function seatedMcpEngines(c: CtxView): string[] {
  try {
    return probeMcpEngines(c) ?? []
  } catch {
    // The opt-in probe never fails the discovery doors (get()
    // throwing on an unmounted lane, ids() throwing on a half-mounted
    // seat): absence folds nothing — error j2.
    return []
  }
}

/** One server's tool rows (the LIVE census for its form's options:
 *  bare tool names — the executor composes mcp__<server>__<tool>
 *  on the wire). */
export function mcpToolsOf(c: CtxView, server: string): McpToolRows {
  const prefix = `${MCP_WIRE_PREFIX}${server}__`
  return c.tools.schemas()
    .filter((t) => t.name.startsWith(prefix))
    .map((t) => ({
      value: t.name.slice(prefix.length),
      label: t.name.slice(prefix.length),
      tooltip: t.description,
    }))
}

/** Minimal structural view of the services the doors touch. */
interface CtxView {
  /** The documented optional-service probe (cordis-tutorial/
   *  03-services.md: skip inject, probe at the use site) — the typed
   *  replacement for the retired `as unknown as { get }` casts
   *  (F-2/F-4, 2026-11-05). */
  get(name: string): unknown
  effect(effect: () => void, label?: string): unknown
  llm: LlmStreamSeam
  registry: {
    values(): Iterable<{
      fibers: Iterable<{
        uid: number | null
        store: unknown
        inertia?: Promise<void>
      }>
    }>
  }
  tools: {
    schemas(): Array<{ name: string; description?: string; parameters?: unknown }>
  }
  webServer: {
    /** The host's bound port (the own-origin seam reads it live). */
    port: number
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void
    }): () => void
  }
}

/** THE PENDING GRACE (the 3088 brick, 2026-09-26 — live proof: a
 * fiber stuck mid-transition held the pending gate closed for 10
 * hours while every non-seat door served fine). "Still activating"
 * is a BOOT-RACE answer, but the state is cheap to observe and
 * GLOBAL: any ONE wedged fiber (a failed plugin-tree reload, a hung
 * MCP seat handshake) would brick every seat door forever. The
 * stamp starts when the state is first observed and clears when it
 * lifts; past ESTATE_PENDING_GRACE_MS the state is a WEDGE, not an
 * activation — the gate opens and the seat probe's own honest voice
 * answers (serve, or the missing-seat 502 naming the family). */
export const ESTATE_PENDING_GRACE_MS = 120_000
/** THE RE-ARM QUIET (li-l, the flap brick): a fiber cycling
 *  activating→ready→activating (the multi-host blender-seat
 *  collision, live proof 2026-10-10: three mcp_server.py children
 *  from three hosts, 3379 remounts in one log) reset the stamp to
 *  null on every momentary lift and held the gate closed FOREVER.
 *  The stamp now lifts only after a SUSTAINED quiet — flapping
 *  cannot extend the grace window. Exported for the re-arm wall
 *  (a later boot race gets a fresh window: doors.spec.ts). */
export const ESTATE_PENDING_REARM_MS = 10_000
/** The gate's stamp state (V5 cure, 2026-10-18: the stamps were
 *  module-scope — one dead mount's wedged window could hold a fresh
 *  mount's seat doors closed, and unload never lifted it). One
 *  record per apply; the closure owns it. */
interface PendingGateStamps {
  pendingSince: number | null
  quietSince: number | null
}
const estateStillActivating = (gate: PendingGateStamps, c: CtxView): boolean => {
  let activating = false
  for (const runtime of c.registry.values()) {
    for (const fiber of runtime.fibers) {
      if (fiber.uid !== null && (fiber.store === undefined || fiber.inertia !== undefined)) activating = true
    }
  }
  if (!activating) {
    if (gate.quietSince === null) gate.quietSince = Date.now()
    // only a SUSTAINED lift re-arms the grace window; a flap's
    // momentary lift does not
    if (gate.pendingSince !== null && Date.now() - gate.quietSince >= ESTATE_PENDING_REARM_MS) {
      gate.pendingSince = null
    }
    return false
  }
  gate.quietSince = null
  if (gate.pendingSince === null) gate.pendingSince = Date.now()
  return Date.now() - gate.pendingSince < ESTATE_PENDING_GRACE_MS
}

// ── THE POSER ARMS (2026-09-16 — estate verbs, never a proxy) ─────
//
// HISTORY: the retired gateway once TUNNELED /poser to a second
// process; the collapse (2026-09-10) deleted it silently and the
// anny/body-studio mesh preview died with "Failed to fetch mesh
// (anny): 404". A prefix mount that forwards another server's URL
// space is a PROXY — the operator's law forbids it outright. What
// stands instead: the mesh serves as ESTATE DATA through the /v1
// door, exactly like form-spec and model-catalog — typed arms with
// validated inputs, the engine called server-side through cordis
// httpCall (the browser renders in three.js client-side; only the
// data transits over the SDK wire). The vendor routes (ComfyUI PromptServer, Layer
// B): GET/POST /poser/skin/mesh, GET /poser/skin/identity-space,
// GET /poser/presets, POST /poser/render.

/** One estate poser arm: the door path, the engine path, the
 *  admitted methods, the outbound budget (mesh shaping and the
 *  render bake get the long tail). */
interface PoserArm {
  readonly doorPath: string
  readonly enginePath: string
  readonly methods: readonly string[]
  readonly timeoutMs: number
}

const POSER_ARMS: readonly PoserArm[] = [
  { doorPath: '/v1/poser/mesh', enginePath: '/poser/skin/mesh', methods: ['GET', 'POST'], timeoutMs: 120_000 },
  { doorPath: '/v1/poser/identity-space', enginePath: '/poser/skin/identity-space', methods: ['GET'], timeoutMs: 30_000 },
  { doorPath: '/v1/poser/presets', enginePath: '/poser/presets', methods: ['GET'], timeoutMs: 30_000 },
  { doorPath: '/v1/poser/render', enginePath: '/poser/render', methods: ['POST'], timeoutMs: 120_000 },
]

/** The poser arms' engine call: the SDK client's fetchApi to the
 *  resolved engine base, the door's JSON contract on every
 *  refusal. A JSON result serves through ok(); the render arm's
 *  PNG serves bytes raw. */
const poserEngineCall = (
  arm: PoserArm,
  search: string,
  body: Buffer | null,
  contentType: string,
  ok: (payload: unknown) => void,
  serveBytes: (status: number, bytes: Buffer) => void,
  fail: (status: number, payload: Record<string, unknown>) => void,
): void => {
  let base: string
  try {
    base = resolveEngineBaseUrl()
  } catch (error: unknown) {
    fail(502, { error: `poser: no comfyui endpoint (${error instanceof Error ? error.message : /* v8 ignore next -- resolveEngineBaseUrl throws Errors only (2026-09-16) */ String(error)})` })
    return
  }
  sdkClient(base).fetchApi(arm.enginePath + search, {
    method: body === null ? 'GET' : 'POST',
    body: body ?? undefined,
    headers: { 'content-type': contentType },
    signal: AbortSignal.timeout(arm.timeoutMs),
  })
    .then(async (r) => {
      const ct: string = r.headers.get('content-type') ?? ''
      if (!ct.includes('json')) {
        serveBytes(r.status, Buffer.from(await r.arrayBuffer()))
        return
      }
      const text: string = await r.text()
      ok(text === '' ? {} : (JSON.parse(text) as unknown))
    })
    .catch((error: unknown) => fail(502, { error: `poser: engine unreachable (${error instanceof Error ? error.message : /* v8 ignore next -- the SDK rejects with Errors only (2026-09-16) */ String(error)})` }))
}

export function apply(c: CtxView, config: Config = {}): void {
  // R2b: the sweep rides the in-process seam (seats + door
  // listeners) — no origin, no port.

  // THE PENDING GRACE's stamps, per-mount (V5 cure): a fresh mount
  // starts with a clean window; unloading a mount drops its state
  // with the closure — never shared, never leaked.
  const pendingGate: PendingGateStamps = { pendingSince: null, quietSince: null }

  // The host default model, read LIVE (2026-09-06 — the door serves
  // the USER'S default, never first-breathing by registration order).
  // agentDefaultModel is the host's own service (settings → Models);
  // absent on an alien host → undefined → the core refuses loudly
  // (no llm named, no default) instead of walking. Never throws.
  const readDefaultLlm = (): string | undefined => {
    try {
      const svc = c.get('agentDefaultModel') as
        | { currentSelection?: () => { provider?: unknown; model?: unknown } }
        | null
        | undefined
      const sel = svc?.currentSelection?.()
      if (typeof sel?.provider === 'string' && typeof sel?.model === 'string') {
        return sel.provider + '/' + sel.model
      }
    } catch { /* no default service — loud refusal downstream, never a walk */ }
    return undefined
  }

  /** The card LLM preference as configured, else the shipped default.
   *  An explicit empty string DISABLES the preference arm (the
   *  profile pins pure host-default behavior); unset rides the
   *  operator's default. */
  const preferenceOf = (cfg: Config): string | undefined => {
    if (cfg.enhancePreference !== undefined) {
      return cfg.enhancePreference.length > 0 ? cfg.enhancePreference : undefined
    }
    return DEFAULT_ENHANCE_PREFERENCE
  }

  /** A signal that fires when the HTTP caller goes away (aborts or
   *  closes) — the fuse leg for long LLM sweeps (row 13). */
  const reqClosedSignal = (req: import('node:http').IncomingMessage): AbortSignal => {
    const ctrl = new AbortController()
    req.on('close', () => ctrl.abort())
    req.on('aborted', () => ctrl.abort())
    return ctrl.signal
  }

  const readBody = (req: import('node:http').IncomingMessage): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (d?: Buffer) => { if (d) chunks.push(d) })
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })

  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-tools/catalog',
    handler: (_req, res) => {
      // llmRoutes is the LIVE route list (2026-09-06: the card's model
      // picker is populated from here — never a restated copy). Best
      // effort: a broken llm seam must not take the proof route down.
      const respondCatalog = (llmRoutes: string[]): void => {
        const body = JSON.stringify({
          tools: c.tools.schemas().map((s) => ({ name: s.name, description: s.description ?? '' })),
          llmRoutes,
        })
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      }
      resolveHarnessRoutes(c.llm).then(
        (routes) => respondCatalog(routes.map(routeName)),
        () => respondCatalog([]),
      )
    },
  }), 'melite-tools: catalog route')

  // The door's own handler seat (IncomingMessage/ServerResponse —
  // the file's inline node:http idiom): `unknown` forced a cast at
  // every touch site, so the signature states the seat (2026-09-12).
  const enhanceHandler = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse): void => {
      let ok = true
      const respond = (status: number, payload: unknown): void => {
        if (!ok) return
        ok = false
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      readBody(req).then((buf) => {
        // The 2026-09-06 "1:1 capture" block (user prompts appended
        // to /tmp/melite-enhance-capture.jsonl via a CJS require
        // that throws under ESM and was swallowed) is DELETED
        // (2026-09-10, deep-audit harness finding #9): a privacy
        // liability AND dead code — the require('node:fs') call
        // never resolved, so nothing was ever captured and the
        // "DELETED after" promise was unenforceable.
        let body: {
          system_prompt?: unknown; prompt?: unknown; temperature?: unknown;
          model?: unknown; llm?: unknown
        }
        try {
          body = JSON.parse(buf.toString('utf8')) as typeof body
        } catch {
          return respond(400, { error: 'body must be JSON: {system_prompt, prompt, temperature?, llm?} or {model, prompt, temperature?, llm?}' })
        }
        if (typeof body.prompt !== 'string' || body.prompt.length === 0) {
          return respond(400, { error: 'prompt is a required string' })
        }
        const temperature = typeof body.temperature === 'number' ? body.temperature : undefined
        // The caller's chosen harness route (2026-09-06: the card's
        // model picker — "provider/model" or an unambiguous bare
        // model). Absent = host default walk (previous behavior).
        // Validated against the LIVE list here so an unknown name is
        // a 400 naming the live routes, never a blind walk.
        const llmWant = typeof body.llm === 'string' && body.llm.length > 0 ? body.llm : undefined

        // NO WALK, NO FALLBACKS (queue lane law): one resolved route
        // or a loud failure. Explicit llm wins, else the host default.
        // Unknown explicit name → 400; stale default / dead route → 502.
        const mapEnhanceError = (err: unknown): void => {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.startsWith('enhance: unknown llm route')) {
            const namesDefault = llmWant !== undefined
              && msg.includes('"' + llmWant + '"')
            return respond(namesDefault ? 400 : 502, { error: msg })
          }
          return respond(502, { error: msg })
        }

        // AGENT SWEEP FORM: {model, prompt} → every declared field
        // enhanced, results keyed by field name (the ✦ Agent Enhance
        // button's wire). Multi-field models complete sequentially
        // (observed ~40s per field live) — the cap is generous, never
        // a mid-song cutoff.
        if (typeof body.model === 'string' && body.model.length > 0) {
          // Ledger row 13 (2026-09-10): the sweep deadline is FUSED
          // with the caller's connection — req.destroyed (client
          // abort/close) aborts the LLM legs too. The old detached
          // AbortSignal.timeout kept every field completion burning
          // after the ✦ button's fetch gave up. AbortSignal.any
          // composes both without either owning the other.
          const sweepSignal = AbortSignal.any([
            AbortSignal.timeout(600_000),
            reqClosedSignal(req),
          ])
          return agenticSweep(c, c.llm, {
            model: body.model,
            prompt: body.prompt,
            temperature,
            signal: sweepSignal,
            ...(llmWant !== undefined ? { llmWant } : {}),
            defaultLlm: readDefaultLlm(),
            preference: preferenceOf(config),
          })
            .then((result) => respond(200, result))
            .catch(mapEnhanceError)
        }

        // ONE-SHOT FORM: the caller (the per-field ✦ button) supplies
        // the recipe directly — it comes from the form-spec SSOT.
        if (typeof body.system_prompt !== 'string' || body.system_prompt.length === 0) {
          return respond(400, { error: 'either model (agent sweep) or system_prompt (one-shot) is required' })
        }
        harnessEnhance(c.llm, {
          system: body.system_prompt,
          prompt: body.prompt,
          temperature,
          ...(llmWant !== undefined ? { llm: llmWant } : {}),
        }, readDefaultLlm(), preferenceOf(config))
          .then((result) => respond(200, result))
          .catch(mapEnhanceError)
      }).catch((err: unknown) => respond(400, { error: `body read failed: ${err instanceof Error ? err.message : String(err)}` }))
  };
  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-tools/enhance',
    handler: enhanceHandler,
  }), 'melite-tools: enhance route')
  // THE 1:1 FLOW PORT'S PATH (2026-09-11): the editor card system's
  // per-field ✦ enhancer posted to /v1/llm/enhance — same handler,
  // second mount (the port's sources ride the old paths verbatim).
  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/v1/llm/enhance',
    handler: enhanceHandler,
  }), 'melite-tools: enhance alias')

  // ── THE UPLOADS RAIL + INPUT PREVIEW (2026-09-11, the 1:1 flow
  // port's media plane): the editor card system's uploadToEstate
  // contract — POST /v1/uploads {filename, data} writes the estate's
  // data/input tree and answers {path: "data/input/<name>"}; GET
  // /v1/assets/inputs/<name> serves those bytes for the img tags.
  // Containment law = the media route's own: one clean segment, no
  // dots-only, realpath inside the input dir, image types only.
  // ONE SEGMENT GRAMMAR (li-aq.3): the contracts' own — this
  // private charset was the same law re-spelled (RULE 10's find).
  // The DOORS add one local truth on top: an upload filename is a
  // SINGLE segment (no separators), which the media grammar rightly
  // does not judge (a path of many legal segments is legal); here
  // one name = one file. Plugin scope: the uploads rail and the
  // binary lora door judge by the same grammar.
  const SEG = (name: string): boolean =>
    !name.includes('/') && !name.includes('\\') && segmentConfined(name)
  {
    const INPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
    const inputDir = async (): Promise<string> => {
      const path = await import('node:path')
      const { resolveRepoRoot } = await import('@melite/comfyui-cordis')
      const dir = path.join(resolveRepoRoot(), 'data', 'input')
      const fs = await import('node:fs/promises')
      await fs.mkdir(dir, { recursive: true })
      return dir
    }
    c.effect(() => c.webServer.register({
      kind: 'exact',
      path: '/v1/uploads',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const fail = (code: number, err: string): void => {
          const body = JSON.stringify({ error: err })
          res.writeHead(code, { 'content-type': 'application/json' })
          res.end(body)
        }
        readBody(req).then(async (buf) => {
          // JSON.parse yields any; the assertion names the expected
          // envelope and the typeof guards below validate each field
          // (the any never escapes the guarded reads).
          let body: Record<string, unknown>
          try { body = JSON.parse(buf.toString('utf8')) as Record<string, unknown> } catch { return fail(400, 'body must be JSON') }
          const filename = typeof body?.filename === 'string' ? body.filename : ''
          const data = typeof body?.data === 'string' ? body.data : ''
          if (filename === '' || data === '') return fail(400, 'uploads: filename + data are required')
          if (!SEG(filename)) return fail(400, 'uploads: bad filename')
          // THE WHITELIST (the door's own law): ANY MEDIA family —
          // image, video, audio (the any-media law, operator
          // 2026-11-06: the mod seat takes any media kind and the
          // system handles the conversion) — plus the mesh wire
          // type's pair (2026-09-21, primitive ③) —
          // model/gltf-binary, or octet-stream ONLY when the filename
          // carries the .glb/.gltf extension (browsers disagree on
          // the MIME; the extension closes the pair, and the whitelist
          // stays closed to every other binary).
          const meshName = /\.glb$/i.test(filename) || /\.gltf$/i.test(filename)
           const b64 = /^data:(?:(image|video|audio)\/[a-z0-9.+-]+|model\/gltf(?:-binary|\+json)|(application\/octet-stream));base64,(.+)$/.exec(data)
          if (b64 === null || (b64[2] !== undefined && !meshName)) {
            return fail(400, 'uploads: only image / video / audio / glb / gltf upload')
          }
          const bytes = Buffer.from(b64[3]!, 'base64')
          const dir = await inputDir()
          const fs = await import('node:fs/promises')
          const path = await import('node:path')
          const file = path.join(dir, filename)
          const [realFile, realDir] = await Promise.all([fs.realpath(file), fs.realpath(dir)].map(async (x) => x.catch(() => undefined)) as Promise<undefined | string>[])
          if (realFile !== undefined && realDir !== undefined && !realFile.startsWith(realDir + path.sep)) {
            return fail(400, 'uploads: path escapes the input dir')
          }
          await fs.writeFile(file, bytes)
          const out = JSON.stringify({ path: 'data/input/' + filename })
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(out)
        }).catch((e: unknown) => fail(500, 'uploads: ' + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))))
      },
    }), 'melite-tools: uploads rail')
    c.effect(() => c.webServer.register({
      kind: 'prefix',
      path: '/v1/assets/inputs',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const fail = (code: number, err: string): void => {
          const body = JSON.stringify({ error: err })
          res.writeHead(code, { 'content-type': 'application/json' })
          res.end(body)
        }
        void (async () => {
          const url = new URL(req.url ?? '/', 'http://melite.invalid')
          // DECODE, THEN JUDGE (the audit's GAP 2: this door sliced the
          // RAW pathname, so a staged `out 1.png` was unservable (404
          // for a file that exists) and a `%00` probe never reached the
          // grammar's NUL arm. Every sibling media door decodes per
          // segment before judging; this one now does too. A malformed
          // escape fails closed as a bad name.)
          let name: string
          try {
            name = decodeURIComponent(url.pathname.slice('/v1/assets/inputs/'.length))
          } catch {
            return fail(400, 'bad input name')
          }
          if (!SEG(name)) return fail(400, 'bad input name')
          const dir = await inputDir()
          const path = await import('node:path')
          const fs = await import('node:fs/promises')
          const file = path.join(dir, name)
          const real = await fs.realpath(file).catch(() => undefined)
          const realDir = await fs.realpath(dir)
          if (real === undefined || !real.startsWith(realDir + path.sep)) return fail(404, 'no such input')
          const bytes = await fs.readFile(file)
          // the MIME answer is the LEAF's one spelling
          // (contentTypeForArtifact — mediaKinds.ts: the shared
          // table; this door owns no map of its own to drift). An
          // mp4 input preview answers video/mp4, never image/webp;
          // unknown extensions answer octet-stream (the table's
          // documented law, svg included).
          res.writeHead(200, { 'content-type': contentTypeForArtifact(name), 'content-length': String(bytes.byteLength) })
          res.end(bytes)
        })().catch((e: unknown) => fail(500, 'inputs: ' + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))))
      },
    }), 'melite-tools: input preview')
  }

  // ── THE BINARY LORA DOOR (2026-10-17, the transport cure): the
  // uploads rail's JSON arm rides base64 data URLs — a 200MB LoRA
  // costs a ~267MB string inside one JSON body (~2× peak memory
  // against the 512MB cap). This door takes the SAME file as RAW
  // octet-stream bytes: `POST /v1/uploads/lora?filename=<one
  // segment>&families=<ids>` — the browser's File streams straight
  // through, no base64 anywhere. The cap reads the DECLARED
  // content-length BEFORE the body is buffered (an oversize upload
  // is refused without ever allocating), and the loras dir is the
  // ONE shared spelling (`resolveEngineLorasDir` — the same function
  // the manage plane's lora arms read, so the doors cannot disagree).
  {
    c.effect(() => c.webServer.register({
      kind: 'exact',
      path: '/v1/uploads/lora',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const fail = (code: number, err: string): void => {
          const body = JSON.stringify({ error: err })
          res.writeHead(code, { 'content-type': 'application/json' })
          res.end(body)
        }
        void (async () => {
          if (req.method !== 'POST') return fail(405, 'the lora door takes POST (raw bytes)')
          const type = String(req.headers['content-type'] ?? '')
          if (!/^application\/octet-stream/i.test(type)) {
            return fail(415, 'the lora door takes application/octet-stream (raw bytes — no base64)')
          }
          const url = new URL(req.url ?? '/', 'http://melite.invalid')
          let filename: string
          try {
            filename = decodeURIComponent(url.searchParams.get('filename') ?? '')
          } catch {
            return fail(400, 'bad filename')
          }
          if (filename === '' || !SEG(filename)) return fail(400, 'the lora door needs a one-segment filename')
          const families = (url.searchParams.get('families') ?? '')
            .split(',').map((f) => f.trim()).filter((f) => f !== '')
          if (families.some((f) => !/^[a-z0-9][a-z0-9-]*$/i.test(f))) {
            return fail(400, 'families must be comma-separated family ids')
          }
          // THE DECLARED-LENGTH CAP, PRE-BUFFER: the refusal answers
          // before readBody allocates anything — a 600MB upload is
          // refused at the header, never held in memory. Chunked
          // bodies carry no declaration, so they cannot prove the
          // cap and are refused (the browser's fetch always declares).
          const declared = Number(req.headers['content-length'] ?? '')
          if (!Number.isFinite(declared) || declared <= 0) {
            return fail(411, 'the lora door needs a declared content-length (the cap is checked pre-read)')
          }
          if (declared > LORA_BYTES_CAP) {
            return fail(413, `the LoRA is over the ${Math.round(LORA_BYTES_CAP / (1024 * 1024))}MB door cap — copy it in from the machine instead (lora_install with a path)`)
          }
          // the dir resolves BEFORE the body is read — an undeclared
          // loras dir refuses without holding the upload's bytes
          const { resolveEngineLorasDir, installUserLoraBuffer } = await import('@melite/comfyui-cordis/user-loras')
          const dir = resolveEngineLorasDir(loadEndpointConfig() as Record<string, unknown>)
          if (dir === null) {
            return fail(502, 'the loras install dir is undeclared — set MELITE_COMFYUI_LORAS_DIR or the endpoint model_base_path (never guessed)')
          }
          const bytes = await readBody(req)
          const landed = installUserLoraBuffer(filename, bytes, dir)
          if (!landed.ok) return fail(422, landed.reason)
          const out = JSON.stringify({
            filename: landed.filename,
            bytes: landed.bytes,
            install_dir: dir,
            // core reads its folder list at import — a reboot is the
            // only refresh this repo owns
            next_action: 'restart',
            restart_required: true,
            row_suggestion: {
              id: landed.filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '_'),
              filename: landed.filename,
              families,
              default_strength: 1,
            },
          })
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(out)
        })().catch((e: unknown) => fail(500, 'lora door: ' + (e instanceof Error ? e.message : String(e))))
      },
    }), 'melite-tools: binary lora door')
  }

  // ── THE /v1 PREFIX DOOR (2026-09-11 — production restore) ────────
  //
  // The editor's whole HTTP face died with the gateway (40b57f94):
  // /v1/form-spec, /v1/model-catalog, /v1/forms, /v1/kinds (the
  // discovery arms — derived LIVE in discovery.ts, referee-pinned
  // from the dead door) plus the seat lanes (flows/bench/runs/
  // manage/skills/load/ledger — makeEstateRequest's seats law).
  // ONE prefix mount serves both: discovery first, seats beneath,
  // 404/502 JSON otherwise (same body shape the dead door served).
  c.effect(() => c.webServer.register({
    kind: 'prefix',
    path: '/v1',
    handler: (req, res) => {
      // THE AUTH GATE (2026-10-04, the operator's "fix ALL blockers"):
      // /v1 carries run submission — an anonymous POST /v1/flows/start
      // queued GPU work. DSH's own carrier answers /api/* with 401
      // while this prefix answered an unauthenticated curl 200
      // (measured on the dev lane), so the run plane was the one door
      // with no fence.
      //
      // The gate is DSH's OWN seam, not an invention: ctx.connection's
      // requestRejection is Host/Origin first (403), browser-session
      // second (401) — packages/client/connection/src/rpc-host.ts.
      // Probed, never injected (the tutorial's documented pattern,
      // estate.ts's seats law): a lane with no browser carrier (the
      // headless commission estate, the SDK app) keeps serving /v1,
      // and a lane that HAS one fences it with that lane's own
      // config. No melite-owned token scheme: DSH's note records the
      // decision that API tokens are not accepted on API paths.
      const connection = c.get('connection') as {
        requestRejection?: (request: { headers: unknown }) => number | undefined
      } | undefined
      // THE SEAM TAKES THE REQUEST, NOT ITS HEADERS (the 2026-10-04
      // audit's catch): ConnectionTrustRequest is `{ headers }`
      // (packages/client/connection/src/rpc.ts:98-101) and DSH's own
      // node caller passes the whole req
      // (packages/host/open-in-app/src/index.ts:186). Handing it
      // `req.headers` made request.headers undefined INSIDE
      // isTrustedApiRequest — a TypeError the web server caught as a
      // bare 400, so the gate broke /v1 instead of fencing it.
      // The try exists so a carrier that ever throws fails with a
      // NAMED body, never an empty 400.
      let rejection: number | undefined
      try {
        rejection = connection?.requestRejection?.({ headers: req.headers })
      } catch (e) {
        const message = 'connection/rejected: ' + (e instanceof Error ? e.message : String(e))
        res.writeHead(500, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(message)) })
        res.end(Buffer.from(message))
        return
      }
      if (rejection !== undefined) {
        const body = JSON.stringify({
          error: 'connection/' + (rejection === 403 ? 'untrusted-request' : 'unauthenticated'),
          status: rejection,
        })
        res.writeHead(rejection, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
        return
      }
      const ok = (payload: unknown): void => {
        const body = JSON.stringify(payload)
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      }
      const fail = (status: number, payload: Record<string, unknown>): void => {
        const body = JSON.stringify(payload)
        res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      }
      /** The estate lanes' error map (the false-death fix, 2026-10-08,
       *  corrected twice — the second critique caught bench/
       *  store-failed defaulting to 400 and ~20 codes classified
       *  only by silence): a day-long hunt read every 502 as a dead
       *  runs seat — the 502s were seat REFUSALS, wrong bodies and
       *  boot-settle races, on a healthy lane. A named protocol
       *  refusal means the seat ANSWERED — never the absent-seat
       *  502 — and the failure's own details ride in the body
       *  verbatim (loc, per-stage errors, the manage envelope's
       *  action/status/data). THE COMPLETE CLASS INVENTORY — every
       *  code declared by the protocol's seats is named below, none
       *  rides the default silently:
       *   - 400 caller-fault — body/shape/refusal voices: the runs/
       *     family (bad-envelope, draft-required, draft-malformed,
       *     draft-unknown, invalid-request, preview-scope,
       *     flow-compile, workflow-pin, card-compose) — ALL raised
       *     from CardArmError(400) voices; lane-input-missing (the
       *     named asset has no store copy — the request is
       *     unexecutable as sent; the body carries the fetch URL);
       *     bench bad-body/bad-wire/self-wire/dead-wire (shape
       *     refusals); draft bad-id/bad-patch/bad-stage-id/
       *     patch-unknown-keys; media/kind; gateway/bad-request.
       *   - 404 not-found — runs/unknown-run, runs/run-unknown,
       *     bench/not-found, bench/stage-not-found,
       *     bench/wire-stage-not-found (a named thing absent),
       *     bench/nothing-to-undo (no live action matches the walk),
       *     draft/not-found.
       *   - 409 conflict — bench/cas-conflict (carries current_rev),
       *     bench/overwrite-required (the load's own overwrite law),
       *     bench/duplicate-stage.
       *   - 502 infra — the storage layer refused while the call was
       *     valid: bench/store-failed, draft/store-failed,
       *     draft/cannot-persist, media/no-seat, gateway/internal,
       *     gateway/cancelled.
       *   - manage/refused → the ENVELOPE's own details.status
       *     (the manage plane always sets one; a missing/garbage
       *     status is the SEAT's bug, not the caller's request —
       *     500, never 400).
       *  A code NOT in the table defaults to 400 — the honest class
       *  for an unknown future refusal (the seat answered; the body
       *  carries the code for discrimination), and every code the
       *  protocol declares today IS in the table. */
      const REFUSAL_STATUS: Readonly<Record<string, number>> = {
        // 404 — a named thing is absent
        'runs/unknown-run': 404,
        'runs/run-unknown': 404,
        'bench/not-found': 404,
        'bench/stage-not-found': 404,
        'bench/wire-stage-not-found': 404,
        'bench/nothing-to-undo': 404,
        'draft/not-found': 404,
        // 409 — state conflicts
        'bench/cas-conflict': 409,
        'bench/overwrite-required': 409,
        'bench/duplicate-stage': 409,
        // 502 — the storage/infra layer refused a valid call
        'bench/store-failed': 502,
        'draft/store-failed': 502,
        'draft/cannot-persist': 502,
        'media/no-seat': 502,
        'gateway/internal': 502,
        'gateway/cancelled': 502,
      }
      const failEstate = (error: unknown): void => {
        const remote = remoteErrorOf(error)
        const message = error instanceof Error ? error.message : String(error)
        if (remote !== undefined) {
          let status = REFUSAL_STATUS[remote.code] ?? 400
          const details: unknown = remote.details
          // details FIRST — ours win on a key collision (a details
          // row carrying its own error/code never masks the protocol's)
          const body: Record<string, unknown> = {}
          if (typeof details === 'object' && details !== null) {
            Object.assign(body, details as Record<string, unknown>)
          }
          body['error'] = message
          body['code'] = remote.code
          if (remote.code === 'manage/refused') {
            // The envelope's own status IS the answer (the manage
            // plane always sets one: 4xx voices, 503 engine-down,
            // 500 its own bugs). A missing/garbage status is the
            // SEAT's bug — 500, never attributed to the caller.
            const envelopeStatus = (details as { status?: unknown } | undefined)?.status
            status = typeof envelopeStatus === 'number' && Number.isInteger(envelopeStatus) && envelopeStatus >= 400 && envelopeStatus <= 599
              ? envelopeStatus
              : 500
          }
          fail(status, body)
          return
        }
        fail(502, { error: message })
      }
      // Discovery arms are GET; seat lanes carry both (bench patch
      // is POST, drafts GET).
      // CALLER-GONE LAW: bind to the RESPONSE's premature close
      // (res 'close' before writableEnded), never req 'close' — a
      // POST's message-complete fires req 'close' the moment the
      // body stream is consumed, aborting the seat mid-call.
      const callerGone = new AbortController()
      res.on('close', () => {
        if (!res.writableEnded) callerGone.abort()
      })
      const signal = callerGone.signal

      // Discovery arms (live derivation — discovery.ts; async — the
      // card defs boot is a promise).
      const serve = (): void => {
        // The URL parse rides INSIDE the try (2026-09-12 fix: an
        // unparseable url used to throw synchronously out of the
        // handler — a host-level crash — instead of the door's 500).
        let path: string
        let method: EstateMethod
        let url: URL
        try {
          url = new URL(req.url ?? '/', 'http://localhost')
          path = url.pathname
          method = (req.method ?? 'GET').toUpperCase() as EstateMethod
          if (method === 'GET' && path === '/v1/card-tools') {
            return void cardToolsArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/model-catalog') {
            // THE OPT-IN FOLD (error j2): the catalog row folds on the
            // estate's engines opt-in, never the ambient tools census.
            return void modelCatalogArm(seatedMcpEngines(c)).then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/forms') {
            // THE OPT-IN FOLD (error j2): same law as the catalog row
            // above — one census, two doors.
            return void formsArm(seatedMcpEngines(c)).then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/kinds') {
            return void kindsDoorArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          // THE POSER ARMS (estate verbs — the mesh data the
          // in-browser three.js viewers render; see the module
          // block above for the never-a-proxy law)
          const poserArm = POSER_ARMS.find((a) => a.doorPath === path)
          if (poserArm !== undefined) {
            if (!poserArm.methods.includes(method)) {
              return void fail(405, { error: `poser: ${method} not allowed on ${path}`, allow: poserArm.methods.join(', ') })
            }
            // identity_model is the mesh arms' one required input
            // (validated HERE — the arm owns its inputs, never a
            // verbatim forward): GET arms carry it in the query,
            // POST arms validate their parsed body below.
            if (method === 'GET' && poserArm.doorPath !== '/v1/poser/presets') {
              const model = url.searchParams.get('identity_model') ?? ''
              if (model.length === 0) {
                return void fail(400, { error: 'poser: the identity_model query parameter is required' })
              }
            }
            const serveBytes = (status: number, bytes: Buffer): void => {
              res.writeHead(status, { 'content-type': 'application/octet-stream', 'content-length': String(bytes.byteLength) })
              res.end(bytes)
            }
            if (method === 'POST') {
              readBody(req).then((buf) => {
                let parsed: Record<string, unknown> = {}
                try {
                  parsed = buf.length > 0 ? JSON.parse(buf.toString('utf8')) as Record<string, unknown> : {}
                } catch {
                  return void fail(400, { error: 'poser: body must be JSON' })
                }
                if (poserArm.doorPath === '/v1/poser/mesh' && (typeof parsed['identity_model'] !== 'string' || parsed['identity_model'].length === 0)) {
                  return void fail(400, { error: 'poser: identity_model (string) is required in the body' })
                }
                const ct = (Array.isArray(req.headers['content-type']) ? req.headers['content-type'][0] : req.headers['content-type']) ?? 'application/json'
                poserEngineCall(poserArm, url.search, buf, ct, ok, serveBytes, fail)
              }).catch((error: unknown) => fail(400, { error: `poser: body read failed (${error instanceof Error ? error.message : String(error)})` }))
              return
            }
            poserEngineCall(poserArm, url.search, null, 'application/json', ok, serveBytes, fail)
            return
          }
          if (method === 'GET' && path === '/v1/form-spec') {
            const model = url.searchParams.get('model') ?? ''
            if (model.length === 0) {
              return fail(400, { error: 'form-spec: the model query parameter is required' })
            }
            // THE ENGINE DOCS (stroke 66/69 — the card-seam
            // generalization): each seated engine serves its own
            // form doc from its DECLARED contract. AGENT's census is
            // built per request off the tools seat's CURRENT schemas
            // (the seated MCP servers) and the skill index — LIVE,
            // never static.
            const servers = [...seatedMcpServers(c)]
            // THE NO-DUMP LAW rides here too: the census NEVER lists
            // skill rows. The spawn config's Skills box serves the
            // BINDING VOCABULARY's entrance docs (model:<mid> /
            // card:<cname>) — the rows an agent may reference when
            // configuring a subagent; leaf skill ids are learned from
            // the owning surface (melite_load), never enumerated.
            const skillCensus = () => {
              const idx = buildSkillIndex(disclosureRoot()) as {
                families: Array<{ id: string; entrance: string | null }>;
                cards: Array<{ id: string; entrance: string | null }>;
              }
              return [
                ...idx.families.flatMap((f) => f.entrance === null ? [] : [{ value: f.entrance, label: f.id }]),
                ...idx.cards.flatMap((c2) => c2.entrance === null ? [] : [{ value: c2.entrance, label: c2.id }]),
              ]
            }
            const mcpCensus = servers.map((v) => ({ value: v, label: v }))
            const engineDocs = new Map<string, () => Record<string, unknown>>([
              ['agent', () => agentFormDoc({ mcps: mcpCensus, skills: skillCensus() })],
              ['craft', () => craftFormDoc()],
            ])
            // THE GENERIC MCP CARD (operator 2026-09-21: ALWAYS spawn
            // a standalone DSH subagent — the configuration is the
            // MCP tools to provide, the inputs, the prompts): the
            // bare key 'mcp' serves the AGENT card doc; each
            // mcp:<server> serves its OWN direct-call doc with its
            // OWN live census (the lane flow-composed rows and the
            // spawned subagent's own tools ride).
            if (servers.length > 0) {
              engineDocs.set('mcp', () => agentCardFormDoc({ mcps: mcpCensus, skills: skillCensus() }))
            }
            for (const server of servers) {
              engineDocs.set(`mcp:${server}`, () => mcpFormDoc({
                server,
                tools: mcpToolsOf(c, server),
                servers,
              }))
            }
            return void formSpecArm(model, engineDocs).then((spec) => {
              if (spec === null) {
                return fail(404, { error: `form-spec: '${model}' does not resolve (unknown, unoffered, or retired)` })
              }
              return ok(spec)
            }, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
        } catch (error: unknown) {
          return fail(500, { error: `discovery door: ${error instanceof Error ? error.message : /* v8 ignore next -- the try body throws Errors only (URL/arms are sync-Error sites, 2026-09-12) */ String(error)}` })
        }

        // Seat lanes — makeEstateRequest's law (a lane with no seat
        // is a hard error naming the migration, never a silent empty).
        // THE QUERY RIDES (stroke 79): `path` above is pathname-only
        // (the door's own route matching) — the seat lane needs the
        // FULL target, query included (/v1/load?inference_type=card
        // arrived at the registry as '' — the params dropped at this
        // seam, the tools never noticed because they call the seats
        // in-process).
        const pathWithQuery = url.pathname + url.search
        if (seatFamilyForPath(path).probeNames.length > 0 && estateStillActivating(pendingGate, c)) {
          return fail(503, {
            error: 'estate composition is still activating',
            code: 'estate/pending',
            pending: true,
          } as const)
        }
        const request = makeEstateRequest(c)
        if (method === 'POST') {
          readBody(req).then((buf) => {
            let body: unknown
            try {
              body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {}
            } catch {
              return fail(400, { error: 'body must be JSON' })
            }
            // SHAPE GATE (schema-strictness fix 6, 2026-10-01): this
            // arm forwarded ANY parsed JSON verbatim — a POST body of
            // `42`, `"x"`, or `[1,2]` rode straight into the seat.
            // Field-level law belongs to each seat (it throws its own
            // named errors); the OBJECT shape is the seam this door
            // owns — every /v1 POST verb takes a record body.
            if (body === null || typeof body !== 'object' || Array.isArray(body)) {
              return fail(400, { error: `seat lane: POST ${path} needs a JSON object body (got ${body === null ? 'null' : Array.isArray(body) ? 'an array' : `a ${typeof body}`})` })
            }
            request(method, pathWithQuery, body, signal, 120_000)
              .then((value) => ok(value))
              .catch(failEstate)
          }).catch((error: unknown) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }))
          return
        }
        request(method, pathWithQuery, undefined, signal, 120_000)
          .then((value) => ok(value))
          .catch(failEstate)
      }
      return serve()
    },
  }), 'melite-tools: /v1 prefix door')

// THE /POSER PREFIX MOUNT IS DELETED (the operator's law, 2026-09-16:
  // NO PROXIES — no prefix passthrough of another server's URL space.
  // The poser routes serve as ESTATE ARMS under /v1 below, the same
  // door every client verb rides.)

}
