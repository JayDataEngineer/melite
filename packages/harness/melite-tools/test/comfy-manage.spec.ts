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
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { comfyManage } from '../src/tools/comfy-manage.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate } from './fake-estate.ts'
import type { JsonValue } from '../src/types.ts'
import { fakeExec } from './fake-exec.ts'

// The render's value is the tool's own ManageResult (a JsonValue); the
// walls feed literals/rows that are JSON by construction.
const asJson = (value: unknown): JsonValue => value as JsonValue

// The foreign seat's undeclared failure code this wall simulates —
// declared here (type-only, erased at runtime) so the RemoteError seam
// accepts the shape a real seat would throw.
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'manage/broken': { readonly action?: string };
  }
}
import { dispatchManage } from '../../estate-queue/src/managePlane.ts'
import type { ManageCtx } from '../../estate-queue/src/managePlane.ts'

/** The typed-lane mock (F-1, 2026-11-05): the tool plane's tests
 * stub the ESTATE seam, never a URL transport. `seen` records the
 * lane a tool rode; manage is this spec's one lane. */
function mockEstate(handler: (body: unknown) => unknown): {
  seen: Array<{ lane: string; body: unknown; timeoutMs?: number }>;
  estate: Estate;
} {
  const seen: Array<{ lane: string; body: unknown; timeoutMs?: number }> = []
  const { estate } = fakeEstate({
    manageAct: (body: unknown, _signal: AbortSignal, timeoutMs?: number) => {
      seen.push({ lane: 'manageAct', body, timeoutMs })
      return handler(body)
    },
  })
  return { seen, estate }
}

function stubEstate(): Estate {
  return fakeEstate({ manageAct: () => ({}) }).estate
}

function exec() {
  return fakeExec(AbortSignal.timeout(5000))
}

describe('comfy_manage operator_confirmed rides the wire (verify-batch31 D3)', () => {
  test('a flagged install forwards the flag; an unflagged one never sends false', async () => {
    const flagged = mockEstate(() => ({ ok: true, action: 'install_extension_url', items: [], state: 'restart_required' }))
    const tool = comfyManage(flagged.estate)
    const out = await tool.execute({ action: 'install_extension_url', url: 'https://example.invalid/pack', ref: 'pack', operator_confirmed: true }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], true)
    const sent = flagged.seen[0]?.body as Record<string, unknown>
    assert.equal(sent['operator_confirmed'], true)
    assert.equal(sent['url'], 'https://example.invalid/pack')

    const unflagged = mockEstate(() => ({ ok: true, action: 'install_extension_url', items: [], state: 'restart_required' }))
    const tool2 = comfyManage(unflagged.estate)
    await tool2.execute({ action: 'install_extension_url', url: 'https://example.invalid/pack' }, exec())
    const sent2 = unflagged.seen[0]?.body as Record<string, unknown>
    assert.equal('operator_confirmed' in sent2, false, 'an unset flag never rides as false')
  })
})

