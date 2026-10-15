import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { comfyManage } from '../../../packages/harness/melite-tools/src/tools/comfy-manage.ts'
import { fakeEstate } from '../../../packages/harness/melite-tools/test/fake-estate.ts'

// THE F-1 TYPED-LANE MIGRATION's snapshot debt (cured 2026-11-05,
// merge of the refmods round): this replay predates the migration
// and still injected a raw EstateRequest (method/path/body) fn —
// comfyManage now rides the typed Estate lane `manageAct`, so the
// raw fn crashed with "estate.manageAct is not a function". The
// replay rides fakeEstate's manageAct lane (the same seam the
// comfy-manage spec uses), never a URL transport.

describe('comfy_manage provisioning result replay', () => {
  it('preserves Manager operation state without a second transport', async () => {
    let calls = 0
    const { estate } = fakeEstate({
      manageAct: (body: unknown) => {
        calls += 1
        assert.deepEqual(body, { action: 'install_extension', nodes: ['pack'] })
        return {
          ok: false,
          action: 'install_extension',
          detail: 'partial',
          data: {
            state: 'partial',
            operation_id: 'op-extension-1',
            restart_required: true,
            items: [{ key: 'extension:pack', state: 'restart_required' }],
          },
        }
      },
    })
    const tool = comfyManage(estate)
    const result = await tool.execute(
      { action: 'install_extension', nodes: ['pack'] },
      { signal: AbortSignal.timeout(5000) },
    ) as Record<string, unknown>
    assert.equal(calls, 1)
    assert.equal(result.ok, false)
    assert.equal(result.action, 'install_extension')
    assert.equal(result.state, 'partial')
    assert.equal(result.partial, true)
    assert.equal(result.operation_id, 'op-extension-1')
    assert.equal(result.restart_required, true)
    assert.deepEqual(result.items, [{ key: 'extension:pack', state: 'restart_required' }])
  })

  it('replays URL-free model and ComfyUI version catalogs', async () => {
    const { estate } = fakeEstate({
      manageAct: (body: unknown) => {
        assert.deepEqual(body, { action: 'status' })
        return {
          ok: true,
          action: 'status',
          detail: 'server up',
          data: {
            model_options: [{ id: 'wan', label: 'Wan', variants: [{ id: 'preview', quants: [{ id: 'fp8', label: 'FP8' }] }] }],
            comfyui_versions: [{ id: 'v0.9', label: 'v0.9 — stable', tag: 'stable' }],
          },
        }
      },
    })
    const tool = comfyManage(estate)
    const result = await tool.execute(
      { action: 'status' },
      { signal: AbortSignal.timeout(5000) },
    ) as Record<string, unknown>
    assert.deepEqual((result.data as { model_options: unknown }).model_options, [{ id: 'wan', label: 'Wan', variants: [{ id: 'preview', quants: [{ id: 'fp8', label: 'FP8' }] }] }])
    assert.deepEqual((result.data as { comfyui_versions: unknown }).comfyui_versions, [{ id: 'v0.9', label: 'v0.9 — stable', tag: 'stable' }])
  })
})
