/**
 * `@melite-plugin/dsh-card-deck` — HOST ONLY.
 *
 * The DSH-side host for the editor's card surfaces. The /ray-deck/* API
 * stayed RETIRED (d157b6c; its client consumer was already an orphaned
 * fossil — the studio iframe rides the /v1 prefix proxies below). The
 * sidebar deck itself is RESTORED (2026-09-05, operator order) as the
 * center-column takeover — see src/client/. This host half serves:
 *
 * - /editor            → the editor's built dist (THE card surface)
 * - /v1, /comfyui, /poser, /health
 *                     → buffered gateway proxies (run artifacts ride
 *                       /v1/assets/runs — Phase 2 consolidation 2026-09-04)
 * - /v1/llm/*          → stubs (the assistant lives in DSH)
 * - /v1/flows/events   → the events WS tunnel (raw TCP to gateway)
 *
 * The src/client/ tree carries the browser half (sidebar entry +
 * full-bleed + DeckCanvas + embed-bridge, the last also source-imported
 * by melite-card-view); the shared tsdown preset builds lib/client.js.
 *
 * Failure policy: reachable webServer + unreachable gateway = 502 JSON with
 * the verbatim upstream body; handlers never throw.
 */
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import fs from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'ray-card-deck'

export const inject = ['webServer']

export interface Config {
  gatewayUrl?: string
  timeoutMs?: number
}

const DEFAULT_GATEWAY_URL = 'http://localhost:33081'
const DEFAULT_TIMEOUT_MS = 20_000
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/** Ids the gateway accepts (model ids, run ids): conservative allowlist. */
function safeId(v: unknown): string | null {
  if (typeof v !== 'string' || v === '') return null
  return /^[A-Za-z0-9_.@-]{1,120}$/.test(v) ? v : null
}