describe('comfy_manage presentCall — the ComfyUI card', () => {
  test('names the action', () => {
    const tool = comfyManage(stubEstate())
    const view = tool.presentCall!({ action: 'status' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'ComfyUI status')
    assert.equal(view?.kind, 'execute')
    assert.equal(view?.rawInput, 'status')
  })

  test('junk actions are refused by the gate (single seat — no re-attached fallback)', () => {
    const tool = comfyManage(stubEstate())
    // (§7 P7: action is required — the gate owns the invalid face.)
    assert.equal(tool.presentCall!({}), undefined)
    assert.equal(tool.presentCall!(null), undefined)
    assert.equal(tool.presentCall!('junk'), undefined)
  })
})

describe('comfy_manage render — the action line', () => {
  test('names action + detail', () => {
    const tool = comfyManage(stubEstate())
    const parts = tool.output.render(
      { action: 'restart' },
      { ok: true, action: 'restart', detail: 'done' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'comfy_manage restart: done')
  })

  test('missing fields fall back', () => {
    const tool = comfyManage(stubEstate())
    const parts = tool.output.render({ action: 'status' }, {} as never) as Array<{ text?: string }>
     assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'comfy_manage ?: \nREFUSED: manage/refused')
  })

  test('renders nested status, rows, and provisioning actions for the agent', () => {
    const tool = comfyManage(stubEstate())
    const text = (value: unknown): string => (tool.output.render({}, asJson(value)) as Array<{ text?: string }>)
      .map((part) => part.text ?? '').join('\n')
    const status = text({
      ok: true,
      action: 'status',
      detail: 'server up',
      data: {
        state: 'up',
        endpoint: { reachable: true, url: 'http://engine:8188' },
        manager: { reachable: true, version: { v: 1 }, queue: { pending: 0 }, security: 'normal' },
        resources: [{ ref: { kind: 'extension', id: 'pack' }, state: 'restart_required' }],
        operations: [{ operation_id: 'op-1', name: 'pack', state: 'restart_required' }],
        next_action: 'restart',
      },
      next_action: 'restart',
    })
    assert.match(status, /endpoint: reachable · http:\/\/engine:8188/)
    assert.match(status, /manager: reachable/)
    assert.match(status, /resource: extension\/pack · restart_required/)
    assert.match(status, /operation op-1 · pack · restart_required/)
    assert.match(status, /next_action: restart/)

    const rows = text({ ok: true, action: 'search_models', detail: '1 hit(s)', data: [{ name: 'M', type: 'lora', filename: 'm.bin' }] })
     assert.match(rows, /M \(lora\) — m\.bin/)
     assert.doesNotMatch(rows, /next_action: provision_model/)
    assert.match(text({ ok: true, action: 'logs', detail: '1 line(s)', data: ['engine ready'] }), /engine ready/)

    const provision = text({
      ok: false,
      action: 'install_extension',
      detail: 'partial (1/2 extension(s) succeeded)',
      state: 'partial',
      operation_id: 'op-1',
       requested: ['pack', 'ghost'],
       succeeded: ['pack'],
       missed: ['ghost'],
       misses: ['ghost: not declared'],
       items: [{ key: 'extension:pack', name: 'pack', outcome: 'restart_required' }],
      operations: [{ operation_id: 'op-1', name: 'pack', state: 'restart_required' }],
      next_action: 'status',
    })
    assert.match(provision, /state: partial/)
     assert.match(provision, /missed: ghost/)
     assert.match(provision, /misses: ghost: not declared/)
     assert.match(provision, /item: pack — restart_required/)
    assert.match(provision, /next_action: status/)
  })
})

describe('comfy_manage execute — the exec-signal miswire', () => {
  test('a missing exec refuses loud as a value', async () => {
    const { seen, estate } = mockEstate(() => ({ ok: true }))
    const tool = comfyManage(estate)
    const out = await tool.execute(
      { action: 'status' },
      undefined as unknown as ToolRunContext,
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'status')
     assert.ok(String(out.detail).includes('miswire'), String(out.detail))
     assert.equal(out.code, 'manage/miswire')
     assert.equal(out.status, 500)
     assert.match(String(out.error), /miswire/)
     assert.equal(seen.length, 0)
  })

  test('a signalless exec refuses the same way', async () => {
    const { seen, estate } = mockEstate(() => ({ ok: true }))
    const tool = comfyManage(estate)
    const out = await tool.execute(
      { action: 'status' },
      {} as unknown as ToolRunContext,
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
    const { seen, estate } = mockEstate(() => ({ ok: true, action: 'download_model', detail: 'fetched', data: { f: 1 } }))
    const tool = comfyManage(estate)
    const out = await tool.execute({ ...FULL, junk: 'dropped' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.equal(out.action, 'download_model')
    assert.equal(out.detail, 'fetched')
    assert.deepEqual(out.data, { f: 1 })
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.lane, 'manageAct')
    assert.equal(seen[0]!.timeoutMs, 300_000)
    const body = seen[0]!.body as Record<string, unknown>
    assert.deepEqual(body, FULL)
  })

  // THE LORA DOORS (2026-10-15, the roadmap's gate): both actions
  // ride the enum, the install door's own params (the copy path,
  // the upload bytes, the families suggestion) forward to the
  // estate leg, and a refusal keeps its voice through the tool
  // face — the model reads WHY, never a bare error.
  test('the lora doors ride the enum, forward their fields, and keep the refusal voice', async () => {
    const { seen, estate } = mockEstate(() => ({ ok: true }))
    const tool = comfyManage(estate)
    const params = tool.parameters as { properties?: Record<string, { enum?: string[] }> }
    const actions = params.properties?.['action']?.enum ?? []
    assert.ok(actions.includes('lora_list'), 'lora_list on the enum')
    assert.ok(actions.includes('lora_install'), 'lora_install on the enum')
    // the copy arm forwards path + families (the row suggestion)
    await tool.execute({ action: 'lora_install', path: '/abs/mine.safetensors', families: ['h3'] }, exec())
    let body = seen[0]!.body as Record<string, unknown>
    assert.equal(body['action'], 'lora_install')
    assert.equal(body['path'], '/abs/mine.safetensors')
    assert.deepEqual(body['families'], ['h3'])
    // the bytes arm forwards data + filename (no path at all)
    await tool.execute({ action: 'lora_install', data: 'data:application/octet-stream;base64,AAAA', filename: 'm.safetensors' }, exec())
    body = seen[1]!.body as Record<string, unknown>
    assert.equal(body['data'], 'data:application/octet-stream;base64,AAAA')
    assert.equal(body['filename'], 'm.safetensors')
    assert.equal(body['path'], undefined, 'the bytes arm rides no path')
    // a refusal IS the answer: the estate's manage/refused carries
    // the plane's own detail through
    const { estate: refused } = mockEstate(() => {
      throw new RemoteError('manage/refused', 'lora_install requires: path', {
        action: 'lora_install',
        status: 422,
        data: { install_dir: '/loras' },
      })
    })
    const refusing = comfyManage(refused)
    const out = await refusing.execute({ action: 'lora_install' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.match(String(out.detail), /requires: path/)
    assert.equal(out.action, 'lora_install')
    assert.equal(out.status, 422)
  })

  // THE REFMODS LISTING DOOR (2026-11-05, the timeline card's mods
  // square): the SSOT's closed vocabulary carries refmods_list — the
  // studio's listing feed rides the manage lane this tool shares. The
  // tool's own schema enum is its mirror (a separate face, judged at
  // the tool-output wall); this arm pins the DISPATCH truth: the
  // action answers through the SSOT and a typo's 422 NAMES it — a
  // membership probe that reds the moment the entry is toggled out
  // of managePlane's ACTIONS.
  test('the SSOT carries the refmods listing door (the closed vocabulary names it)', async () => {
    const ctx: ManageCtx = {
      repoRoot: process.cwd(),
      stateRoots: [],
      comfyUnit: 'melite-comfyui.service',
      autoProvision: false,
      endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
      models: {} as ManageCtx['models'],
      timeout: () => () => {},
      objectInfo: async () => ({
        MiniMaxH3RefModsLoader: {
          input: { required: { mod_1: [['(none)', 'pack_a'], {}], mod_2: [['pack_b'], {}] } },
        },
      }),
    } as unknown as ManageCtx
    const [, admitted] = await dispatchManage({ action: 'refmods_list' }, ctx)
    assert.equal(admitted.ok, true)
    assert.equal(admitted.action, 'refmods_list')
    assert.deepEqual((admitted.data as { stems?: string[] }).stems, ['pack_a', 'pack_b'])
    const [status, refusedTypo] = await dispatchManage({ action: 'refmods_list_typo' }, ctx)
    assert.equal(status, 422)
    assert.ok(
      String(refusedTypo.detail).includes('refmods_list'),
      'the closed-vocabulary refusal names refmods_list (got: ' + String(refusedTypo.detail) + ')',
    )
  })

  test('lifts provisioning state fields without hiding the raw data', async () => {
    const { estate } = mockEstate(() => ({
      ok: true,
      action: 'install_extension',
      detail: 'restart required',
      data: {
        state: 'partial',
        operation_id: 'op-1',
        restart_required: true,
        items: [{ key: 'extension:pack', state: 'restart_required' }],
      },
    }))
    const tool = comfyManage(estate)
    const out = await tool.execute({ action: 'install_extension', nodes: ['pack'] }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.state, 'partial')
    assert.equal(out.partial, true)
    assert.equal(out.operation_id, 'op-1')
    assert.equal(out.restart_required, true)
    assert.deepEqual(out.items, [{ key: 'extension:pack', state: 'restart_required' }])
  })

  test('uses the real dispatch status envelope across the agent boundary', async () => {
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: unknown) => {
      const value = String(url)
      if (value.endsWith('/system_stats')) return new Response(JSON.stringify({ system: { comfyui_version: '9.9' }, devices: [] }))
      if (value.endsWith('/manager/version')) return new Response(JSON.stringify({ version: '3.0' }))
      return new Response(JSON.stringify({ is_processing: false, total_count: 0, done_count: 0 }))
    }) as typeof fetch
    try {
      const ctx: ManageCtx = {
        repoRoot: process.cwd(),
        // J12: the census manifest rides the ctx (config-named)
        stateRoots: [],
        comfyUnit: 'melite-comfyui.service',
        autoProvision: false,
        endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
        models: {} as ManageCtx['models'],
        provisioning: {
          reconcile: async () => [],
        } as unknown as ManageCtx['provisioning'], // partial mock: this wall drives only reconcile
        timeout: () => () => {},
      }
      const { estate } = fakeEstate({
        manageAct: async (body: unknown, signal: AbortSignal) => {
          const [, envelope] = await dispatchManage(body, ctx, signal)
          return envelope
        },
      })
      const tool = comfyManage(estate)
      const out = await tool.execute({ action: 'status' }, exec()) as Record<string, unknown>
      const data = out.data as { manager: { reachable: boolean; security: string }; next_action: string }
      assert.equal(out.ok, true)
      assert.equal(out.action, 'status')
      assert.equal(data.manager.reachable, true)
      assert.match(data.manager.security, /unpinned|security_level/)
      assert.equal(out.next_action, 'status')
      const rendered = (tool.output.render({}, asJson(out)) as Array<{ text?: string }>).map((part) => part.text ?? '').join('\n')
      assert.match(rendered, /endpoint: reachable/)
      assert.match(rendered, /manager: reachable/)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('blank and omitted fields stay out of the envelope', async () => {
    const { seen, estate } = mockEstate(() => ({ ok: true, action: 'status', detail: 'fine' }))
    const tool = comfyManage(estate)
    await tool.execute({ action: 'status', url: '', tail: 10 }, exec())
    assert.deepEqual(seen[0]!.body, { action: 'status', tail: 10 })
  })

  test('a falsy envelope still maps (ok:false, data:null)', async () => {
    const { estate } = mockEstate(() => ({ ok: false, action: 'status', detail: 'guarded' }))
    const tool = comfyManage(estate)
    const out = await tool.execute({ action: 'status' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'status')
    assert.equal(out.detail, 'guarded')
    assert.equal(out.data, null)
  })
})

describe('comfy_manage execute — refusals ARE the answer', () => {
  test('manage/refused carrying the envelope surfaces as the value', async () => {
    const { seen, estate } = mockEstate(() => {
      throw new RemoteError('manage/refused', 'lifecycle refused: 2 runs active', {
        action: 'restart',
        status: 409,
        data: { runs: 2 },
      })
    })
    const tool = comfyManage(estate)
    const out = await tool.execute({ action: 'restart' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'restart')
    assert.equal(out.detail, 'lifecycle refused: 2 runs active')
    assert.equal(out.status, 409)
    assert.equal(out.code, 'manage/refused')
    assert.deepEqual(out.data, { runs: 2 })
    assert.equal(seen.length, 1)
  })

  test('a dataless refusal defaults data to null', async () => {
    const { estate } = mockEstate(() => {
      throw new RemoteError('manage/refused', 'catalog miss', { action: 'stop' })
    })
    const tool = comfyManage(estate)
    const out = await tool.execute({ action: 'stop' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.action, 'stop')
    assert.equal(out.detail, 'catalog miss')
    assert.equal(out.data, null)
  })

  test('manage/refused without a string action rethrows', async () => {
    const refusal = new RemoteError('manage/refused', 'shapeless', { data: 1 })
    const { estate } = mockEstate(() => { throw refusal })
    const tool = comfyManage(estate)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /shapeless/)
  })

  test('manage/refused without details rethrows', async () => {
    const refusal = new RemoteError('manage/refused', 'detail-less', undefined as never) // no details at runtime — the rethrow arm
    const { estate } = mockEstate(() => { throw refusal })
    const tool = comfyManage(estate)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /detail-less/)
  })

  test('any other remote code rethrows', async () => {
    const refusal = new RemoteError('manage/broken', 'seat blew up', { action: 'free' })
    const { estate } = mockEstate(() => { throw refusal })
    const tool = comfyManage(estate)
    await assert.rejects(tool.execute({ action: 'free' }, exec()) as Promise<unknown>, /seat blew up/)
  })

  test('a plain transport failure rethrows', async () => {
    const { estate } = mockEstate(() => { throw new Error('down') })
    const tool = comfyManage(estate)
    await assert.rejects(tool.execute({ action: 'logs', tail: 5 }, exec()) as Promise<unknown>, /down/)
  })
})

describe('comfy_manage contract projection matrix', () => {
  const text = (value: unknown): string => (comfyManage(stubEstate()).output.render({}, asJson(value)) as Array<{ text?: string }>)
    .map((part) => part.text ?? '')
    .join('\n')

  test('status renders endpoint, manager, resources, and both operation sources', () => {
    const value = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: {
        state: 'up',
        endpoint: { reachable: false, url: 'http://engine', comfyui_version: '1.2' },
        manager: { reachable: false, version: null, security: 'locked', reason: 'busy' },
        routing: { lane: 'a' },
        active_runs: [1, 'r', null],
        resources: [null, { ref: null, state: 3 }, { ref: { kind: 'k', owner: 'o', id: 'i' }, state: { ok: true } }],
        operations: [
          { operation_id: 'op', name: 'pack', state: 'active', outcome: 'done', path: '/p' },
          { id: 'op2', outcome: 'failed' },
        ],
        resources_detail: 'detail',
      },
    })
    assert.ok(value.includes('state: up'))
    assert.ok(value.includes('endpoint: not reachable'))
    assert.ok(value.includes('comfyui: 1.2'))
    assert.ok(value.includes('manager: unavailable'))
    assert.ok(value.includes('active_runs: 1, r, ?'))
    assert.ok(value.includes('resource: resource'))
    assert.ok(value.includes('resource: k/o/i'))
    assert.ok(value.includes('operation op · pack · active · done · /p'))
    assert.ok(value.includes('operation op2 · failed'))
    assert.ok(value.includes('resource_status: detail'))

    const managerOperations = text({
      ok: true,
      action: 'status',
      data: { manager: { reachable: true, operations: [{ id: 'm1' }, 'raw'] } },
    })
    assert.ok(managerOperations.includes('operation m1'))
  })

  // AUDIT F2 (infra-resources-census-honesty, 2026-10-20): the tool
  // face sliced the roster at 20 rows with no "+N more" and never
  // surfaced census_partial — an agent reading the face would title
  // a partial scan as the whole truth, the same honesty class the
  // census law banned at the service and deck planes.
  test('AUDIT F2: a roster past the display cap names its truncation, never slices silently', () => {
    const resources = Array.from({ length: 25 }, (_, index) => ({
      ref: { kind: 'extension', id: 'pack-' + String(index) },
      state: 'active',
    }))
    const value = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: { state: 'up', resources },
    })
    assert.ok(value.includes('resource: extension/pack-19 · active'), 'the cap still renders its 20 rows')
    assert.ok(!value.includes('resource: extension/pack-20 · active'), 'rows past the cap stay cut — the cap is a token budget, the honesty is the naming')
    assert.ok(value.includes('resource: +5 more (display cap — the roster is longer than shown)'),
      'the truncation names itself — 25 rows shown as 20 without the note is a silent lie')
  })

  test('AUDIT F2: census_partial rides the tool face — a partial scan is never titled whole', () => {
    const value = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: {
        state: 'up',
        resources: [{ ref: { kind: 'extension', id: 'pack' }, state: 'unknown' }],
        census_partial: true,
      },
    })
    assert.ok(value.includes('census: partial — the scan could not check every resource or item; unknown rows are not health verdicts'),
      'the mark that managePlane derives must ride the face an agent reads')

    const whole = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: {
        state: 'up',
        resources: [{ ref: { kind: 'extension', id: 'pack' }, state: 'active' }],
        census_partial: undefined,
      },
    })
    assert.ok(!whole.includes('census: partial'), 'a settled roster never carries the mark')
  })

  // AUDIT V4 (infra-census-f1-f2-verification-2026-10-20): the
  // operations ledger sliced at 20 rows with no "+N more" — the
  // resources cap's own honesty law, one list over.
  test('AUDIT V4: an operations ledger past the display cap names its truncation', () => {
    const operations = Array.from({ length: 23 }, (_, index) => ({
      operation_id: 'op-' + String(index),
      state: 'active',
    }))
    const value = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: { state: 'up', operations },
    })
    assert.ok(value.includes('operation op-19'), 'the cap still renders its 20 rows')
    assert.ok(!value.includes('operation op-20'), 'rows past the cap stay cut — the naming is the honesty')
    assert.ok(value.includes('operation: +3 more (display cap — the ledger is longer than shown)'),
      '23 operations shown as 20 without the note is a silent lie')
  })

  // AUDIT V2 (infra-census-f1-f2-verification-2026-10-20): the
  // status->face edge was composition-judged only — both consumer
  // specs HAND-SET census_partial, so a one-sided rename in
  // managePlane greened everything. This arm rides the REAL
  // producer: dispatchManage derives census_partial from a live
  // unknown row (nothing hand-sets the key), and the envelope's
  // own data flows through the tool's real output.render — a
  // rename at either seat reds it.
  test('AUDIT V2: census_partial flows producer->face through the real seam — no hand-set key', async () => {
    const ctx: ManageCtx = {
      repoRoot: process.cwd(),
      stateRoots: [],
      comfyUnit: 'melite-comfyui.service',
      autoProvision: false,
      endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
      models: {} as ManageCtx['models'],
      timeout: () => () => {},
      provisioning: {
        reconcile: async () => [{
          ref: { kind: 'model', owner: 'family', id: 'anima' },
          state: 'unknown',
          items: [],
          detail: 'scan incomplete — this resource was not checked before the status budget closed',
        }],
        operationOf: () => undefined,
      } as unknown as NonNullable<ManageCtx['provisioning']>,
    } as unknown as ManageCtx
    const [, envelope] = await dispatchManage({ action: 'status' }, ctx)
    assert.equal(envelope.ok, true)
    const data = (envelope as { data: { census_partial?: boolean; resources: unknown[] } }).data
    assert.equal(data.census_partial, true,
      'the REAL managePlane derived the mark from the live unknown row — nothing hand-set it')
    const face = text({ ok: true, action: 'status', detail: 'status', data })
    assert.ok(face.includes('census: partial'),
      'the tool face renders the mark the producer derived — a rename at either seat reds this arm')
  })

  test('THE FINDING-10 SPLIT: idle-engine status renders the historical rows by name, empty actives as none', () => {
    const value = text({
      ok: true,
      action: 'status',
      detail: 'status',
      data: {
        state: 'up',
        active_runs: [],
        engine_queue: { running: 0, pending: 0 },
        stale_claims: [
          'run-a (claimed live; engine queue empty — historical: the sidecar never settled; the boot sweep retires its own root at restart)',
        ],
      },
    })
    assert.ok(value.includes('active_runs: none'))
    assert.ok(value.includes('engine queue: running 0 · pending 0'))
    assert.ok(value.includes('stale_claims (historical, never settled): run-a (claimed live; engine queue empty'))
  })

  test('THE FINDING-10 SPLIT: surplus claims render the one-run-law note', () => {
    const value = text({
      ok: true,
      action: 'status',
      data: {
        active_runs: ['run-a', 'run-b'],
        engine_queue: { running: 1, pending: 0 },
        active_runs_note: '2 claims; the one-run law bounds machine-wide actives at 1 — the surplus is unsettled sidecars (historical); the engine queue corroborates only when empty',
      },
    })
    assert.ok(value.includes('active_runs: run-a, run-b'))
    assert.ok(value.includes('engine queue: running 1 · pending 0'))
    assert.ok(value.includes('note: 2 claims; the one-run law bounds machine-wide actives at 1'))
  })

  test('row, operation, action-row, and inferred-next helpers cover sparse values', () => {
    const rows = text({
      ok: true,
      action: 'search_models',
      data: { rows: [
        'plain',
        4,
        null,
        [],
        { name: 'named', type: 'lora', base: 'b', state: 'ok', outcome: 'ok', version: 'v', filename: 'f', path: 'p' },
        { id: 'identified', key: 'k' },
        { key: 'keyed', type: '', base: '', state: '', outcome: '', version: '', filename: '', path: '' },
      ] },
    })
    assert.ok(rows.includes('plain'))
    assert.ok(rows.includes('4'))
    assert.ok(rows.includes('named (lora, b) — v · f · p · ok'))
    assert.ok(rows.includes('identified'))
    assert.ok(rows.includes('keyed'))

    const logs = text({ ok: true, action: 'logs', data: { lines: ['line', { id: 'row' }] } })
    assert.ok(logs.includes('line'))
    assert.ok(logs.includes('row'))
    assert.ok(text({ ok: true, action: 'list_extensions', data: { items: [{ name: 'pack' }] } }).includes('pack'))
    assert.ok(text({ ok: true, action: 'snapshot_list', data: [{ name: 'snap' }] }).includes('snap'))
    assert.ok(text({ ok: true, action: 'list_extensions', data: [] }).includes('rows: none'))
    assert.ok(text({ ok: true, action: 'list_extensions', data: {} }).includes('rows: none'))

    const next = text({ ok: true, action: 'status', data: {} })
    assert.ok(next.includes('next_action: status'))
    assert.ok(text({ ok: true, action: 'list_extensions', data: {} }).includes('next_action: install_extension'))
    assert.ok(text({ ok: true, action: 'snapshot_list', data: {} }).includes('next_action: snapshot_save'))
    assert.ok(text({ ok: true, action: 'status', data: { state: 'restart_required' } }).includes('state: restart_required'))
    assert.ok(text({ ok: true, action: 'status', data: { next_action: 'data-next' } }).includes('next_action: data-next'))
  })

  test('refusals and result envelopes expose every structured field', async () => {
    const { estate, seen } = mockEstate(() => ({
      ok: true,
      action: 'install_extension',
      detail: 'done',
      data: {
        operation_id: 'data-op', status: 201, code: 'data-code', state: 'active', next_action: 'data-next',
        restart_required: false, partial: false, items: [{ name: 'data' }], operations: [{ id: 'data-op' }],
        rows: [{ id: 'data-row' }], requested: ['a', 1], succeeded: ['b', 2], missed: ['c', 3], misses: ['d', 4],
      },
      operation_id: 'env-op', status: 202, code: 'env-code', state: 'partial', next_action: 'env-next',
      restart_required: true, partial: true, items: [{ name: 'env' }], operations: [{ id: 'env-op' }],
      rows: [{ id: 'env-row' }], requested: ['e'], succeeded: ['f'], missed: ['g'], misses: ['h'],
    }))
    const out = await comfyManage(estate).execute({ action: 'install_extension' }, exec()) as Record<string, unknown>
    assert.equal(out.operation_id, 'env-op')
    assert.equal(out.status, 202)
    assert.equal(out.code, 'env-code')
    assert.equal(out.state, 'partial')
    assert.equal(out.next_action, 'env-next')
    assert.equal(out.restart_required, true)
    assert.equal(out.partial, true)
    assert.deepEqual(out.requested, ['e'])
    assert.deepEqual(out.succeeded, ['f'])
    assert.deepEqual(out.missed, ['g'])
    assert.deepEqual(out.misses, ['h'])
    assert.equal(seen[0]?.body && (seen[0].body as Record<string, unknown>).action, 'install_extension')

    const array = mockEstate(() => ({ ok: true, action: 'search_models', data: [{ name: 'array-row' }] }))
    const arrayOut = await comfyManage(array.estate).execute({ action: 'search_models' }, exec()) as Record<string, unknown>
    assert.deepEqual(arrayOut.rows, [{ name: 'array-row' }])
    const sparse = mockEstate(() => ({ ok: true, action: 'status', data: null }))
    const sparseOut = await comfyManage(sparse.estate).execute({ action: 'status' }, exec()) as Record<string, unknown>
    assert.equal(sparseOut.data, null)
  })

  test('optional envelope values and refusal details keep their exact voices', async () => {
    const nulls = mockEstate(() => ({ ok: false, action: 'status', detail: 'refused' }))
    const out = await comfyManage(nulls.estate).execute({ action: 'status', nodes: [], url: '' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'refused')
    assert.equal(out.ok, false)

    const refusal = mockEstate(() => {
      throw new RemoteError('manage/refused', 'named', { action: 'install_extension', data: { state: 'partial' }, status: 'bad' as unknown as number, code: 'custom' }) // intentionally mistyped status: the tool drops non-numbers (undefined below)
    })
    const value = await comfyManage(refusal.estate).execute({ action: 'install_extension' }, exec()) as Record<string, unknown>
    assert.equal(value.code, 'custom')
    assert.equal(value.status, undefined)
    assert.equal(value.state, 'partial')
  })

  test('remaining renderer and envelope arms degrade without throwing', async () => {
    assert.equal(text(null), 'comfy_manage ?: ')
    assert.equal(text({ ok: true, action: 'status', data: null }).includes('comfy_manage status'), true)
    const circular: Record<string, unknown> = {}
    circular['self'] = circular
    assert.equal(text({ ok: true, action: 'search_models', rows: [circular, () => 1, { state: 'x' }] }).includes('?'), true)
    assert.equal(text({ ok: true, action: 'search_models', rows: [{ name: 'top' }] }).includes('top'), true)
    assert.equal(text({ ok: true, action: 'status', data: { endpoint: { reachable: true } } }).includes('endpoint: reachable'), true)
    assert.equal(text({ ok: true, action: 'status', data: { manager: { operations: [{}] } } }).includes('operation ?'), true)
    assert.equal(text({ ok: true, action: 'status', data: null }).includes('state:'), false)
    assert.equal(text({ ok: false, action: 'free', detail: 'd', code: 'c', status: 418 }).includes('status 418'), true)
    assert.equal(text({ ok: false, action: 'free', detail: 'd', error: 'd' }).includes('error:'), false)
    assert.equal(text({ ok: false, action: 'free', detail: 'd', error: 'other' }).includes('error: other'), true)
    assert.equal(text({ ok: true, action: 'free', data: { x: 1 } }).includes('data:'), true)
    assert.equal(text({ ok: true, action: 'free', data: circular }).includes('data: ?'), true)
    assert.equal(text({ ok: true, action: 'free', data: null }).includes('data:'), false)
    assert.equal(text({ ok: true, action: 'free', data: undefined }).includes('data:'), false)

    for (const key of ['state', 'operation_id', 'requested', 'succeeded', 'missed', 'misses', 'items', 'operations']) {
      const value: Record<string, unknown> = { ok: true, action: 'install_extension' }
      value[key] = key === 'state' ? 'active' : key === 'operation_id' ? 'op' : key === 'items' ? ['i'] : key === 'operations' ? [{ id: 'o' }] : ['x']
      assert.equal(text(value).includes('comfy_manage install_extension'), true)
    }
    assert.equal(text({ ok: true, action: 'install_extension', data: { state: 'restart_required' } }).includes('next_action: restart'), true)

    const arrayResponse = mockEstate(() => [])
    const arrayOut = await comfyManage(arrayResponse.estate).execute({ action: 'status' }, exec()) as Record<string, unknown>
    assert.equal(arrayOut.action, 'status')
    const emptyMiss = mockEstate(() => ({ ok: true, action: 'status', data: { missed: [] } }))
    const emptyOut = await comfyManage(emptyMiss.estate).execute({ action: 'status' }, exec()) as Record<string, unknown>
    assert.equal(emptyOut.ok, true)
  })
})

