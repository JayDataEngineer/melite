/**
 * @melite-plugin/dsh-tools/doors — the HOST ROUTE plane of the melite
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

export const inject = ['webServer', 'llm', 'tools']

/** Door config — same spelling as the tool plane's. */
export interface Config {
  /** Estate wire origin override. UNSET by default — the doors ride
   *  THIS host's own webServer (the melite-estate bundle mounts them
   *  in-process; the estate collapse, docs/plans/
   *  estate-collapse-2026-09-10.md). Set only for an external estate
   *  lane (another machine's DSH host). */
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

  const enhanceHandler = (req: unknown, res: unknown): void => {
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
        }, readDefaultLlm())
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
            return void formsArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/kinds') {
            return void kindsDoorArm().then(ok, (e: unknown) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }))
          }
          if (method === 'GET' && path === '/v1/form-spec') {
            const model = url.searchParams.get('model') ?? ''
            if (model.length === 0) {
              return fail(400, { error: 'form-spec: the model query parameter is required' })
            }
            return void formSpecArm(model).then((spec) => {
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
        const request = makeEstateRequest(c)
        if (method === 'POST') {
          readBody(req).then((buf) => {
            let body: unknown
            try {
              body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {}
            } catch {
              return fail(400, { error: 'body must be JSON' })
            }
            request(method, path, body, signal, 120_000)
              .then((value) => ok(value))
              .catch((error: unknown) => fail(502, { error: error instanceof Error ? error.message : String(error) }))
          }).catch((error: unknown) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }))
          return
        }
        request(method, path, undefined, signal, 120_000)
          .then((value) => ok(value))
          .catch((error: unknown) => fail(502, { error: error instanceof Error ? error.message : String(error) }))
      }
      return serve()
    },
  }), 'melite-tools: /v1 prefix door')
}
