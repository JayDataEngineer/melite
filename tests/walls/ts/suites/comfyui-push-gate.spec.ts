import { describe, expect, it } from 'vitest'
import {
  committedPlanes,
  judgeCommitted,
  judgePins,
  judgeRemotes,
  pinCensus,
} from '../../../../tools/comfyui-push-gate.mjs'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// THE COMFYUI-NODES PUSH GATE (operator 2026-11-07: "add some push
// only test that does this, to see if all of our custom comfyui
// nodes are fully commited and pushed beforehand, and that we have
// no dead comfyui extension pins for the other ones we rely on").
//
// The gate's CLI seat is pre-push ONLY — CI judges the committed
// tree (it cannot see riding-behind bytes) and the unit plane runs
// keyless with no network. This wall judges the gate's three LAWS
// as pure functions (the staged-trash-gate pattern): every refusal
// class fires on its own arm, and the real-tree arm pins the census
// floors so a silent rot of the manifest or the vendor tree reds
// here long before push time.
//
// The wall does NOT probe the network (the keyless law): FACE 3 is
// judged over injected probe answers; the live probe's own receipt
// is the operator-visible pre-push run.

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')
const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, 'packages', 'engines', 'comfyui-cordis', 'data', 'extension-manifest.json'), 'utf8'),
) as Array<{ name: string; url: string; ref: string }>

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const C = 'c'.repeat(40)

/** The real local seats, read the way the CLI reads them (git
 *  plumbing is read-only and keyless — allowed in a wall arm).
 *  Both maps key by full repo-relative path. */
function readSeats(): { links: Map<string, string>; submodules: Map<string, string> } {
  const links = new Map<string, string>()
  for (const line of execFileSync('git', ['ls-files', '-s', '--', 'vendor/comfyui_extensions'], {
    encoding: 'utf8',
    cwd: ROOT,
  }).split('\n')) {
    const m = line.match(/^(160000) ([0-9a-f]{40}) 0\s+(.*)$/u)
    if (m !== null) links.set(m[3], m[2])
  }
  const submodules = new Map<string, string>()
  for (const line of execFileSync('git', ['config', '--file', '.gitmodules', '--list'], {
    encoding: 'utf8',
    cwd: ROOT,
  }).split('\n')) {
    const m = line.match(/^submodule\.(.*)\.url=(.*)$/u)
    if (m !== null) submodules.set(m[1], m[2])
  }
  return { links, submodules }
}

describe('FACE 1 — the custom-node planes are committed (judgeCommitted)', () => {
  it('a modified gitlink under vendor/comfyui_extensions refuses (the dev box runs different bytes than the push ships)', () => {
    const refusals = judgeCommitted([' M vendor/comfyui_extensions/melite-poser-nodes'])
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('melite-poser-nodes')
    expect(refusals[0]).toContain('COMMITTED')
  })

  it('an untracked stray file inside a vendored pack refuses (bytes riding behind the gitlink)', () => {
    const refusals = judgeCommitted(['?? vendor/comfyui_extensions/melite-poser-nodes/local-edit.py'])
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('local-edit.py')
  })

  it('a staged-but-uncommitted manifest or .gitmodules refuses (pre-push ships commits, not the index)', () => {
    const refusals = judgeCommitted([
      'M  packages/engines/comfyui-cordis/data/extension-manifest.json',
      ' M .gitmodules',
    ])
    expect(refusals).toHaveLength(2)
  })

  it('dirty paths OUTSIDE the planes are not this gate\'s to judge', () => {
    expect(judgeCommitted([' M packages/models/moss-image/src/actions.ts', '?? dev_docs/audit.md'])).toEqual([])
  })

  it('the real planes cover the vendor tree, the submodule bookkeeping, and the shipped manifest', () => {
    expect(committedPlanes()).toEqual([
      'vendor/comfyui_extensions',
      '.gitmodules',
      'packages/engines/comfyui-cordis/data/extension-manifest.json',
    ])
  })
})

