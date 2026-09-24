// index.ts walls (vitest, fake host — no estate, no network): the
// plugin surface (name/inject/tool-name consts) plus apply's
// interface law — browser default, headless via env or config, ad
// hoc parsing (env wins, string-or-list config, trim/filter), and
// the exact registration sets.
import { expandEstateDoors } from '../src/expansion'
import { describe, test, afterEach } from 'vitest'
import assert from 'node:assert/strict'
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

const savedEnv: Record<string, string | undefined> = {}
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k]
  if (v === undefined) delete process.env[k]
  else process.env[k] = v
}

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
    delete savedEnv[k]
  }
})

const BASE = [...BASE_TOOL_NAMES]
const HEADLESS = [...HEADLESS_TOOL_NAMES]
const CARD_TOOLS = [
  'music',
  'tts',
  'image_edit', // voice_lock died 2026-09-21 (design moved into the tts card's mods)
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
      'melite_view', 'comfy_manage', 'melite_skill_index', 'melite_skill_read', 'ledger_tail',
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
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    setEnv('MELITE_CARD_TOOLS', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context)
    const names = f.registered.map((r) => r.name)
    // EAGER only at apply (the expansion law)
    for (const e of EAGER_TOOL_NAMES) assert.ok(names.includes(e), 'missing eager ' + e)
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(!names.includes(d), 'deferred seated early: ' + d)
    for (const c of CARD_TOOLS) assert.ok(!names.includes(c), 'card tool leaked: ' + c)
    for (const h of HEADLESS) assert.ok(!names.includes(h), 'run door leaked: ' + h)
    assert.equal(names.length, EAGER_TOOL_NAMES.length)
    // THE CATALOG TOUCH seats the deferred five — idempotently
    expandEstateDoors()
    expandEstateDoors()
    const seated = f.registered.map((r) => r.name)
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(seated.includes(d), 'door never seated: ' + d)
    assert.equal(seated.length, EAGER_TOOL_NAMES.length + DEFERRED_TOOL_NAMES.length)
    assert.ok(String(f.logs[0][1]).includes('BROWSER'))
    assert.equal(f.logs[0][3], 0) // headless run door count
    assert.equal(f.logs[0][4], 0) // ad hoc count
  })

  test('cardTools:true opts the maker face in (base + card tools)', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { cardTools: true })
    const names = f.registered.map((r) => r.name)
    for (const c of CARD_TOOLS) assert.ok(names.includes(c), 'missing card tool ' + c)
    assert.equal(names.length, EAGER_TOOL_NAMES.length + CARD_TOOLS.length)
  })

  test('an explicit empty config is the browser interface too (base only)', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, {})
    assert.equal(f.registered.length, EAGER_TOOL_NAMES.length)
  })
})

describe('apply headless interface', () => {
  test('MELITE_HEADLESS=1 registers the run doors', async () => {
    setEnv('MELITE_HEADLESS', '1')
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, {})
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

  test('config headless:true registers the run doors without env', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { headless: true })
    assert.ok(f.registered.some((r) => r.name === 'melite_flow'))
    assert.ok(f.registered.some((r) => r.name === 'run_status'))
    // the maker seats eager through the config path too (one law,
    // two arming spells)
    for (const d of DEFERRED_TOOL_NAMES) assert.ok(f.registered.some((r) => r.name === d), 'config-path door never seated: ' + d)
  })

  test('config headless:false stays browser', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { headless: false })
    assert.ok(!f.registered.some((r) => r.name === 'melite_flow'))
  })
})

describe('apply ad hoc parsing', () => {
  test('MELITE_ADHOC env splits, trims, and drops empties', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', ' alpha ,, beta ')
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, {})
    assert.equal(f.logs[0][4], 2)
  })

  test('config array adhocTools trims and drops empties', async () => {
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { adhocTools: [' x ', '', 'y'] })
    assert.equal(f.logs[0][4], 2)
  })

  test('config string adhocTools splits on commas', async () => {
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { adhocTools: 'p,q' })
    assert.equal(f.logs[0][4], 2)
  })

  test('env wins over config when both name tools', async () => {
    setEnv('MELITE_ADHOC', 'from-env')
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, { adhocTools: ['from-cfg'] })
    assert.equal(f.logs[0][4], 1)
  })
})
