/**
 * bench-load — the media plane's restore gestures (the Flows face's
 * click + every wand), pinned WITHOUT the panel (unit level,
 * fakes-not-mocks: fetch is replaced whole per test and answers the
 * same-origin doors; the recorded calls + the deps' open/error
 * surfaces are asserted by deep-equal):
 *
 *   addresses — the cross-plugin bench/run address codecs;
 *   draft     — the CAS read-modify-write (rev rides, birth on miss,
 *               refusals surface honestly, never a throw past React);
 *   run       — the run's OWN record wins (bench_snapshot first, then
 *               card_snapshot, then the verbatim request, then the
 *               draft link; a draftless run errors honestly).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cardsBenchAddress,
  cardsRunAddress,
  loadDraftOntoBench,
  loadRunOntoBench,
  type BenchLoadDeps,
} from '../src/client/bench-load.ts'

interface Deps extends BenchLoadDeps {
  opened: string[]
  errors: string[]
}

function deps(sessionId?: string): Deps {
  const opened: string[] = []
  const errors: string[] = []
  return {
    opened,
    errors,
    sessionId,
    openResource(address: string) {
      opened.push(address)
    },
    onError(message: string) {
      errors.push(message)
    },
  }
}

type Route = (url: string, init?: RequestInit) => Response | Promise<Response> | never

function stubFetch(route: Route): { calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    calls.push({ url, init })
    return route(url, init)
  }))
  return { calls }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The CAS birth + load tail, canned per test. */
function benchRoutes(get: Route, ensure: Route): Route {
  return (url, init) => {
    if (url.startsWith('/v1/bench/ensure')) return ensure(url, init)
    if (url.startsWith('/v1/bench/')) return get(url, init)
    throw new Error('unstubbed door ' + url)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the bench/run address codecs', () => {
  it('names the conversation bench, main for unattributed seats', () => {
    expect(cardsBenchAddress('s1')).toBe('dsh-resource://cards/bench/s1')
    expect(cardsBenchAddress(undefined)).toBe('dsh-resource://cards/bench/main')
    expect(cardsBenchAddress('bad id!')).toBe('dsh-resource://cards/bench/main')
    expect(cardsBenchAddress('')).toBe('dsh-resource://cards/bench/main')
  })

  it('encodes the run address', () => {
    expect(cardsRunAddress('r 9')).toBe('dsh-resource://cards/run/r%209')
  })
})

