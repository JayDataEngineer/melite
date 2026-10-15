import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { BenchVerb, Estate } from '../src/estate.ts'

/** One lane the fake serves: (…args) → answer. Recording is uniform:
 * every call appends { lane, args } to `seen`, so tool tests assert
 * the TYPED lane a tool rode — never a URL spelling (F-1, 2026-11-05:
 * the URL grammar is the browser face's own; the tool plane's tests
 * speak its typed seam). */
export interface FakeLane {
  // never[] params: lane thunks declare their real parameter shapes
  // (body/signal/timeout) and stay assignable — unknown[] would
  // force every thunk to widen its own params to unknown.
  (...args: never[]): unknown
}

export interface FakeEstate {
  estate: Estate
  seen: Array<{ lane: string, args: unknown[] }>
}

/** Builds an Estate whose every method delegates to the lane thunk of
 * the same name; an UN-stubbed lane rejects naming itself (a tool
 * reaching an un-mocked lane is a test-design bug, never a silent
 * undefined). */
export function fakeEstate(lanes: Record<string, FakeLane>): FakeEstate {
  const seen: FakeEstate['seen'] = []
  const refuse = (lane: string): FakeLane => {
    return () => {
      throw new Error(`fakeEstate: lane ${lane} is not stubbed in this test`)
    }
  }
  const names = [
    'draftsList', 'draftsGet', 'draftsStagePatch', 'cardCompose',
    'benchGet', 'benchEnsure', 'benchVerb',
    'runsValidate', 'runsStart', 'runsStatus', 'runsStop', 'runsList',
    'discover', 'flowsContracts', 'manageAct', 'skillsIndex', 'skillRead',
    'loadCard', 'ledgerTail',
  ] as const
  const estate = {} as Record<string, unknown>
  for (const name of names) {
    const lane = lanes[name] ?? refuse(name)
    estate[name] = async (...args: unknown[]): Promise<unknown> => {
      seen.push({ lane: name, args })
      return await (lane as (...a: unknown[]) => unknown)(...args)
    }
  }
  return { estate: estate as unknown as Estate, seen }
}

/** Type re-export so specs import the seam from one home. */
export type { BenchVerb }

/** Status-voiced variant for specs whose fixtures answer in the
 * door's {status, body} contract: a 2xx resolves the body, a 4xx
 * throws the lane's RemoteError voice (bench* 404 → bench/not-found,
 * any other 4xx → runs/flow-compile carrying the body's error text),
 * and an unhandled lane throws runs/unknown-run naming itself. This
 * is the typed-lane re-home of the URL-status fixtures: the voices
 * are the seats' law, only the dispatch changed. */
export function fakeEstateStatus(
  handlers: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined>,
): {
  estate: Estate
  calls: Array<{ lane: string, args: unknown[] }>
} {
  const calls: Array<{ lane: string, args: unknown[] }> = []
  const dispatch = async (lane: string, args: unknown[]): Promise<unknown> => {
    calls.push({ lane, args })
    for (const h of handlers) {
      const r = h(lane, args)
      if (r !== undefined) {
        if (r.status < 200 || r.status >= 300) {
          const body = typeof r.body === 'object' && r.body !== null ? r.body as Record<string, unknown> : {}
          const msg = typeof body['error'] === 'string' ? body['error'] : 'mock refusal'
          if (lane.startsWith('bench') && r.status === 404) {
            throw new RemoteError('bench/not-found', msg, { session: 'main' })
          }
          throw new RemoteError('runs/flow-compile', msg, { loc: 'flow' })
        }
        return r.body
      }
    }
    throw new RemoteError('runs/unknown-run', 'unmocked lane ' + lane, { runId: '' })
  }
  const names = [
    'draftsList', 'draftsGet', 'draftsStagePatch', 'cardCompose',
    'benchGet', 'benchEnsure', 'benchVerb',
    'runsValidate', 'runsStart', 'runsStatus', 'runsStop', 'runsList',
    'discover', 'flowsContracts', 'manageAct', 'skillsIndex', 'skillRead',
    'loadCard', 'ledgerTail',
  ] as const
  const estate = {} as Record<string, unknown>
  for (const name of names) {
    estate[name] = async (...args: unknown[]): Promise<unknown> => dispatch(name, args)
  }
  return { estate: estate as unknown as Estate, calls }
}

/** Shared-recording variant for specs whose handlers dispatch on
 * the lane themselves: every call appends { lane, args, timeoutMs }
 * to the caller's `seen` before delegating — the handler IS the stub. */
export function fakeEstateRecorded(
  seen: Array<{ lane: string, args: unknown[], timeoutMs?: number }>,
  handler: (lane: string, args: unknown[]) => unknown,
): { estate: Estate } {
  const names = [
    'draftsList', 'draftsGet', 'draftsStagePatch', 'cardCompose',
    'benchGet', 'benchEnsure', 'benchVerb',
    'runsValidate', 'runsStart', 'runsStatus', 'runsStop', 'runsList',
    'discover', 'flowsContracts', 'manageAct', 'skillsIndex', 'skillRead',
    'loadCard', 'ledgerTail',
  ] as const
  const estate = {} as Record<string, unknown>
  for (const name of names) {
    estate[name] = async (...args: unknown[]): Promise<unknown> => {
      const timeoutMs = typeof args.at(-1) === 'number' ? args.at(-1) as number : undefined
      seen.push({ lane: name, args, timeoutMs })
      return await handler(name, args)
    }
  }
  return { estate: estate as unknown as Estate }
}
