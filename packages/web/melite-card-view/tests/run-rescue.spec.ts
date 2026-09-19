/**
 * run-rescue.spec.ts — the run-gate rescue's law (roadmap item 4):
 * the parse takes EXACTLY the estate's own refusal shapes (the
 * missing-extension refusal names its pack verbatim; a model miss
 * names a weight file in a not-found context) and nothing else —
 * never a wrong install; the family scan reads the stages' own
 * model params; the call rides the ONE manage wire with NAMES
 * ONLY (the links-in-code law: no URL ever enters the client).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { familyOfStages, parseRescue, runRescueCall } from '../src/client/run-rescue.ts'

describe('parseRescue (the estate refusal shapes, nothing else)', () => {
  it('a missing-extension refusal yields its pack verbatim', () => {
    expect(parseRescue(
      "card 'h3-timeline' requires 'ComfyUI-MiniMaxH3-TimelineDirector' (nodes A, B) — none live on the engine; install via ComfyUI-Manager",
    )).toEqual({ kind: 'extension', pack: 'ComfyUI-MiniMaxH3-TimelineDirector' })
  })

  it('a model-file miss in a not-found context yields the file', () => {
    expect(parseRescue("node error: minimax_h3_turbo_v4_step600_ema.safetensors not found in loras/h3"))
      .toEqual({ kind: 'model', file: 'minimax_h3_turbo_v4_step600_ema.safetensors' })
    expect(parseRescue('Checkpoint does not exist: flux_dev.safetensors (404)'))
      .toEqual({ kind: 'model', file: 'flux_dev.safetensors' })
  })

  it('a weight file named with NO miss context is not ours to fix', () => {
    expect(parseRescue('loaded film_net_fp16.safetensors fine, then OOM')).toBe(null)
  })

  it('every other failure is null (never a wrong install)', () => {
    expect(parseRescue('the engine refused: CUDA out of memory')).toBe(null)
    expect(parseRescue('')).toBe(null)
    expect(parseRescue('queue timeout after 300s')).toBe(null)
  })
})

describe('familyOfStages (the provision target)', () => {
  it('the first stage naming a model owns the family', () => {
    expect(familyOfStages([
      { params: { prompt: 'x' } },
      { params: { model: 'h3-timeline', prompt: 'y' } },
    ])).toBe('h3-timeline')
  })

  it('no model param, no target (the banner offers nothing)', () => {
    expect(familyOfStages([{ params: { prompt: 'x' } }])).toBe(null)
  })
})

describe('runRescueCall (names only, the one wire)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('an extension rescue posts install_extension with the pack id', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'queued: 1 pack(s)' })
    vi.doMock('@melite/card-base/wire', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'SomePack' }, 'h3-timeline')).resolves.toBe('queued: 1 pack(s)')
    expect(spy).toHaveBeenCalledWith('install_extension', { nodes: ['SomePack'] })
  })

  it('a model rescue posts provision_model with the FAMILY id (never a URL)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'downloaded: 2' })
    vi.doMock('@melite/card-base/wire', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'h3-timeline')).resolves.toBe('downloaded: 2')
    expect(spy).toHaveBeenCalledWith('provision_model', { model: 'h3-timeline' })
  })

  it('a refused install surfaces the detail, never a silent ok', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false, detail: 'pack unknown to the manager list' }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'GhostPack' }, '')).rejects.toThrow('pack unknown')
  })
})
