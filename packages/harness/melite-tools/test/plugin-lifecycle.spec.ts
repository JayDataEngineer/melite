// plugin-lifecycle walls (vitest, fake host + tmp DSH_HOME): the
// apply surface's UNTAKEN PATHS — the arms the delegation and
// catalog specs never walk because their fake host's effect()
// discards the disposers and their registry always answers:
//
//   1. UNLOAD: the apply-scope disposer (index.ts's c.effect(() =>
//      () => …)) flushes the run-door seats, the compose seats, the
//      deferred disposers and the seat set — plugin lifetime either
//      way. A host whose effect() throws the disposer away (the
//      index.spec fake) never proves the flush.
//   2. COMMANDS REFUSAL: a commands inject that resolves WITHOUT a
//      registry refuses LOUD — never a silent skip of /melite-runs.
//   3. WRITE-FAILURE VOICE: the toggle's success text says the flip
//      did not persist (both directions) — the persisted-flip burn's
//      honesty tail, driven through the real writeRunsDelegation.
//   4. LANE ABSENCE: the optional-lane loader names a dead lane and
//      keeps the live ones; the card-gate effect's own disposer
//      unwinds the registered card tools with the plugin.
import { describe, test, beforeAll, afterAll, vi } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  apply,
  loadCardLanes,
  RUN_DOOR_NAMES,
  type CardLaneSeat,
} from '../src/index.ts'
import { writeRunsDelegation } from '../src/runsDelegation.ts'
import type { ToolDefinition } from '../src/types.ts'

// THE DEAD LANES: the apply-scope absent callback (index.ts's own
// onAbsent, passed to loadCardLanes when cardTools boots) fires only
// when a REAL seat throws inside apply. The factories RESOLVE (a
// factory throw gets wrapped by the runner and loses its shape) and
// the BUILDERS throw the two death shapes the warn's own branches
// judge: music dies the module-resolution death (a .code-bearing
// error), tts dies the non-Error death (a bare string — the warn's
// `message ?? err` fallback arm) — the harness boots without either,
// naming both absences (the rc.3 burn's law), while the other four
// lanes still seat.
vi.mock('@melite/audio-music/tool', () => ({
  buildMusicTool: async () => {
    const err = new Error('Cannot find module') as Error & { code?: string }
    err.code = 'ERR_MODULE_NOT_FOUND'
    throw err
  },
}))
vi.mock('@melite/audio-tts/tool', () => ({
  buildTtsTool: async () => {
    throw 'a bare string death (the non-Error throw class)'
  },
}))

const previousHome = process.env.DSH_HOME
let specHome: string

beforeAll(() => {
  specHome = mkdtempSync(join(tmpdir(), 'melite-tools-lifecycle-'))
  process.env.DSH_HOME = specHome
})

afterAll(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  rmSync(specHome, { recursive: true, force: true })
})

/** Reset the persisted delegation to ABSENT (the compose law's boot).
 *  Each arm owns its own record state. */
const clearRecord = (): void => {
  rmSync(join(specHome, 'melite-runs-state.json'), { force: true })
}

interface CmdDef {
  name: string
  handler: (inv: { rawInput: string }) => { kind: 'success' | 'error'; text: string }
}

/** The lifecycle fake: effect() CAPTURES its disposer (the flush
 *  arms fire them by hand — a real cordis host fires them at
 *  unload), inject() captures the commands callback, tools.register
 *  returns a WORKING disposer (the flush arms assert the registered
 *  list actually drains). */
