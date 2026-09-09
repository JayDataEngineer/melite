// index.ts — @melite/viewer, host half: the run-viewer composition.
//
// ONE pair of run-scoped same-origin proxy routes serves EVERY run
// card's view (a run id is global on the gateway — no card prefix):
//   GET /melite-viewer/run/<run_id>  → the runs status door (JSON)
//   GET /melite-viewer/asset/<run>/<rel> → the asset door (bytes)
// ALL gateway knowledge stays host-side in Config; the client half
// (the toolview claims) builds only the same-origin URLs from
// @melite/viewer-base/wire (the media-plugin law).
//
// webServer is an OPTIONAL service (the same probe law as the card
// faces): the host that serves the GUI has one; a headless
// composition skips and the claims' gallery simply cannot fetch.
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import Schema from '@deepseek-ai/schemastery'
import { ASSET_ROUTE_PREFIX, RUN_ROUTE_PREFIX } from '@melite/viewer-base/wire'

export const name = '@melite/viewer'

export const inject: string[] = []

export interface Config {
  gateway: string
}

export const Config: Schema<Config> = Schema.object({
  gateway: Schema.string()
    .default(process.env.MELITE_GATEWAY_URL || 'http://localhost:33081')
    .description('The Melite gateway base URL (the run doors the viewer proxies)'),
})

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

/** One proxied fetch of a gateway door, JSON or bytes (testable in isolation). */
export async function proxyDoor(
  gateway: string,
  upstreamPath: string,
  json: boolean,
  respond: (status: number, headers: Record<string, string>, body: string | Buffer) => void,
): Promise<void> {
  try {
    const response = await fetch(gateway + upstreamPath, {
      signal: AbortSignal.timeout(15e3),
      headers: json ? { accept: 'application/json' } : {},
    })
    if (json) {
      respond(response.status, JSON_HEADERS, await response.text())
      return
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    respond(response.status, {
      'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'public, max-age=60',
      'content-length': String(buffer.byteLength),
    }, buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    respond(502, JSON_HEADERS, JSON.stringify({ error: 'gateway_unreachable', message }))
  }
}

export function apply(ctx: Context, config: Config): void {
  const webServer = ctx.get('webServer') as
    | { register(route: { kind: 'prefix'; path: string; handler: (req: {
        url?: string
      }, res: {
        writeHead(status: number, headers?: Record<string, string>): void
        end(data?: Buffer | string): void
      }) => Promise<void> | void }): unknown }
    | undefined
  if (webServer === undefined) return
  const gateway = (config?.gateway ?? '').trim().replace(/\/+$/, '')

  ctx.effect(() => webServer.register({
    kind: 'prefix',
    path: RUN_ROUTE_PREFIX,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://melite-viewer.invalid')
      const runId = decodeURIComponent(url.pathname.slice(RUN_ROUTE_PREFIX.length).replace(/\/+$/, ''))
      if (runId === '') {
        res.writeHead(400, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'missing_run_id' }))
        return
      }
      await proxyDoor(gateway, `/v1/flows/runs/${encodeURIComponent(runId)}`, true,
        (status, headers, body) => { res.writeHead(status, headers); res.end(body) })
    },
  }) as () => void, '@melite/viewer: run proxy route')

  ctx.effect(() => webServer.register({
    kind: 'prefix',
    path: ASSET_ROUTE_PREFIX,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://melite-viewer.invalid')
      const rest = url.pathname.slice(ASSET_ROUTE_PREFIX.length).replace(/\/+$/, '')
      if (rest === '') {
        res.writeHead(400, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'missing_asset_path' }))
        return
      }
      await proxyDoor(gateway, `/v1/assets/runs/${rest}`, false,
        (status, headers, body) => { res.writeHead(status, headers); res.end(body) })
    },
  }) as () => void, '@melite/viewer: asset proxy route')
}
