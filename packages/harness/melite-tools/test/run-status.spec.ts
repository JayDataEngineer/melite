// run_status walls (vitest, estate mocked — no gateway, no GPU):
//   1. the pre-fetch guard refuses bare runId values (empty string —
//      the wrapper gate proves a string, ToolArgsError proves presence)
//   2. status fetch refusals ride the value as `code: message`
//      (RemoteError) while transport failures propagate (rethrow)
//   3. gateway-shaped rows project with honest defaults (unknown / []
//      / 0) and a gateway {error} refuses without a status
//   4. the render tolerates sparse values (replay path) and counts
//      completions past null stage rows; queue suffix only past 0

import { describe, test, vi, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { runStatus } from '../src/tools/run-status.ts'
import type { EstateRequest } from '../src/estate.ts'
import { fakeExec } from './fake-exec.ts'

afterEach(() => { vi.useRealTimers() })

function mockRequest(
  handler: (method: string, path: string, body: unknown) => unknown,
): { calls: Array<{ method: string; path: string; body: unknown }>; request: EstateRequest } {
  const calls: Array<{ method: string; path: string; body: unknown }> = []
  const request = (async (method: string, path: string, body: unknown): Promise<unknown> => {
    calls.push({ method, path, body })
    return handler(method, path, body)
  }) as EstateRequest
  return { calls, request }
}

const exec = fakeExec(AbortSignal.timeout(2000))

describe('run_status presentCall — the streaming tile', () => {
  test('titles the run; junk renders generic (the re-attached presenter)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    // The tile always answers the generic card (pinned below) — narrow
    // the ToolCallView union to read its rawInput.
    assert.equal(tool.presentCall!({ runId: 'r1' } as never)!.title, 'Run status: r1')
    assert.equal((tool.presentCall!({ runId: 'r1' } as never)! as GenericCallView).rawInput, 'r1')
    assert.equal(tool.presentCall!({} as never)!.title, 'Run status: ?')
    assert.equal(tool.presentCall!(null as never)!.title, 'Run status: ?')
    assert.equal(tool.presentCall!('x' as never)!.title, 'Run status: ?')
    assert.equal(tool.presentCall!({ runId: 'r1' } as never)!.card, 'generic')
  })
})

