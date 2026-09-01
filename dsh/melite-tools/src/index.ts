/**
 * `@melite-plugin/dsh-tools` — Melite tools as DSH host tool plugins.
 *
 * THE OLD CONTRACT (agent/prompts/BASE_PROMPT.md + docs/agent/
 * CAPABILITIES.md): the assistant composes EDITABLE CARDS the user
 * reviews and runs; "It composes; it never executes — there is no run
 * tool." So this plugin registers exactly FOUR tools (transformations,
 * reads, and ONE infra-upkeep queue append — still no execution):
 *
 *   - model_catalog    — discovery (the catalog read)
 *   - build_pipeline   — compose ONE draft card (dry-run /v1/compose);
 *                        the conversation renders the REAL action card;
 *                        the run door opens ONLY from the user's Run
 *                        press (browser → /melite-proxy/v1/pipelines/start)
 *   - provision_model  — INFRA UPKEEP (2026-08-26, gap gamma of
 *                        AUDIT-AGENT-CARDS-DOWNLOADS.md): queue ONE
 *                        model's weight download via POST
 *                        /v1/models/provision (catalog source: decl →
 *                        ComfyUI-Manager). A Manager queue append fetches
 *                        bytes to disk and starts NO run — the
 *                        CARDS-NOT-RUNS law bans GPU inference from the
 *                        model, not weight upkeep. The in-card path stays
 *                        user-owned: a card Run that short-circuits
 *                        download_required opens the ModelDownloadDialog
 *                        for the USER.
 *   - enhance_prompt  — the old langchain-era prompt enhancement,
 *                       transferred: the model's OWN per-model recipe
 *                       (form-spec SSOT) is completed by THE HARNESS'S
 *                       OWN MODEL via ctx.llm — the registered DeepSeek
 *                       adapter the host itself chats through. NO
 *                       keystore, NO key setup: "no model" cannot happen
 *                       in a host that converses at all. Simple models:
 *                       one call. Multi-field models (music3): the agent
 *                       calls once per declared field.
 *
 * No status tool (the card polls), no compose tool (build_pipeline IS
 * the compose), no run tool (GPU execution stays impossible from the
 * model). Plus two host routes riding the SAME harness seam:
 * GET /melite-tools/catalog (registration proof) and POST /melite-tools/enhance
 * (the editor ✦ button's door — same-origin from the chat embed; the same
 * execution core as the tool, zero key configuration).
 *
 * @module @melite-plugin/dsh-tools
 */
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_GATEWAY_URL } from './gateway.ts'
import { buildPipeline } from './tools/build-pipeline.ts'
import { enhancePrompt } from './tools/enhance-prompt.ts'
import { laneBundle } from './tools/lane-bundle.ts'
import { modelCatalog } from './tools/model-catalog.ts'
import { provisionModel } from './tools/provision-model.ts'
import { refineDraft } from './tools/refine-draft.ts'
import { skillIndex } from './tools/skill-index.ts'
import { skillRead } from './tools/skill-read.ts'
import { ledgerTail } from './tools/ledger-tail.ts'
import { cardTools } from './tools/card-tools.ts'
import type { ToolDefinition } from './types.ts'
import { harnessEnhance, type LlmStreamSeam } from './llm-complete.ts'
import { agenticSweep } from './enhance-agent.ts'

export { DEFAULT_GATEWAY_URL, RayGatewayError, normalizeGatewayUrl } from './gateway.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'melite-tools'

/** Services this fiber needs: tools, the host web server, and the harness LLM seam. */
export const inject = ['tools', 'webServer', 'llm']

/** Plugin config — defaults filled in apply (zod-free, loader passes raw). */
export interface Config {
  /** Melite gateway base URL. Default http://localhost:33081. */
  gatewayUrl?: string
}

/** The tool names this plugin owns (the diagnostic route filters to these). */
export const MELITE_TOOL_NAMES = [
  'model_catalog', 'build_pipeline', 'refine_draft', 'lane_bundle',
  'enhance_prompt', 'provision_model',
  'skill_index', 'skill_read', 'ledger_tail',
] as const

/** Minimal structural view of the services apply touches. */
interface CtxView {
  logger: { info(msg: string, ...args: unknown[]): void }
  effect(effect: () => void, label?: string): unknown
  llm: LlmStreamSeam
  tools: {
    register(definition: ToolDefinition): () => void
    schemas(): Array<{ name: string; description?: string; parameters?: unknown }>
  }
  webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler(req: unknown, res: { writeHead(status: number, headers: Record<string, string>): void; end(body?: string): void }): void
    }): unknown
  }
}

