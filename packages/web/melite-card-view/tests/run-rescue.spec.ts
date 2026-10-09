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
import { familyOfStages, parseRescue, runRescueCall, terminalStageErrorOf } from '../src/client/run-rescue-core.ts'

describe('parseRescue (the estate refusal shapes, nothing else)', () => {
  it('a missing-extension refusal yields its pack verbatim', () => {
    expect(parseRescue(
      "card 'h3-timeline' requires 'ComfyUI-MiniMaxH3-TimelineDirector' (nodes A, B) — none live on the engine; install via ComfyUI-Manager",
    )).toEqual({ kind: 'extension', pack: 'ComfyUI-MiniMaxH3-TimelineDirector' })
  })

  it('a bare filename in a not-found context is NOT ours to fix — the offer needs a provision bearing (RISK-2)', () => {
    // The generic arm once offered Download on ANY text pairing a
    // weight-looking filename with a miss word — an output-write
    // failure or a lane cure naming a file promised an acquire no
    // DECL owned. The fence (2026-10-20) requires the text itself
    // to carry the provision bearing: a provision_model target or
    // the needs-weight sentence naming the same file.
    expect(parseRescue("node error: minimax_h3_turbo_v4_step600_ema.safetensors not found in loras/h3"))
      .toBe(null)
    expect(parseRescue('Checkpoint does not exist: flux_dev.safetensors (404)'))
      .toBe(null)
    expect(parseRescue('output img_0042.safetensors not found after run'))
      .toBe(null)
  })

  it('the needs-weight sentence keeps the generic arm honest for the SAME file', () => {
    expect(parseRescue("flow needs weight 'flux_dev.safetensors' and the engine reports 404"))
      .toEqual({ kind: 'model', file: 'flux_dev.safetensors' })
    // the bearing attaches to the file the sentence NAMES — a
    // not-found word for some OTHER file never earns the sentence's
    // file an offer, and the other file never earns one at all
    // (the parser anchors on the borne filename)
    expect(parseRescue("flow needs weight 'a.pt'; also b.safetensors not found"))
      .toEqual({ kind: 'model', file: 'a.pt' })
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

  // THE ANCHORED PACK VOICE (the client-plane audit cure, 2026-10-18):
  // a bare /requires '…'/ ate the lane voices and rendered an Install
  // banner for a phantom pack named after a lane word. Only the
  // door's own sentence parses.
  it('a lane-relation voice carrying "requires" is NOT an extension miss', () => {
    expect(parseRescue("card_compose phase 1: lane 'krea-2/turbo' refuses the state: this lane requires 'prompt' — 'prompt' is not stated"))
      .toBe(null)
    expect(parseRescue('this lane requires one of image,mask — none is stated'))
      .toBe(null)
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

  it('treats an unreadable persisted word as not failed — the pane never dies on it (2026-10-12 follow-through)', () => {
    // 'unreachable' inside runStatus is an ERA row: rows written
    // before the health channel existed (LOW-23 landed 2026-10-12)
    // carry the transport stamp in the status word — the card plane
    // now writes it on `health`, never runStatus. The view-side read
    // folds the era word to no-information: no rescue offer, no
    // throw.
    expect(terminalStageErrorOf([
      { runStatus: 'unreachable', result: { error: 'transport down' } },
      { runStatus: 'weird', result: { error: 'garbage' } },
      { runStatus: 7, result: { error: 'not even a word' } },
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
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'SomePack' }, 'h3-timeline')).resolves.toEqual({ detail: 'queued: 1 pack(s)', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('install_extension', { nodes: ['SomePack'] })
  })

  it('a model rescue posts acquire_weight with the FAMILY id (never a URL)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'downloaded: 2', data: { operation_id: 'op-1', state: 'active', bytes: 2, total: 2 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'h3-timeline')).resolves.toEqual({ detail: 'downloaded: 2', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' })
  })

  it('uses an explicit model target over the stage fallback', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-2', state: 'active', bytes: 5, total: 5 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.bin', target: 'mask' }, 'family')).resolves.toEqual({ detail: 'installed', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'x.bin' })
  })

  it('a model start that is still acquiring polls the SAME door by operation id', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-poll', state: 'acquiring', bytes: 1, total: 4 } })
      .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-poll', state: 'active', bytes: 4, total: 4 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'acquiring x', restartRequired: false })
    expect(spy).toHaveBeenNthCalledWith(1, 'acquire_weight', { model: 'fam', file: 'x.safetensors' })
    expect(spy).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-poll' })
  })

  it('reads restart_required from manage action data', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { state: 'restart_required' } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'installed', restartRequired: true })
  })

  it('honors restart_required independently of state', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { state: 'active', restart_required: true } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'installed', restartRequired: true })
  })

  it('a refused install surfaces the detail, never a silent ok', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false, detail: 'pack unknown to the manager list' }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'GhostPack' }, '')).rejects.toThrow('pack unknown')
  })

  it('a reply with no detail line still answers honest defaults (both kinds)', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-d', state: 'active', bytes: 7, total: 7 } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'P installed', restartRequired: false })
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'fam acquired (7/7 bytes)', restartRequired: false })
  })

  it('a detail-less refusal still names itself', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('manage refused')
  })

  it('a detail-less EXTENSION refusal names itself too (both arms carry the default)', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: false }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'GhostPack' }, '')).rejects.toThrow('manage refused')
  })

  it('an acquire answer with no operation id at all is refused by name (never a ghost fetch)', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, data: { state: 'active' } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('acquire_weight answered without an operation_id')
  })

  it('a non-object acquire payload is the same refusal (the wire shape is judged, not trusted)', async () => {
    vi.doMock('@melite/card-base/client', () => ({
      postManageAction: vi.fn().mockResolvedValue({ ok: true, data: null }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('answered without an operation_id')
  })

  it('a camelCase operationId and an absent state still track (the parser falls back, never invents)', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { operationId: 'op-camel' } })
      .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-camel', state: 'active', bytes: 3, total: 3 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'fam acquired (3/3 bytes)', restartRequired: false })
    expect(spy).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-camel' })
  })

  it('a model rescue with an empty file posts the family alone (no empty file key)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-nf', state: 'active' } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call, acquireWeightStart: start } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: '' }, 'fam')).resolves.toEqual({ detail: 'installed', restartRequired: false })
    expect(spy).toHaveBeenCalledWith('acquire_weight', { model: 'fam' })
    // the exported seam alone: no file argument, no file key on the wire
    await expect(start('fam')).resolves.toEqual(expect.objectContaining({ operationId: 'op-nf' }))
    expect(spy).toHaveBeenLastCalledWith('acquire_weight', { model: 'fam' })
  })

  it('a refused poll refusal voices its detail, and a detail-less one names itself', async () => {
    vi.resetModules()
    const detailed = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-x', state: 'acquiring' } })
      .mockResolvedValueOnce({ ok: false, detail: 'registry hiccup' })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: detailed }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('registry hiccup')

    vi.resetModules()
    const bare = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-y', state: 'acquiring' } })
      .mockResolvedValueOnce({ ok: false })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: bare }))
    const { runRescueCall: again } = await import('../src/client/run-rescue-core.ts')
    await expect(again({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('manage refused')
  })

  it('a terminal failed or blocked poll throws the estate voice, or names the state itself', async () => {
    vi.resetModules()
    const voiced = vi.fn().mockResolvedValue({ ok: true, detail: 'disk full', data: { operation_id: 'op-f', state: 'failed' } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: voiced }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('disk full')

    vi.resetModules()
    const bare = vi.fn().mockResolvedValue({ ok: true, data: { operation_id: 'op-b', state: 'failed' } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: bare }))
    const { runRescueCall: bareCall } = await import('../src/client/run-rescue-core.ts')
    await expect(bareCall({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('weight acquisition failed')

    vi.resetModules()
    const blocked = vi.fn().mockResolvedValue({ ok: true, data: { operation_id: 'op-k', state: 'blocked' } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: blocked }))
    const { runRescueCall: blockedCall } = await import('../src/client/run-rescue-core.ts')
    await expect(blockedCall({ kind: 'model', file: 'x.safetensors' }, 'fam')).rejects.toThrow('weight acquisition blocked')
  })
})
