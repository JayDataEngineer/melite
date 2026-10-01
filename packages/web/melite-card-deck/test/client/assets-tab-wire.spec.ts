import { afterEach, describe, expect, it, vi } from 'vitest'

import { postManage } from '../../src/client/assets-tab.tsx'

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

describe('postManage frame', () => {
  it('posts the client-request frame and narrows the envelope', async () => {
    let seen: Frame = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      seen = frameOf(init)
      return answer({ action: 'status', ok: true, detail: 'up', data: { a: 1 } }, String(seen.rpcId))
    }))
    const reply = await postManage('status', {})
    expect(reply).toEqual({ action: 'status', ok: true, detail: 'up', data: { a: 1 } })
    expect(seen.type).toBe('client-request')
    expect(seen.method).toBe('manage/act')
    expect(typeof seen.rpcId).toBe('string')
    expect(seen.payload?.args?.doc).toEqual({ action: 'status' })
  })

  it('carries the optional abort signal', async () => {
    let signal: unknown
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      signal = (init as Record<string, unknown>)['signal']
      return answer({ action: 'x', ok: true, detail: '' }, String(frameOf(init).rpcId))
    }))
    const controller = new AbortController()
    await postManage('status', {}, controller.signal)
    expect(signal).toBe(controller.signal)
  })

  it('rethrows cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    }))
    await expect(postManage('status', {})).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('postManage channel refusals', () => {
  it('maps HTTP status and code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    expect(await postManage('restart', { force: true })).toEqual({
      action: 'restart',
      ok: false,
      code: 'manage/http',
      status: 503,
      detail: 'manage wire: HTTP 503',
    })
  })

  it('rejects malformed response frames', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({ type: 'server-event', rpcId: frameOf(init).rpcId }), { status: 200 })
    }))
    expect(await postManage('status', {})).toEqual({ action: 'status', ok: false, code: 'manage/wire', detail: 'manage wire: malformed response frame' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ type: 'server-response', rpcId: 'foreign', result: { ok: true, value: {} } }),
      { status: 200 },
    )))
    expect(await postManage('status', {})).toEqual({ action: 'status', ok: false, code: 'manage/wire', detail: 'manage wire: malformed response frame' })
  })

  it('rejects malformed results and envelopes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frameOf(init).rpcId, result: null }), { status: 200 })
    }))
    expect(await postManage('status', {})).toEqual({ action: 'status', ok: false, code: 'manage/wire', detail: 'manage wire: malformed result' })
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer('just a string', String(frameOf(init).rpcId))
    }))
    expect(await postManage('status', {})).toEqual({ action: 'status', ok: false, code: 'manage/wire', detail: 'manage wire: malformed envelope' })
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frameOf(init).rpcId, result: { ok: false } }), { status: 200 })
    }))
    expect(await postManage('status', {})).toEqual({ action: 'status', ok: false, code: 'manage/wire', detail: 'manage wire: refused without an error frame' })
  })

  it('maps Error and bare-string transports', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => { throw new Error('socket reset') }))
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, code: 'manage/transport', detail: 'socket reset' })
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => { throw 'bare string failure' }))
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, code: 'manage/transport', detail: 'bare string failure' })
  })
})

describe('postManage contract fields', () => {
  it('maps a RemoteError refusal with code, status, state, operation, and flags', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return refused('partial provisioning', String(frameOf(init).rpcId), {
        action: 'provision_model',
        status: 500,
        code: 'manage/refused',
        data: {
          state: 'partial',
          operation_id: 'op-1',
          partial: true,
          restart_required: false,
          next_action: 'provision_model',
          items: [],
        },
      })
    }))
    expect(await postManage('provision_model', {})).toEqual({
      action: 'provision_model',
      ok: false,
      detail: 'partial provisioning',
      data: {
        state: 'partial',
        operation_id: 'op-1',
        partial: true,
        restart_required: false,
        next_action: 'provision_model',
        items: [],
      },
      code: 'manage/refused',
      status: 500,
      state: 'partial',
      operation_id: 'op-1',
      partial: true,
      restart_required: false,
      next_action: 'provision_model',
    })
  })

  it('falls back to the call action and honest refusal values', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return refused('nope', String(frameOf(init).rpcId))
    }))
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, code: 'manage/refused', detail: 'nope', data: undefined })
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frameOf(init).rpcId, result: { ok: false, error: {} } }), { status: 200 })
    }))
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, code: 'manage/refused', detail: 'manage wire: refused', data: undefined })
  })

  it('narrows loosely typed success envelopes without inventing fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer({ action: 42, ok: false, detail: 42, data: null }, String(frameOf(init).rpcId))
    }))
    expect(await postManage('free', {})).toEqual({ action: 'free', ok: false, detail: '', data: null })
  })

  it('extracts top-level contract fields and falls back to data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer({
        action: 'install_extension',
        ok: true,
        detail: 'installed',
        state: 'restart_required',
        next_action: 'restart',
        operation_id: 'op-top',
        partial: false,
        restart_required: true,
        data: { state: 'active', operation_id: 'op-data' },
      }, String(frameOf(init).rpcId))
    }))
    expect(await postManage('install_extension', {})).toMatchObject({
      state: 'restart_required',
      next_action: 'restart',
      operation_id: 'op-top',
      partial: false,
      restart_required: true,
    })

    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return answer({
        action: 'snapshot_restore',
        ok: true,
        detail: 'restored',
        data: { state: 'restart_required', operation_id: 'op-data', restart_required: true, next_action: 'restart' },
      }, String(frameOf(init).rpcId))
    }))
    expect(await postManage('snapshot_restore', {})).toMatchObject({
      state: 'restart_required',
      operation_id: 'op-data',
      restart_required: true,
      next_action: 'restart',
    })
  })
})

describe('nextRpcId', () => {
  it('uses crypto.randomUUID when available', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
      seen.push(String(frameOf(init).rpcId))
      return answer({ action: 'status', ok: true, detail: '' }, seen[seen.length - 1] ?? '')
    }))
    await postManage('status', {})
    await postManage('status', {})
    expect(seen[0]).not.toBe('')
    expect(seen[1]).not.toBe('')
  })

  it('falls back where crypto is absent', async () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', undefined)
    try {
      let seen = ''
      vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
        seen = String(frameOf(init).rpcId)
        return answer({ action: 'status', ok: true, detail: '' }, seen)
      }))
      const reply = await postManage('status', {})
      expect(reply.ok).toBe(true)
      expect(seen.startsWith('rpc-')).toBe(true)
    } finally {
      vi.stubGlobal('crypto', real)
    }
  })
})
