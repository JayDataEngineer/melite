// comfy_manage walls (vitest, estate mocked — no gateway, no
// ComfyUI). Pins the ONE manager face over the manage seat:
//   1. ENVELOPE: only declared fields ride the /v1/manage POST
//      (extra=forbid at the seat); blank/omitted fields stay out.
//   2. MISWIRE: no exec signal refuses LOUD as a value (never a
//      detached call).
//   3. REFUSALS: manage/refused CARRYING the envelope (string
//      action) surfaces as the value (data defaults null); any
//      other failure rethrows — a refusal IS the answer, a crash
//      is a crash.
//   4. PRESENTATION: ComfyUI <action> card; the render names
//      action + detail, never throwing on junk.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { comfyManage } from '../src/tools/comfy-manage.ts'
import type { EstateRequest } from '../src/estate.ts'

function mockRequest(handler: (method: string, path: string, body: unknown) => unknown): {
  seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }>;
  request: EstateRequest;
} {
  const seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }> = []
  const request = (async (method, path, body, _signal, timeoutMs) => {
    seen.push({ method: method as string, path: path as string, body, timeoutMs: timeoutMs as number })
    return handler(method as string, path as string, body)
  }) as unknown as EstateRequest
  return { seen, request }
}

function exec(): { signal: AbortSignal } {
  return { signal: AbortSignal.timeout(5000) }
}

function stubRequest(): EstateRequest {
  return (async () => ({})) as unknown as EstateRequest
}

describe('comfy_manage presentCall — the ComfyUI card', () => {
  test('names the action', () => {
    const tool = comfyManage(stubRequest())
    const view = tool.presentCall!({ action: 'status' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'ComfyUI status')
    assert.equal(view?.kind, 'execute')
    assert.equal(view?.rawInput, 'status')
  })

  test('junk actions fall back to ?', () => {
    const tool = comfyManage(stubRequest())
    assert.equal(tool.presentCall!({})?.title, 'ComfyUI ?')
    assert.equal(tool.presentCall!(null)?.title, 'ComfyUI ?')
    assert.equal(tool.presentCall!('junk')?.title, 'ComfyUI ?')
  })
})

describe('comfy_manage render — the action line', () => {
  test('names action + detail', () => {
    const tool = comfyManage(stubRequest())
    const parts = tool.output.render(
      { action: 'restart' },
      { ok: true, action: 'restart', detail: 'done' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'comfy_manage restart: done')
  })

  test('missing fields fall back', () => {
    const tool = comfyManage(stubRequest())
    const parts = tool.output.render({ action: 'status' }, {} as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'comfy_manage ?: ')
  })
})

describe('comfy_manage execute — the exec-signal miswire', () => {
  test('a missing exec refuses loud as a value', async () => {
    const { seen, request } = mockRequest(() => ({ ok: true }))
    const tool = comfyManage(request)
    const out = await tool.execute(
      { action: 'status' },
      undefined as unknown as { signal: AbortSignal },
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'status')
    assert.ok(String(out.detail).includes('miswire'), String(out.detail))
    assert.equal(seen.length, 0)
  })

  test('a signalless exec refuses the same way', async () => {
    const { seen, request } = mockRequest(() => ({ ok: true }))
    const tool = comfyManage(request)
    const out = await tool.execute(
      { action: 'status' },
      {} as unknown as { signal: AbortSignal },
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'status')
    assert.equal(seen.length, 0)
  })
})

describe('comfy_manage execute — the manage lane', () => {
  const FULL = {
    action: 'download_model',
    nodes: ['Pack-A'],
    url: 'https://example.invalid/m.safetensors',
    relative_path: 'models/checkpoints',
    filename: 'm.safetensors',
    model: 'z-image',
    variant: 'v1',
    quant: 'q8',
    query: 'flux',
    tail: 50,
    version: '1.2.3',
    target: 'comfy',
    force: true,
    snapshot: 'pre-update.snap',
  }

  test('declared fields ride the 300s POST; undeclared never do', async () => {
    const { seen, request } = mockRequest(() => ({ ok: true, action: 'download_model', detail: 'fetched', data: { f: 1 } }))
    const tool = comfyManage(request)
    const out = await tool.execute({ ...FULL, junk: 'dropped' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.equal(out.action, 'download_model')
    assert.equal(out.detail, 'fetched')
    assert.deepEqual(out.data, { f: 1 })
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.method, 'POST')
    assert.equal(seen[0]!.path, '/v1/manage')
    assert.equal(seen[0]!.timeoutMs, 300_000)
    const body = seen[0]!.body as Record<string, unknown>
    assert.deepEqual(body, FULL)
  })

  test('blank and omitted fields stay out of the envelope', async () => {
    const { seen, request } = mockRequest(() => ({ ok: true, action: 'status', detail: 'fine' }))
    const tool = comfyManage(request)
    await tool.execute({ action: 'status', url: '', tail: 10 }, exec())
    assert.deepEqual(seen[0]!.body, { action: 'status', tail: 10 })
  })

  test('a falsy envelope still maps (ok:false, data:null)', async () => {
    const { request } = mockRequest(() => ({ ok: false, action: 'status', detail: 'guarded' }))
    const tool = comfyManage(request)
    const out = await tool.execute({ action: 'status' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'status')
    assert.equal(out.detail, 'guarded')
    assert.equal(out.data, null)
  })
})

describe('comfy_manage execute — refusals ARE the answer', () => {
  test('manage/refused carrying the envelope surfaces as the value', async () => {
    const { seen, request } = mockRequest(() => {
      throw new RemoteError('manage/refused', 'lifecycle refused: 2 runs active', {
        action: 'restart',
        status: 409,
        data: { runs: 2 },
      })
    })
    const tool = comfyManage(request)
    const out = await tool.execute({ action: 'restart' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'restart')
    assert.equal(out.detail, 'lifecycle refused: 2 runs active')
    assert.deepEqual(out.data, { runs: 2 })
    assert.equal(seen.length, 1)
  })

  test('a dataless refusal defaults data to null', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('manage/refused', 'catalog miss', { action: 'stop' })
    })
    const tool = comfyManage(request)
    const out = await tool.execute({ action: 'stop' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'stop')
    assert.equal(out.detail, 'catalog miss')
    assert.equal(out.data, null)
  })

  test('manage/refused without a string action rethrows', async () => {
    const refusal = new RemoteError('manage/refused', 'shapeless', { data: 1 })
    const { request } = mockRequest(() => { throw refusal })
    const tool = comfyManage(request)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /shapeless/)
  })

  test('manage/refused without details rethrows', async () => {
    const refusal = new RemoteError('manage/refused', 'detail-less')
    const { request } = mockRequest(() => { throw refusal })
    const tool = comfyManage(request)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /detail-less/)
  })

  test('any other remote code rethrows', async () => {
    const refusal = new RemoteError('manage/broken', 'seat blew up', { action: 'free' })
    const { request } = mockRequest(() => { throw refusal })
    const tool = comfyManage(request)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /seat blew up/)
  })

  test('a plain transport failure rethrows', async () => {
    const { request } = mockRequest(() => { throw new Error('down') })
    const tool = comfyManage(request)
    await assert.rejects(tool.execute({ action: 'logs', tail: 5 }, exec()) as Promise<unknown>, /down/)
  })
})
