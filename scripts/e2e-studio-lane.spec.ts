/**
 * e2e-studio-lane.spec.ts — repository script spec (DSH tier 1
 * covers scripts/**.spec.ts): the browser-wall CI seat's own LAWS
 * (roadmap §9, the fresh-checkout repair of 2026-09-25). Hermetic
 * and instant — no host boot, no playwright, no engine: the skip
 * laws, the REQUIRE mode, the tracked-seed preference, and the
 * seed's portability are proven against the script text and stub
 * environments.
 *
 * What is NOT walled here: the lane's green run (that is the
 * e2e lane itself, `pnpm run test:e2e:studio`).
 */
import { describe, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'scripts', 'e2e-studio-lane.sh')
const SEED = join(ROOT, 'packages', 'web', 'melite-card-view', 'e2e', 'profile-seed')
const text = readFileSync(SCRIPT, 'utf8')

function runLane(env: Record<string, string>, expectFail = false): string {
  // A STUB PATH: nothing on it resolves (no dsh, no pnpm, no curl)
  // except bash builtins — the skip laws fire before any boot.
  try {
    return execFileSync('/bin/bash', [SCRIPT], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString()
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; status?: number }
    const out = `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`
    if (!expectFail) throw new Error(`lane failed unexpectedly:\n${out}`)
    assert.equal(err.status, 1, `REQUIRED refusal must exit 1, got ${err.status}:\n${out}`)
    return out
  }
}

describe('the browser-wall CI seat (scripts/e2e-studio-lane.sh)', () => {
  it('THE REQUIRE MODE: a missing prerequisite refuses loudly instead of self-skipping', () => {
    // no dsh binary on a PATH of stubs only → the skip law fires;
    // REQUIRE turns it into exit 1 naming the prerequisite
    const stubs = mkdtempSync(join(tmpdir(), 'lane-stubs-'))
    const out = runLane({ E2E_STUDIO_REQUIRE: '1', PATH: stubs, DSH_BIN: 'dsh-absent' }, true)
    assert.match(out, /REQUIRED prerequisite missing: no dsh binary on PATH/)
    assert.match(out, /E2E_STUDIO_REQUIRE=1 refuses the skip/)
  })

  it('the same prerequisite self-skips (exit 0, never a fake red) when not REQUIRED', () => {
    const stubs = mkdtempSync(join(tmpdir(), 'lane-stubs-'))
    const out = runLane({ PATH: stubs, DSH_BIN: 'dsh-absent' })
    assert.match(out, /SKIP \(exit 0\)/)
  })

  it('THE TRACKED SEED: committed, portable, dead-link-free — the fresh-checkout floor', () => {
    // the seed is committed (tracked files, no node_modules baggage)
    const pkgPath = join(SEED, 'package.json')
    assert.ok(existsSync(pkgPath), 'the tracked seed exists')
    assert.ok(existsSync(join(SEED, 'cordis.yml')), 'the seed carries the empty entry list')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies: Record<string, string>
      dsh?: { profile?: { bundles?: string[] } }
    }
    // every link: is RELATIVE (portable — no machine paths in the tree)
    const links = Object.entries(pkg.dependencies).filter(([, v]) => v.startsWith('link:'))
    assert.ok(links.length > 40, `the seed links the workspace (${links.length} deps)`)
    for (const [name, ref] of links) {
      assert.ok(!ref.startsWith('link:/'), `${name} must be relative, got ${ref}`)
      assert.ok(existsSync(join(SEED, ref.slice(5))), `${name} target must resolve: ${ref}`)
    }
    // the bundle list resolves through the same deps
    const bundles = pkg.dsh?.profile?.bundles ?? []
    assert.ok(bundles.length >= 10, 'the bundle list rides the seed')
    // workspace bundles ride link: dep rows; the @deepseek-ai/* host
    // bundles resolve from the dsh installation itself (no dep row)
    for (const b of bundles) {
      if (b.startsWith('@melite')) assert.ok(pkg.dependencies[b], `bundle ${b} has a dep row`)
    }
  })

  it('the lane script boots the TRACKED seed only, and rewrites links at boot', () => {
    // THE SEAT'S SEED IS THE TRACKED SEED (2026-10-12, the moss-404
    // lesson): the runtime dev profile arms the G2 hot door through
    // cordis.patch.yml — its patch watcher can mount→dispose→remount
    // the row mid-run and the every-card wall boards a card the
    // estate then un-serves under it (form-spec 404s land as page
    // errors; the defs refresh blanks neighbor axes). A wall seat
    // asserts STABLE serving: committed seed-only profile, never the
    // runtime one. Operator pins ride settings.yaml, not the profile.
    assert.doesNotMatch(text, /PROFILE_SRC/, 'no runtime-profile preference remains')
    assert.match(text, /if \[ -d "\$TRACKED_SEED" \]; then\n\s+SEED_DIR="\$TRACKED_SEED"/)
    assert.match(text, /os\.path\.isabs\(ref\[5:\]\)/, 'the boot rewrites relative links to machine-absolute')
    // the workspace row is REPO_ROOT-derived, never a machine hardcode
    assert.doesNotMatch(text, /"path": "\/home\//, 'no absolute machine path in the workspace seed')
    assert.match(text, /__REPO_ROOT__/)
  })

  it('the CI seat wires the lane in REQUIRE mode (a self-skip can never green CI)', () => {
    const ci = readFileSync(join(ROOT, '.github', 'workflows', 'tests.yml'), 'utf8')
    assert.match(ci, /E2E_STUDIO_REQUIRE=1/, 'the CI step runs the lane with REQUIRE')
  })
})
