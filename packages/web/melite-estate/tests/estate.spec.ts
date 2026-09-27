// estate.spec — the estate bundle's host row, pinned WITHOUT booting
// the lane (fake cordis ctx; the fake ctx.plugin RECORDS every row
// and RUNS the estate's own inline rows — exactly a real cordis's
// half of the contract — while third-party rows stay unapplied: their
// behavior belongs to their packages):
//
//   dispatch — the engine seat first, the queue row pinned with
//              repoRoot, config-carrying rows passed through
//              verbatim, bare rows applied naked;
//   rows     — the mcp/craft/agent inline rows' loud seat decisions.
//
// SEAM STUBS (below): the four wrapped lanes need what a unit lane
// cannot give — the blender/unity subprocesses (mcp-client applies), the engines
// + tools + llm seats (mcpEngines, craftEngineAutoRoute, agentEngine),
// the disclosure tree (findSkill/disclosureRoot). The stubs stand at
// THOSE seams only, to pin the ROWS' own logic (witness census,
// serialized seat attempts, loud refusals, skill reads). The wrapped
// lanes are pinned by their owners.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import estateDefault, { apply, name } from '../src/index.ts'

const mcpBridge = vi.hoisted(() => ({
  mode: 'resolve' as 'undefined' | 'sync' | 'resolve' | 'reject',
  reason: undefined as unknown,
  calls: [] as Array<{ cfg: unknown }>,
  tools: undefined as Record<string, unknown> | undefined,
}))
vi.mock('@deepseek-ai/dsh-mcp-client', () => ({
  inject: ['tools'],
  Config: {},
  apply: (_ctx: unknown, cfg: unknown) => {
    mcpBridge.calls.push({ cfg })
    if (mcpBridge.mode === 'undefined') return undefined
    if (mcpBridge.mode === 'sync') return 'sync-value'
    if (mcpBridge.mode === 'reject') return Promise.reject(mcpBridge.reason)
    return Promise.resolve('bridge-value')
  },
}))

const craftLane = vi.hoisted(() => ({
  mode: 'false' as 'false' | 'true' | 'reject' | 'pending',
  reason: new Error('route exploded') as unknown,
  calls: [] as Array<{ prefer: unknown }>,
  release: undefined as ((v: boolean) => void) | undefined,
}))
vi.mock('@melite/engine-craft', () => ({
  craftEngineAutoRoute: (_ctx: unknown, _say: unknown, prefer: unknown) => {
    craftLane.calls.push({ prefer })
    if (craftLane.mode === 'true') return Promise.resolve(true)
    if (craftLane.mode === 'reject') return Promise.reject(craftLane.reason)
    if (craftLane.mode === 'pending') return new Promise<boolean>((r) => { craftLane.release = r })
    return Promise.resolve(false)
  },
}))

const agentLane = vi.hoisted(() => ({
  opts: undefined as unknown,
}))
vi.mock('@melite/engine-agent', async () => {
  const { vi: vitest } = await import('vitest')
  return {
    agentEngine: vitest.fn((_ctx: unknown, opts: unknown) => { agentLane.opts = opts }),
  }
})

const mcpLane = vi.hoisted(() => ({
  calls: [] as Array<{ cfg: unknown }>,
}))
vi.mock('@melite/engine-mcp', async () => {
  const { vi: vitest } = await import('vitest')
  return { mcpEngines: vitest.fn((...args: unknown[]) => { mcpLane.calls.push({ cfg: args[1] }) }) }
})

const discloseLane = vi.hoisted(() => ({
  root: '/tmp/disclosure-root',
  found: null as null | { bodyText: string | null; path: string },
}))
vi.mock('@melite/estate-queue', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@melite/estate-queue')>()
  return {
    ...mod,
    disclosureRoot: () => discloseLane.root,
    findSkill: (_root: unknown, _id: unknown) => discloseLane.found,
  }
})

