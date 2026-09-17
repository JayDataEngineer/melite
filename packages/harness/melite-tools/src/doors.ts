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
import type { LlmStreamSeam } from './llm-complete.ts'
import { harnessEnhance, resolveHarnessRoutes, routeName } from './llm-complete.ts'
import { agenticSweep } from './enhance-agent.ts'
import {
  formSpecArm,
  formsArm,
  kindsDoorArm,
  modelCatalogArm,
  cardToolsArm,
} from './discovery.ts'
import { makeEstateRequest, type EstateMethod } from './estate.ts'
// The /poser door's outbound seam — cordis's own HTTP primitive +
// engine base resolution (COMFYUI_URL / the endpoint config file):
// the same seam every other Layer-A→B call resolves through.
import { httpCall, resolveEngineBaseUrl } from '@melite/comfyui-cordis'
import { buildSkillIndex, disclosureRoot } from '@melite/estate-queue'
import { agentFormDoc } from '@melite/engine-agent'
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
    const parts = t.name.split('__')
    if (parts.length === 3 && parts[0] === 'mcp') servers.add(parts[1]!)
  }
  return [...servers].sort()
}

/** One server's tool rows (the LIVE census for its form's options:
 *  bare tool names — the executor composes mcp__<server>__<tool>
 *  on the wire). */
