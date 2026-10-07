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
import { join, resolve } from 'node:path'
import estateDefault, { apply, name } from '../src/index.ts'

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

// The models seat row: the fake ctx EXECUTES it (a real family
// registration is the provider's own package, not the estate's), so
// the awaited-mount contract is pinnable here — a refusal must fail
// the boot before any other row mounts.
const modelsLane = vi.hoisted(() => ({
  refusal: undefined as Error | undefined,
  mounted: 0,
}))
vi.mock('@melite/comfyui-cordis/catalog-registry', () => ({
  default: {
    name: 'comfyui-models-families',
    apply: () => {
      modelsLane.mounted += 1
      if (modelsLane.refusal !== undefined) throw modelsLane.refusal
    },
  },
}))

// Every row the fake ctx was asked to mount, in order — the atomicity
// witness for the awaited seat (a refusal must leave exactly one).
const attempted: Array<{ name: string }> = []

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
  loader?: { entries(): Array<{ options: { name: string } }> }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  delete process.env['MELITE_CRITIC_ROUTE']
  delete process.env['MELITE_AGENT_ROUTE']
  // The ambient-env law (dsh-ci-test-reliability): a shell that drove
  // the studio lane can carry a present-but-empty MELITE_MCP_ENGINES,
  // and the mcp-row's own config assertion reads the environment.
  delete process.env['MELITE_MCP_ENGINES']
})

// apply is async (the models row is awaited so a family refusal
// fails the estate boot loud): mount awaits it the way cordis does.
// loaderNames builds the loader stub the bundle gate judges — absent
// (undefined) means a direct-mount rig with no tree, present means a
// lane boot with exactly those composed entry modules.
async function mount(config?: { repoRoot?: string; blenderPath?: string; allowGuttedLane?: boolean }, loaderNames?: string[]): Promise<Ctx> {
  const ctx: Ctx = {
    plugins: [],
    plugin(row, cfg) {
      ctx.plugins.push({ name: String(row?.name), cfg, row: row as Ctx['plugins'][0]['row'] })
      attempted.push({ name: String(row?.name) })
      // The models seat row is EXECUTED by the fake (a real family
      // registration is the provider's own package, not the estate's):
      // the awaited mount's contract — a family refusal rethrown out
      // of apply — is only observable when the row's apply runs. Every
      // other row stays recorded-but-unapplied (the header's law).
      if (row?.name === 'comfyui-models-families' && typeof row?.apply === 'function') {
        return Promise.resolve((row.apply as (c: unknown, cfg: unknown) => unknown)(ctx, cfg))
      }
      return row
    },
    get: (_name: string) => undefined,
    effect: (fn: () => unknown) => fn(),
    root: { on: () => () => {} },
    ...(loaderNames === undefined
      ? {}
      : { loader: { entries: () => loaderNames.map((name) => ({ options: { name } })) } }),
  }
  attempted.length = 0
  await apply(ctx as never, config as never)
  return ctx
}

describe('the bundle face', () => {
  it('names melite-estate and applies through ctx.plugin', () => {
    expect(name).toBe('melite-estate')
    expect(estateDefault).toEqual({ name: 'melite-estate', apply })
  })
})

