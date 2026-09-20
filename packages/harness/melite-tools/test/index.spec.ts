// index.ts walls (vitest, fake host — no estate, no network): the
// plugin surface (name/inject/tool-name consts) plus apply's
// interface law — browser default, headless via env or config, ad
// hoc parsing (env wins, string-or-list config, trim/filter), and
// the exact registration sets.
import { describe, test, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import type { Context } from '@deepseek-ai/cordis'
import {
  ADHOC_TOOL_NAMES,
  apply,
  BASE_TOOL_NAMES,
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
    assert.deepEqual(BASE, [
      'melite_discover', 'melite_construct', 'melite_load', 'melite_view',
      'comfy_manage', 'skill_index', 'skill_read', 'ledger_tail',
    ])
    assert.deepEqual(HEADLESS, ['melite_flow', 'run_status'])
    assert.deepEqual([...ADHOC_TOOL_NAMES], [])
    assert.deepEqual([...MELITE_TOOL_NAMES].sort(), [...BASE, ...HEADLESS].sort())
  })
})

describe('apply browser interface (default)', () => {
  test('registers base + card tools, never the run doors', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context)
    const names = f.registered.map((r) => r.name)
    for (const b of BASE) assert.ok(names.includes(b), 'missing base ' + b)
    for (const c of CARD_TOOLS) assert.ok(names.includes(c), 'missing card tool ' + c)
    for (const h of HEADLESS) assert.ok(!names.includes(h), 'run door leaked: ' + h)
    assert.equal(names.length, BASE.length + CARD_TOOLS.length)
    assert.ok(String(f.logs[0][1]).includes('BROWSER'))
    assert.equal(f.logs[0][3], 0) // headless run door count
    assert.equal(f.logs[0][4], 0) // ad hoc count
  })

  test('an explicit empty config is the browser interface too', async () => {
    setEnv('MELITE_HEADLESS', undefined)
    setEnv('MELITE_ADHOC', undefined)
    const f = fakeCtx()
    await apply(f.ctx as unknown as Context, {})
    assert.equal(f.registered.length, BASE.length + CARD_TOOLS.length)
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
    assert.equal(names.length, BASE.length + CARD_TOOLS.length + HEADLESS.length)
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
