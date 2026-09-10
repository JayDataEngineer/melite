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

export const inject = ['webServer', 'llm', 'tools']

/** Door config — same spelling as the tool plane's. */
export interface Config {
  /** Estate wire origin override. UNSET by default — the doors ride
   *  THIS host's own webServer (the melite-estate bundle mounts them
   *  in-process; the estate collapse, docs/plans/
   *  estate-collapse-2026-09-10.md). Set only for an external estate
   *  lane (another machine's DSH host). */
  gatewayUrl?: string
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
  // E3 (estate collapse): the tool plane's wire origin is THIS host's
  // own webServer — the doors are mounted in the same process; the
  // :33081 second-Loader seam is retired. The port is read LIVE so a
  // port-0 (OS-assigned) host binds correctly too.
  const ownOrigin = `http://127.0.0.1:${c.webServer.port}`
  const gatewayUrl = config.gatewayUrl ?? ownOrigin

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

  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-tools/enhance',
    handler: (req, res) => {
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
          return agenticSweep(gatewayUrl, c.llm, {
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
    },
  }), 'melite-tools: enhance route')
}
