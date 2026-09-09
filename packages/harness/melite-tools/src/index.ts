/**
 * `@melite-plugin/dsh-tools` — the estate's DSH tool surface.
 *
 * TWO INTERFACES, ONE PLUGIN (the interface law):
 *
 *   BROWSER (default — no env): compose-only. The agent discovers,
 *   loads lanes, reads skills, composes cards (build_flow /
 *   dedicated card tools) and NEVER executes — the run door is the
 *   USER's Run press (editor -> /melite-proxy/v1/flows/start).
 *   This keeps the old contract (agent/prompts/BASE_PROMPT.md): "It
 *   composes; it never executes."
 *
 *   HEADLESS (MELITE_HEADLESS=1 — the one-shot/agent mounts): the
 *   DELEGATED OPERATOR. Same queue, same doors, plus the run pair:
 *   card_run (a card is a 1-length flow — draft {model,...params}
 *   through the queue start door) and flow_run (a NAMED template
 *   through {flow:name}), with run_status as the monitor. All three
 *   ride the queue's registration door — never a bypass, never a
 *   hand-assembled graph (QUEUE LANE LAW).
 *
 * AD HOC TOOLS (MELITE_ADHOC="enhance_prompt,..."): registered ONLY
 * when a session names them. enhance_prompt — the langchain-era
 * prompt enhancement riding ctx.llm (the harness's own model, per-
 * model recipes SSOT in the gateway form-spec) — is the first: never
 * in a base toolset, only called ad hoc.
 *
 * BASE toolset (both interfaces): melite_discover, melite_load,
 * lane_bundle_peek, lane_bundle_load, build_flow, refine_draft,
 * comfy_manage, skill_index, skill_read, ledger_tail. Card tools
 * compose from their card packages (named imports above — the fetch
 * registrar retired with its last row).
 *
 * @module @melite-plugin/dsh-tools
 */
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_GATEWAY_URL } from './gateway.ts'
// THE CARD PACKAGES' TOOL FACES (M2′ + the registrar retirement,
// 2026-09-09): a card tool is IMPORTED from its package — the
// DSH law (packages/shell/tool-bash: a tool is its own package;
// hosts compose packages, never fetch registries). The fetch
// registrar (tools/card-tools.ts) died with its last row — every
// card tool composes through its package now.
import { buildMusicTool } from '@melite/audio-music/tool'
import { buildTtsTool } from '@melite/audio-tts/tool'
import { buildVoiceLockTool } from '@melite/audio-voice-lock/tool'
import { buildImageEditTool } from '@melite/image-image-edit/tool'
import { buildMotionTool } from '@melite/motion-motion/tool'
import { buildH3TimelineTool } from '@melite/video-h3-timeline/tool'
import { cardRun } from './tools/card-run.ts'
import { flowRun } from './tools/flow-run.ts'
import { runStatus } from './tools/run-status.ts'
import { buildFlow } from './tools/build-flow.ts'
import { comfyManage } from './tools/comfy-manage.ts'
import { meliteDiscover } from './tools/melite-discover.ts'
import { laneBundlePeek } from './tools/lane-bundle-peek.ts'
import { laneBundleLoad } from './tools/lane-bundle-load.ts'
import { meliteLoad } from './tools/melite-load.ts'
import { refineDraft } from './tools/refine-draft.ts'
import { skillIndex } from './tools/skill-index.ts'
import { skillRead } from './tools/skill-read.ts'
import { ledgerTail } from './tools/ledger-tail.ts'
import type { ToolDefinition } from './types.ts'
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName, type LlmStreamSeam } from './llm-complete.ts'

// Re-exported for the route-preference unit test (drives the BUILT lib
// with a fake seam — no host, no key, seconds-cheap).
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName }
import { agenticSweep } from './enhance-agent.ts'

export { DEFAULT_GATEWAY_URL, RayGatewayError, normalizeGatewayUrl } from './gateway.ts'