function lifecycleCtx(): {
  ctx: unknown
  registered: Array<{ name: string }>
  logs: unknown[][]
  disposers: Array<() => void>
  fireCommands: (member: Partial<{ commands: unknown }>) => void
} {
  const registered: Array<{ name: string }> = []
  const logs: unknown[][] = []
  const disposers: Array<() => void> = []
  let commandsCb: ((ctx: { commands?: unknown }) => void) | undefined
  const ctx = {
    logger: {
      info: (...args: unknown[]) => { logs.push(args) },
      warn: (...args: unknown[]) => { logs.push(args) },
    },
    effect: (fn: () => () => void) => {
      const dispose = fn()
      disposers.push(dispose)
      return dispose
    },
    inject: (names: readonly string[], fn: (ctx: { commands?: unknown }) => void) => {
      if (names.includes('commands')) commandsCb = fn
    },
    tools: {
      register: (def: { name: string }) => {
        registered.push(def)
        return () => {
          const i = registered.lastIndexOf(def)
          if (i >= 0) registered.splice(i, 1)
        }
      },
      schemas: () => registered.map((d) => ({ name: d.name })),
    },
    get: (_name: string) => undefined,
  }
  return {
    ctx,
    registered,
    logs,
    disposers,
    fireCommands: (member) => {
      if (!commandsCb) throw new Error('commands callback never captured — apply did not inject')
      commandsCb(member as { commands?: unknown })
    },
  }
}

describe('UNLOAD — the apply-scope disposer flushes every seat', () => {
  test('firing the captured disposers drains the registered tools (delegated boot)', async () => {
    clearRecord()
    assert.equal(writeRunsDelegation({ delegated: true }), undefined)
    const f = lifecycleCtx()
    await apply(f.ctx as unknown as Context)
    // a delegated boot seats eager + deferred + run doors — the
    // flush has real disposers in every array it drains
    const before = f.registered.map((r) => r.name)
    for (const h of RUN_DOOR_NAMES) assert.ok(before.includes(h), 'delegated boot lost a run door: ' + h)
    assert.ok(f.disposers.length > 0, 'apply registered no effects — nothing to flush')
    for (const dispose of f.disposers.splice(0)) dispose()
    // THE COLLECTORS' LAW: the apply-scope disposer flushes what it
    // COLLECTED (run doors, compose seats, deferred disposers). A
    // real host unwinds the fiber-tied base registrations with the
    // plugin fiber itself; this fake has no fiber, so the eager
    // trio's own registration may lawfully outlive the flush —
    // anything else seated after the flush is a leak.
    const survivors = f.registered.map((r) => r.name)
    const eager = ['melite_discover', 'melite_load', 'melite_construct']
    for (const s of survivors) {
      assert.ok(eager.includes(s), 'the unload flush left a collected tool behind: ' + s)
    }
    // idempotent by shape: a second fire of the (now-spliced) set is
    // the empty flush — the arrays drained, not the registrations
    // stacked
    for (const dispose of f.disposers.splice(0)) dispose()
    assert.deepEqual(f.registered.map((r) => r.name), survivors)
  })
})

describe('COMMANDS REFUSAL — an inject without a registry refuses loud', () => {
  test('a commands member that resolves to nothing throws, never silently skips', async () => {
    clearRecord()
    const f = lifecycleCtx()
    await apply(f.ctx as unknown as Context)
    // the child context carries NO commands member — the inject
    // resolved but the registry is absent: the refusal is the
    // designed loud path
    assert.throws(
      () => f.fireCommands({}),
      /the commands inject resolved but exposes no registry/,
      'a registry-less commands inject must refuse by name',
    )
  })

  test('a live registry still seats the /melite-runs command (the refusal is not the only path)', async () => {
    clearRecord()
    const f = lifecycleCtx()
    await apply(f.ctx as unknown as Context)
    const defs: CmdDef[] = []
    f.fireCommands({ commands: { register: (d: CmdDef) => { defs.push(d); return () => {} } } })
    assert.equal(defs[0]?.name, 'melite-runs')
  })
})