import { mcpEngines } from '@melite/engine-mcp'
import { agentEngine } from '@melite/engine-agent'

interface Ctx {
  plugins: Array<{ name: string; cfg: unknown; row: { name?: string; apply?: (c: unknown, cfg: unknown) => unknown } }>
  plugin(row: { name?: string; apply?: unknown }, cfg?: unknown): unknown
  get(name: string): undefined
  effect(fn: () => unknown): unknown
  root: { on(): () => void }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  delete process.env['MELITE_CRITIC_ROUTE']
  delete process.env['MELITE_AGENT_ROUTE']
})

function mount(config?: { repoRoot?: string }): Ctx {
  const ctx: Ctx = {
    plugins: [],
    plugin(row, cfg) {
      ctx.plugins.push({ name: String(row?.name), cfg, row: row as Ctx['plugins'][0]['row'] })
      return row
    },
    get: (_name: string) => undefined,
    effect: (fn: () => unknown) => fn(),
    root: { on: () => () => {} },
  }
  apply(ctx as never, config as never)
  return ctx
}

describe('the bundle face', () => {
  it('names melite-estate and applies through ctx.plugin', () => {
    expect(name).toBe('melite-estate')
    expect(estateDefault).toEqual({ name: 'melite-estate', apply })
  })
})

describe('dispatch — mount order is load order', () => {
  it('seats the engines contract first', () => {
    const ctx = mount({ repoRoot: '/tmp/pin' })
    expect(ctx.plugins.length).toBeGreaterThan(5)
    expect(ctx.plugins[0]?.name).toBe('engine-contract')
  })

  it('pins the queue row with repoRoot and passes row configs through verbatim', () => {
    const ctx = mount({ repoRoot: '/tmp/pin' })
    const queue = ctx.plugins.find((p) => p.name === 'estate-queue')
    expect(queue?.cfg).toEqual({ repoRoot: '/tmp/pin' })
    const blender = ctx.plugins.find((p) => p.name === 'mcp-client-blender')
    expect(blender?.cfg).toMatchObject({
      transport: 'stdio',
      serverName: 'blender',
      failOnStartupError: false,
    })
    const mcpRow = ctx.plugins.find((p) => p.name === 'melite-engine-mcp-row')
     expect(mcpRow?.cfg).toEqual({ engines: ['mcp:blender'] })
  })

  it('applies bare rows naked and defaults the config face', () => {
    const ctx = mount()
    const craft = ctx.plugins.find((p) => p.name === 'melite-engine-craft-row')
    expect(craft?.cfg).toBe(undefined)
    const queue = ctx.plugins.find((p) => p.name === 'estate-queue')
    expect(queue?.cfg).toEqual({ repoRoot: undefined })
  })
})

type RowApply = (c: unknown, cfg: unknown) => unknown

function rowApply(name: string): { fn: RowApply; cfg: unknown } {
  const ctx = mount()
  const found = ctx.plugins.find((p) => p.name === name)
  if (found?.row.apply === undefined) throw new Error('no appliable row ' + name)
  return { fn: found.row.apply as RowApply, cfg: found.cfg }
}

function silence(): string[] {
  const lines: string[] = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '))
  })
  return lines
}

function toolsCtx(tools?: Record<string, unknown>) {
  const cleanups: Array<() => void> = []
  const listeners: Array<() => void> = []
  const unsubs: string[] = []
  const ctx = {
    get: (n: string): unknown =>
      n === 'tools'
        ? tools === undefined
          ? undefined
          : { get: (k: string): unknown => tools[k] }
        : undefined,
    effect: (fn: () => () => void): unknown => {
      cleanups.push(fn())
      return undefined
    },
    root: {
      on: (ev: string, fn: () => void): (() => void) => {
        listeners.push(fn)
        return () => { unsubs.push(ev) }
      },
    },
  }
  return { ctx, cleanups, listeners, unsubs }
}

