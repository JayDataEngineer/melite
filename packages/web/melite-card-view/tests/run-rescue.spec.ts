// @contract cards-run-rescue-runtime
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
import { familyOfStages, parseRescue, rescueOfLaneDetails, runRescueCall, terminalRunStageErrorOf, terminalStageErrorOf } from '../src/client/run-rescue-core.ts'

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

  // THE LANE-PRESENCE VOICE (operator 2026-10-22): the presence gate's
  // own sentence opens the weight popup — the family is the provision
  // target, the declared file the miss, and the URL the prose carries
  // stays server-side (names only, always).
  it('the lane-presence gate sentence yields the family and the declared file', () => {
    expect(parseRescue("lane presence: family 'qwen-img-edit-21' declares text_encoder 'qwen3vl_8b_int8_convrot.safetensors' but no store copy exists (folders checked: text_encoders, clip, SEEDVR2) — fetch it: https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_int8_convrot.safetensors"))
      .toEqual({ kind: 'model', file: 'qwen3vl_8b_int8_convrot.safetensors', target: 'qwen-img-edit-21' })
    expect(parseRescue("bench stages/\"s_0\" (params.checkpoint): lane presence: family 'm1' declares checkpoint 'x.safetensors' but no store copy exists (folders checked: checkpoints)"))
      .toEqual({ kind: 'model', file: 'x.safetensors', target: 'm1' })
    expect(parseRescue("lane presence: family 'f1' declares vae 'not a weight name here' but no store copy exists"))
      .toBe(null)
  })

  // THE RUNTIME-MISS VOICE (E2-2, operator 2026-10-20 — "WHEN THE
  // MODEL IS MISSING, A DOWNLOAD PROMPT APPEARS, NOT WHATEVER
  // BULLSHIT I SEE"): the engine's own sentence names the missing
  // tool runtime AND its provision command — `X runtime not found
  // at <path>. Provision it: <cmd>` — so the estate faces the
  // provision instead of the raw ComfyError. The anchor is the
  // engine's own "Provision it:" sentence (the anchored-pack
  // precedent): a bare "runtime not found" without it is not ours
  // to fix — never a wrong install.
  it('the engine runtime-miss sentence yields the runtime and its provision command', () => {
    expect(parseRescue("ComfyError: ComfyUI run failed: RuntimeError: anny-estimator runtime not found at /home/user/tools/data/runtime/anny-estimator. Provision it: pnpm run provision -- estimator (SAM 3D Body venv + SOMA-X checkout — see dev_docs/design/estimator-chain.md). Missing: /home/user/tools/data/runtime/anny-estimator/estimator_chain.py, /home/user/tools/data/runtime/anny-estimator/.venv/bin/python, /home/user/tools/data/runtime/anny-estimator/SOMA-X/tools/mhr2soma.py. Or point ANNY_ESTIMATOR_ROOT at an existing runtime. @ anny::Sam3dBodyImageToAnny.0 (Sam3dBodyImageToAnny, 1 nodes executed before the failure)"))
      .toEqual({ kind: 'runtime', runtime: 'anny-estimator', command: 'pnpm run provision -- estimator (SAM 3D Body venv + SOMA-X checkout — see dev_docs/design/estimator-chain.md)', env: 'ANNY_ESTIMATOR_ROOT' })
  })

  it('a runtime-miss without the engine Provision sentence is not ours to fix', () => {
    expect(parseRescue('RuntimeError: some-tool runtime not found at /opt/runtimes/x'))
      .toBe(null)
    expect(parseRescue('the engine refused: CUDA out of memory')).toBe(null)
  })
})

