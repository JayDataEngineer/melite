import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { comfyManage } from '../../../packages/harness/melite-tools/src/tools/comfy-manage.ts'
import type { EstateRequest } from '../../../packages/harness/melite-tools/src/estate.ts'

describe('comfy_manage provisioning result replay', () => {
  it('preserves Manager operation state without a second transport', async () => {
    const request = (async (method: string, path: string, body: unknown) => {
      assert.equal(method, 'POST')
      assert.equal(path, '/v1/manage')
      assert.deepEqual(body, { action: 'install_extension', nodes: ['pack'] })
      return {
        ok: true,
        action: 'install_extension',
        detail: 'restart required',
        data: {
          state: 'partial',
          operation_id: 'op-extension-1',
          restart_required: true,
          items: [{ key: 'extension:pack', state: 'restart_required' }],
        },
      }
    }) as unknown as EstateRequest
    const tool = comfyManage(request)
    const result = await tool.execute(
      { action: 'install_extension', nodes: ['pack'] },
      { signal: AbortSignal.timeout(5000) },
    ) as Record<string, unknown>
    assert.equal(result.ok, true)
    assert.equal(result.action, 'install_extension')
    assert.equal(result.state, 'partial')
    assert.equal(result.partial, true)
    assert.equal(result.operation_id, 'op-extension-1')
    assert.equal(result.restart_required, true)
    assert.deepEqual(result.items, [{ key: 'extension:pack', state: 'restart_required' }])
  })
})
