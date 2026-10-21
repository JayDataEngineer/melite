// index.ts walls (vitest, fake host — no estate, no network): the
// plugin surface (name/inject/tool-name consts) plus apply's
// interface law — browser default, headless via env or config, ad
// hoc parsing (env wins, string-or-list config, trim/filter), and
// the exact registration sets.
//
// THE ISOLATED DSH HOME (2026-11-09): apply boots on the PERSISTED
// delegation (runsDelegation.ts) — without a pinned DSH_HOME the
// toggle test would write the operator's real state file and every
// later boot, here and on this machine, would inherit it. The spec
// owns a throwaway home.
import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  ADHOC_TOOL_NAMES,
  apply,
  BASE_TOOL_NAMES,
  EAGER_TOOL_NAMES,
  DEFERRED_TOOL_NAMES,
  HEADLESS_TOOL_NAMES,
  inject,
  MELITE_TOOL_NAMES,
  name,
} from '../src/index.ts'
import { writeRunsDelegation, readRunsDelegation } from '../src/runsDelegation.ts'

const previousHome = process.env.DSH_HOME
let specHome: string

beforeAll(() => {
  specHome = mkdtempSync(join(tmpdir(), 'melite-tools-index-'))
  process.env.DSH_HOME = specHome
})

afterAll(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  rmSync(specHome, { recursive: true, force: true })
})

interface Fake {
  ctx: unknown
  registered: Array<{ name: string }>
  logs: unknown[][]
}

function fakeCtx(): Fake {
  const registered: Array<{ name: string }> = []
  const logs: unknown[][] = []
  const ctx = {
    logger: {
      info: (...args: unknown[]) => { logs.push(args) },
      warn: () => {},
    },
    effect: (fn: () => void) => {
      fn()
      return () => {}
    },
    // dsh-inject semantics: the callback fires only when the named
    // service is composed. The fake composes none by default (a bare
    // mount seats no commands registry); the /melite-runs tests pass
    // their own registry through injectCommands below.
    inject: (_names: readonly string[], _fn: (ctx: unknown) => void) => {},
    tools: {
      register: (def: { name: string }) => {
        registered.push(def)
        return () => {}
      },
      schemas: () => registered.map((d) => ({ name: d.name })),
    },
    get: (_name: string) => undefined,
  }
  return { ctx, registered, logs }
}

/** Drive the REAL catalog touch (V4 cure, 2026-10-18: the expansion
 * seat is apply-closure state — the only in-band trigger is the
 * tool's own execute arm; the estate call after it rejects on the
 * fake host, which the seat does not care about). */
async function touchCatalog(f: Fake): Promise<void> {
  const discover = f.registered.find((r) => r.name === 'melite_discover') as unknown as {
    execute?: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown>
  }
  await discover.execute?.({}, { signal: new AbortController().signal }).catch(() => {})
}

const BASE = [...BASE_TOOL_NAMES]
const HEADLESS = [...HEADLESS_TOOL_NAMES]
const CARD_TOOLS = [
  'music',
  'tts',
  'image_edit', // voice_lock died 2026-09-21 (design moved into the tts card's mods)
  'image_gen', // joined 2026-10-18: the dual-face-law cure seats the sixth card tool here (the gate's one-tool-per-card promise already claimed it)
  'motion',
  'h3_timeline',
]

describe('plugin surface', () => {
  test('name/inject/tool-name consts state the interface law', () => {
    assert.equal(name, 'melite-tools')
    assert.deepEqual(inject, ['tools'])
    assert.deepEqual(BASE, [...EAGER_TOOL_NAMES, ...DEFERRED_TOOL_NAMES])
    // THE EXPANSION LAW (operator 2026-10-08): eager trio first — the
    // deferred five seat on the first catalog touch, never at apply.
    assert.deepEqual([...EAGER_TOOL_NAMES], [
      'melite_discover', 'melite_load', 'melite_construct',
    ])
    assert.deepEqual([...DEFERRED_TOOL_NAMES], [
      'melite_view', 'melite_read', 'comfy_manage', 'melite_skill_index', 'melite_skill_read', 'ledger_tail',
    ])
    assert.deepEqual(HEADLESS, ['melite_flow', 'run_status'])
    assert.deepEqual([...ADHOC_TOOL_NAMES], [])
    assert.deepEqual([...MELITE_TOOL_NAMES].sort(), [...BASE, ...HEADLESS].sort())
  })
})