describe('run_status execute — the run monitor', () => {
  test('missing runId throws at the wrapper gate (presence contract)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = runStatus(request)
    await assert.rejects(tool.execute({} as never, exec), ToolArgsError)
  })

  test('empty runId refuses bare without any fetch', async () => {
    const seen = mockRequest(() => ({}))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: '' }, exec) as Record<string, unknown>
    assert.equal(out.error, 'runId is required')
    assert.equal(seen.calls.length, 0)
  })

  test('a completed row carrying error:"" serves RICH, never the ? — 0/0 husk (021 receipt)', async () => {
    // THE EMPTY-ERROR TRAP (2026-09-24): the registry writes error:""
    // on success; the old bare typeof-string check read it as the
    // refusal shape and returned {run_id, error:""} — the render
    // voiced "? — 0/0 stage(s)" on all four 021 stages (completed,
    // with artifacts). Only a NON-EMPTY error refuses.
    const seen = mockRequest(() => ({
      run_id: 'run-x', status: 'completed', error: '',
      stages: [{ id: 'tts', name: 'tts', index: 0, status: 'completed', outputs: {}, expected: {} }],
      artifacts: ['out/tts.flac'],
      skipped_stages: [],
    }))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'run-x' }, exec) as Record<string, unknown>
    assert.equal(out.status, 'completed')
    assert.equal(out.error, undefined)
    assert.equal((out.stages as unknown[]).length, 1)
    assert.equal((out.artifacts as unknown[]).length, 1)
  })

  test('a full row projects verbatim (encoding rides the path)', async () => {
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/flows/status/' + encodeURIComponent('r/1'))
      return {
        run_id: 'r/1', status: 'running',
        stages: [{ id: 's_0', status: 'completed' }],
        artifacts: [{ path: 'out.png', bytes: 12 }],
        queue_position: 2,
      }
    })
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r/1' }, exec) as Record<string, unknown>
    assert.equal(out.run_id, 'r/1')
    assert.equal(out.status, 'running')
    assert.deepEqual(out.stages, [{ id: 's_0', status: 'completed' }])
    assert.deepEqual(out.artifacts, [{ path: 'out.png', bytes: 12 }])
    assert.equal(out.queue_position, 2)
    assert.equal(out.error, undefined)
  })

  test('a sparse row falls back honestly (unknown / [] / 0, no error key)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r9' }, exec) as Record<string, unknown>
    assert.deepEqual(out, {
      run_id: 'r9', status: 'unknown', stages: [], artifacts: [], queue_position: 0,
    })
  })

  test('non-array stages/artifacts and a non-number queue fall back', async () => {
    const { request } = mockRequest(() => ({ run_id: 'r', status: 'queued', stages: 'x', artifacts: null, queue_position: 'soon' }))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r' }, exec) as Record<string, unknown>
    assert.deepEqual(out.stages, [])
    assert.deepEqual(out.artifacts, [])
    assert.equal(out.queue_position, 0)
  })

  test('the rich receipt fields project through the execute result', async () => {
    const { request } = mockRequest(() => ({
      run_id: 'r', status: 'completed', export_name: 'voice', export_path: '/voice.qvoice', test: true,
    }))
    const out = await runStatus(request).execute({ runId: 'r' }, exec) as Record<string, unknown>
    assert.equal(out.export_name, 'voice')
    assert.equal(out.export_path, '/voice.qvoice')
    assert.equal(out.test, true)
  })

  test('a gateway {error} refuses without a status', async () => {
    const { request } = mockRequest(() => ({ error: 'queue forgot this run' }))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r' }, exec) as Record<string, unknown>
    assert.deepEqual(out, { run_id: 'r', error: 'queue forgot this run' })
  })

  test('a remote refusal rides the value as code + message', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('runs/unknown-run', 'no such run', { runId: 'r9' })
    })
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r9' }, exec) as Record<string, unknown>
    assert.deepEqual(out, { run_id: 'r9', error: 'runs/unknown-run: no such run' })
  })

  test('a transport failure propagates (never valued)', async () => {
    const { request } = mockRequest(() => { throw new Error('socket hangup') })
    const tool = runStatus(request)
    await assert.rejects(tool.execute({ runId: 'r' }, exec), /socket hangup/)
  })
})

