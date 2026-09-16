/**
 * postManage — the manage wire door's full contract, pinned WITHOUT
 * the panel (unit level, fakes-not-mocks: fetch is replaced whole and
 * answers the client-request frame; every reply shape is asserted by
 * deep-equal on the returned envelope):
 *
 *   frame     — the client-request shape + rpcId correlation + the
 *               optional abort signal ride;
 *   refusals  — HTTP non-2xx, malformed frames/results/envelopes, and
 *               refused RemoteErrors all answer as honest REFUSAL
 *               replies (never a throw past the panel);
 *   aborts    — cancellation rethrows (the caller's);
 *   rpc ids   — crypto.randomUUID when present, the hand-rolled arm
 *               where the browser standard is absent.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { postManage } from '../assets-tab.tsx'

interface Frame {
  type?: string
  rpcId?: string
  method?: string
  payload?: { args?: { doc?: Record<string, unknown> } }
}

function frameOf(init?: RequestInit): Frame {
  return JSON.parse(String(init?.body)) as Frame
}

function answer(value: unknown, rpcId: string): Response {
  return new Response(
    JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function refused(message: string, rpcId: string, details?: unknown): Response {
  return new Response(
    JSON.stringify({
      type: 'server-response',
      rpcId,
      result: { ok: false, error: { message, ...(details === undefined ? {} : { details }) } },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postManage — the frame', () => {
  it('posts the client-request frame and narrows the envelope', async () => {
    let seen: Frame = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      seen = frameOf(init)
      return answer(
        { action: 'status', ok: true, detail: 'up', data: { a: 1 } },
        String(seen.rpcId),
      )
    }))
    const reply = await postManage('status', {})
    expect(reply).toEqual({ action: 'status', ok: true, detail: 'up', data: { a: 1 } })
    expect(seen.type).toBe('client-request')
    expect(seen.method).toBe('manage/act')
    expect(typeof seen.rpcId).toBe('string')
    expect(seen.payload?.args?.doc).toEqual({ action: 'status' })
  })

  it('the abort signal rides the fetch (cancellation is the caller\'s)', async () => {
    let signal: unknown
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      signal = (init as Record<string, unknown>)['signal']
      return answer({ action: 'x', ok: true, detail: '' }, String(frameOf(init).rpcId))
    }))
    const ctrl = new AbortController()
    await postManage('status', {}, ctrl.signal)
    expect(signal).toBe(ctrl.signal)
  })

  it('an abort rethrows (never absorbed into a refusal)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      const e = new Error('aborted')
      e.name = 'AbortError'
      throw e
    }))
    await expect(postManage('status', {})).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('postManage — channel surprises answer as refusals', () => {
  it('an HTTP non-2xx is a refusal naming the status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    expect(await postManage('restart', { force: true })).toEqual({
      action: 'restart',
      ok: false,
      detail: 'manage wire: HTTP 503',
    })
  })

  it('a malformed response frame is a refusal (wrong type, wrong rpcId)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      const rpcId = String(frameOf(init).rpcId)
      return new Response(JSON.stringify({ type: 'server-event', rpcId }), { status: 200 })
    }))
    expect(await postManage('status', {})).toEqual({
      action: 'status',
      ok: false,
      detail: 'manage wire: malformed response frame',
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ type: 'server-response', rpcId: 'foreign', result: { ok: true, value: {} } }),
      { status: 200 },
    )))
    expect(await postManage('status', {})).toEqual({
      action: 'status',
      ok: false,
      detail: 'manage wire: malformed response frame',
    })
  })

  it('a malformed result is a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      const rpcId = String(frameOf(init).rpcId)
      return new Response(JSON.stringify({ type: 'server-response', rpcId, result: null }), { status: 200 })
    }))
    expect(await postManage('status', {})).toEqual({
      action: 'status',
      ok: false,
      detail: 'manage wire: malformed result',
    })
  })

  it('an ok envelope with a non-object value is a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer('just a string', String(frameOf(init).rpcId))
    }))
    expect(await postManage('status', {})).toEqual({
      action: 'status',
      ok: false,
      detail: 'manage wire: malformed envelope',
    })
  })

  it('a refused envelope without an error frame is a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      const rpcId = String(frameOf(init).rpcId)
      return new Response(
        JSON.stringify({ type: 'server-response', rpcId, result: { ok: false } }),
        { status: 200 },
      )
    }))
    expect(await postManage('status', {})).toEqual({
      action: 'status',
      ok: false,
      detail: 'manage wire: refused without an error frame',
    })
  })

  it('a transport throw carries its message (non-Errors ride String())', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      throw new Error('socket reset')
    }))
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, detail: 'socket reset' })
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      throw 'bare string failure'
    }))
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, detail: 'bare string failure' })
  })
})

describe('postManage — the refusal mapping', () => {
  it('a manage/refused RemoteError maps onto the envelope (action + detail + data ride)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return refused('lifecycle refused while runs are active', String(frameOf(init).rpcId), {
        action: 'restart',
        data: { active_runs: ['r1'] },
      })
    }))
    expect(await postManage('restart', {})).toEqual({
      action: 'restart',
      ok: false,
      detail: 'lifecycle refused while runs are active',
      data: { active_runs: ['r1'] },
    })
  })

  it('missing details fall back to the call action + the honest voice', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return refused('nope', String(frameOf(init).rpcId))
    }))
    // no details member at all — the call's own action names the reply
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, detail: 'nope', data: undefined })
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      const rpcId = String(frameOf(init).rpcId)
      return new Response(
        JSON.stringify({ type: 'server-response', rpcId, result: { ok: false, error: {} } }),
        { status: 200 },
      )
    }))
    // a messageless refusal never passes an empty detail up
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, detail: 'manage wire: refused', data: undefined })
  })

  it('a loosely-typed envelope narrows honestly (non-string action/detail fall back)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer({ action: 42, ok: false, detail: 42, data: null }, String(frameOf(init).rpcId))
    }))
    expect(await postManage('free', {})).toEqual({ action: 'free', ok: false, detail: '', data: null })
  })
})

describe('nextRpcId — the correlation arm', () => {
  it('rides crypto.randomUUID where the browser standard exists', async () => {
    let seen: Frame = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      seen = frameOf(init)
      return answer({ action: 'status', ok: true, detail: '' }, String(seen.rpcId))
    }))
    await postManage('status', {})
    await postManage('status', {})
    expect(typeof seen.rpcId).toBe('string')
    expect(String(seen.rpcId)).not.toBe('')
  })

  it('hand-rolls the id where the standard is absent (non-secure contexts)', async () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', undefined)
    try {
      let seen: Frame = {}
      vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
        seen = frameOf(init)
        return answer({ action: 'status', ok: true, detail: '' }, String(seen.rpcId))
      }))
      const reply = await postManage('status', {})
      expect(reply.ok).toBe(true)
      expect(String(seen.rpcId).startsWith('rpc-')).toBe(true)
    } finally {
      vi.stubGlobal('crypto', real)
    }
  })
})