// Tool factories — re-exported for the smoke harness (test/smoke.mjs)
// and any embedder that mounts tools without the full plugin apply().
export { cardRun } from './tools/card-run.ts'
export { flowRun } from './tools/flow-run.ts'
export { runStatus } from './tools/run-status.ts'
export { laneBundlePeek } from './tools/lane-bundle-peek.ts'
export { laneBundleLoad } from './tools/lane-bundle-load.ts'
export { meliteDiscover } from './tools/melite-discover.ts'
export { buildFlow } from './tools/build-flow.ts'
export { refineDraft } from './tools/refine-draft.ts'
export { comfyManage } from './tools/comfy-manage.ts'
export { meliteLoad } from './tools/melite-load.ts'
export { skillIndex } from './tools/skill-index.ts'
export { skillRead } from './tools/skill-read.ts'
export { ledgerTail } from './tools/ledger-tail.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'melite-tools'

/**
 * Services this fiber NEEDS: tools + the harness LLM seam (enhance
 * rides ctx.llm). No webServer dependency — headless/SDK mounts boot
 * without one.
 */
// webServer: the /melite-tools/* host routes (the editor ✦ button's
// enhance door). RESTORED 2026-09-05 — the 2026-09-03 "ray-era fossil"
// retirement killed them as "zero live callers", but the editor's
// enhance.ts targets /melite-tools/enhance as its ONLY door (the
// keystore fallback died 2026-09-05), so the ✦ button answered the
// operator-quoted error inside the DeepSeek app. The route IS the link
// to the DSH model (ctx.llm) — one core, two doors.
export const inject = ['tools', 'webServer', 'llm']

/**
 * Plugin config — defaults filled in apply (zod-free, loader passes raw).
 * Interface selection is config-first (profile-pinned, declarative) with
 * env override for one-shot mounts: MELITE_HEADLESS=1 and MELITE_ADHOC=…
 * force the same gates without touching a profile.
 */
export interface Config {
  /** Melite gateway base URL. Default http://localhost:33081. */
  gatewayUrl?: string
  /** HEADLESS interface: register the run doors (card_run, flow_run,
   *  run_status) — the delegated operator. Default false (browser law:
   *  the model composes, the USER presses Run). */
  headless?: boolean
  /** AD HOC tool names, never in a base toolset ('enhance_prompt').
   *  Accepts a single string or a list. */
  adhocTools?: string | string[]
}

/** BASE tool names — both interfaces (discovery, compose, management, audit). */
export const BASE_TOOL_NAMES = [
  'melite_discover', 'melite_load', 'lane_bundle_peek', 'lane_bundle_load',
  'build_flow', 'refine_draft', 'comfy_manage',
  'skill_index', 'skill_read', 'ledger_tail',
] as const

/** HEADLESS-only run doors (MELITE_HEADLESS=1) — the delegated operator. */
export const HEADLESS_TOOL_NAMES = [
  'card_run', 'flow_run', 'run_status',
] as const

/** AD HOC names (MELITE_ADHOC) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export const ADHOC_TOOL_NAMES = [] as const

/** Every tool name this plugin can own (registration log + smoke filter). */
export const MELITE_TOOL_NAMES = [
  ...BASE_TOOL_NAMES, ...HEADLESS_TOOL_NAMES, ...ADHOC_TOOL_NAMES,
] as const

/** Minimal structural view of the services apply touches. */
interface CtxView {
  logger: { info(msg: string, ...args: unknown[]): void; warn(msg: string, ...args: unknown[]): void }
  effect(effect: () => void, label?: string): unknown
  llm: LlmStreamSeam
  tools: {
    register(definition: ToolDefinition): () => void
    schemas(): Array<{ name: string; description?: string; parameters?: unknown }>
  }
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void
    }, label?: string): () => void
  }
}