/** Register the Melite tools (+ the /melite-tools/catalog diagnostic route). */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const c = ctx as unknown as CtxView
  // LANE-SPAWN LAW (2026-09-01): the gateway that spawns a lane agent
  // owns that agent's composes — its door URL rides the spawn env, so
  // the one-card wall + auto-arm bind to the spawning gateway instead
  // of silently falling through to whatever this profile pins.
  const envGw = process.env.MELITE_GATEWAY_URL || ''
  const gatewayUrl = (envGw || config.gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/+$/, '')

  // LANE MODE (2026-08-31): a scoped agent session mounts EXACTLY ONE
  // card tool and NOTHING else — no build_pipeline, no model catalog,
  // no provisioning, no skills door, no ledger, no other cards. The
  // session cannot know another lane exists: impossibility by mounting,
  // not by instruction. Set by the gateway's agent door spawn
  // (MELITE_CARD_TOOLS_LANE=<lane>) — never by the session itself.
  const lane = process.env.MELITE_CARD_TOOLS_LANE || (config as any).lane || ''
  if (lane) {
    const cardToolList = await cardTools(gatewayUrl, undefined, lane)
    if (cardToolList.length !== 1)
      throw new Error('melite-tools lane mode: lane "' + lane + '" must yield exactly 1 tool, got ' + String(cardToolList.length))
    for (const t of cardToolList) c.tools.register(t as unknown as ToolDefinition)
    c.logger.info('melite-tools LANE MODE (%s): 1 tool — %s', lane, cardToolList[0]?.name ?? '?')
    return
  }

  c.logger.info('melite-tools: registering %d tools against gateway %s', MELITE_TOOL_NAMES.length, gatewayUrl)

  c.tools.register(modelCatalog(gatewayUrl))
  c.tools.register(buildPipeline(gatewayUrl))
  c.tools.register(refineDraft(gatewayUrl))
  c.tools.register(laneBundle(gatewayUrl))
  c.tools.register(provisionModel(gatewayUrl))
  c.tools.register(enhancePrompt(gatewayUrl, c.llm))
  c.tools.register(skillIndex(gatewayUrl))
  c.tools.register(skillRead(gatewayUrl))
  c.tools.register(ledgerTail(gatewayUrl))
  // THE PLUGIN SYSTEM (2026-08-30): complex cards OWN their tools —
  // a tool.json manifest beside each card's form declares name/schema/
  // constraints; register one DSH tool per manifest. Adding a complex
  // card = adding its dir; zero godfile edits on this side.
  try {
    const cardToolList = await cardTools(gatewayUrl)
    for (const t of cardToolList) c.tools.register(t as unknown as ToolDefinition)
    c.logger.info('melite-tools: %d card tool(s) from /v1/card-tools', cardToolList.length)
  } catch (e) {
    c.logger.warn('melite-tools: card-tools manifest fetch failed: %s', e instanceof Error ? e.message : e)
  }

  // Diagnostic surface: read the REAL registry back through ctx.tools.schemas()
  // so a booted instance can prove registration over HTTP (verification law).
  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-tools/catalog',
    handler: (_req, res) => {
      const mine = new Set<string>(MELITE_TOOL_NAMES)
      const tools = c.tools.schemas()
        .filter((s) => mine.has(s.name))
        .map((s) => ({ name: s.name, description: s.description, parameters: s.parameters }))
      const body = JSON.stringify({ gateway: gatewayUrl, tools })
      // Explicit content-length: remote proxies (tailscale serve) mishandle
      // chunked framing on lossy links — a known length lets them buffer.
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
      res.end(Buffer.from(body))
    },
  }), 'melite-tools: catalog route')

  // The editor ✦ button's door — SAME execution core as the tool, on the
  // SAME harness model. The chat embed is same-origin with this server, so
  // the embedded editor reaches this directly; no keystore exists on this
  // path, so the button can never answer "no model" inside the GUI.
  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-tools/enhance',
    handler: (req, res) => {
      const chunks: Buffer[] = []
      let ok = true
      const respond = (status: number, payload: unknown): void => {
        if (!ok) return
        ok = false
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      ;(req as { on(ev: string, cb: (d?: Buffer) => void): void }).on('data', (d) => {
        if (d) chunks.push(d)
      })
      ;(req as { on(ev: string, cb: () => void): void }).on('end', () => {
        let body: {
          system_prompt?: unknown; prompt?: unknown; temperature?: unknown;
          model?: unknown;
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as typeof body
        } catch {
          return respond(400, { error: 'body must be JSON: {system_prompt, prompt, temperature?} or {model, prompt, temperature?}' })
        }
        if (typeof body.prompt !== 'string' || body.prompt.length === 0) {
          return respond(400, { error: 'prompt is a required string' })
        }
        const temperature = typeof body.temperature === 'number' ? body.temperature : undefined

        // AGENT SWEEP FORM: {model, prompt} → every declared field enhanced,
        // results keyed by field name. This is the ✦ Agent Enhance button's
        // wire — the agent system's own orchestration core, server-side.
        // Deadline: multi-field models complete sequentially (observed ~40s
        // per field live); the cap is generous, never a mid-song cutoff.
        if (typeof body.model === 'string' && body.model.length > 0) {
          return agenticSweep(gatewayUrl, c.llm, {
            model: body.model,
            prompt: body.prompt,
            temperature,
            signal: AbortSignal.timeout(600_000),
          })
            .then((result) => respond(200, result))
            .catch((err: unknown) => respond(502, { error: err instanceof Error ? err.message : String(err) }))
        }

        // ONE-SHOT FORM: caller supplies the recipe directly.
        if (typeof body.system_prompt !== 'string' || body.system_prompt.length === 0) {
          return respond(400, { error: 'either model (agent sweep) or system_prompt (one-shot) is required' })
        }
        harnessEnhance(c.llm, {
          system: body.system_prompt,
          prompt: body.prompt,
          temperature,
        })
          .then((result) => respond(200, result))
          .catch((err: unknown) => respond(502, { error: err instanceof Error ? err.message : String(err) }))
      })
    },
  }), 'melite-tools: enhance route')
}