export function apply(ctx: Context, config: Config = {}): void {
  const gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const upstream = (path: string, init?: RequestInit): Promise<Response> =>
    fetch(`${gatewayUrl}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })

  ctx.logger.info('ray-card-deck proxying gateway %s', gatewayUrl)

  // ── THE REAL CARD CANVAS ──────────────────────────────────────────────
  // The old Library tab (card-authoring canvas: tiles land in the grid one
  // after another, click zooms IN PLACE, drag-to-wire, run lands results)
  // SURVIVED in web/editor/src/surfaces/{library,flow}/**. The built
  // dist is served under /editor/ and its same-origin API prefixes proxy
  // to the gateway — exactly the vite dev proxy table.
  // ── THE LLM SEAM (the assistant IS DSH) ──────────────────────────────
  // The editor's own LLM lane (ray gateway keystore: OpenRouter keys,
  // providers, health) is DEAD SURFACE in the DSH embed — the agent and
  // its LLM live in DSH (settings → Models). This prefix route stubs the
  // lane at the wire: the embed never fetches the editor keystore (and
  // never receives its API key). Longest-prefix match beats the generic
  // /v1 gateway proxy below.
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

  // THE WEB FAMILY (2026-09-02 split): packages/web/dsh (this package, the
  // DSH panels) and packages/web/editor are ONE card surface — this host
  // serves the editor's built dist and the chat toolviews embed it in
  // iframes (ONE card design, 1:1; see packages/web/README.md). The dist
  // path is FAMILY-RELATIVE and machine-independent: this file builds to
  // <pkg>/lib/, the editor dist sits at packages/web/editor/dist — TWO
  // levels up from lib lands on packages/web, then 'editor/dist'.
  // (2026-09-10 depth fix: the default carried three '..' — one too many
  // since the family split — resolving to packages/editor/dist, so /editor
  // 404'd while the chat toolviews' iframes failed in the console. The
  // python gate that once validated this depth was deleted in the TS flip;
  // test/editor-dist.test.mjs now asserts the built default resolves to a
  // real index.html.)
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

  // Run artifacts live in data/runs and ride the /v1 proxy at
  // /v1/assets/runs (Phase 2 consolidation, 2026-09-04) — no separate
  // prefix needed; /editor stays purely static.
  for (const prefix of ['/v1', '/comfyui', '/poser', '/health']) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: prefix,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://local')
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const body = chunks.length ? Buffer.concat(chunks) : undefined
        try {
          const response = await upstream(url.pathname + url.search, {
            method: req.method,
            headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
            body: body && body.length > 0 ? body : undefined,
          })
          const buf = Buffer.from(await response.arrayBuffer())
          const h: Record<string, string> = {}
          for (const [k, v] of response.headers) if (typeof v === 'string') h[k] = v
          // (2026-09-01 the truncated-JSON fix) fetch() DECOMPRESSES the
          // body when upstream gzipped it — the upstream content-length
          // then describes the COMPRESSED size. Keeping it made Node
          // truncate every response to the gzip size (the "unterminated
          // string at column 157" that killed the card view). Drop the
          // stale length and state the true byte count.
          delete h['content-encoding']
          delete h['transfer-encoding']
          h['content-length'] = String(buf.length)
          res.writeHead(response.status, h)
          res.end(buf)
        } catch (e) {
          res.writeHead(502, JSON_HEADERS)
          res.end(JSON.stringify({ error: 'gateway_unreachable', message: String(e) }))
        }
      },
    }), `ray-card-deck: ${prefix} gateway proxy`)
  }

  // ── THE EVENTS WS TUNNEL (2026-09-04 live bug: 'no feedback from the
  // comfyui webhooks' inside the DSH embed) ─────────────────────────────
  // The buffered /v1 prefix proxy above answers every WS Upgrade with
  // 502 — fetch() cannot upgrade. The editor's live progress stream
  // (streamFlowEvents) therefore died on connect inside the DSH
  // origin and the card ran silent. registerUpgrade tunnels at EXACT
  // paths only, so the client uses the BARE /v1/flows/events with
  // ?run_id=<id>; this handler opens a RAW TCP socket to the gateway,
  // replays the handshake with the gateway's PATH form, and pipes
  // bytes both ways. The 700ms status poll stays the terminal
  // authority; this tunnel only carries the intra-tick frames.
  ctx.effect(() => ctx.webServer.registerUpgrade({
    path: '/v1/flows/events',
    handler: (req, socket, head) => {
      try {
        const gw = new URL(gatewayUrl)
        const port = Number(gw.port || (gw.protocol === 'https:' ? 443 : 80))
        const url = new URL(req.url ?? '/?run_id=', 'http://dsh.local')
        const runId = url.searchParams.get('run_id') ?? url.searchParams.get('id') ?? ''
        if (!safeId(runId)) {
          socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
          socket.destroy()
          return
        }
        const key = req.headers['sec-websocket-key'] ?? ''
        const sub = req.headers['sec-websocket-protocol']
        const ver = req.headers['sec-websocket-version'] ?? '13'
        const reqLines = [
          `GET /v1/flows/events/${runId} HTTP/1.1`,
          `Host: ${gw.host}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${key}`,
          `Sec-WebSocket-Version: ${ver}`,
          ...(typeof sub === 'string' && sub ? [`Sec-WebSocket-Protocol: ${sub}`] : []),
          '',
          '',
        ]
        const upstreamSock = net.connect({ host: gw.hostname, port }, () => {
          upstreamSock.write(reqLines.join('\r\n'))
          if (head.length) upstreamSock.write(head)
        })
        upstreamSock.on('error', () => {
          socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n')
          socket.destroy()
        })
        upstreamSock.on('data', (c: Buffer) => socket.write(c))
        socket.on('data', (c: Buffer) => upstreamSock.write(c))
        upstreamSock.on('close', () => socket.destroy())
        socket.on('close', () => upstreamSock.destroy())
        socket.on('error', () => upstreamSock.destroy())
      } catch {
        socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n')
        socket.destroy()
      }
    },
  }), 'ray-card-deck: events WS tunnel')

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