describe('run_status execute — THE WAIT PRIMITIVE (efficiency fix 5)', () => {
  // Fake timers own setTimeout AND Date — the loop's deadline math
  // and its 5s cadence both advance under advanceTimersByTimeAsync.
  function fakeClock(): void {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
  }

  test('wait_s=0 keeps the single-shot read (no wait keys, one fetch)', async () => {
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r', wait_s: 0 }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(seen.calls.length, 1)
    assert.equal(out.wait_expired, undefined)
    assert.equal(out.waited_s, undefined)
  })

  test('the long-poll absorbs the poll loop: terminal inside budget → ONE call, waited_s receipt', async () => {
    fakeClock()
    let n = 0
    const seen = mockRequest(() => {
      n += 1
      return n === 1
        ? { run_id: 'r', status: 'running', stages: [] }
        : { run_id: 'r', status: 'completed', stages: [{ id: 's_0', status: 'completed' }], artifacts: [{ path: 'f.mp4' }] }
    })
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 300 }, fakeExec(AbortSignal.timeout(5000)))
    const raced = Promise.race([p, vi.advanceTimersByTimeAsync(5000).then(() => new Promise(() => {}))])
    const out = await raced as Record<string, unknown>
    assert.equal(seen.calls.length, 2)          // running → (5s sleep) → completed
    assert.equal(out.status, 'completed')
    assert.equal(out.wait_expired, undefined)
    assert.equal(typeof out.waited_s, 'number')
  })

  test('budget expiry on a live run → wait_expired:true + the last row (never fabricated)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running', stages: [] }))
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 3 }, fakeExec(AbortSignal.timeout(5000)))
    const out = await Promise.race([p, vi.advanceTimersByTimeAsync(10_000).then(() => new Promise(() => {}))]) as Record<string, unknown>
    assert.equal(out.status, 'running')        // the truth at expiry, not a guess
    assert.equal(out.wait_expired, true)
    assert.equal(out.wait_budget_s, 3)
    assert.ok(seen.calls.length >= 2)          // fetch → sleep-past-deadline → fetch
  })

  test('a numeric-string wait_s refuses at the gate, named (the arg-coerce valve is deleted, 2026-10-01)', async () => {
    const seen = mockRequest(() => ({ run_id: 'r', status: 'completed' }))
    // The valve coerced "300" → 300 AFTER the session log wrote it —
    // executed args the log could not reconstruct. Deleted (the
    // handroll audit's ranked item 1): the gate's own type refusal is
    // the voice now, and the description teaches the spelling
    // beforehand. Execute's Number arm stays as depth for non-tool
    // callers; through the tool, a string never reaches it.
    const tool = runStatus(seen.request)
    await assert.rejects(
      tool.execute({ runId: 'r', wait_s: '0' } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"wait_s" must be a number/)
        return true
      },
    )
    assert.equal(seen.calls.length, 0)
  })

  test('a cancelled wait rejects through the sleep (no lingering fetch)', async () => {
    fakeClock()
    const ac = new AbortController()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 300 }, fakeExec(ac.signal))
    const guard = p.catch((e: unknown) => e)
    vi.advanceTimersByTimeAsync(1000).then(() => ac.abort(new Error('user cancelled')))
    const settled = await Promise.race([guard, vi.advanceTimersByTimeAsync(6000).then(() => new Promise(() => {}))])
    // THE ABORT MUST REACH THE CALLER (the walls audit's H9): the old
    // line accepted `settled === undefined` — which is exactly what a
    // hung wait (the race's never-resolving branch) produces, so a
    // broken sleep-abort wiring shipped a "cancel-safe" tool. The
    // wait must REJECT with the abort's own reason, promptly.
    assert.ok(settled instanceof Error,
      `the cancelled wait rejects (got ${String(settled)} — a hung wait is not a cancellation)`)
    assert.match((settled as Error).message, /user cancelled|abort/i,
      'and it carries the abort reason')
  })

  test('a bare abort (no reason) falls back to the generic error (the ?? arm)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const ac = new AbortController()
    ac.abort()   // reason undefined — the sleep rejects with 'aborted'
    await assert.rejects(
      tool.execute({ runId: 'r', wait_s: 30 }, fakeExec(ac.signal)),
      /aborted/,
    )
    assert.equal(seen.calls.length, 1)
  })

  test('a non-conforming signal with undefined reason still rejects loud (the ?? fallback)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    // aborted on entry with reason undefined (a stub, never a real
    // AbortSignal whose default reason is truthy) — the fallback
    // Error('aborted') is the rejection, never a silent hang
    const stub = { aborted: true, reason: undefined } as never
    await assert.rejects(tool.execute({ runId: 'r', wait_s: 30 }, fakeExec(stub)), /aborted/) // stub signal: intentionally non-conforming (never), the ?? fallback arm
    assert.equal(seen.calls.length, 1)
  })

  test('an ALREADY-aborted signal rejects before the first fetch (the sleep pre-check arm)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const ac = new AbortController()
    ac.abort(new Error('late arrival'))
    // wait_s>0 forces the loop; the signal is dead on entry — the
    // sleep's pre-abort arm rejects without a second fetch.
    await assert.rejects(
      tool.execute({ runId: 'r', wait_s: 30 }, fakeExec(ac.signal)),
      /late arrival/,
    )
    assert.equal(seen.calls.length, 1)   // the one pre-sleep fetch only
  })

  test('a live-plan row projects verbatim (planned_stages/card/run_age_s true paths)', async () => {
    const seen = mockRequest(() => ({
      run_id: 'r', status: 'running',
      planned_stages: [{ id: 'h3-film', engine: 'comfyui' }],
      card: 'h3-timeline', run_age_s: 42,
    }))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.deepEqual(out.planned_stages, [{ id: 'h3-film', engine: 'comfyui' }])
    assert.equal(out.card, 'h3-timeline')
    assert.equal(out.run_age_s, 42)
  })
})