describe('apply browser interface (default)', () => {
  // THE CARD GATE (operator law 2026-09-21): the default toolset is
  // BASE ONLY — engine faces sit in NO agent lane's toolset at turn
  // one. Maker faces opt in with cardTools:true (the web profile).
  test('registers BASE only — card tools gated off, never the run doors', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context)
    const names = f.registered.map((r) => r.name)
    // EAGER only at apply (the expansion law)
    for (const e of EAGER_TOOL_NAMES) assert.ok(names.includes(e), 'missing eager ' + e)
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(!names.includes(d), 'deferred seated early: ' + d)
    for (const c of CARD_TOOLS) assert.ok(!names.includes(c), 'card tool leaked: ' + c)
    for (const h of HEADLESS) assert.ok(!names.includes(h), 'run door leaked: ' + h)
    assert.equal(names.length, EAGER_TOOL_NAMES.length)
    // THE CATALOG TOUCH (twice) seats the deferred five — idempotently
    await touchCatalog(f)
    await touchCatalog(f)
    const seated = f.registered.map((r) => r.name)
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(seated.includes(d), 'door never seated: ' + d)
    assert.equal(seated.length, EAGER_TOOL_NAMES.length + DEFERRED_TOOL_NAMES.length)
    assert.ok(String(f.logs[0][1]).includes('BROWSER'))
    assert.equal(f.logs[0][3], 0) // headless run door count
    assert.equal(f.logs[0][4], 0) // ad hoc count
  })

  test('cardTools:true opts the maker face in (base + card tools)', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { cardTools: true })
    const names = f.registered.map((r) => r.name)
    for (const c of CARD_TOOLS) assert.ok(names.includes(c), 'missing card tool ' + c)
    assert.equal(names.length, EAGER_TOOL_NAMES.length + CARD_TOOLS.length)
  })

  test('an explicit empty config is the browser interface too (base only)', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, {})
    assert.equal(f.registered.length, EAGER_TOOL_NAMES.length)
  })
})

describe('apply headless interface', () => {
  test('config headless:true registers the run doors without env', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { headless: true })
    const names = f.registered.map((r) => r.name)
    for (const h of HEADLESS) assert.ok(names.includes(h), 'missing run door ' + h)
    // THE MAKER SEATS EAGER (transcript-016 audit): headless runners
    // fix their tool catalog at boot — deferred doors must sit at
    // apply or they are promised-but-unreachable for the whole maker
    // session (nine catalog hunts + reasoning spirals around doors
    // the maker could never call).
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(names.includes(d), 'maker door never seated at boot: ' + d)
    // headless agent rig: card faces stay gated off there too
    assert.equal(names.length, EAGER_TOOL_NAMES.length + DEFERRED_TOOL_NAMES.length + HEADLESS.length)
    assert.ok(String(f.logs[0][1]).includes('HEADLESS'))
    assert.equal(f.logs[0][3], HEADLESS.length)
  })

  test('config headless:false stays browser', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { headless: false })
    assert.ok(!f.registered.some((r) => r.name === 'melite_flow'))
  })
})

describe('apply ad hoc parsing', () => {
  test('config array adhocTools trims and drops empties', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { adhocTools: [' x ', '', 'y'] })
    assert.equal(f.logs[0][4], 2)
  })

  test('config string adhocTools splits on commas', async () => {
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { adhocTools: 'p,q' })
    assert.equal(f.logs[0][4], 2)
  })
})