describe('comfy_manage acquire_weight — the agent seat on the one acquisition door', () => {
  test('the action rides the enum, forwards model/file/operation_id, and surfaces bytes/total', async () => {
    const tool = comfyManage(stubEstate())
    const params = tool.parameters as { properties?: Record<string, { enum?: string[] }> }
    assert.ok(params.properties?.['action']?.enum?.includes('acquire_weight'), 'acquire_weight on the enum')

    // THE START (the agent's Download press): model + file ride the
    // SAME /v1/manage door the popup button rides — one door, two
    // callers — and the live bytes/total surface top-level.
    const start = mockEstate(() => ({
      ok: true,
      action: 'acquire_weight',
      detail: 'acquiring mask (weight.bin) — 0/8 bytes',
      data: { operation_id: 'op-agent-1', state: 'acquiring', bytes: 0, total: 8, next_action: 'acquire_weight' },
      operation_id: 'op-agent-1',
      state: 'acquiring',
      next_action: 'acquire_weight',
    }))
    const started = await comfyManage(start.estate).execute(
      { action: 'acquire_weight', model: 'mask', file: 'weight.bin' }, exec()) as Record<string, unknown>
    assert.deepEqual(start.seen[0]?.body, { action: 'acquire_weight', model: 'mask', file: 'weight.bin' })
    assert.equal(started.operation_id, 'op-agent-1')
    assert.equal(started.state, 'acquiring')
    assert.equal(started.bytes, 0)
    assert.equal(started.total, 8)

    // THE POLL (the agent's tracker read): the SAME action with ONLY
    // the operation id — no second fetch — and the terminal ledger
    // lands with bytes == total.
    const poll = mockEstate(() => ({
      ok: true,
      action: 'acquire_weight',
      detail: 'acquire_weight op-agent-1: 8/8 bytes (active)',
      data: { operation_id: 'op-agent-1', state: 'active', bytes: 8, total: 8, next_action: 'acquire_weight' },
      operation_id: 'op-agent-1',
      state: 'active',
      next_action: 'acquire_weight',
    }))
    const polled = await comfyManage(poll.estate).execute(
      { action: 'acquire_weight', operation_id: 'op-agent-1' }, exec()) as Record<string, unknown>
    assert.deepEqual(poll.seen[0]?.body, { action: 'acquire_weight', operation_id: 'op-agent-1' })
    assert.equal(polled.bytes, 8)
    assert.equal(polled.total, 8)
    assert.equal(polled.state, 'active')
  })

  test('the render names the live bytes/total line', async () => {
    const tool = comfyManage(stubEstate())
    const render = tool.output?.render
    assert.ok(typeof render === 'function')
    const lines = render({}, {
      ok: true,
      action: 'acquire_weight',
      detail: 'acquiring mask — 1/8 bytes',
      operation_id: 'op-agent-1',
      state: 'acquiring',
      bytes: 1,
      total: 8,
    }) as Array<{ text: string }>
    assert.match(lines[0]?.text ?? '', /progress: 1\/8 bytes/)
  })

  test('the progress line marks the missing half with ? (bytes-only and total-only polls)', async () => {
    // A poll can carry half the fraction (bytes before the total is
    // known, or the total before bytes land) — the line still renders
    // with ? for the unknown half.
    const tool = comfyManage(stubEstate())
    const render = tool.output?.render
    assert.ok(typeof render === 'function')
    const bytesOnly = render({}, {
      ok: true,
      action: 'acquire_weight',
      detail: 'acquiring',
      operation_id: 'op-1',
      state: 'acquiring',
      bytes: 1,
    }) as Array<{ text: string }>
    assert.match(bytesOnly[0]?.text ?? '', /progress: 1\/\? bytes/)
    const totalOnly = render({}, {
      ok: true,
      action: 'acquire_weight',
      detail: 'sizing',
      operation_id: 'op-1',
      state: 'acquiring',
      total: 8,
    }) as Array<{ text: string }>
    assert.match(totalOnly[0]?.text ?? '', /progress: \?\/8 bytes/)
  })
})