describe('FACE 2 — local pin truth (judgePins)', () => {
  it('a manifest row pinning a different sha than its vendored twin refuses (cold installs and dev boxes diverge)', () => {
    // Seats keyed the production way — gitlink keys are full paths.
    // This arm is the regression proof for the twin lookup: a bare
    // links.get(row.name) once matched nothing and silenced this
    // law for every real pack.
    const refusals = judgePins({
      links: new Map([['vendor/comfyui_extensions/melite-poser-nodes', A]]),
      submodules: new Map([['vendor/comfyui_extensions/melite-poser-nodes', 'u']]),
      manifest: [{ name: 'melite-poser-nodes', url: 'u', ref: B }],
    })
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('PIN-TRUTH')
    expect(refusals[0]).toContain('manifest ref')
  })

  it('a manifest row with no vendored twin is legal (Manager clones the remote at ref — the pip-leg shape)', () => {
    expect(
      judgePins({
        links: new Map(),
        submodules: new Map(),
        manifest: [{ name: 'ComfyUI-GGUF', url: 'u', ref: A }],
      }),
    ).toEqual([])
  })

  it('a gitlink with no .gitmodules entry refuses (every fresh clone dies fetching it)', () => {
    const refusals = judgePins({
      links: new Map([['vendor/comfyui_extensions/melite-model-base', A]]),
      submodules: new Map(),
      manifest: [],
    })
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('no .gitmodules entry')
  })

  it('a .gitmodules entry with no tracked gitlink refuses (the declared seat does not exist)', () => {
    const refusals = judgePins({
      links: new Map(),
      submodules: new Map([['vendor/comfyui_extensions/ghost-pack', 'u']]),
      manifest: [],
    })
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('no tracked gitlink')
  })

  it('the real tree agrees: every vendored twin pins its gitlink and .gitmodules is a bijection', () => {
    const { links, submodules } = readSeats()
    expect(links.size, 'the vendored gitlink census rotted below its floor').toBeGreaterThanOrEqual(13)
    expect(MANIFEST.length, 'the manifest census rotted below its floor').toBeGreaterThanOrEqual(28)
    expect(judgePins({ links, submodules, manifest: MANIFEST })).toEqual([])
  })
})

describe('FACE 3 — remote liveness (judgeRemotes over injected probes)', () => {
  it('a dead URL refuses with the probe\'s own detail', () => {
    const refusals = judgeRemotes(
      [{ name: 'ComfyUI-GGUF', url: 'u', ref: A, why: 'manifest row' }],
      () => ({ ok: false, detail: 'fatal: could not read from remote repository' }),
    )
    expect(refusals).toHaveLength(1)
    expect(refusals[0]).toContain('REMOTE-LIVENESS')
    expect(refusals[0]).toContain('could not read from remote repository')
  })

  it('a sha the remote cannot serve refuses (the retracted-pin class: alive locally, dead upstream)', () => {
    const refusals = judgeRemotes(
      [{ name: 'melite-poser-nodes', url: 'u', ref: A, why: 'manifest row' }],
      () => ({ ok: false, detail: 'fatal: remote error: upload-pack: not our ref' }),
    )
    expect(refusals[0]).toContain('not our ref')
  })

  it('a probe that never ran refuses (no silent skip — absence is not liveness)', () => {
    const refusals = judgeRemotes(
      [{ name: 'p', url: 'u', ref: A, why: 'manifest row' }],
      () => ({ ok: false, detail: '' }),
    )
    expect(refusals).toHaveLength(1)
  })

  it('every pin alive refuses nothing', () => {
    expect(
      judgeRemotes(
        [
          { name: 'p1', url: 'u1', ref: A, why: 'manifest row' },
          { name: 'p2', url: 'u2', ref: B, why: 'vendored gitlink' },
        ],
        () => ({ ok: true, detail: '' }),
      ),
    ).toEqual([])
  })
})

describe('the pin census (pinCensus)', () => {
  it('covers every manifest row plus twinless vendored gitlinks, deduped by url+ref', () => {
    const pins = pinCensus({
      links: new Map([
        ['vendor/comfyui_extensions/melite-model-base', C],
        ['vendor/comfyui_extensions/melite-poser-nodes', A],
      ]),
      submodules: new Map([
        ['vendor/comfyui_extensions/melite-model-base', 'url-model-base'],
        ['vendor/comfyui_extensions/melite-poser-nodes', 'url-poser'],
      ]),
      manifest: [{ name: 'melite-poser-nodes', url: 'url-poser', ref: A }],
    })
    // poser is deduped (manifest row == gitlink); model-base rides
    // as the twinless gitlink; nothing else.
    expect(pins.map((p) => p.name)).toEqual(['melite-poser-nodes', 'vendor/comfyui_extensions/melite-model-base'])
    expect(pins[1].why).toBe('vendored gitlink')
  })

  it('the real census floors: every manifest row and every vendored pack rides a probe at push', () => {
    const { links, submodules } = readSeats()
    const pins = pinCensus({ links, submodules, manifest: MANIFEST })
    const byName = new Set(pins.map((p) => p.name.replace('vendor/comfyui_extensions/', '')))
    // Every pack the cards rely on is probed, and every vendored
    // pack is probed (twin rows and gitlinks dedupe to one probe —
    // the twinless seats like melite-model-base ride on their own).
    for (const row of MANIFEST) expect(byName.has(row.name), `census dropped the manifest row ${row.name}`).toBe(true)
    for (const path of links.keys()) {
      const name = path.replace('vendor/comfyui_extensions/', '')
      expect(byName.has(name), `census dropped the vendored pack ${name}`).toBe(true)
    }
    expect(pins.length).toBeGreaterThanOrEqual(MANIFEST.length + 2)
  })
})
