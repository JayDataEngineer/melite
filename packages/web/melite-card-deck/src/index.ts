/**
 * `@melite-plugin/dsh-card-deck` — HOST ONLY.
 *
 * THE ESTATE COLLAPSE (docs/plans/estate-collapse-2026-09-10.md,
 * 2026-09-10): this host once proxied /v1|/comfyui|/poser|/health to
 * the second-Loader estate process (retired) and tunneled the events
 * WS — the seam that enshrined the degenerate copy of DSH. ALL of it
 * is deleted: the estate's doors are cordis plugins now, mounted in
 * THIS DSH host by the `melite-estate` bundle row, answering the same
 * same-origin /v1 paths directly. What remains here is what was never
 * a gateway concern:
 *
 * - /editor     → the editor's built dist (the standalone card
 *                 studio; a static file tree, no upstream)
 * - /v1/llm/*   → stubs (the assistant lives in DSH; the editor's own
 *                 LLM lane is dead surface — longest-prefix match
 *                 beats the estate doors' exact rows on this lane)
 */
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'ray-card-deck'

export const inject = ['webServer']

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
  }), 'ray-card-deck: /v1/llm stub (DSH owns the LLM)')

  // THE WEB FAMILY (2026-09-02 split): packages/web/dsh (this package,
  // the DSH panels) and packages/web/editor are ONE card surface — this
  // host serves the editor's built dist. The dist path is
  // FAMILY-RELATIVE and machine-independent: this file builds to
  // <pkg>/lib/, the editor dist sits at packages/web/editor/dist — TWO
  // levels up from lib lands on packages/web, then 'editor/dist'.
  // (2026-09-10 depth fix history kept: the default once carried three
  // '..' — one too many since the family split; test/editor-dist.test.mjs
  // asserts the built default resolves to a real index.html.)
  // RAY_EDITOR_DIST overrides for out-of-repo layouts.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const EDITOR_DIST = process.env.RAY_EDITOR_DIST
    ?? path.resolve(here, '..', '..', 'editor', 'dist')
  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary',
    '.wasm': 'application/wasm',
    '.woff2': 'font/woff2',
  }

  const serveStatic = async (rel: string, res: import('node:http').ServerResponse): Promise<void> => {
    const root = path.resolve(EDITOR_DIST)
    const target = path.resolve(root, '.' + rel.replace(/^\/editor/, ''))
    if (!target.startsWith(root)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    // Directory (or extension-less SPA path) → index.html; a missing
    // ASSET (has extension) 404s honestly — no octet-stream index.
    const st = await fs.stat(target).catch(() => null)
    let file = target
    if (!st || st.isDirectory()) {
      if (path.extname(rel) !== '') {
        res.writeHead(404)
        res.end('not found')
        return
      }
      file = path.join(root, 'index.html')
    }
    try {
      const data = await fs.readFile(file)
      const ext = path.extname(file).toLowerCase()
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/editor',
    handler: async (req, res) => { await serveStatic(new URL(req.url ?? '/editor/', 'http://local').pathname, res) },
  }), 'ray-card-deck: /editor static')

}
