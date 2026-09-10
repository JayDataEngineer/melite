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

/** R5: the viewer answers over the estate lanes (in-process) — no
 *  gateway URL, no port; the ctx carries the mounted listeners. */
export interface Config {
  gateway?: string
}

export const Config: Schema<Config> = Schema.object({
  gateway: Schema.string()
    .description('RETIRING: unused — the lanes answer in-process'),
})

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

/** One estate lane read, JSON or bytes (testable in isolation).
 *  THE GATEWAY KILL (2026-09-10): the lanes are dead — every proxy
 *  answers 502 LOUD until the viewer rides named remotes/DHS faces. */
export async function proxyDoor(
  ctx: Context,
  upstreamPath: string,
  json: boolean,
  respond: (status: number, headers: Record<string, string>, body: string | Buffer) => void,
): Promise<void> {
  void ctx; void json;
  respond(502, JSON_HEADERS, JSON.stringify({ error: 'estate_killed', path: upstreamPath }));
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
      await proxyDoor(ctx, `/v1/flows/runs/${encodeURIComponent(runId)}`, true,
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
      await proxyDoor(ctx, `/v1/assets/runs/${rest}`, false,
        (status, headers, body) => { res.writeHead(status, headers); res.end(body) })
    },
  }) as () => void, '@melite/viewer: asset proxy route')
}
