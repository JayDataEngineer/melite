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
import { familyOfStages, parseRescue, runRescueCall, terminalStageErrorOf } from '../src/client/run-rescue.ts'

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

  it('parses the current missing-weight voice and its declared target, never its fetch source', () => {
    expect(parseRescue("card 'mask' needs weight 'sams/sam2.1_hiera_large.pt' — absent on the models tree; fetch declared-source (provision_model model=mask)"))
      .toEqual({ kind: 'model', file: 'sams/sam2.1_hiera_large.pt', target: 'mask' })
    expect(parseRescue("card 'mask' needs weight 'sams/sam2.1_hiera_large.pt' — absent on the models tree; fetch declared-source"))
      .toEqual({ kind: 'model', file: 'sams/sam2.1_hiera_large.pt' })
  })

  it('keeps an explicit target on a generic model miss', () => {
    expect(parseRescue('x.safetensors not found (provision_model model=mask)'))
      .toEqual({ kind: 'model', file: 'x.safetensors', target: 'mask' })
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

describe('terminalStageErrorOf (the normalized failure carry)', () => {
  it('returns the first failed stage result error', () => {
    expect(terminalStageErrorOf([
      { runStatus: 'done', result: { error: 'not terminal' } },
      { runStatus: 'failed', result: { error: 'stage refused' } },
      { runStatus: 'failed', result: { error: 'second' } },
    ])).toBe('stage refused')
  })

  it('ignores non-terminal and malformed stage results', () => {
    expect(terminalStageErrorOf([
      { runStatus: 'failed', result: null },
      { runStatus: 'running', result: { error: 'live' } },
      { runStatus: 'failed', result: { error: 7 } },
    ])).toBe(null)
  })
})

describe('runRescueCall (names only, the one wire)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('an extension rescue posts install_extension with the pack id', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'queued: 1 pack(s)', data: { state: 'active' } })
    vi.doMock('@melite/card-base/wire', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'SomePack' }, 'h3-timeline')).resolves.toEqual({ detail: 'queued: 1 pack(s)', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('install_extension', { nodes: ['SomePack'] })
  })

  it('a model rescue posts provision_model with the FAMILY id (never a URL)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'downloaded: 2', data: { state: 'active', restart_required: false } })
    vi.doMock('@melite/card-base/wire', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'h3-timeline')).resolves.toEqual({ detail: 'downloaded: 2', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('provision_model', { model: 'h3-timeline' })
  })

  it('uses an explicit model target over the stage fallback', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'installed' })
    vi.doMock('@melite/card-base/wire', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'model', file: 'x.bin', target: 'mask' }, 'family')).resolves.toEqual({ detail: 'installed', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('provision_model', { model: 'mask' })
  })

  it('reads restart_required from manage action data', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { state: 'restart_required' } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'installed', restartRequired: true })
  })

  it('honors restart_required independently of state', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { state: 'active', restart_required: true } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'installed', restartRequired: true })
  })

  it('a refused install surfaces the detail, never a silent ok', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false, detail: 'pack unknown to the manager list' }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'GhostPack' }, '')).rejects.toThrow('pack unknown')
  })

  it('a reply with no detail line still answers honest defaults (both kinds)', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'P installed', restartRequired: false })
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'fam provisioned', restartRequired: false })
  })

  it('a detail-less refusal still names itself', async () => {
    vi.doMock('@melite/card-base/wire', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('manage refused')
  })
})
