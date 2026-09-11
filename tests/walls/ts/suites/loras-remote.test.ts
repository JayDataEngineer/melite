import test from 'node:test'
import assert from 'node:assert/strict'
import { Context, Service } from '../../../../packages/engines/comfyui-cordis/node_modules/@deepseek-ai/cordis/lib/index.js'
import type { Plugin } from '../../../../packages/engines/comfyui-cordis/node_modules/@deepseek-ai/cordis/lib/index.js'

/** THE LORAS WALL (the /v1/loras door's DSH-native replacement): the
 *  loras remote serves one family's pick catalog over the comfyui
 *  seat's mod catalog — THE RUNTIME CATALOG LAW rides the seat
 *  (family rows win over the union; a runtime-catalog family with no
 *  family rows is served the union, shared-flagged), an empty family
 *  answers an honest empty (DATA, never an error), and a non-string
 *  or empty model is a 422-shaped refusal (loras/invalid-request).
 *  The lora list is FAMILY-OWNED DATA — the mods tree declares the
 *  rows; this remote only serves them. */

/** One lora row as the mods tree declares it. */
interface LoraRow {
  readonly id: string
  readonly filename: string
  readonly source_url: string
  readonly label?: string
  readonly category?: string
  readonly default_strength?: number
}

/** The comfyui seat stub: the modCatalog face the remote reads. */
class FakeComfy extends Service {
  constructor(ctx: Context) {
    super(ctx, 'comfyui')
  }
  modCatalog(_pack: string, family: string): { rows: readonly LoraRow[]; shared: boolean } {
    if (family === 'krea-2') {
      return {
        shared: false,
        rows: [
          { id: 'r1', filename: 'krea-2/realism.safetensors', source_url: 'https://x/r1', label: 'Realism', category: 'photorealism', default_strength: 0.7 },
          { id: 'r2', filename: 'krea-2/turbo.safetensors', source_url: 'https://x/r2', label: 'Turbo', default_strength: 1.0 },
        ],
      }
    }
    if (family === 'qwen-img-edit-2511') {
      return { shared: true, rows: [
        { id: 'u1', filename: 'shared/one.safetensors', source_url: 'https://x/u1' },
      ] }
    }
    return { rows: [], shared: false }
  }
}

test('loras/list: family rows, the union, honest empties, and the refusal', async () => {
  const ctx = new Context()
  new FakeComfy(ctx)
  const mod = await import('../../../../packages/estate/loras/lib/index.js')
  await ctx.plugin(mod.lorasRemotePlugin as never as Plugin)
  const remote = ctx.get('lorasRemote', true) as {
    remoteExportList(model: string, signal: AbortSignal): Promise<{
      model: string
      loras: readonly string[]
      meta: Record<string, { label?: string; category?: string; default_strength?: number }>
      note: string | null
    }>
  }
  assert.ok(remote, 'loras remote mounted')

  // Family rows serve verbatim: filenames + meta keyed by STEM.
  const krea = await remote.remoteExportList('krea-2', new AbortController().signal)
  assert.deepEqual([...krea.loras], ['krea-2/realism.safetensors', 'krea-2/turbo.safetensors'])
  assert.equal(krea.meta['krea-2/realism']?.label, 'Realism')
  assert.equal(krea.meta['krea-2/realism']?.default_strength, 0.7)
  assert.equal(krea.meta['krea-2/turbo']?.label, 'Turbo')
  assert.equal(krea.note, null)

  // The runtime catalog law: a shared union serves with the note.
  const qwen = await remote.remoteExportList('qwen-img-edit-2511', new AbortController().signal)
  assert.deepEqual([...qwen.loras], ['shared/one.safetensors'])
  assert.match(qwen.note ?? '', /shared catalog/)

  // An empty family is DATA, never an error — with the mods-tree note.
  const none = await remote.remoteExportList('wan-vace', new AbortController().signal)
  assert.deepEqual([...none.loras], [])
  assert.match(none.note ?? '', /mods\/loras\.ts/)

  // The refusal shape: an empty model is loras/invalid-request.
  await assert.rejects(
    () => remote.remoteExportList('', new AbortController().signal),
    (e: unknown) => {
      const err = e as { code?: string; message?: string }
      assert.equal(err.code, 'loras/invalid-request')
      assert.match(err.message ?? '', /non-empty family id/)
      return true
    },
  )
})