describe('run_status render — the human line', () => {
  test('errors name the run, status and refusal', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(text({ run_id: 'r', status: 'error', error: 'boom' }), 'run r error — boom')
    assert.equal(text({ error: 'boom' }), 'run ? ? — boom')
  })

  test('progress counts completions past null rows; queue suffix only past 0', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r1', status: 'running', stages: [null, { status: 'running' }, { status: 'completed' }], artifacts: [{}, {}], queue_position: 5 }),
      'run r1 running (queue #5) — 1/3 stage(s) · 2 artifact(s)',
    )
    assert.equal(text({}), 'run ? ? — 0/0 stage(s)')
    assert.equal(text({ run_id: 'r', status: 'queued', queue_position: 0 }), 'run r queued — 0/0 stage(s)')
  })

  test('an unreadable stage word counts as not done — the line renders, never throws (2026-10-12 follow-through)', () => {
    // The run-level word passed readRunStatus's door; the per-stage
    // words did not, and era rows carry 'unreachable' in runStatus
    // (the escalation writes the health channel since 2026-10-12).
    // The view-side read answers no-information: the count says
    // not-done and the agent keeps its answer.
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r1', status: 'running', stages: [{ status: 'completed' }, { status: 'unreachable' }, { status: 'weird' }], artifacts: [] }),
      'run r1 running — 1/3 stage(s)',
    )
  })

  test('a live row with no stage rows renders its registered plan + age (Fix 2)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r1', status: 'running', stages: [], planned_stages: [{ id: 'h3-film', engine: 'comfyui' }], card: 'h3-timeline', run_age_s: 754 }),
      'run r1 running — 0/0 stage(s) · plan: 1 stage(s) (h3-timeline) · age 754s',
    )
    // no plan: the bare render survives (honest fallback, never fabricated)
    assert.equal(
      text({ run_id: 'r2', status: 'queued', stages: [], queue_position: 0 }),
      'run r2 queued — 0/0 stage(s)',
    )
    // plan WITHOUT card/age: the cond-expr else arms (no parens, no age suffix)
    assert.equal(
      text({ run_id: 'r3', status: 'running', stages: [], planned_stages: [{ id: 'h3-film' }] }),
      'run r3 running — 0/0 stage(s) · plan: 1 stage(s)',
    )
  })

  test('THE CHANNEL DOOR (commission 020): a terminal row voices its declared output channels', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    // the design lane's two channels, rendered — the maker can
    // enumerate what a run publishes from the status line alone
    assert.match(
      text({ run_id: 'r1', status: 'completed', stages: [{ id: 'tts', status: 'completed', outputs: { default: 'audio', voices: 'voice' } }] }),
      /tts:completed \[default,voices\]/,
    )
    // empty outputs stay silent (a plain run reads as before)
    assert.doesNotMatch(
      text({ run_id: 'r2', status: 'completed', stages: [{ id: 'tts', status: 'completed', outputs: {} }] }),
      /\[/,
    )
  })

  test('the wait receipts render: expiry asks for another wait, waited_s proves absorption (Fix 5)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r', status: 'running', stages: [], wait_expired: true, wait_budget_s: 300 }),
      'run r running — 0/0 stage(s) · wait expired (budget spent, not terminal — wait again)',
    )
    assert.equal(
      text({ run_id: 'r', status: 'completed', stages: [{ status: 'completed' }], waited_s: 5 }),
      // THE RECEIPT-PATH LAW (022's self-critique #1): terminal rows
      // voice their per-stage status (id-less rows print ?) — the
      // count-only line forced output/ globs before.
      'run r completed — 1/1 stage(s) · waited 5s\nstages: ?:completed',
    )
  })

  test('THE CANONICAL RECEIPT PATH (023 self-critique #3): route-relative gains its out root, absolute + repo-relative pass', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: ['run-abc/tts/f.flac'] }),
      'run run-abc completed — 1/1 stage(s) · 1 artifact(s)\nstages: t:completed\nartifacts: output/run-abc/tts/f.flac',
    )
    assert.equal(
      text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: ['run-abc/tts/f.flac'], test: true }),
      'run run-abc completed — 1/1 stage(s) · 1 artifact(s)\nstages: t:completed\nartifacts: test-output/run-abc/tts/f.flac',
    )
    assert.equal(
      text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [{ path: './output/run-abc/tts/f.flac' }] }),
      'run run-abc completed — 1/1 stage(s) · 1 artifact(s)\nstages: t:completed\nartifacts: output/run-abc/tts/f.flac',
    )
  })

  test('THE EXPORT-NAME VOICE (023 self-critique #4/#6): the design receipt names the mint, never the silent hole', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    const out = text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: ['/repo/output/run-abc/tts/f.flac'], export_name: 'night-keeper' })
    assert.ok(out.includes("export: 'night-keeper'"), 'the mint is named')
    assert.ok(out.includes('preview audio is the design sample'), 'the preview is sold, not holed (the 1-sample stub died 2026-09-24)')
    assert.ok(out.includes('night-keeper_*.qvoice'), 'the voices-root glob is spelled')
  })

  test('THE EXPORT-PATH VOICE (roadmap OWED 2026-09-24 — the FULL PATH): the engine-reported mint file prints verbatim', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    const mint = '/mnt/data/models/audio/voices/night-keeper_17.qvoice'
    const out = text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [], export_name: 'night-keeper', export_path: mint })
    assert.ok(out.includes("export: 'night-keeper'"), 'the mint is named')
    assert.ok(out.includes('the deliverable .qvoice is ' + mint), 'the exact collision-numbered file prints — zero voices-dir listing')
    assert.ok(!out.includes('_*.qvoice'), 'the glob hint retires when the path rode')
  })

  test('THE LOUDNESS CHIP (roadmap OWED 2026-09-26 — transcript-0034 #2): the meter reading rides the terminal line, no sidecar read needed', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    const out = text({
      run_id: 'run-425', status: 'completed', stages: [{ id: 'h3-film', status: 'completed' }], artifacts: [],
      loudness: { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 },
    })
    assert.ok(out.includes('· -24.72 LUFS / -6.37 dBTP'), 'the compact chip prints the receipt pair at 2 decimals: ' + out.split(String.fromCharCode(10))[0])
    // unmetered runs carry no fabricated chip
    const bare = text({ run_id: 'run-x', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [] })
    assert.ok(!bare.includes('LUFS'), 'no chip without a reading')
    // a non-terminal row never chips (the reading is a receipt, not a promise)
    const live = text({ run_id: 'run-y', status: 'running', stages: [], artifacts: [], loudness: { loudness_lufs: -20, peak_db: -3 } })
    assert.ok(!live.includes('LUFS'), 'terminal only')
  })

  test('THE FRESHNESS VOICE (the loudness sibling): the voice-mint receipt names the winner and stamps reuse loud', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    const stale = text({
      run_id: 'run-e', status: 'completed', stages: [{ id: 'tts', status: 'completed' }], artifacts: [],
      voice_freshness: { reused_existing: true, voice_file: 'harbour_watchman_2.qvoice' },
    })
    assert.ok(stale.includes('· voice harbour_watchman_2.qvoice (REUSED'), 'a stale mint names the law: ' + stale.split(String.fromCharCode(10))[0])
    const freshMint = text({
      run_id: 'run-f', status: 'completed', stages: [{ id: 'tts', status: 'completed' }], artifacts: [],
      voice_freshness: { reused_existing: false, voice_file: 'tide_14.qvoice' },
    })
    assert.ok(freshMint.includes('· voice tide_14.qvoice (fresh mint)'), 'a fresh mint says so')
    const voiceless = text({ run_id: 'run-g', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [] })
    assert.ok(!voiceless.includes('· voice '), 'no fabricated receipt on voiceless runs')
  })

  test('THE VARIANT VOICE (commission 033 self-critique #5): the lane rides the first line — design reads apart from performing at a glance', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    // the 033 ledger named BOTH runs qwen3-tts-voicedesign; the lane
    // is what tells them apart — it voices on live rows too (known
    // at birth, not at settle).
    assert.ok(
      text({ run_id: 'run-d', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [], variant: 'voicedesign' }).startsWith('run run-d completed — 1/1 stage(s) · variant voicedesign'),
      'the design lane leads the receipt',
    )
    assert.ok(
      text({ run_id: 'run-q', status: 'queued', planned_stages: [{ id: 't' }], card: 'tts', variant: 'customvoice' }).includes('· variant customvoice'),
      'a live performing row voices its lane',
    )
    assert.ok(
      !text({ run_id: 'run-x', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [] }).includes('variant'),
      'variant-less runs voice nothing — absent, never guessed',
    )
    assert.ok(
      !text({ run_id: 'run-e', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: [], variant: '' }).includes('variant'),
      'an empty lane voices nothing — the blank is not a lane',
    )
  })

  test('THE LEGACY-DOUBLE COLLAPSE (024 self-critique #2): rows served pre-fix spell <run>/<run>/… — the receipt collapses the stencil', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'run-abc', status: 'completed', stages: [{ id: 't', status: 'completed' }], artifacts: ['run-abc/run-abc/tts/f.flac'] }),
      'run run-abc completed — 1/1 stage(s) · 1 artifact(s)\nstages: t:completed\nartifacts: output/run-abc/tts/f.flac',
    )
  })
})