describe('rescueOfLaneDetails (the structured lane miss, exact at the press site)', () => {
  it('the door\'s details row reads into a model rescue with the family target', () => {
    expect(rescueOfLaneDetails({ family: 'f1', slot: 'text_encoder', missing: 't.safetensors', folders: ['clip'], fetch_url: 'https://example/t', kind: 'model' }))
      .toEqual({ kind: 'model', file: 't.safetensors', target: 'f1' })
  })
  it('anything that is not that row is null (the prose anchor covers it)', () => {
    expect(rescueOfLaneDetails(undefined)).toBe(null)
    expect(rescueOfLaneDetails({ family: 'f1', missing: 't.safetensors', kind: 'model' })).toBe(null)
    expect(rescueOfLaneDetails({ family: 'f1', missing: 't.safetensors', kind: 'extension' })).toBe(null)
    expect(rescueOfLaneDetails({ family: '', missing: 't.safetensors', kind: 'model' })).toBe(null)
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

describe('terminalRunStageErrorOf (the run wire shape — the runface-error cure)', () => {
  it('returns the first error-folded stage error verbatim (the run shape, not the draft shape)', () => {
    // the draft read would fold every one of these to not-failed
    // ({ runStatus, result.error } is absent) — the run read folds
    // { status, error } instead.
    expect(terminalRunStageErrorOf([
      { status: 'done', error: 'not terminal' },
      { status: 'failed', error: 'node 3 blew up' },
      { status: 'failed', error: 'second' },
    ])).toBe('node 3 blew up')
  })

  it('prefers the stage error over the run-level fallback (terminalOutcomeOf stage-first order)', () => {
    expect(terminalRunStageErrorOf(
      [{ status: 'failed', error: 'stage owns it' }],
      'run fallback',
    )).toBe('stage owns it')
  })

  it('falls back to the run-level text when no single stage owns the reason', () => {
    expect(terminalRunStageErrorOf(
      [{ status: 'failed' }, { status: 'done', error: 'not terminal' }],
      'gpu gone',
    )).toBe('gpu gone')
  })

  it('ignores non-terminal, empty, and malformed stage errors — null when nothing voices', () => {
    expect(terminalRunStageErrorOf([
      { status: 'failed', error: '' },
      { status: 'failed', error: 7 },
      { status: 'running', error: 'live' },
      { status: 'done', error: 'not terminal' },
    ])).toBe(null)
    expect(terminalRunStageErrorOf([], undefined)).toBe(null)
  })

  it('treats an unreadable status word as not failed — the pane never dies on it', () => {
    expect(terminalRunStageErrorOf([
      { status: 'unreachable', error: 'transport down' },
      { status: 'weird', error: 'garbage' },
      { status: 7, error: 'not even a word' },
    ], 'run fallback')).toBe('run fallback')
    expect(terminalRunStageErrorOf([
      { status: 'weird', error: 'garbage' },
    ])).toBe(null)
  })
})

describe('runRescueCall (names only, the one wire)', () => {
  // THE UNMOCKED-SUCCESS MOVE (the download-honesty cure, 2026-11-08):
  // the model-arm fixtures below once answered the wire with
  // state:'active' and expected a RESOLVED acquire — 'active' sat in
  // ACQUIRE_TERMINAL, so the mock itself declared a non-terminal
  // engine report a completion (run-rescue-acquire-terminal.spec.ts
  // ARM 1 is the wall that refused it). Every such fixture now
  // answers with the genuinely terminal word 'installed'; the
  // restartRequired:true it carries is the standing law for a landed
  // weight (restart_required || installed).
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
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'downloaded: 2', data: { operation_id: 'op-1', state: 'installed', bytes: 2, total: 2 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'h3-timeline')).resolves.toEqual({ detail: 'downloaded: 2', restartRequired: true })
    expect(spy).toHaveBeenCalledWith('acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' })
  })

  it('uses an explicit model target over the stage fallback', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-2', state: 'installed', bytes: 5, total: 5 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.bin', target: 'mask' }, 'family')).resolves.toEqual({ detail: 'installed', restartRequired: true })
    expect(spy).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'x.bin' })
  })

  it('a model start that is still acquiring polls the SAME door by operation id', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-poll', state: 'acquiring', bytes: 1, total: 4 } })
      .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-poll', state: 'installed', bytes: 4, total: 4 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'acquiring x', restartRequired: true })
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
        .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-d', state: 'installed', bytes: 7, total: 7 } }),
    }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'extension', pack: 'P' }, '')).resolves.toEqual({ detail: 'P installed', restartRequired: false })
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'fam acquired (7/7 bytes)', restartRequired: true })
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
      .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-camel', state: 'installed', bytes: 3, total: 3 } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: 'x.safetensors' }, 'fam')).resolves.toEqual({ detail: 'fam acquired (3/3 bytes)', restartRequired: true })
    expect(spy).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-camel' })
  })

  it('a model rescue with an empty file posts the family alone (no empty file key)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-nf', state: 'installed' } })
    vi.doMock('@melite/card-base/client', () => ({ postManageAction: spy }))
    const { runRescueCall: call, acquireWeightStart: start } = await import('../src/client/run-rescue-core.ts')
    await expect(call({ kind: 'model', file: '' }, 'fam')).resolves.toEqual({ detail: 'installed', restartRequired: true })
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