describe('the /melite-runs toggle (the user-side AI-run door, 2026-10-13)', () => {
  // The command rides ctx.inject('commands'): dsh semantics fire the
  // callback only where a command registry is composed. The fake
  // captures it; a registry composed = the browser lane's surface.
  interface CmdDef {
    name: string
    handler: (inv: { rawInput: string }) => { kind: 'success' | 'error'; text: string }
  }
  function fakeCtxWithCommands() {
    const registered: Array<{ name: string }> = []
    let commandsCb: ((ctx: { commands: { register(d: CmdDef): () => void } }) => void) | undefined
    const ctx = {
      logger: { info: () => {}, warn: () => {} },
      effect: () => () => {},
      inject: (names: readonly string[], fn: (ctx: { commands: { register(d: CmdDef): () => void } }) => void) => {
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
    return { ctx, registered, seatRegistry: () => {
      const defs: CmdDef[] = []
      if (!commandsCb) throw new Error('commands callback never captured — apply did not inject')
      commandsCb({ commands: { register: (d) => { defs.push(d); return () => {} } } })
      return defs
    } }
  }

  test('on seats the run doors + flips the compose loop; off reverses both', async () => {
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context)
    const names = () => f.registered.map((r) => r.name)
    // browser default: no run doors
    for (const h of HEADLESS) assert.ok(!names().includes(h), 'run door leaked at boot: ' + h)
    const [cmd] = f.seatRegistry()
    assert.equal(cmd.name, 'melite-runs')
    const constructBefore = f.registered.find((r) => r.name === 'melite_construct')
    const seated = cmd.handler({ rawInput: 'on' })
    assert.equal(seated.kind, 'success')
    for (const h of HEADLESS) assert.ok(names().includes(h), 'run door never seated: ' + h)
    // the compose loop re-seats with the flipped interface flag (its
    // model-facing copy names the door this mount now owns): the OLD
    // construct seat is disposed and a NEW definition lands
    const constructDefs = f.registered.filter((r) => r.name === 'melite_construct')
    assert.equal(constructDefs.length, 1, 'compose loop stacked a duplicate seat')
    assert.notEqual(constructDefs[0], constructBefore, 'compose loop never re-seated')
    const unseated = cmd.handler({ rawInput: 'off' })
    assert.equal(unseated.kind, 'success')
    for (const h of HEADLESS) assert.ok(!names().includes(h), 'run door never unseated: ' + h)
  })

  test('bare invocation reads the state; unknown argument refuses', async () => {
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context)
    const [cmd] = f.seatRegistry()
    const read = cmd.handler({ rawInput: '' })
    assert.equal(read.kind, 'success')
    assert.ok(read.text.includes('OFF'), 'bare read must state the browser default')
    const bad = cmd.handler({ rawInput: 'sideways' })
    assert.equal(bad.kind, 'error')
  })

  test('a headless mount boots with the doors seated; the command can still unseat them', async () => {
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context, { headless: true })
    const names = () => f.registered.map((r) => r.name)
    for (const h of HEADLESS) assert.ok(names().includes(h), 'headless boot lost a run door: ' + h)
    const [cmd] = f.seatRegistry()
    cmd.handler({ rawInput: 'off' })
    for (const h of HEADLESS) assert.ok(!names().includes(h), 'off failed to unseat on headless: ' + h)
  })

  test('on while already seated is a no-op (no stacked doors); toggle flips both ways', async () => {
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context, { headless: true })
    const names = () => f.registered.map((r) => r.name)
    const [cmd] = f.seatRegistry()
    // 'on' while the boot already seated the doors: the early
    // return answers — the door count stays one, never stacked
    const again = cmd.handler({ rawInput: 'on' })
    assert.equal(again.kind, 'success')
    const doorCount = (n: string) => f.registered.filter((r) => r.name === n).length
    for (const h of HEADLESS) assert.equal(doorCount(h), 1, 'on-while-seated stacked a door: ' + h)
    // toggle from seated → unseated, then back — both directions
    const toggedOff = cmd.handler({ rawInput: 'toggle' })
    assert.equal(toggedOff.kind, 'success')
    for (const h of HEADLESS) assert.ok(!names().includes(h), 'toggle failed to unseat: ' + h)
    const toggedOn = cmd.handler({ rawInput: 'toggle' })
    assert.equal(toggedOn.kind, 'success')
    for (const h of HEADLESS) assert.ok(names().includes(h), 'toggle failed to re-seat: ' + h)
  })

  // THE BURN'S OWN FIRING ARM (session 90a0b920, 2026-11-05: "the
  // melite_runs auto mode turned off... after I had it on" — the
  // toggle's state was memory-only, so a lane reload rebooted the
  // browser lane UNSEATED mid-session). The record outlives the
  // mount: a fresh boot reads it and seats accordingly.
  test('a persisted ON survives the reload — the fresh browser boot seats the run doors', async () => {
    assert.equal(writeRunsDelegation({ delegated: true }), undefined)
    assert.deepEqual(readRunsDelegation(), { delegated: true })
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context) // browser config — no headless
    const names = f.registered.map((r) => r.name)
    for (const h of HEADLESS) assert.ok(names.includes(h), 'the reload stole the delegation: ' + h)

    // THE SEAT PIN (the flap class, L336-377): a delegated reload
    // boots with the ESTATE doors pinned too — no catalog touch, no
    // 'unknown tool "comfy_manage"' hunt after a reload
    for (const d of ['melite_view', 'melite_read', 'comfy_manage', 'melite_skill_index', 'melite_skill_read', 'ledger_tail']) {
      assert.ok(names.includes(d), 'the delegated reload booted without the estate door: ' + d)
    }

    // and the record's other half: a persisted OFF boots unseated
    // (memory cannot resurrect what the operator switched off)
    assert.equal(writeRunsDelegation({ delegated: false }), undefined)
    const g = fakeCtxWithCommands()
    await apply(g.ctx as unknown as Context)
    for (const h of HEADLESS) assert.ok(!g.registered.map((r) => r.name).includes(h), 'an OFF record seated a door: ' + h)
    // the off-lane keeps the progressive-disclosure law: deferred
    // doors arrive on first catalog touch, never at boot
    for (const d of ['melite_view', 'comfy_manage', 'ledger_tail']) {
      assert.ok(!g.registered.map((r) => r.name).includes(d), 'an OFF record pinned a deferred door: ' + d)
    }
  })

  test('the toggle\'s success voice states whether the flip persisted', async () => {
    const f = fakeCtxWithCommands()
    await apply(f.ctx as unknown as Context)
    const [cmd] = f.seatRegistry()
    const on = cmd.handler({ rawInput: 'on' }) as { kind: string; text: string }
    assert.equal(on.kind, 'success')
    assert.match(on.text, /Recorded — the delegation survives lane reloads/, 'the ON voice names the persistence')
    // the pin's mid-session face: ON seats the estate doors too
    const seatedNames = f.registered.map((r) => r.name)
    for (const d of ['melite_view', 'comfy_manage', 'ledger_tail']) {
      assert.ok(seatedNames.includes(d), 'the ON toggle left an estate door unseated: ' + d)
    }
    assert.match(on.text, /estate doors/, 'the ON voice names the pinned estate doors')
    const off = cmd.handler({ rawInput: 'off' }) as { kind: string; text: string }
    assert.equal(off.kind, 'success')
    assert.match(off.text, /Recorded/, 'the OFF voice names the persistence')
  })
})