describe('WRITE-FAILURE VOICE — the toggle says when the flip did not persist', () => {
  test('an unwritable DSH_HOME: ON and OFF both answer success naming the failed record', async () => {
    clearRecord()
    // DSH_HOME pointed at an existing FILE: the state file's parent
    // cannot be made, the write refuses — runs-delegation.spec's
    // occupied-file pattern, driven here through the real handler
    const notADir = join(specHome, 'not-a-dir')
    writeFileSync(notADir, 'occupied', 'utf8')
    const f = lifecycleCtx()
    await apply(f.ctx as unknown as Context)
    const defs: CmdDef[] = []
    f.fireCommands({ commands: { register: (d: CmdDef) => { defs.push(d); return () => {} } } })
    const cmd = defs[0]!
    try {
      process.env.DSH_HOME = notADir
      const on = cmd.handler({ rawInput: 'on' })
      assert.equal(on.kind, 'success')
      assert.match(on.text, /WARNING: recording failed/, 'the ON voice must name the failed record')
      assert.match(on.text, /a reload reverts to OFF/, 'the ON voice must state the revert')
      const off = cmd.handler({ rawInput: 'off' })
      assert.equal(off.kind, 'success')
      assert.match(off.text, /WARNING: recording failed/, 'the OFF voice must name the failed record')
      assert.match(off.text, /a reload reverts to ON/, 'the OFF voice must state the revert')
      // the log line carries the failure too (the operator's tail)
      const logged = f.logs.some((args) => String(args[0]).includes('/melite-runs') && String(args.at(-1)).includes('WRITE FAILED'))
      assert.ok(logged, 'the info log never named the write failure')
    } finally {
      if (previousHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previousHome
      rmSync(notADir, { force: true })
    }
  })
})

describe('LANE ABSENCE — the optional-lane loader names its dead, keeps its live', () => {
  test('a throwing seat costs exactly its lane; the live lanes still answer', async () => {
    const deadCode = (await import('node:util')).promisify
    assert.ok(deadCode, 'util import answered (the table below is hand-built anyway)')
    const seats: CardLaneSeat[] = [
      {
        lane: 'dead-lane',
        seat: async () => {
          // a real module-resolution death carries .code (the
          // ERR_MODULE_NOT_FOUND class) — the warn's errno arm names
          // it when present
          const err = new Error('Cannot find module') as Error & { code?: string }
          err.code = 'ERR_MODULE_NOT_FOUND'
          throw err
        },
      },
      {
        lane: 'live-lane',
        seat: async () => ({ name: 'live-lane-tool' }) as unknown as ToolDefinition,
      },
    ]
    const absent: Array<{ lane: string; err: unknown }> = []
    const tools = await loadCardLanes(seats, (lane, err) => { absent.push({ lane, err }) })
    assert.equal(absent.length, 1, 'the loader named more than its one dead lane')
    assert.equal(absent[0]?.lane, 'dead-lane')
    assert.equal((absent[0]?.err as NodeJS.ErrnoException).code, 'ERR_MODULE_NOT_FOUND')
    assert.deepEqual(tools.map((t) => t.name), ['live-lane-tool'], 'a dead lane must not cost its live siblings')
  })

  test('the card-gate effect disposer unwinds the card tools with the plugin', async () => {
    clearRecord()
    const f = lifecycleCtx()
    await apply(f.ctx as unknown as Context, { cardTools: true })
    // THE MOCKED-DEAD music + tts lanes: each absence is NAMED (the
    // rc.3 burn's law — an absent lane costs exactly its own tool),
    // the other four lanes still seat
    const cardNames = ['image_edit', 'image_gen', 'motion', 'h3_timeline']
    for (const c of cardNames) {
      assert.ok(f.registered.some((r) => r.name === c), 'card tool never registered: ' + c)
    }
    assert.ok(!f.registered.some((r) => r.name === 'music'), 'the dead music lane seated a tool')
    assert.ok(!f.registered.some((r) => r.name === 'tts'), 'the dead tts lane seated a tool')
    const namedLane = (lane: string) => f.logs.some((args) => String(args[0]).includes(`card lane ${lane} ABSENT`))
    assert.ok(namedLane('audio-music'), 'the dead music lane was never named in the warn')
    assert.ok(namedLane('audio-tts'), 'the dead tts lane was never named in the warn')
    // fire every captured disposer (the card-gate effect's among
    // them) — the card tools drain with the rest of the plugin; the
    // fiber-tied eager trio may lawfully remain (this fake has no
    // fiber — see the collectors' law above)
    for (const dispose of f.disposers.splice(0)) dispose()
    for (const c of cardNames) {
      assert.ok(!f.registered.some((r) => r.name === c), 'unload left a card tool seated: ' + c)
    }
    for (const s of f.registered.map((r) => r.name)) {
      assert.ok(['melite_discover', 'melite_load', 'melite_construct'].includes(s),
        'unload left a non-fiber registration seated: ' + s)
    }
  })
})
