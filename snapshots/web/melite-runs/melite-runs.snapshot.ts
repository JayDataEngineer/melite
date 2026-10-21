/**
 * Web snapshot scenario (DSH tier 7): the /melite-runs command's
 * USER-VISIBLE contract, replayed WITHOUT a booted host — the exact
 * strings the operator's composer serves and the door names the
 * agent's tool list gains. The unit spec
 * (packages/harness/melite-tools/test/index.spec.ts:257) owns the
 * MECHANICS (re-seat, dispose, no duplicate seats); this scenario
 * owns the product face: the command row, the four handler texts
 * verbatim, and the boot default (browser lanes start with the run
 * doors ABSENT — the user's Run press owns runs until /melite-runs
 * on).
 *
 * THE REPLAY LAW (cards-tab's): borrows the canonical session from
 * snapshots/session/hello, reads the owner's selected parent
 * generation read-only, CI forces DSH_SNAPSHOT=replay. Keyless —
 * the handler is a pure mount against a commands-registry fake,
 * the same seam dsh's inject('commands') fires on browser lanes.
 */
import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import { apply, HEADLESS_TOOL_NAMES } from '../../../packages/harness/melite-tools/src/index.ts'
import type { Context } from '@deepseek-ai/cordis'

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsRoot = resolve(here, '..', '..')

/** dsh-inject semantics: the callback fires only where a commands
 * registry is composed — the browser lane's surface. */
interface CmdDef {
  name: string
  description: string
  input: { hint: string }
  handler: (inv: { rawInput: string }) => { kind: 'success' | 'error'; text: string }
}

function mountBrowserLane(): { cmd: CmdDef; toolNames: () => string[] } {
  const registered: Array<{ name: string }> = []
  let commandsCb: ((ctx: { commands: { register(d: CmdDef): () => void } }) => void) | undefined
  const ctx = {
    logger: { info: () => {}, warn: () => {} },
    effect: (fn: () => void) => { fn(); return () => {} },
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
  void apply(ctx as unknown as Context)
  if (commandsCb === undefined) throw new Error('apply never injected on commands — the command cannot register')
  const defs: CmdDef[] = []
  commandsCb({ commands: { register: (d) => { defs.push(d); return () => {} } } })
  const [cmd] = defs
  if (cmd === undefined) throw new Error('the commands registry seated but melite-runs never registered')
  return { cmd, toolNames: () => registered.map((r) => r.name) }
}

const savedEnv: Record<string, string | undefined> = {}
function clearEnv(k: string): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k]
  delete process.env[k]
}
afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
    delete savedEnv[k]
  }
})

describe('web melite-runs (the AI-run toggle face, keyless)', () => {
  it('replays against the borrowed canonical session', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.ok(manifest.borrows, 'web scenario without a local fixture must declare borrows')
    const parent = selectGeneration(join(snapshotsRoot, manifest.borrows!), 'parent')
    assert.ok(parent.rows.length > 0, 'the borrowed session carries rows')
  })

  it('serves the command row the composer lists', () => {
    clearEnv('MELITE_HEADLESS')
    clearEnv('MELITE_ADHOC')
    clearEnv('MELITE_CARD_TOOLS')
    const { cmd } = mountBrowserLane()
    assert.equal(cmd.name, 'melite-runs', 'the / menu row name')
    assert.equal(
      cmd.description,
      'Toggle whether the AI can start runs (melite_flow) or runs wait for the user\u2019s Run press',
      'the row description names both worlds',
    )
    assert.deepEqual(cmd.input, { hint: '[on|off]' }, 'the input hint')
  })

  it('browser boot default: the run doors are ABSENT (runs start at the user\u2019s Run press)', () => {
    clearEnv('MELITE_HEADLESS')
    clearEnv('MELITE_ADHOC')
    clearEnv('MELITE_CARD_TOOLS')
    const { toolNames } = mountBrowserLane()
    for (const h of HEADLESS_TOOL_NAMES) {
      assert.ok(!toolNames().includes(h), `run door ${h} leaked at browser boot`)
    }
  })

  it('on: the exact success text and both doors live in the agent\u2019s tool list', () => {
    clearEnv('MELITE_HEADLESS')
    clearEnv('MELITE_ADHOC')
    clearEnv('MELITE_CARD_TOOLS')
    const { cmd, toolNames } = mountBrowserLane()
    const seated = cmd.handler({ rawInput: 'on' })
    assert.equal(seated.kind, 'success')
    assert.equal(
      seated.text,
      'AI runs ON — melite_flow + run_status + the estate doors (melite_view, melite_read, comfy_manage, skills, ledger) seated; the next model request sees them (a boot-fixed catalog sees them next session). Recorded — the delegation survives lane reloads.',
      'the ON text verbatim',
    )
    assert.deepEqual(
      HEADLESS_TOOL_NAMES.filter((h) => !toolNames().includes(h)),
      [],
      'every run door seated by on',
    )
  })

  it('off and bare read: the OFF text verbatim, doors withdrawn', () => {
    clearEnv('MELITE_HEADLESS')
    clearEnv('MELITE_ADHOC')
    clearEnv('MELITE_CARD_TOOLS')
    const { cmd, toolNames } = mountBrowserLane()
    cmd.handler({ rawInput: 'on' })
    const off = cmd.handler({ rawInput: 'off' })
    assert.equal(off.kind, 'success')
    assert.equal(off.text, 'AI runs OFF — runs start at the user\u2019s Run press again. Recorded.', 'the OFF text verbatim')
    for (const h of HEADLESS_TOOL_NAMES) {
      assert.ok(!toolNames().includes(h), `run door ${h} never withdrawn by off`)
    }
    const read = cmd.handler({ rawInput: '' })
    assert.equal(read.kind, 'success')
    assert.equal(read.text, 'AI runs OFF — runs start at the user\u2019s Run press again. Recorded.', 'the bare read states the current state')
  })

  it('unknown argument: the refusal text verbatim', () => {
    clearEnv('MELITE_HEADLESS')
    clearEnv('MELITE_ADHOC')
    clearEnv('MELITE_CARD_TOOLS')
    const { cmd } = mountBrowserLane()
    const bad = cmd.handler({ rawInput: 'sideways' })
    assert.equal(bad.kind, 'error')
    assert.equal(
      bad.text,
      'unknown argument "sideways" (use on, off, or no argument to read the state)',
      'the refusal names the argument and the grammar',
    )
  })
})