describe('mcp-client-blender row — the witnessed bridge apply', () => {
  it('a sync bridge apply rides through untouched', () => {
    mcpBridge.mode = 'sync'
    const { fn, cfg } = rowApply('mcp-client-blender')
    expect(fn(toolsCtx().ctx, cfg)).toBe('sync-value')
  })

  it('an undefined bridge apply rides through untouched', () => {
    mcpBridge.mode = 'undefined'
    const { fn, cfg } = rowApply('mcp-client-blender')
    expect(fn(toolsCtx().ctx, cfg)).toBe(undefined)
  })

  it('a settled bridge censuses the blender namespace (absent seats read absent)', async () => {
    mcpBridge.mode = 'resolve'
    mcpBridge.calls = []
    const lines = silence()
    try {
      const { fn, cfg } = rowApply('mcp-client-blender')
      await expect(fn(toolsCtx().ctx, cfg)).resolves.toBe('bridge-value')
      expect(mcpBridge.calls[0]?.cfg).toMatchObject({ transport: 'stdio', serverName: 'blender' })
      expect(lines.join('\n')).toContain(
        '[melite-estate] mcp-client-blender ready: mcp__blender__scene_info=absent mcp__blender__render_shot=absent',
      )
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a partially published namespace censuses PRESENT per tool', async () => {
    mcpBridge.mode = 'resolve'
    const lines = silence()
    try {
      const { fn, cfg } = rowApply('mcp-client-blender')
      await expect(
        fn(toolsCtx({ mcp__blender__scene_info: {} }).ctx, cfg),
      ).resolves.toBe('bridge-value')
      expect(lines.join('\n')).toContain('mcp__blender__scene_info=PRESENT mcp__blender__render_shot=absent')
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a rejected bridge logs its cause chain, then rethrows identical', async () => {
    const lines = silence()
    try {
      const { fn, cfg } = rowApply('mcp-client-blender')
      const nested = new Error('outer', {
        cause: { message: 'mid', cause: { cause: { message: 'deep' } } },
      } as ErrorOptions)
      mcpBridge.mode = 'reject'
      mcpBridge.reason = nested
      await expect(fn(toolsCtx().ctx, cfg)).rejects.toBe(nested)
      expect(lines.join('\n')).toContain('REJECTED: outer | caused by: mid | caused by: [object Object]')

      mcpBridge.reason = new Error('x', { cause: null } as ErrorOptions)
      await expect(fn(toolsCtx().ctx, cfg)).rejects.toBe(mcpBridge.reason)
      expect(lines.join('\n')).toContain('REJECTED: x | caused by: ')

      mcpBridge.reason = 'bare string failure'
      await expect(fn(toolsCtx().ctx, cfg)).rejects.toBe('bare string failure')
      expect(lines.join('\n')).toContain('REJECTED: bare string failure')

      mcpBridge.reason = 42
      await expect(fn(toolsCtx().ctx, cfg)).rejects.toBe(42)
    } finally {
      vi.restoreAllMocks()
    }
  })
})

describe('Unity MCP row — intentionally not composed', () => {
  it('is absent from the estate composition', () => {
    const ctx = mount({ repoRoot: '/tmp/pin' })
    expect(ctx.plugins.find((p) => p.name === 'mcp-client-unity')).toBeUndefined()
  })
})

describe('melite-engine-mcp-row — the gated seat read', () => {
  it('announces its config LOUD and seats through the mcp lane', () => {
    const lines = silence()
    try {
      const { fn, cfg } = rowApply('melite-engine-mcp-row')
      const ctx = toolsCtx().ctx
      fn(ctx, cfg)
       expect(lines.join('\n')).toContain('[melite-estate] mcp row applying with config {"engines":["mcp:blender"]}')
       expect(vi.mocked(mcpEngines)).toHaveBeenCalledWith(ctx, { engines: ['mcp:blender'] })
    } finally {
      vi.restoreAllMocks()
    }
  })

  // li-l (2026-10-10, the 5+ brick): MELITE_MCP_ENGINES is the
  // operator's gate — empty names NO engine, the row announces the
  // OFF state LOUD, and mcpEngines is never called (a flapping
  // blender handshake can no longer brick the estate: no seat, no
  // cycle). The 3D cards refuse by name at the door instead.
  it('MELITE_MCP_ENGINES empty turns the row OFF loudly — no mcpEngines call, no flapping seat', () => {
    const lines = silence()
    vi.clearAllMocks()
    process.env['MELITE_MCP_ENGINES'] = ''
    try {
      const { fn, cfg } = rowApply('melite-engine-mcp-row')
      fn(toolsCtx().ctx, cfg)
      expect(lines.join('\n')).toContain('row OFF (MELITE_MCP_ENGINES empty)')
      expect(vi.mocked(mcpEngines)).not.toHaveBeenCalled()
    } finally {
      delete process.env['MELITE_MCP_ENGINES']
      vi.restoreAllMocks()
    }
  })

  it('MELITE_MCP_ENGINES overrides the default list', () => {
    const lines = silence()
    vi.clearAllMocks()
    process.env['MELITE_MCP_ENGINES'] = 'mcp:unity, mcp:blender'
    try {
      const { fn, cfg } = rowApply('melite-engine-mcp-row')
      const ctx = toolsCtx().ctx
      fn(ctx, cfg)
      expect(lines.join('\n')).toContain('{"engines":["mcp:unity","mcp:blender"]}')
      expect(vi.mocked(mcpEngines)).toHaveBeenCalledWith(ctx, { engines: ['mcp:unity', 'mcp:blender'] })
    } finally {
      delete process.env['MELITE_MCP_ENGINES']
      vi.restoreAllMocks()
    }
  })
})

describe('melite-engine-craft-row — serialized late seating', () => {
  it('attempts the auto-route with no preference when the route is unnamed', async () => {
    craftLane.mode = 'false'
    craftLane.calls = []
    const { ctx, listeners } = toolsCtx()
    const { fn } = rowApply('melite-engine-craft-row')
    await fn(ctx, undefined)
    expect(craftLane.calls).toEqual([{ prefer: undefined }])
    expect(listeners).toHaveLength(1)
  })

  it('names the critic explicitly (malformed routes fall back to auto)', async () => {
    craftLane.mode = 'false'
    craftLane.calls = []
    process.env['MELITE_CRITIC_ROUTE'] = 'prov/model'
    await rowApply('melite-engine-craft-row').fn(toolsCtx().ctx, undefined)
    expect(craftLane.calls).toEqual([{ prefer: { provider: 'prov', model: 'model' } }])
    process.env['MELITE_CRITIC_ROUTE'] = 'noslash'
    await rowApply('melite-engine-craft-row').fn(toolsCtx().ctx, undefined)
    expect(craftLane.calls[1]).toEqual({ prefer: undefined })
  })

  it('a seated route unsubscribes and ignores later announcements', async () => {
    craftLane.mode = 'true'
    craftLane.calls = []
    const { ctx, listeners, unsubs } = toolsCtx()
    await rowApply('melite-engine-craft-row').fn(ctx, undefined)
    // the seating attempt settles on the microtask queue
    await new Promise((r) => setTimeout(r, 20))
    expect(craftLane.calls).toHaveLength(1)
    expect(unsubs).toEqual(['llm/adapters-updated'])
    listeners[0]?.()
    await new Promise((r) => setTimeout(r, 20))
    expect(craftLane.calls).toHaveLength(1)
  })

  it('a failed attempt logs LOUD and the next announcement retries', async () => {
    craftLane.mode = 'reject'
    craftLane.reason = new Error('route exploded')
    craftLane.calls = []
    const lines = silence()
    try {
      const { ctx, listeners } = toolsCtx()
      await rowApply('melite-engine-craft-row').fn(ctx, undefined)
      await new Promise((r) => setTimeout(r, 20))
      expect(lines.join('\n')).toContain('craft engine: late seat attempt failed (route exploded)')
      // a messageless rejection still says something (the defensive arm).
      craftLane.reason = { custom: 1 }
      listeners[0]?.()
      await new Promise((r) => setTimeout(r, 20))
      expect(craftLane.calls).toHaveLength(2)
      expect(lines.join('\n')).toContain('waiting for the next adapters-updated')
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('concurrent announcements serialize (one attempt at a time)', async () => {
    craftLane.mode = 'pending'
    craftLane.calls = []
    const { ctx, listeners } = toolsCtx()
    await rowApply('melite-engine-craft-row').fn(ctx, undefined)
    listeners[0]?.()
    listeners[0]?.()
    expect(craftLane.calls).toHaveLength(1)
    craftLane.release?.(false)
    await new Promise((r) => setTimeout(r, 20))
  })

  it('the effect disposal unsubscribes the announcement', async () => {
    craftLane.mode = 'pending'
    craftLane.calls = []
    const { ctx, cleanups, unsubs } = toolsCtx()
    await rowApply('melite-engine-craft-row').fn(ctx, undefined)
    // the row seated nothing yet, but the announcement subscription
    // is live — disposal drops it (the off?.() defined arm; the
    // undefined arm is unreachable: off assigns synchronously in
    // apply before any external code can run the disposal).
    cleanups[0]?.()
    expect(unsubs).toEqual(['llm/adapters-updated'])
    craftLane.mode = 'true'
    craftLane.release?.(false)
    await new Promise((r) => setTimeout(r, 20))
  })
})

describe('melite-engine-agent-row — the named brain or a loud refusal', () => {
  it('refuses LOUD without MELITE_AGENT_ROUTE (never a default brain)', () => {
    const lines = silence()
    try {
      rowApply('melite-engine-agent-row').fn(toolsCtx().ctx, undefined)
      expect(vi.mocked(agentEngine)).not.toHaveBeenCalled()
      expect(lines.join('\n')).toContain("engine 'agent' NOT seated")
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a malformed route refuses the same way', () => {
    process.env['MELITE_AGENT_ROUTE'] = 'noslash'
    const lines = silence()
    try {
      rowApply('melite-engine-agent-row').fn(toolsCtx().ctx, undefined)
      expect(vi.mocked(agentEngine)).not.toHaveBeenCalled()
      expect(lines.join('\n')).toContain("engine 'agent' NOT seated")
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a named route seats with the spawn-injection reader', async () => {
    process.env['MELITE_AGENT_ROUTE'] = 'prov/model'
    vi.mocked(agentEngine).mockClear()
    rowApply('melite-engine-agent-row').fn(toolsCtx().ctx, undefined)
    const opts = agentLane.opts as {
      provider: string
      model: string
      skills: { read(id: string): Promise<string | null> }
    }
    expect(opts.provider).toBe('prov')
    expect(opts.model).toBe('model')
    // unknown skills read null (the engine refuses the skill at stage start)
    discloseLane.found = null
    await expect(opts.skills.read('nope')).resolves.toBe(null)
    // body-text skills ride verbatim (no disk touch)
    discloseLane.found = { bodyText: '# skill', path: '/nowhere.md' }
    await expect(opts.skills.read('s')).resolves.toBe('# skill')
    // leaf-file skills read off disk; unreadable leaves read null
    const dir = mkdtempSync(join(tmpdir(), 'estate-skill-'))
    try {
      writeFileSync(join(dir, 's.md'), '# leaf')
      discloseLane.found = { bodyText: null, path: join(dir, 's.md') }
      await expect(opts.skills.read('s')).resolves.toBe('# leaf')
      discloseLane.found = { bodyText: null, path: join(dir, 'gone.md') }
      await expect(opts.skills.read('s')).resolves.toBe(null)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