describe('dispatch — mount order is load order', () => {
  it('mounts the awaited models seat first, then the engines contract', async () => {
    const ctx = await mount({ repoRoot: '/tmp/pin' })
    expect(ctx.plugins.length).toBeGreaterThan(5)
    // The models row mounts BEFORE the loop and the loop skips it
    // (identity), so it is recorded exactly once — at index 0. The
    // await is what makes a family refusal fail the whole boot
    // (below) instead of leaving a half-mounted lane.
    expect(ctx.plugins.filter((p) => p.name === 'comfyui-models-families')).toHaveLength(1)
    expect(ctx.plugins[0]?.name).toBe('comfyui-models-families')
    expect(ctx.plugins[1]?.name).toBe('LocalSubprocessRuntime')
    expect(ctx.plugins[2]?.name).toBe('engine-contract')
  })

  it('a family refusal fails the estate boot before any other row mounts', async () => {
    modelsLane.refusal = new Error('family "anny" refuses: unknown node')
    const ctx = await mount({ repoRoot: '/tmp/pin' }).catch((e: unknown) => e)
    try {
      expect(ctx).toBeInstanceOf(Error)
      expect((ctx as Error).message).toBe('family "anny" refuses: unknown node')
      // Atomicity: cordis flips the fiber INACTIVE without running
      // collected disposers, so a refusal that landed mid-loop would
      // leave the engines/MCP/craft/agent seats registered on a lane
      // whose runs, queue and disclosure doors never mounted. The
      // fake's recording list proves the loop never started — the
      // models row is the only mount attempted.
      expect(attempted.map((p) => p.name)).toEqual(['comfyui-models-families'])
    } finally {
      modelsLane.refusal = undefined
      attempted.length = 0
    }
  })

  it('a gutted loader tree refuses before any row mounts (the lane-side refusal)', async () => {
    // The 2026-10-05 replay: every @melite* bundle skipped, so the
    // tree carries DSH rows only. The gate runs before the models
    // seat — attempted holds zero rows, stronger than the
    // models-first atomicity above (which mounts one seat).
    const gutted: string[] = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
    const outcome = await mount({ repoRoot: '/tmp/pin' }, gutted).catch((e: unknown) => e)
    try {
      expect(outcome).toBeInstanceOf(Error)
      expect((outcome as Error).message).toMatch(/gutted lane/)
      expect((outcome as Error).message).toMatch(/@melite\/harness-tools/)
      expect(attempted.map((p) => p.name)).toEqual([])
    } finally {
      attempted.length = 0
    }
  })

  it('a whole loader tree mounts normally past the gate', async () => {
    const ctx = await mount({ repoRoot: '/tmp/pin' }, ['@melite/harness-tools', '@deepseek-ai/dsh-web-app'])
    expect(ctx.plugins.length).toBeGreaterThan(5)
    expect(ctx.plugins[0]?.name).toBe('comfyui-models-families')
  })

  it('the degraded opt-out serves a gutted tree instead of refusing', async () => {
    const ctx = await mount({ repoRoot: '/tmp/pin', allowGuttedLane: true }, ['@deepseek-ai/dsh-web-app'])
    expect(ctx.plugins.length).toBeGreaterThan(5)
  })

  it('pins the queue row with repoRoot and passes row configs through verbatim', async () => {
    const ctx = await mount({ repoRoot: '/tmp/pin' })
    const queue = ctx.plugins.find((p) => p.name === 'estate-queue')
    expect(queue?.cfg).toEqual({ repoRoot: '/tmp/pin' })
    const blender = ctx.plugins.find((p) => p.name === 'mcp-client-blender')
    // No blender seat (operator ruling 2026-10-04, audit 008 M12):
    // melite mounts no MCP client of its own — the bench is a DSH
    // profile concern (dsh-provision presets: melite-foundry, game,
    // mega-blender, mega-unity).
    expect(blender).toBe(undefined)
    const mcpRow = ctx.plugins.find((p) => p.name === 'melite-engine-mcp-row')
     // optional/experimental (2026-10-12): the default seats nothing
     expect(mcpRow?.cfg).toEqual({ engines: [] })
  })


  it('applies bare rows naked and defaults the config face', async () => {
    const ctx = await mount()
    const craft = ctx.plugins.find((p) => p.name === 'melite-engine-craft-row')
    expect(craft?.cfg).toBe(undefined)
    const queue = ctx.plugins.find((p) => p.name === 'estate-queue')
    expect(queue?.cfg).toEqual({ repoRoot: undefined })
  })
})

type RowApply = (c: unknown, cfg: unknown) => unknown

