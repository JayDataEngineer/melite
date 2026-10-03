/**
 * `@melite-plugin/dsh-card-deck` — HOST ONLY.
 *
 * THE ESTATE COLLAPSE (dev_docs/plans/estate-collapse-2026-09-10.md,
 * 2026-09-10): this host once proxied /v1|/comfyui|/poser|/health to
 * the second-Loader estate process (retired) and tunneled the events
 * WS — the seam that enshrined the degenerate copy of DSH. ALL of it
 * is deleted: the estate's plane is Typert remotes now (drafts/bench/
 * runs/manage over /api/<ns>/<method>), mounted in THIS DSH host by
 * the `melite-estate` bundle row. What remains here is what was never
 * a gateway concern:
 *
 * - /v1/llm/*   → stubs (the assistant lives in DSH; the editor's own
 *                 LLM lane is dead surface — longest-prefix match
 *                 beats the estate doors' exact rows on this lane).
 *                 The stub stays a stub (not a DSH primitive) for one
 *                 reason: without it the shell fallback would answer
 *                 these lanes with 200 + HTML and the studio would
 *                 misparse it as keystore JSON. A loud typed refusal
 *                 beats a lying 200.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'melite-card-deck'

export const inject = ['webServer', 'connection']

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

export function apply(ctx: Context): void {
  // ── THE LLM SEAM (the assistant IS DSH) ──────────────────────────────
  // The editor's own LLM lane (ray gateway keystore: OpenRouter keys,
  // providers, health) is DEAD SURFACE in the DSH origin — the agent
  // and its LLM live in DSH (settings → Models). This prefix route
  // stubs the lane at the wire: the studio never fetches the editor
  // keystore (and never receives its API key).
  const LLM_STUBS: Record<string, [number, unknown]> = {
    '/v1/llm/keys': [200, { keys: [] }],
    '/v1/llm/keys/active': [404, { error: 'no_active_key', message: 'The assistant lives in DSH; the editor LLM lane is disabled in the embed.' }],
    '/v1/llm/health': [200, { connected: false, reason: 'dsh_owns_the_assistant', model: null, name: null }],
    '/v1/llm/providers': [200, { providers: [] }],
  }
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/v1/llm',
    handler: async (req, res) => {
      const path = (req.url ?? '/').split('?')[0]
      const [status, body] = LLM_STUBS[path] ?? [404, { error: 'llm_lane_disabled', message: 'The assistant lives in DSH.' }]
      res.writeHead(status, JSON_HEADERS)
      res.end(JSON.stringify(body))
    },
  }), 'melite-card-deck: /v1/llm stub (DSH owns the LLM)')
}