describe('run_status render — the live-age law (§36.6 progress-UX)', () => {
  const text = (v: unknown): string => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    return (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0]!.text ?? ''
  }
  test('a STAGED live row renders its age (the long-render liveness signal)', () => {
    const line = text({ run_id: 'run-x', status: 'running', stages: [{ id: 'h3-film', status: 'running' }], run_age_s: 612 })
    assert.match(line, /0\/1 stage\(s\) · age 612s/)
  })
  test('a terminal row never renders age', () => {
    const line = text({ run_id: 'run-x', status: 'completed', stages: [{ id: 'h3-film', status: 'completed' }], run_age_s: 900 })
    assert.ok(!line.includes('age '), 'terminal rows stay receipt-shaped')
  })

  test('receipt rendering handles every stage and artifact spelling', () => {
    const sparse = text({
      run_id: 7,
      status: 'failed',
      stages: [
        { name: 'named', status: 4, error: 'bad stage' },
        { id: 'identified', status: 'completed', error: '' },
        { id: 9, status: null, error: null },
      ],
      artifacts: ['/absolute/a.png', './relative/b.png', { path: 'object/c.png' }, { path: 8 }, 'plain.txt'],
    })
    assert.ok(sparse.includes('named:? ! bad stage'))
    assert.ok(sparse.includes('identified:completed'))
    assert.ok(sparse.includes('?:?'))
    assert.ok(sparse.includes('/absolute/a.png'))
    assert.ok(sparse.includes('relative/b.png'))
    assert.ok(sparse.includes('object/c.png'))

    const expanded = text({
      run_id: 'run-abc',
      status: 'completed',
      stages: [{ id: 's', status: 'completed' }],
      artifacts: ['run-abc', 'run-abc/one.flac', 'run-abc/run-abc/two.flac', './run-abc/three.flac', 'other/four.flac'],
    })
    assert.ok(expanded.includes('output/run-abc'))
    assert.ok(expanded.includes('test-output/') === false)
    assert.ok(expanded.includes('(+1 more)'))
  })

  test('test runs select the test output root and the exact run directory arm', () => {
    const line = text({
      run_id: 'run-abc',
      status: 'completed',
      stages: [],
      artifacts: ['run-abc', 'run-abc/file.flac'],
      test: true,
    })
    assert.ok(line.includes('test-output/run-abc'))
    assert.ok(line.includes('test-output/run-abc/file.flac'))
  })
});