async function rowApply(name: string): Promise<{ fn: RowApply; cfg: unknown }> {
  const ctx = await mount()
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

describe('Unity MCP row — intentionally not composed', () => {
  it('is absent from the estate composition', async () => {
    const ctx = await mount({ repoRoot: '/tmp/pin' })
    expect(ctx.plugins.find((p) => p.name === 'mcp-client-unity')).toBeUndefined()
  })
})

describe('melite-engine-mcp-row — the gated seat read', () => {
  it('the optional default seats NOTHING — the row announces OFF loudly (the operator law of 2026-10-12: the MCP card is experimental, opt-in)', async () => {
    const lines = silence()
    try {
      const { fn, cfg } = await rowApply('melite-engine-mcp-row')
      fn(toolsCtx().ctx, cfg)
      expect(lines.join('\n')).toContain('mcp row OFF (no engine named')
      expect(vi.mocked(mcpEngines)).not.toHaveBeenCalled()
    } finally {
      vi.restoreAllMocks()
    }
  })

  // li-l (2026-10-10, the 5+ brick): MELITE_MCP_ENGINES is the
  // operator's gate — empty names NO engine, the row announces the
  // OFF state LOUD, and mcpEngines is never called (a flapping
  // blender handshake can no longer brick the estate: no seat, no
  // cycle). The 3D cards refuse by name at the door instead.
  it('MELITE_MCP_ENGINES empty turns the row OFF loudly — no mcpEngines call, no flapping seat', async () => {
    const lines = silence()
    vi.clearAllMocks()
    process.env['MELITE_MCP_ENGINES'] = ''
    try {
      const { fn, cfg } = await rowApply('melite-engine-mcp-row')
      fn(toolsCtx().ctx, cfg)
      expect(lines.join('\n')).toContain('mcp row OFF (no engine named')
      expect(vi.mocked(mcpEngines)).not.toHaveBeenCalled()
    } finally {
      delete process.env['MELITE_MCP_ENGINES']
      vi.restoreAllMocks()
    }
  })

  // THE CONFIG OVERRIDE HALF (index.ts:223). MELITE_MCP_ENGINES is
  // the operator's gate; when the environment names nothing, the row
  // reads its own cordis.yml config face — the OTHER door the same
  // comment advertises ("MELITE_MCP_ENGINES or config").
  it('an unset MELITE_MCP_ENGINES seats the row from its own config', async () => {
    const lines = silence()
    vi.clearAllMocks()
    delete process.env['MELITE_MCP_ENGINES']
    try {
      const { fn } = await rowApply('melite-engine-mcp-row')
      const ctx = toolsCtx().ctx
      fn(ctx, { engines: ['mcp:blender'] })
      expect(lines.join('\n')).toContain('{"engines":["mcp:blender"]}')
      expect(vi.mocked(mcpEngines)).toHaveBeenCalledWith(ctx, { engines: ['mcp:blender'] })
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('an unconfigured row (no env, no config) announces OFF — never a bare seat', async () => {
    const lines = silence()
    vi.clearAllMocks()
    delete process.env['MELITE_MCP_ENGINES']
    try {
      const { fn } = await rowApply('melite-engine-mcp-row')
      fn(toolsCtx().ctx, undefined)
      expect(lines.join('\n')).toContain('mcp row OFF (no engine named')
      expect(vi.mocked(mcpEngines)).not.toHaveBeenCalled()
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('MELITE_MCP_ENGINES overrides the default list', async () => {
    const lines = silence()
    vi.clearAllMocks()
    process.env['MELITE_MCP_ENGINES'] = 'mcp:unity, mcp:blender'
    try {
      const { fn, cfg } = await rowApply('melite-engine-mcp-row')
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
    const { fn } = await rowApply('melite-engine-craft-row')
    await fn(ctx, undefined)
    expect(craftLane.calls).toEqual([{ prefer: undefined }])
    expect(listeners).toHaveLength(1)
  })

  it('names the critic explicitly (malformed routes fall back to auto)', async () => {
    craftLane.mode = 'false'
    craftLane.calls = []
    process.env['MELITE_CRITIC_ROUTE'] = 'prov/model'
    const craftApply = (await rowApply('melite-engine-craft-row')).fn
    craftApply(toolsCtx().ctx, undefined)
    expect(craftLane.calls).toEqual([{ prefer: { provider: 'prov', model: 'model' } }])
    process.env['MELITE_CRITIC_ROUTE'] = 'noslash'
    craftApply(toolsCtx().ctx, undefined)
    expect(craftLane.calls[1]).toEqual({ prefer: undefined })
  })

  it('a seated route unsubscribes and ignores later announcements', async () => {
    craftLane.mode = 'true'
    craftLane.calls = []
    const { ctx, listeners, unsubs } = toolsCtx()
    const craftApply = (await rowApply('melite-engine-craft-row')).fn
    craftApply(ctx, undefined)
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
      const craftApply = (await rowApply('melite-engine-craft-row')).fn
      craftApply(ctx, undefined)
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

  // THE LANE-AUDIT WALL (2026-09-28): cordis's duplicate-service throw
  // ('service "melite-engine-craft" has been registered at <X>') is
  // SUCCESS wearing an error's clothes — the loader double-applied the
  // row and the SECOND construction lost the race. Treated as retryable
  // it re-armed on every adapters-updated forever (11 collision lines
  // per boot on the live lane) and held every seat door in
  // estate/pending. The fix treats exactly that message as ALREADY
  // SEATED; every OTHER rejection keeps the loud-retry law above.
  it('a duplicate-service rejection is ALREADY SEATED — one line, unsubscribe, no retry', async () => {
    craftLane.mode = 'reject'
    craftLane.reason = new Error('service "melite-engine-craft" has been registered at <melite-engine-craft-row>')
    craftLane.calls = []
    const lines = silence()
    try {
      const { ctx, listeners, unsubs } = toolsCtx()
      const craftApply = (await rowApply('melite-engine-craft-row')).fn
      craftApply(ctx, undefined)
      await new Promise((r) => setTimeout(r, 20))
      const logged = lines.join('\n')
      expect(logged).toContain('craft engine: already seated at <melite-engine-craft-row> — nothing to do')
      expect(logged).not.toContain('waiting for the next adapters-updated')
      expect(unsubs).toEqual(['llm/adapters-updated'])
      // the row is DONE: a later announcement must not attempt again.
      listeners[0]?.()
      await new Promise((r) => setTimeout(r, 20))
      expect(craftLane.calls).toHaveLength(1)
      expect(lines.filter((l) => l.includes('already seated'))).toHaveLength(1)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('concurrent announcements serialize (one attempt at a time)', async () => {
    craftLane.mode = 'pending'
    craftLane.calls = []
    const { ctx, listeners } = toolsCtx()
    const craftApply = (await rowApply('melite-engine-craft-row')).fn
    craftApply(ctx, undefined)
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
    const craftApply = (await rowApply('melite-engine-craft-row')).fn
    craftApply(ctx, undefined)
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
  it('refuses LOUD without MELITE_AGENT_ROUTE (never a default brain)', async () => {
    const lines = silence()
    try {
      const agentApply = (await rowApply('melite-engine-agent-row')).fn
      agentApply(toolsCtx().ctx, undefined)
      expect(vi.mocked(agentEngine)).not.toHaveBeenCalled()
      expect(lines.join('\n')).toContain("engine 'agent' NOT seated")
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a malformed route refuses the same way', async () => {
    process.env['MELITE_AGENT_ROUTE'] = 'noslash'
    const lines = silence()
    try {
      const agentApply = (await rowApply('melite-engine-agent-row')).fn
      agentApply(toolsCtx().ctx, undefined)
      expect(vi.mocked(agentEngine)).not.toHaveBeenCalled()
      expect(lines.join('\n')).toContain("engine 'agent' NOT seated")
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('a named route seats with the spawn-injection reader', async () => {
    process.env['MELITE_AGENT_ROUTE'] = 'prov/model'
    vi.mocked(agentEngine).mockClear()
    const agentApply = (await rowApply('melite-engine-agent-row')).fn
    agentApply(toolsCtx().ctx, undefined)
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