export function mcpToolsOf(c: CtxView, server: string): McpToolRows {
  const prefix = `mcp__${server}__`
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
  effect(effect: () => void, label?: string): unknown
  llm: LlmStreamSeam
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

// ── THE /POSER DOOR (2026-09-16 — the named restore) ───────────────
//
// HISTORY: the retired second-Loader gateway once TUNNELED /poser
// (blind byte forwarding to another process); the estate collapse
// (2026-09-10) deleted the tunnel — and with it, silently, the
// browser's only path to the poser routes the anny/body-studio
// mesh preview rides ("Failed to fetch mesh (anny): 404"). The
// restore is NOT the tunnel back: this is a NAMED door — an
// explicit allow-list of the vendor extension's routes
// (vendor/comfyui_extensions/melite-poser-nodes/server.py, ComfyUI
// PromptServer — Layer B), each arm called server-side through
// cordis's httpCall with the estate's JSON error contract. The
// browser never learns the engine origin; unknown paths and
// methods refuse at the door.

/** One allow-listed poser arm (path + admitted methods + the
 *  outbound budget — mesh shaping renders geometry, render bakes
 *  a PNG; both get the long tail). */
interface PoserArm {
  readonly path: string
  readonly methods: readonly string[]
  readonly timeoutMs: number
}

const POSER_ARMS: readonly PoserArm[] = [
  { path: '/poser/skin/mesh', methods: ['GET', 'POST'], timeoutMs: 120_000 },
  { path: '/poser/skin/identity-space', methods: ['GET'], timeoutMs: 30_000 },
  { path: '/poser/presets', methods: ['GET'], timeoutMs: 30_000 },
  { path: '/poser/render', methods: ['POST'], timeoutMs: 120_000 },
]

export { POSER_ARMS }

export function apply(c: CtxView, config: Config = {}): void {
  // R2b: the sweep rides the in-process seam (seats + door
  // listeners) — no origin, no port.

  // The host default model, read LIVE (2026-09-06 — the door serves
  // the USER'S default, never first-breathing by registration order).
  // agentDefaultModel is the host's own service (settings → Models);
  // absent on an alien host → undefined → the core refuses loudly
  // (no llm named, no default) instead of walking. Never throws.
  const readDefaultLlm = (): string | undefined => {
    try {
      const svc = (c as unknown as { get(name: string): unknown }).get('agentDefaultModel') as
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
    const SEG = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/
    c.effect(() => c.webServer.register({
      kind: 'exact',
      path: '/v1/uploads',
      handler: (req: any, res: any) => {
        const fail = (code: number, err: string): void => {
          const body = JSON.stringify({ error: err })
          res.writeHead(code, { 'content-type': 'application/json' })
          res.end(body)
        }
        readBody(req).then(async (buf) => {
          let body: any
          try { body = JSON.parse(buf.toString('utf8')) } catch { return fail(400, 'body must be JSON') }
          const filename = typeof body?.filename === 'string' ? body.filename : ''
          const data = typeof body?.data === 'string' ? body.data : ''
          if (filename === '' || data === '') return fail(400, 'uploads: filename + data are required')
          if (!SEG.test(filename)) return fail(400, 'uploads: bad filename')
          const b64 = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(data)
          if (b64 === null) return fail(400, 'uploads: only png / jpeg / webp upload')
          const bytes = Buffer.from(b64[2]!, 'base64')
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
      handler: (req: any, res: any) => {
        const fail = (code: number, err: string): void => {
          const body = JSON.stringify({ error: err })
          res.writeHead(code, { 'content-type': 'application/json' })
          res.end(body)
        }
        void (async () => {
          const url = new URL(req.url ?? '/', 'http://melite.invalid')
          const name = url.pathname.slice('/v1/assets/inputs/'.length)
          if (!SEG.test(name)) return fail(400, 'bad input name')
          const dir = await inputDir()
          const path = await import('node:path')
          const fs = await import('node:fs/promises')
          const file = path.join(dir, name)
          const real = await fs.realpath(file).catch(() => undefined)
          const realDir = await fs.realpath(dir)
          if (real === undefined || !real.startsWith(realDir + path.sep)) return fail(404, 'no such input')
          const bytes = await fs.readFile(file)
          // split always yields ≥1 element, so pop() is always a
          // string — no ?. decay, no ?? (2026-09-12).
          const ext = (name.split('.').pop() as string).toLowerCase()
          const type = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'
          res.writeHead(200, { 'content-type': type, 'content-length': String(bytes.byteLength) })
          res.end(bytes)
        })().catch((e: unknown) => fail(500, 'inputs: ' + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))))
      },
    }), 'melite-tools: input preview')
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
            return void modelCatalogArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/forms') {
            return void formsArm(seatedMcpServers(c)).then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/kinds') {
            return void kindsDoorArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
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
            const engineDocs = new Map<string, () => Record<string, unknown>>([
              ['agent', () => {
                const idx = buildSkillIndex(disclosureRoot()) as { skills: Array<{ id: string; name: string }> }
                return agentFormDoc({
                  mcps: servers.map((v) => ({ value: v, label: v })),
                  skills: idx.skills.map((r) => ({ value: r.id, label: r.name })),
                })
              }],
              ['craft', () => craftFormDoc()],
            ])
            // THE MCP CARD (the instance rows — one descriptor row
            // per seated server, §1.5): mcp:<server> serves its OWN
            // doc with its OWN live tool census; the Model rail
            // (families) switches instances and the client's
            // model-key refetch re-specs to the new server's tools.
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
        const request = makeEstateRequest(c)
        const pathWithQuery = url.pathname + url.search
        if (method === 'POST') {
          readBody(req).then((buf) => {
            let body: unknown
            try {
              body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {}
            } catch {
              return fail(400, { error: 'body must be JSON' })
            }
            request(method, pathWithQuery, body, signal, 120_000)
              .then((value) => ok(value))
              .catch((error: unknown) => fail(502, { error: error instanceof Error ? error.message : String(error) }))
          }).catch((error: unknown) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }))
          return
        }
        request(method, pathWithQuery, undefined, signal, 120_000)
          .then((value) => ok(value))
          .catch((error: unknown) => fail(502, { error: error instanceof Error ? error.message : String(error) }))
      }
      return serve()
    },
  }), 'melite-tools: /v1 prefix door')

  // THE /POSER DOOR: named arms, server-side calls, estate errors
  // (see the POSER_ARMS history above — never the tunnel back).
  c.effect(() => c.webServer.register({
    kind: 'prefix',
    path: '/poser',
    handler: (req, res) => {
      const json = (status: number, payload: Record<string, unknown>): void => {
        const body = JSON.stringify(payload)
        res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      }
      let url: URL
      try {
        url = new URL(req.url ?? '/', 'http://localhost')
      } catch {
        return void json(400, { error: 'poser: unparseable url' })
      }
      const method = (req.method ?? 'GET').toUpperCase()
      const arm = POSER_ARMS.find((a) => a.path === url.pathname)
      if (arm === undefined) {
        return void json(404, { error: `poser: no arm at ${url.pathname}`, arms: POSER_ARMS.map((a) => a.path) })
      }
      if (!arm.methods.includes(method)) {
        return void json(405, { error: `poser: ${method} not allowed on ${url.pathname}`, allow: arm.methods.join(', ') })
      }
      let base: string
      try {
        base = resolveEngineBaseUrl()
      } catch (error: unknown) {
        return void json(502, { error: `poser: no comfyui endpoint (${error instanceof Error ? error.message : /* v8 ignore next -- resolveEngineBaseUrl throws Errors only (2026-09-16) */ String(error)})` })
      }
      const target = base + url.pathname + url.search
      const send = (body: Buffer | null): void => {
        const contentType = body === null
          ? 'application/json'
          : (Array.isArray(req.headers['content-type']) ? req.headers['content-type'][0] : req.headers['content-type']) ?? 'application/json'
        httpCall(method, target, body, contentType, arm.timeoutMs)
          .then((r) => {
            // JSON arms serve JSON; the render arm's PNG serves
            // bytes. The upstream STATUS rides verbatim (the
            // vendor route's own 404 for an unknown model is the
            // honest answer, not a door-side rewrite).
            if (Buffer.isBuffer(r.body)) {
              res.writeHead(r.status, { 'content-type': 'application/octet-stream', 'content-length': String(r.body.byteLength) })
              res.end(r.body)
              return
            }
            const out = r.body === null ? '{}' : JSON.stringify(r.body)
            res.writeHead(r.status, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(out)) })
            res.end(Buffer.from(out))
          })
          .catch((error: unknown) => json(502, { error: `poser: upstream unreachable (${error instanceof Error ? error.message : /* v8 ignore next -- httpCall rejects with Errors only (2026-09-16) */ String(error)})` }))
      }
      if (method === 'POST') {
        readBody(req)
          .then((buf) => { send(buf) })
          .catch((error: unknown) => json(400, { error: `poser: body read failed (${error instanceof Error ? error.message : String(error)})` }))
        return
      }
      send(null)
    },
  }), 'melite-tools: /poser door')
}