/** Register the Melite tools against the live estate gateway. */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const c = ctx as unknown as CtxView
  // GATEWAY OVERRIDE: an embedding host (SDK spawn, remote mount) pins
  // its own gateway through the env — never silently falling through to
  // whatever this profile's config pins.
  const envGw = process.env.MELITE_GATEWAY_URL || ''
  const gatewayUrl = (envGw || config.gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/+$/, '')

  // config-first, env-override: a profile pins its interface; a
  // one-shot mount forces it without touching the profile.
  const headless = process.env.MELITE_HEADLESS === '1' || config.headless === true
  const adhocEnv = (process.env.MELITE_ADHOC || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean)
  const adhocCfg = Array.isArray(config.adhocTools)
    ? config.adhocTools.map((s: string) => s.trim()).filter(Boolean)
    : (typeof config.adhocTools === 'string'
      ? config.adhocTools.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [])
  const adhoc = adhocEnv.length ? adhocEnv : adhocCfg

  c.logger.info(
    'melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s',
    headless ? 'HEADLESS' : 'BROWSER', BASE_TOOL_NAMES.length,
    headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, gatewayUrl,
  )

  // BASE (both interfaces): disclosure (flow preferred, card
  // fallback), discovery, compose, management, audit.
  c.tools.register(meliteDiscover(gatewayUrl))
  c.tools.register(meliteLoad(gatewayUrl))
  c.tools.register(laneBundlePeek(gatewayUrl))
  c.tools.register(laneBundleLoad(gatewayUrl))
  c.tools.register(buildFlow(gatewayUrl))
  c.tools.register(refineDraft(gatewayUrl))
  c.tools.register(comfyManage(gatewayUrl))
  c.tools.register(skillIndex(gatewayUrl))
  c.tools.register(skillRead(gatewayUrl))
  c.tools.register(ledgerTail(gatewayUrl))

  // HEADLESS run doors — the delegated operator (QUEUE LANE LAW: the
  // queue's own registration door, models named explicitly, never a
  // hand-assembled graph).
  if (headless) {
    c.tools.register(cardRun(gatewayUrl))
    c.tools.register(flowRun(gatewayUrl))
    c.tools.register(runStatus(gatewayUrl))
  }

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

  // THE CARD PACKAGE TOOL FACES — direct composition, one builder per
  // card package (the same Config.gateway spelling every tool face
  // takes). No fetch, no allowlist: ownership is the import graph.
  c.tools.register(buildMusicTool(gatewayUrl) as unknown as ToolDefinition)
  c.tools.register(buildTtsTool(gatewayUrl) as unknown as ToolDefinition)
  c.tools.register(buildVoiceLockTool(gatewayUrl) as unknown as ToolDefinition)
  c.tools.register(buildImageEditTool(gatewayUrl) as unknown as ToolDefinition)
  c.tools.register(buildMotionTool(gatewayUrl) as unknown as ToolDefinition)
  c.tools.register(buildH3TimelineTool(gatewayUrl) as unknown as ToolDefinition)

  

  // ── HOST ROUTES (restored 2026-09-05) ─────────────────────────────
  // The editor's ✦ Enhance door: POST /melite-tools/enhance on THIS
  // host, same-origin from the chat embed. The LLM is the harness's
  // OWN model (ctx.llm) — the registered adapter the host itself
  // chats through. No keystore exists on this path, so the button can
  // never answer "no model" inside a host that converses at all.
  // ONE execution core, two doors (llm-complete.ts): this route and
  // the enhance_prompt tool.
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
        // TEMPORARY 1:1 CAPTURE (2026-09-06, operator order: "I SEND IN
        // DSH, THEN YOU DO IT LIVE" — the operator presses Enhance once
        // and I replay the EXACT body). Append-only local file on the
        // operator's own machine, used once to replay THEIR failure,
        // DELETED after. Never committed, never in records.
        try {
          const fs = require('node:fs') as {
            appendFileSync(p: string, s: string): void
          }
          fs.appendFileSync(
            '/tmp/melite-enhance-capture.jsonl',
            JSON.stringify({
              time: new Date().toISOString(),
              chars: buf.length,
              body: buf.toString('utf8'),
            }) + '\n',
          )
        } catch { /* capture must never break the door */ }
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
          return agenticSweep(gatewayUrl, c.llm, {
            model: body.model,
            prompt: body.prompt,
            temperature,
            signal: AbortSignal.timeout(600_000),
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
