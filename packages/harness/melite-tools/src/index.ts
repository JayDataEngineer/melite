/**
 * `@melite-plugin/dsh-tools` — the estate's DSH tool surface.
 *
 * TWO INTERFACES, ONE PLUGIN (the interface law):
 *
 *   BROWSER (default — no env): compose-only. The agent discovers,
 *   loads lanes, reads skills, composes cards (dedicated card
 *   tools) and NEVER executes — the run door is the
 *   USER's Run press (editor -> /melite-proxy/v1/flows/start).
 *   This keeps the old contract (agent/prompts/BASE_PROMPT.md): "It
 *   composes; it never executes."
 *
 *   HEADLESS (MELITE_HEADLESS=1 — the one-shot/agent mounts): the
 *   DELEGATED OPERATOR. Same queue, same doors, plus the ONE
 *   execution verb melite_flow (a card or a flow tool call — single,
 *   template, or stages drafted on the fly), with run_status as the
 *   monitor. Both ride the queue's registration door — never a
 *   bypass, never a hand-assembled graph (QUEUE LANE LAW).
 *
 * AD HOC TOOLS (MELITE_ADHOC="enhance_prompt,..."): registered ONLY
 * when a session names them. enhance_prompt — the langchain-era
 * prompt enhancement riding ctx.llm (the harness's own model, per-
 * model recipes SSOT in the gateway form-spec) — is the first: never
 * in a base toolset, only called ad hoc.
 *
 * BASE toolset (both interfaces): melite_discover, melite_load,
 * lane_bundle_peek, lane_bundle_load, comfy_manage, skill_index,
 * skill_read, ledger_tail (+ melite_flow + run_status headless).
 * Card tools compose from their card packages (named imports above
 * — the fetch registrar retired with its last row).
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
import { buildCardTool as buildClothingPlacementTool } from '@melite/3d-clothing-placement/tool'
import { buildH3TimelineTool } from '@melite/video-h3-timeline/tool'
import { runStatus } from './tools/run-status.ts'
import { meliteFlow } from './tools/melite-flow.ts'
import { comfyManage } from './tools/comfy-manage.ts'
import { meliteDiscover } from './tools/melite-discover.ts'
import { laneBundlePeek } from './tools/lane-bundle-peek.ts'
import { laneBundleLoad } from './tools/lane-bundle-load.ts'
import { meliteLoad } from './tools/melite-load.ts'
import { skillIndex } from './tools/skill-index.ts'
import { skillRead } from './tools/skill-read.ts'
import { ledgerTail } from './tools/ledger-tail.ts'
import type { ToolDefinition } from './types.ts'
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName } from './llm-complete.ts'

// Re-exported for the route-preference unit test (drives the BUILT lib
// with a fake seam — no host, no key, seconds-cheap).
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName }

export { DEFAULT_GATEWAY_URL, RayGatewayError, normalizeGatewayUrl } from './gateway.ts'

// Tool factories — re-exported for the smoke harness (test/smoke.mjs)
// and any embedder that mounts tools without the full plugin apply().
export { runStatus } from './tools/run-status.ts'
export { laneBundlePeek } from './tools/lane-bundle-peek.ts'
export { laneBundleLoad } from './tools/lane-bundle-load.ts'
export { meliteDiscover } from './tools/melite-discover.ts'
export { meliteFlow } from './tools/melite-flow.ts'
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
// inject law (split 2026-09-10): THIS plugin is the profile-agnostic
// tool plane — it must activate in EVERY composition, including the
// estate/sdk server (no webServer service, see src/doors.ts for why
// the host routes live in their own loader entry). llm is NOT injected
// here: the run doors ride the GATEWAY, and the enhance seams that do
// need ctx.llm moved to src/doors.ts with the routes.
export const inject = ['tools']

/**
 * Plugin config — defaults filled in apply (zod-free, loader passes raw).
 * Interface selection is config-first (profile-pinned, declarative) with
 * env override for one-shot mounts: MELITE_HEADLESS=1 and MELITE_ADHOC=…
 * force the same gates without touching a profile.
 */
export interface Config {
  /** Melite gateway base URL. Default http://localhost:33081. */
  gatewayUrl?: string
  /** HEADLESS interface: register the run doors (melite_flow,
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
  'comfy_manage', 'skill_index', 'skill_read', 'ledger_tail',
] as const

/** HEADLESS-only run doors (MELITE_HEADLESS=1) — the delegated operator. */
export const HEADLESS_TOOL_NAMES = [
  'melite_flow', 'run_status',
] as const

/** AD HOC names (MELITE_ADHOC) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export const ADHOC_TOOL_NAMES = [] as const

/** Every tool name this plugin can own (registration log + smoke filter). */
export const MELITE_TOOL_NAMES = [
  ...BASE_TOOL_NAMES, ...HEADLESS_TOOL_NAMES, ...ADHOC_TOOL_NAMES,
] as const

/** Minimal structural view of the services apply touches (doors moved
 * out — webServer and the llm seam live in src/doors.ts now). */
interface CtxView {
  logger: { info(msg: string, ...args: unknown[]): void; warn(msg: string, ...args: unknown[]): void }
  effect(effect: () => void, label?: string): unknown
  tools: {
    register(definition: ToolDefinition): () => void
    schemas(): Array<{ name: string; description?: string; parameters?: unknown }>
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
  c.tools.register(comfyManage(gatewayUrl))
  c.tools.register(skillIndex(gatewayUrl))
  c.tools.register(skillRead(gatewayUrl))
  c.tools.register(ledgerTail(gatewayUrl))

  // HEADLESS run doors — the delegated operator (QUEUE LANE LAW: the
  // queue's own registration door, models named explicitly, never a
  // hand-assembled graph).
  if (headless) {
    c.tools.register(meliteFlow(gatewayUrl))
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
  // Ledger row 31 (2026-09-10): DUAL-REGISTRATION resolved — the
  // card packages keep their own guarded self-registration for
  // compositions that mount them directly (gateway lane); this
  // composition is the single owner in the harness lane. A
  // mis-composition mounting both throws LOUD at the tools
  // service's duplicate refusal — the designed guard, not a bug to
  // paper over. clothing-placement joins the list — the "one tool
  // per card manifest" promise now holds for every card package
  // with a tool face.
  //
  // Ledger row 33 (2026-09-10): VERSION SKEW CURED — every
  // dsh-tools consumer pins 0.1.5-alpha.2 (latest), so the
  // ToolRunContext types resolve to one copy and the casts are
  // gone. If a future pin drifts again, tsc fails HERE (not
  // silently downstream) — re-pin, never re-cast.
  c.tools.register(buildMusicTool(gatewayUrl))
  c.tools.register(buildTtsTool(gatewayUrl))
  c.tools.register(buildVoiceLockTool(gatewayUrl))
  c.tools.register(buildImageEditTool(gatewayUrl))
  c.tools.register(buildMotionTool(gatewayUrl))
  c.tools.register(buildH3TimelineTool(gatewayUrl))
  c.tools.register(buildClothingPlacementTool(gatewayUrl))

}
