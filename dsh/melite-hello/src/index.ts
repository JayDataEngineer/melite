/**
 * `@melite-plugin/dsh-hello` — W0 foundation probe. Registers `GET /melite-health`
 * on the `webServer` service; exists to prove the overlay door end to end:
 * build → `dsh --profile web --patch` → fiber ACTIVE → observable route.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'melite-hello'

/** Routes arrive with the webServer service; none needed for the probe. */
export const inject = ['webServer']

export interface Config {
  /** Value reported by /melite-health (identifies the mounted overlay). */
  greeting?: string
}

/** Minimal structural view of the services apply touches (melite-tools pattern). */
interface CtxView {
  logger: { info(msg: string, ...args: unknown[]): void }
  effect(effect: () => void, label?: string): unknown
  webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler(req: unknown, res: { writeHead(status: number, headers: Record<string, string>): void; end(body?: string): void }): void
    }): unknown
  }
}

export function apply(ctx: Context, config: Config): void {
  const c = ctx as unknown as CtxView
  const greeting = config.greeting ?? 'Melite lane online'
  c.logger.info('%s (melite-hello fiber mounted)', greeting)
  c.effect(() => c.webServer.register({
    kind: 'exact',
    path: '/melite-health',
    handler: (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ plugin: 'melite-hello', greeting, pid: process.pid }))
    },
  }), 'melite-hello: /melite-health route')
}