describe('loadDraftOntoBench — the CAS load', () => {
  const DRAFT = { stages: [{ id: 's_0', engine: 'comfyui' }], intent: 'a red cube' }

  it('a boot-race ensure refusal retries to the load (never "the bench refused")', async () => {
    // The 3088 incident's client half (2026-10-18): the estate's
    // seats mount behind the boot URL, and the doors answer the
    // pending voice meanwhile — a WAIT state, never a bench
    // refusal. Fake timers drive the retry cadence.
    vi.useFakeTimers()
    try {
      let ensures = 0
      stubFetch((url) => {
        if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
        if (url.startsWith('/v1/bench/ensure')) {
          ++ensures
          if (ensures === 1) {
            return json({
              error: 'estate composition is still activating',
              code: 'estate/pending',
              pending: true,
            }, 503)
          }
          return json({ ok: true })
        }
        return json({ rev: 3 })
      })
      const d = deps('s1')
      const settling = loadDraftOntoBench('d1', d)
      await vi.advanceTimersByTimeAsync(1_000)
      await settling
      expect(ensures).toBe(2)
      expect(d.errors).toEqual([])
      expect(d.opened).toEqual(['dsh-resource://cards/bench/s1'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('reads the rev, ensures with expect_rev, and opens the bench', async () => {
    const routed: Route = (url, init) => {
      if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
      return benchRoutes(
        () => json({ rev: 3 }),
        () => json({ ok: true }),
      )(url, init)
    }
    stubFetch(routed)
    const d = deps('s1')
    await loadDraftOntoBench('d1', d)
    expect(d.errors).toEqual([])
    expect(d.opened).toEqual(['dsh-resource://cards/bench/s1'])
  })

  it('carries the CAS rev into the ensure body', async () => {
    const { calls } = stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
      if (url.startsWith('/v1/bench/ensure')) return json({ ok: true })
      return json({ rev: 7 })
    })
    const d = deps('s1')
    await loadDraftOntoBench('d1', d)
    expect(d.errors).toEqual([])
    const ensure = calls.find((c) => c.url === '/v1/bench/ensure')
    const body = JSON.parse(String(ensure?.init?.body)) as Record<string, unknown>
    expect(body).toMatchObject({ session: 's1', author: 'user', overwrite: true, expect_rev: 7, intent: 'a red cube' })
  })

  it('births on any miss (no bench, unparsable rev, unreadable row)', async () => {
    for (const get of [
      () => json({ error: 'no bench' }, 404),
      () => json({ rev: 'three' }),
      () => new Response('not json', { status: 200 }),
    ] as Route[]) {
      const { calls } = stubFetch((url) => {
        if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
        if (url.startsWith('/v1/bench/ensure')) return json({ ok: true })
        return get(url)
      })
      const d = deps('s1')
      await loadDraftOntoBench('d1', d)
      expect(d.errors).toEqual([])
      expect(d.opened).toEqual(['dsh-resource://cards/bench/s1'])
      const body = JSON.parse(String(calls.find((c) => c.url === '/v1/bench/ensure')?.init?.body)) as Record<string, unknown>
      expect('expect_rev' in body).toBe(false)
    }
  })

  it('an unreadable draft errors honestly (refusal voice, then HTTP n)', async () => {
    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json({ error: 'unknown draft' }, 404)
      return json({ rev: 1 })
    })
    const d = deps('s1')
    await loadDraftOntoBench('nope', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['could not read that card (unknown draft)'])

    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json({}, 500)
      return json({ rev: 1 })
    })
    const e = deps('s1')
    await loadDraftOntoBench('nope', e)
    expect(e.errors).toEqual(['could not read that card (HTTP 500)'])

    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json('just a string')
      return json({ rev: 1 })
    })
    const f = deps('s1')
    await loadDraftOntoBench('d1', f)
    expect(f.errors).toEqual(['could not read that card (HTTP 200)'])
  })

  it('a shapeless draft loads empty stages with the default intent', async () => {
    const { calls } = stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json({ stages: 'nope', intent: 42 })
      if (url.startsWith('/v1/bench/ensure')) return json({ ok: true })
      return json({ error: 'no bench' }, 404)
    })
    const d = deps(undefined)
    await loadDraftOntoBench('d1', d)
    expect(d.errors).toEqual([])
    expect(d.opened).toEqual(['dsh-resource://cards/bench/main'])
    const body = JSON.parse(String(calls.find((c) => c.url === '/v1/bench/ensure')?.init?.body)) as Record<string, unknown>
    expect(body).toMatchObject({ stages: [], intent: 'restored draft' })
  })

  it('a refused ensure surfaces the refusal; a bare one surfaces HTTP n', async () => {
    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
      if (url.startsWith('/v1/bench/ensure')) return json({ error: 'bench/cas-conflict' }, 409)
      return json({ rev: 1 })
    })
    const d = deps('s1')
    await loadDraftOntoBench('d1', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['the bench refused the load (bench/cas-conflict)'])

    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
      if (url.startsWith('/v1/bench/ensure')) return new Response('not json', { status: 409 })
      return json({ rev: 1 })
    })
    const e = deps('s1')
    await loadDraftOntoBench('d1', e)
    expect(e.errors).toEqual(['the bench refused the load (HTTP 409)'])
  })

  it('transport failures surface caller-side (Errors and bare throws alike)', async () => {
    stubFetch(() => {
      throw new Error('socket reset')
    })
    const d = deps('s1')
    await loadDraftOntoBench('d1', d)
    expect(d.errors).toEqual(['bench load failed — socket reset'])

    stubFetch(() => {
      throw 'bare string failure'
    })
    const e = deps('s1')
    await loadDraftOntoBench('d1', e)
    expect(e.errors).toEqual(['bench load failed — bare string failure'])
  })

  it('a bench-read failure surfaces through the load tail (Errors and bare throws)', async () => {
    for (const thrown of [new Error('rev unreadable'), 'bare rev failure'] as const) {
      stubFetch((url) => {
        if (url.startsWith('/v1/flows/drafts/')) return json(DRAFT)
        throw thrown
      })
      const d = deps('s1')
      await loadDraftOntoBench('d1', d)
      expect(d.opened).toEqual([])
      expect(d.errors).toEqual(['bench load failed — ' + String(thrown instanceof Error ? thrown.message : thrown)])
    }
  })

  it('an unparsable draft body errors honestly', async () => {
    stubFetch((url) => {
      if (url.startsWith('/v1/flows/drafts/')) return new Response('not json', { status: 200 })
      return json({ rev: 1 })
    })
    const d = deps('s1')
    await loadDraftOntoBench('d1', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['could not read that card (HTTP 200)'])
  })
})

