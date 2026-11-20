import assert from 'node:assert/strict'
import { existsSync as exists, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { pressBudgetMs } from '../../../../packages/harness/melite-tools/src/tools/melite-flow.ts'
import { LifecycleLatch } from '../../../../packages/harness/estate-queue/src/lifecycleLatch.ts'

// THE CORDIS CONFORMANCE CURES (the 2026-11-20 three-audit sweep —
// refs-drift, conventions, cordis-waterfall — reports under
// dev_docs/audits/): the sweep graded the harness layer B and named
// four undocumented divergences plus one NEW hardcoded-tunable drift
// the bench-window cure itself introduced. These arms judge each
// cure's own law so a regression reds here, at its own path:
//
//   ARM 1 — every harness plugin ships a Config schema (cordis-tutorial
//     05-config.md: config is declared, validated before apply,
//     settable from cordis.yml; a seat with config fields but no
//     schema silently accepts a typo'd cordis.yml row as absent).
//   ARM 2 — the lifecycle latch is INSTANCE state (the retired
//     module-global holders Map was the exact hazard melite-tools
//     cured in itself; two seats must never share a latch silently).
//   ARM 3 — the cordis pin grammar is the upstream tilde (dsh's own
//     packages pin workspace:~, which PUBLISHES as ~x.y.z; a caret
//     reaches across minors the vendored surface was never composed
//     against).
//   ARM 4 — the press window's tunables are Config fields, not
//     constants (a DEFAULT_* constant is not configurability; the
//     schema defaults keep D-7's law byte-for-byte when cordis.yml
//     is silent).

const REPO = join(import.meta.dirname, '..', '..', '..', '..')

describe('THE CORDIS CONFORMANCE CURES (the 2026-11-20 sweep: config schema, latch ownership, pin grammar, press tunables)', () => {
  it('ARM 1 THE CONFIG LAW: every harness plugin entry exports a Schemastery Config', async () => {
    const queue = await import('../../../../packages/harness/estate-queue/src/index.ts')
    const tools = await import('../../../../packages/harness/melite-tools/src/index.ts')
    type SchemaFace = { (value: unknown): Record<string, unknown>; type: string; dict: Record<string, { meta?: { default?: unknown } }> }
    const faces: Array<[string, SchemaFace]> = [
      ['estate-queue', (queue as unknown as { Config: SchemaFace }).Config],
      ['melite-tools', (tools as unknown as { Config: SchemaFace }).Config],
    ]
    for (const [name, cfg] of faces) {
      assert.ok(cfg !== undefined, `${name}: the plugin entry must export Config (05-config.md — a config field with no schema accepts a typo'd cordis.yml row silently)`)
      assert.equal(typeof cfg, 'function', `${name}: a Schemastery schema is callable (resolve) — a plain object here is not a schema`)
      assert.equal(cfg.type, 'object', `${name}: the Config schema must be an object schema`)
    }
    // The estate-queue schema mirrors QueueConfig's four declared
    // fields — a field added to QueueConfig without its schema row
    // re-opens the silent-absence hole this arm cured.
    for (const field of ['repoRoot', 'stateRoot', 'stateRoots', 'executeCeilMs']) {
      assert.ok(field in faces[0][1].dict, `estate-queue: Config must carry the ${field} row QueueConfig declares`)
    }
    // The press tunables are schema rows with the D-7 defaults, and
    // resolving an absent config yields them (cordis.yml silent =
    // the pre-config law, byte-for-byte).
    const dict = faces[1][1].dict
    assert.equal(dict['pressBaseMs']?.meta?.default, 110_000, 'pressBaseMs default must stay D-7\u2019s 110000')
    assert.equal(dict['pressStageShareMs']?.meta?.default, 90_000, 'pressStageShareMs default must stay the bench law\u2019s 90000')
    assert.equal(dict['pressCeilingMs']?.meta?.default, 900_000, 'pressCeilingMs default must stay the observation budget\u2019s 900000')
    const resolved = faces[1][1]({})
    assert.equal(resolved['pressBaseMs'], 110_000, 'an absent cordis.yml resolves the D-7 base')
    assert.equal(resolved['pressCeilingMs'], 900_000, 'an absent cordis.yml resolves the observation ceiling')
  })

  it('ARM 2 LATCH OWNERSHIP: the latch is instance state — two seats never share a hold', () => {
    // The structural half: the module exports the class, never bare
    // functions over a module-global Map (the retired shape).
    const seatA = new LifecycleLatch()
    const seatB = new LifecycleLatch()
    const release = seatA.hold('restart')
    try {
      assert.equal(seatA.inFlight(), 'restart')
      assert.equal(seatB.inFlight(), null, 'seat B never sees seat A\u2019s hold — ambient state is the retired hazard')
    } finally {
      release()
    }
    // The behavioral half lives in the package suite
    // (manage-lifecycle-latch.spec.ts: the manage door\u2019s hold
    // refuses the press through the SHARED instance — production
    // threads ctx.queue.lifecycleLatch into both planes).
  })

  it('ARM 3 THE PIN GRAMMAR: every live cordis pin rides the tilde', () => {
    const files = [join(REPO, 'package.json')]
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'dist') continue
        const p = join(dir, entry.name)
        walk(p)
        const pkg = join(p, 'package.json')
        if (exists(pkg)) files.push(pkg)
      }
    }
    walk(join(REPO, 'packages'))
    walk(join(REPO, 'vendor'))
    let pins = 0
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const m of text.matchAll(/"@deepseek-ai\/cordis":\s*"([^"]+)"/g)) {
        pins += 1
        assert.match(m[1] as string, /^~/, `${f}: the cordis pin ${m[1]} must use upstream\u2019s tilde grammar (workspace:~ publishes as ~x.y.z — a caret reaches minors the vendored surface was never composed against)`)
      }
    }
    assert.ok(pins > 50, `the sweep must cover the whole pin fleet (found ${pins})`)
  })

  it('ARM 4 THE PRESS TUNABLES: the Config window overrides the constants; absent rows keep D-7 byte-for-byte', () => {
    assert.equal(pressBudgetMs(1), 110_000, 'absent config: a single pressed stage keeps D-7\u2019s exact window')
    assert.equal(pressBudgetMs(9), 830_000, 'absent config: the bench law\u2019s 8-stage share rides')
    assert.equal(pressBudgetMs(10), 900_000, 'absent config: the ceiling holds')
    // A cordis.yml row overrides its stage of the window — the
    // constant is the DEFAULT, never the law.
    assert.equal(pressBudgetMs(1, { baseMs: 60_000 }), 60_000, 'a configured base overrides D-7\u2019s default base')
    assert.equal(pressBudgetMs(3, { stageShareMs: 30_000 }), 170_000, 'a configured share rides (110000 + 2\u00d730000)')
    assert.equal(pressBudgetMs(3, { baseMs: 100_000, ceilingMs: 150_000 }), 150_000, 'a configured ceiling clamps the scaled window')
  })
})