describe('loadRunOntoBench — the run record wins', () => {
  function runWith(side: unknown, draft: unknown = { stages: [], intent: 'x' }): Route {
    return (url) => {
      if (url.startsWith('/infer-gallery/flow')) {
        return typeof side === 'string' ? new Response(side, { status: 200 }) : json(side)
      }
      if (url.startsWith('/v1/flows/drafts/')) return json(draft)
      if (url.startsWith('/v1/bench/ensure')) return json({ ok: true })
      return json({ error: 'no bench' }, 404)
    }
  }

  it('THE SNAPSHOT CONTRACT: an unloadable bench_snapshot refuses with the row named and never posts to the door', async () => {
    // (the operator's order, 2026-09-26: "the saving should 100% be
    // a schemamaster contract" — the reader judges bench_snapshot
    // through the same contract the writer stamps; a snapshot that
    // fails parse is refused with the exact problem, never a
    // best-effort post of coerced junk to the bench. The card arm
    // is NOT a fallback for a corrupt bench arm — a silent partial
    // restore is the fabrication this law kills.)
    const { calls } = stubFetch(runWith({
      run_id: 'r1',
      flow: {
        card_snapshot: { card: 'image-gen', params: { prompt: 'ran prompt' } },
        bench_snapshot: { stages: [{ id: 'ok', card: 'image-gen' }, null], intent: 'x' },
      },
    }))
    const d = deps('s1')
    await loadRunOntoBench('r1', d)
    expect(d.errors).toEqual([
      'this run keeps an unloadable bench snapshot (bench_snapshot.stages[1]: not an object)',
    ])
    expect(calls.some((c) => c.url === '/v1/bench/ensure')).toBe(false)
    expect(d.opened).toEqual([])
  })

  it('THE SNAPSHOT CONTRACT, card face: a cardless or junk-params card_snapshot refuses by name (never a coerced restore)', async () => {
    // params:'not-an-object' used to coerce to {} and "restore
    // bare" — a fabricated input record riding the bench as if it
    // were the ran workflow. The contract names it and refuses.
    stubFetch(runWith({ run_id: 'r2', flow: { card_snapshot: { params: { prompt: 'x' } } } }))
    const d = deps('s1')
    await loadRunOntoBench('r2', d)
    expect(d.errors).toEqual([
      'this run keeps an unloadable card snapshot (card_snapshot.card: must be a non-empty string)',
    ])

    stubFetch(runWith({ run_id: 'r2b', flow: { card_snapshot: { card: 'image-gen', params: 'not-an-object' } } }))
    const e = deps('s1')
    await loadRunOntoBench('r2b', e)
    expect(e.errors).toEqual([
      'this run keeps an unloadable card snapshot (card_snapshot.params: must be an object)',
    ])
    expect(e.opened).toEqual([])
  })

  function ensuredBody(calls: Array<{ url: string; init?: RequestInit }>): Record<string, unknown> {
    return JSON.parse(String(calls.find((c) => c.url === '/v1/bench/ensure')?.init?.body)) as Record<string, unknown>
  }

  it('an unreadable sidecar errors honestly', async () => {
    stubFetch((url) => {
      if (url.startsWith('/infer-gallery/flow')) return json({ error: 'gone' }, 404)
      return json({ rev: 1 })
    })
    const d = deps('s1')
    await loadRunOntoBench('r1', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['that run keeps no readable sidecar (gone)'])

    stubFetch((url) => {
      if (url.startsWith('/infer-gallery/flow')) return json('just a string')
      return json({ rev: 1 })
    })
    const e = deps('s1')
    await loadRunOntoBench('r1', e)
    expect(e.errors).toEqual(['that run keeps no readable sidecar (HTTP 200)'])
  })

  it('an unparsable sidecar errors honestly', async () => {
    stubFetch((url) => {
      if (url.startsWith('/infer-gallery/flow')) return new Response('not json', { status: 200 })
      return json({ rev: 1 })
    })
    const d = deps('s1')
    await loadRunOntoBench('r1', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['that run keeps no readable sidecar (HTTP 200)'])
  })

  it('the bench_snapshot restores every stage (stale state stripped; D6, 2026-11-06: EVERY ran stage keeps the run previews, not the matched card alone)', async () => {
    const side = {
      run_id: 'r1',
      skipped_stages: ['s_2'],
      flow: {
        artifacts: ['/data/run-0f1e2d-r1/out.png'],
        card_snapshot: { card: 'image-gen', params: { prompt: 'ran prompt', draft_id: 'd9', test: 1 } },
        bench_snapshot: {
          stages: [
            { id: 's_0', card: 'image-gen', result: { old: true }, runStatus: 'x', resolved: true },
            { id: 's_1', card: 'other' },
            { id: 's_2', card: 'skipped-card' },
          ],
          intent: 'the full workflow intent from the run press, kept verbatim here for the restore',
        },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r1', d)
    expect(d.errors).toEqual([])
    expect(d.opened).toEqual(['dsh-resource://cards/bench/s1'])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages).toHaveLength(3)
    const shared = { run_id: 'r1', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/out.png') }
    expect(stages[0]).toMatchObject({ id: 's_0', card: 'image-gen', provenance: 'restored', result: shared })
    expect('runStatus' in stages[0]!).toBe(false)
    // (D6 re-pin, 2026-11-06: "image previews not recovered on all
    // cards") the old arm pinned the DEFECT as law — s_1 (card
    // 'other', never matched by card_snapshot.card) restored
    // previewless and its card rendered no image. The run's result
    // is shared truth; each card's own preview law picks its hero.
    expect(stages[1]).toMatchObject({ id: 's_1', card: 'other', provenance: 'restored', result: shared })
    // THE SKIPPED SET never carries another stage's product.
    expect(stages[2]).toEqual({ id: 's_2', card: 'skipped-card', provenance: 'restored' })
    expect(String(ensuredBody(calls).intent).length).toBeLessThanOrEqual(77)
  })

  it('THE CROSS-BENCH HISTORY LEAK — history/resultParams never ride a restore (bench-session-2bd2a61f proof)', async () => {
    // Live proof, 2026-09-23: the operator's bench s_0 (an sfx card)
    // showed history tiles NAMED LIKE ANOTHER CARD'S FILE — a tts
    // flac from the maker session's run and an sfx run from a third
    // bench. Mechanism: the wand's bench_snapshot arm stripped
    // result/runStatus/resolved but SHIPPED history/resultParams
    // verbatim; ensure admitted them; the next Run press archived
    // the foreign memory into this bench's tiles. The restore ships
    // the WORKFLOW only — memory never crosses benches.
    const side = {
      run_id: 'r-leak',
      flow: {
        artifacts: ['/data/run-0f1e2d-rleak/tts/SaveAudio.0_tts_00001.flac'],
        card_snapshot: { card: 'sfx', params: { prompt: 'thunder' } },
        bench_snapshot: {
          stages: [
            {
              id: 's_0',
              card: 'sfx',
              result: { run_id: 'run-foreign-1', url: '/x/flac' },
              runStatus: 'done',
              history: [
                { run_id: 'run-foreign-tts', url: '/tts/SaveAudio.0_tts_00001.flac' },
                { run_id: 'run-foreign-sfx', url: '/sfx/SaveAudio.0_sfx_00001.flac', params: { qvoice: [{ qvoice: '/v/joren.qvoice' }] } },
              ],
              resultParams: { qvoice: [{ qvoice: '/v/joren.qvoice' }], style_instruction: 'young man' },
            },
            {
              id: 's_1',
              card: 'tts',
              history: [{ run_id: 'run-foreign-tts', url: '/tts/x.flac' }],
              resultParams: { voice: 'ryan' },
            },
          ],
          intent: 'restored from a foreign bench, memory must die here',
        },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r-leak', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages).toHaveLength(2)
    for (const st of stages) {
      expect('history' in st).toBe(false)
      expect('resultParams' in st).toBe(false)
      expect('runStatus' in st).toBe(false)
      expect('resolved' in st).toBe(false)
    }
    // the ran card still keeps ITS OWN preview (the restore's one
    // lawful result stamp — this run's artifact, not the memory).
    expect(stages[0]).toMatchObject({
      id: 's_0',
      card: 'sfx',
      provenance: 'restored',
      result: { run_id: 'r-leak', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rleak/tts/SaveAudio.0_tts_00001.flac') },
    })
  })

  it('a single-stage snapshot falls through to the card arm', async () => {
    const side = {
      run_id: 'r2',
      flow: {
        artifacts: ['/data/run-0f1e2d-r2/out.png'],
        card_snapshot: { card: 'image-gen', params: { prompt: 'solo' } },
        bench_snapshot: { stages: [{ id: 's_0', card: 'image-gen' }], intent: '' },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r2', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages).toHaveLength(1)
    expect(stages[0]).toMatchObject({ id: 's_0', engine: 'comfyui', card: 'image-gen', provenance: 'restored' })
    expect(ensuredBody(calls).intent).toBe('solo')
  })

  it('THE MASK BREAK — a self-naming model (params.model === card) is stripped before re-admission', async () => {
    // Live proof run-ffbabb558cb8-c79f2b98: the era's compose wire
    // stamped model='mask' on the mask card, and today's write-time
    // admission refuses a model the card does not board (mask boards
    // none) — every mask restore died 'model X is not offered by
    // card X'. The family-less voice strips; the restore lands.
    // (The F1 mint, 2026-10-12, keeps this arm: the family id is
    // mask-select, never the card's id, so the strip still owns the
    // card's self-naming residue — the form-spec door keeps the
    // card arm too.)
    const side = {
      run_id: 'rm',
      flow: {
        artifacts: ['/data/runs/output/run-0f1e2d-rm/mask/SaveImage.0_mask_combined_00001_.png'],
        card_snapshot: {
          card: 'mask',
          params: {
            input_image: '/melite-media/runs/run-src/generate/SaveImage.0_gen_00001_.png',
            model: 'mask',
            sam3: [{ name: 'sam3', prompt: 'hat', sam_threshold: 0.5 }],
            draft_id: 'bench-session-x',
            test: false,
          },
        },
        bench_snapshot: { stages: [{ id: 's_0', card: 'mask', params: { model: 'mask' } }], intent: '' },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rm', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toMatchObject({
      id: 's_0',
      card: 'mask',
      params: {
        input_image: '/melite-media/runs/run-src/generate/SaveImage.0_gen_00001_.png',
        sam3: [{ name: 'sam3', prompt: 'hat', sam_threshold: 0.5 }],
      },
    })
    expect('model' in (stages[0]!['params'] as Record<string, unknown>)).toBe(false)
  })

  it('a model naming a REAL family rides untouched (admission judges it, never the restore)', async () => {
    const side = {
      run_id: 'rg',
      flow: {
        artifacts: ['/data/run-0f1e2d-rg/out.png'],
        card_snapshot: { card: 'image-gen', params: { model: 'z-image', prompt: 'a hat' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rg', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect((stages[0]!['params'] as Record<string, unknown>)['model']).toBe('z-image')
  })

  it('a multi-stage snapshot strips the self-naming model per stage (era stages ride the same law)', async () => {
    const side = {
      run_id: 'rs',
      flow: {
        artifacts: ['/data/run-0f1e2d-rs/out.png'],
        card_snapshot: { card: 'mask', params: { model: 'mask' } },
        bench_snapshot: {
          stages: [
            { id: 's_0', card: 'image-gen', params: { prompt: 'gen', model: 'z-image' } },
            { id: 's_1', card: 'mask', params: { model: 'mask', sam3: [] } },
          ],
          intent: 'two stages, era model residue',
        },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rs', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect((stages[0]!['params'] as Record<string, unknown>)['model']).toBe('z-image')
    expect('model' in (stages[1]!['params'] as Record<string, unknown>)).toBe(false)
    expect(stages[1]!['params']).toMatchObject({ sam3: [] })
  })

  it('a snapshot without a preview or prompt restores bare (no result key, default intent)', async () => {
    // (the junk-params coercion this wall used to pin —
    // params:'not-an-object' → {} — died with THE SNAPSHOT
    // CONTRACT above; the bare-restore law keeps its purpose with a
    // well-formed params record.)
    const side = {
      run_id: 'r3',
      flow: {
        artifacts: ['notes.txt'],
        card_snapshot: { card: 'image-gen', params: { seed: 3 } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r3', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toEqual({
      // THE CONTRACT-SHAPED ROW (benchStage.ts — the restore rides it
      // now, so this arm is not a second writer): a CARD stage's
      // outputs stay ABSENT (the card-ports law — they are derived
      // from the card's ports at compose; fabricating an image
      // default here mis-kinded every video/tts/film stage).
      id: 's_0', engine: 'comfyui', card: 'image-gen', params: { seed: 3 },
      inputs: {}, outputs: {}, provenance: 'restored',
    })
    expect(ensuredBody(calls).intent).toBe('restored run')
  })

  it('a non-image artifact list restores without a preview', async () => {
    const side = {
      run_id: 'r4',
      flow: { card_snapshot: { card: 'image-gen', params: { prompt: 'p' } } },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r4', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect('result' in stages[0]!).toBe(false)
  })

  it('an audio artifact stamps the run preview (the audit: TTS restores carried no preview)', async () => {
    const side = {
      run_id: 'ra',
      flow: {
        artifacts: ['/data/runs/output/run-0f1e2d-ra/tts/SaveAudio.0_tts_00001.flac'],
        card_snapshot: { card: 'tts', params: { model: 'qwen3-tts', text: 'say it' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('ra', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toMatchObject({
      card: 'tts',
      result: { run_id: 'ra', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-ra/tts/SaveAudio.0_tts_00001.flac') },
    })
  })

  it('a video artifact stamps the run preview', async () => {
    const side = {
      run_id: 'rv',
      flow: {
        artifacts: ['/data/runs/output/run-0f1e2d-rv/generate/film.mp4'],
        card_snapshot: { card: 'video-gen', params: { prompt: 'a film' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rv', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toMatchObject({
      result: { run_id: 'rv', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rv/generate/film.mp4') },
    })
  })

  it('THE FULL GALLERY RIDES THE STAMP — an h3 run restores ALL clips, hero = the concatenated film (the "one of three clips" catch)', async () => {
    // Operator catch, 2026-09-23: "reload card history, open the
    // timeline card — the preview shows ONE of the three clips."
    // The old stamp carried arts.find(first) alone — for h3 runs
    // _flow.json.artifacts[0] is often a WINDOW clip, so the restored
    // hero was the wrong clip AND the walk set held one item. The
    // stamp mirrors the estate's terminal outcome: artifacts map +
    // assetUrls for every clip; the hero is the video WITHOUT a
    // window suffix (the concatenated film).
    const R = (p: string): string => '/infer-gallery/artifact?path=' + encodeURIComponent(p)
    const side = {
      run_id: 'rh3',
      flow: {
        artifacts: [
          '/data/runs/output/run-0f1e2d-rh3/h3-film/h3_t4_w2_00004_.mp4',
          '/data/runs/output/run-0f1e2d-rh3/h3-film/h3_t4_film_00021_.mp4',
          '/data/runs/output/run-0f1e2d-rh3/h3-film/h3_t4_w1_00005_.mp4',
          '/data/runs/output/run-0f1e2d-rh3/h3-film/notes.txt',
        ],
        card_snapshot: { card: 'h3-timeline', params: { prompt: 'the storm' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rh3', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    const result = stages[0]?.['result'] as Record<string, unknown>
    expect(result['run_id']).toBe('rh3')
    expect(result['url'], 'the hero is the concatenated film, not the first-listed window').toBe(
      R('run-0f1e2d-rh3/h3-film/h3_t4_film_00021_.mp4'),
    )
    expect(result['artifacts']).toEqual({
      'run-0f1e2d-rh3/h3-film/h3_t4_film_00021_.mp4': R('run-0f1e2d-rh3/h3-film/h3_t4_film_00021_.mp4'),
      // TEXT RIDES THE GALLERY (the text-visibility law): a .txt in
      // the artifacts list is served through the same artifact map —
      // the hero law is unchanged (film beats windows beats text);
      // the row's presence IS the pin.
      'run-0f1e2d-rh3/h3-film/notes.txt': R('run-0f1e2d-rh3/h3-film/notes.txt'),
      'run-0f1e2d-rh3/h3-film/h3_t4_w2_00004_.mp4': R('run-0f1e2d-rh3/h3-film/h3_t4_w2_00004_.mp4'),
      'run-0f1e2d-rh3/h3-film/h3_t4_w1_00005_.mp4': R('run-0f1e2d-rh3/h3-film/h3_t4_w1_00005_.mp4'),
    })
    // assetUrls carries every served row (the three clips + the
    // text note — the same visibility law as the map above).
    expect(result['assetUrls']).toHaveLength(4)
  })

  it('a window-only gallery uses its first clip and skips paths outside a run directory', async () => {
    const side = {
      run_id: 'r-window',
      flow: {
        artifacts: [
          '/data/run-0f1e2d-rwin/h3_t4_w1_00001_.mp4',
          '/outside/h3_t4_w2_00001_.mp4',
        ],
        card_snapshot: { card: 'h3-timeline', params: { prompt: 'window only' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r-window', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    const result = stages[0]?.['result'] as Record<string, unknown>
    const route = (path: string): string => '/infer-gallery/artifact?path=' + encodeURIComponent(path)
    expect(result).toMatchObject({
      url: route('run-0f1e2d-rwin/h3_t4_w1_00001_.mp4'),
      artifacts: { 'run-0f1e2d-rwin/h3_t4_w1_00001_.mp4': route('run-0f1e2d-rwin/h3_t4_w1_00001_.mp4') },
      assetUrls: [route('run-0f1e2d-rwin/h3_t4_w1_00001_.mp4')],
    })
  })

  it('a model artifact stamps the run preview', async () => {
    const side = {
      run_id: 'rm',
      flow: {
        artifacts: ['/data/runs/output/run-0f1e2d-rm/mesh/model.glb'],
        card_snapshot: { card: 'img-to-mesh', params: {} },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('rm', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toMatchObject({
      result: { run_id: 'rm', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rm/mesh/model.glb') },
    })
  })

  it('a bench-born draft link refuses honestly (the living bench is never the source)', async () => {
    stubFetch(runWith({ run_id: 'rb', flow: { draft_id: 'bench-main' } }))
    const d = deps('s1')
    await loadRunOntoBench('rb', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['that run was born on a living bench and keeps no snapshot — nothing to restore exactly'])

    stubFetch(runWith({ run_id: 'rc', flow: null, draft_id: 'bench-other' }))
    const e = deps('s1')
    await loadRunOntoBench('rc', e)
    expect(e.opened).toEqual([])
    expect(e.errors).toEqual(['that run was born on a living bench and keeps no snapshot — nothing to restore exactly'])
  })

  it('an image outside any run dir restores without a preview', async () => {
    const side = {
      run_id: 'r5',
      flow: {
        artifacts: ['/absolute/elsewhere/img.png'],
        card_snapshot: { card: 'image-gen', params: { prompt: 'p' } },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r5', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect('result' in stages[0]!).toBe(false)
  })

  it('a shapeless bench_snapshot refuses by name (THE SNAPSHOT CONTRACT killed the silent fall-through to the card arm)', async () => {
    // stages:'nope' used to fall through to the card arm and
    // restore ONE stage of a multi-stage workflow as if that were
    // the run — a silent partial restore. The contract names the
    // corruption and refuses; the ran card is never presented as
    // the workflow that made the media.
    const { calls } = stubFetch(runWith({
      run_id: 'r10',
      flow: {
        card_snapshot: { card: 'image-gen', params: { prompt: 'shapeless' } },
        bench_snapshot: { stages: 'nope', intent: 'ignored' },
      },
    }))
    const d = deps('s1')
    await loadRunOntoBench('r10', d)
    expect(d.errors).toEqual([
      'this run keeps an unloadable bench snapshot (bench_snapshot.stages: must be an array)',
    ])
    expect(calls.some((c) => c.url === '/v1/bench/ensure')).toBe(false)
    expect(d.opened).toEqual([])
  })

  it('a run_id-less sidecar still restores (the id defaults empty)', async () => {
    const snapSide = {
      flow: { card_snapshot: { card: 'image-gen', params: { prompt: 'no id' } } },
    }
    const snapCalls = stubFetch(runWith(snapSide))
    const a = deps('s1')
    await loadRunOntoBench('rx', a)
    expect(a.errors).toEqual([])
    expect(ensuredBody(snapCalls.calls).intent).toBe('no id')

    const reqSide = {
      flow: {},
      request: { model: 'image-gen' },
    }
    const reqCalls = stubFetch(runWith(reqSide))
    const b = deps('s1')
    await loadRunOntoBench('ry', b)
    expect(b.errors).toEqual([])
    const reqStages = ensuredBody(reqCalls.calls).stages as Array<Record<string, unknown>>
    expect(reqStages[0]).toEqual({
      // the CONTRACT-shaped row: a card-LESS restore keeps the
      // engine's own output default (only a CARD stage derives its
      // channels from its ports — the card-ports law)
      id: 's_0',
      engine: 'comfyui',
      params: { model: 'image-gen' },
      inputs: {},
      outputs: { default: 'image' },
      provenance: 'restored',
    })
    expect(ensuredBody(reqCalls.calls).intent).toBe('restored run')

    const fullSide = {
      flow: {
        artifacts: ['/data/run-0f1e2d-rz/out.png'],
        card_snapshot: { card: 'a' },
        bench_snapshot: { stages: [{ id: 's_0', card: 'a' }, { id: 's_1', card: 'b' }], intent: '' },
      },
    }
    const fullCalls = stubFetch(runWith(fullSide))
    const c = deps('s1')
    await loadRunOntoBench('rz', c)
    expect(c.errors).toEqual([])
    const fullStages = ensuredBody(fullCalls.calls).stages as Array<Record<string, unknown>>
    expect(fullStages[0]).toMatchObject({ result: { run_id: '', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-rz/out.png') } })
    expect(ensuredBody(fullCalls.calls).intent).toBe('restored run')
  })

  it('D6: a multi-stage snapshot without the ran card still recovers previews (and an artifactless run stamps nothing)', async () => {
    // (re-pin 2026-11-06) the old arm pinned the DEFECT as law: no
    // card_snapshot match -> no stage carried a result -> every card
    // in the restored flow rendered previewless. The run's result is
    // shared truth; the card match was never the gate.
    const side = {
      run_id: 'r6',
      flow: {
        artifacts: ['/data/run-0f1e2d-r6/out.png'],
        bench_snapshot: {
          stages: [{ id: 's_0', card: 'a' }, { id: 's_1', card: 'b' }],
          intent: 'two stages, no snapshot card',
        },
      },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r6', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages.every((st) => 'result' in st)).toBe(true)
    expect(ensuredBody(calls).intent).toBe('two stages, no snapshot card')
    // the honest NOTHING: a run with no servable artifact has no
    // result to share — nothing is stamped anywhere.
    const bare = stubFetch(runWith({ run_id: 'r6b', flow: { artifacts: [], bench_snapshot: { stages: [{ id: 's_0', card: 'a' }, { id: 's_1', card: 'b' }], intent: 'bare' } } }))
    const d2 = deps('s2')
    await loadRunOntoBench('r6b', d2)
    expect(d2.errors).toEqual([])
    const bareStages = ensuredBody(bare.calls).stages as Array<Record<string, unknown>>
    expect(bareStages.every((st) => !('result' in st))).toBe(true)
  })

  it('the verbatim request restores older runs (draft/test keys stripped)', async () => {
    const side = {
      run_id: 'r7',
      flow: { artifacts: [] },
      request: { model: 'image-gen', prompt: 'old prompt', draft_id: 'd9', test: 1 },
    }
    const { calls } = stubFetch(runWith(side))
    const d = deps('s1')
    await loadRunOntoBench('r7', d)
    expect(d.errors).toEqual([])
    const stages = ensuredBody(calls).stages as Array<Record<string, unknown>>
    expect(stages[0]).toEqual({
      // the CONTRACT-shaped row, card-LESS: a cardless stage keeps the
      // engine's own output default (the card-ports law's other side —
      // only a CARD stage derives its channels from its ports)
      id: 's_0',
      engine: 'comfyui',
      params: { model: 'image-gen', prompt: 'old prompt' },
      inputs: {},
      outputs: { default: 'image' },
      provenance: 'restored',
    })
    // THE INTENT IS A LABEL, NEVER A PAYLOAD (the wire audit's M5):
    // this arm restores a request body with no card, so the birth law
    // stamps `card = intent` — passing the PROMPT titled the restored
    // tile with prompt text and made its Run compose
    // `model = <the prompt>`. A cardless restore is honest and
    // refuses; it is never dressed up as a card.
    expect(ensuredBody(calls).intent).toBe('restored run')
    expect(ensuredBody(calls).intent).not.toBe('old prompt')
  })

  it('the flow draft link restores through the draft door', async () => {
    const { calls } = stubFetch(runWith({ run_id: 'r8', flow: { draft_id: 'd8' } }, { stages: [{ id: 's_9' }], intent: 'linked' }))
    const d = deps('s1')
    await loadRunOntoBench('r8', d)
    expect(d.errors).toEqual([])
    expect(calls.some((c) => c.url === '/v1/flows/drafts/d8')).toBe(true)
    expect(ensuredBody(calls).intent).toBe('linked')
  })

  it('the top-level draft link restores when the flow names none', async () => {
    const { calls } = stubFetch(runWith({ run_id: 'r9', flow: null, draft_id: 'd2' }, { stages: [], intent: 'top' }))
    const d = deps('s1')
    await loadRunOntoBench('r9', d)
    expect(d.errors).toEqual([])
    expect(calls.some((c) => c.url === '/v1/flows/drafts/d2')).toBe(true)
  })

  it('a draftless run errors honestly (nothing to restore)', async () => {
    stubFetch(runWith({ run_id: 'rx', flow: { draft_id: '' } }))
    const d = deps('s1')
    await loadRunOntoBench('rx', d)
    expect(d.opened).toEqual([])
    expect(d.errors).toEqual(['this run keeps no card record — nothing to restore'])
  })

  it('a run transport failure surfaces caller-side', async () => {
    stubFetch(() => {
      throw new Error('sidecar unreadable')
    })
    const d = deps('s1')
    await loadRunOntoBench('r1', d)
    expect(d.errors).toEqual(['bench load failed — sidecar unreadable'])

    stubFetch(() => {
      throw 'bare string failure'
    })
    const e = deps('s1')
    await loadRunOntoBench('r1', e)
    expect(e.errors).toEqual(['bench load failed — bare string failure'])
  })
})
