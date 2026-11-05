#!/usr/bin/env node
// THE COMFYUI-NODES PUSH GATE (operator 2026-11-07: "add some push
// only test that does this, to see if all of our custom comfyui
// nodes are fully commited and pushed beforehand, and that we have
// no dead comfyui extension pins for the other ones we rely on").
//
// Push-only by design: CI judges the committed tree (it cannot see
// riding-behind bytes) and the unit walls run keyless with no
// network. This gate runs at the pre-push seat, the one place both
// facts are checkable:
//
// THREE LAWS (each refusal names the pack + the law):
//   1. COMMITTED — no uncommitted, staged, or untracked bytes on the
//      custom-node planes: vendor/comfyui_extensions/ (the gitlinks
//      AND any stray file inside), .gitmodules, and the shipped
//      extension-manifest.json. A pack re-checked-out at another
//      sha without committing the gitlink shows as a dirty path
//      here: the dev box is running different bytes than the push
//      ships.
//   2. PIN TRUTH (local) — every manifest row with a vendored twin
//      pins exactly the tracked gitlink (the cold-clone wall's law,
//      restated at the push seat so a CI-bypassing push cannot ship
//      a pin split), and .gitmodules is a bijection with the
//      gitlinks (a linkless module or moduleless link dies on every
//      fresh clone).
//   3. REMOTE LIVENESS (network — the push-only face) — every pin
//      (all 28 manifest rows plus twinless vendored gitlinks like
//      melite-model-base) must exist ON ITS REMOTE: probed by
//      `git fetch --dry-run --depth=1 <url> <ref>`, which exits 0
//      only when the server can serve that exact ref (GitHub's
//      reachable-sha1-in-want). A sha that lives only in the local
//      pack's history — retracted, force-pushed away, never pushed
//      — kills every from-nothing install. No offline pass, no
//      escape hatch: a probe that cannot run is a probe that
//      refused.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The custom-node planes FACE 1 judges — a dirty porcelain line on
 *  any of them refuses the push.
 *  @returns {string[]} the plane roots, repo-relative */
export function committedPlanes() {
  return ['vendor/comfyui_extensions', '.gitmodules', 'packages/engines/comfyui-cordis/data/extension-manifest.json']
}

/** FACE 1 — judge the porcelain lines (exported for the wall).
 *  @param {string[]} dirty `git status --porcelain -z` entries
 *  @returns {string[]} refusals (empty = clean) */
export function judgeCommitted(dirty) {
  const refusals = []
  for (const line of dirty) {
    const path = line.slice(3)
    const plane = committedPlanes().find((p) => path === p || path.startsWith(`${p}/`))
    if (plane !== undefined) refusals.push(`${path}: COMMITTED — ${line.slice(0, 2).trim() || '?'} on the custom-node plane (${plane}); the dev box runs different bytes than the push ships — commit or clean it`)
  }
  return refusals
}

/** FACE 2 — judge local pin truth (exported for the wall).
 *  @param {{ links: Map<string, string>, submodules: Map<string, string>, manifest: Array<{ name: string, url: string, ref: string }> }} seats
 *  @returns {string[]} refusals (empty = clean) */
export function judgePins({ links, submodules, manifest }) {
  const refusals = []
  for (const row of manifest) {
    // gitlink keys are repo-relative paths; manifest names are bare
    // pack names — the twin lookup crosses the two spellings (a
    // bare get() here once made this law fire on nothing).
    const sha = links.get(`vendor/comfyui_extensions/${row.name}`)
    if (sha !== undefined && row.ref !== sha) refusals.push(`${row.name}: PIN-TRUTH — manifest ref ${row.ref} != vendored gitlink ${sha} (cold installs and dev boxes diverge)`)
  }
  for (const [name, sha] of links) {
    if (!submodules.has(name)) refusals.push(`${name}: PIN-TRUTH — gitlink ${sha.slice(0, 8)} with no .gitmodules entry (every fresh clone dies fetching it)`)
  }
  for (const name of submodules.keys()) {
    if (!links.has(name)) refusals.push(`${name}: PIN-TRUTH — .gitmodules entry with no tracked gitlink (the declared seat does not exist)`)
  }
  return refusals
}

/** FACE 3 — judge remote liveness over probe answers (exported for
 *  the wall; the CLI injects real network probes, tests inject
 *  fakes — the unit plane never touches the network).
 *  @param {Array<{ name: string, url: string, ref: string, why: string }>} pins
 *  @param {(url: string, ref: string) => { ok: boolean, detail: string }} probe
 *  @returns {string[]} refusals (empty = every pin is alive upstream) */
export function judgeRemotes(pins, probe) {
  const refusals = []
  for (const pin of pins) {
    const r = probe(pin.url, pin.ref)
    if (!r.ok) refusals.push(`${pin.name}: REMOTE-LIVENESS — ${pin.ref.slice(0, 12)} (${pin.why}) is not servable from ${pin.url}: ${r.detail}`)
  }
  return refusals
}

/** The full pin census: every manifest row (the packs the cards
 *  rely on) plus twinless vendored gitlinks (pip-leg twins such as
 *  melite-model-base that no manifest row names).
 *  @param {{ links: Map<string, string>, submodules: Map<string, string>, manifest: Array<{ name: string, url: string, ref: string }> }} seats
 *  @returns {Array<{ name: string, url: string, ref: string, why: string }>} deduped pins */
export function pinCensus({ links, submodules, manifest }) {
  const pins = []
  const seen = new Set()
  for (const row of manifest) {
    pins.push({ name: row.name, url: row.url, ref: row.ref, why: 'manifest row' })
    seen.add(`${row.url} ${row.ref}`)
  }
  for (const [name, sha] of links) {
    const url = submodules.get(name) ?? ''
    const key = `${url} ${sha}`
    if (seen.has(key)) continue
    pins.push({ name, url, ref: sha, why: 'vendored gitlink' })
  }
  return pins
}

function main() {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  const run = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', cwd: root, ...opts })

  // FACE 1 — committed planes. --no-renames keeps the -z parse
  // honest: rename entries arrive as two NUL-separated fields, and a
  // rename under these planes is a delete+add either way.
  const porcelain = run(['status', '--porcelain', '-z', '--no-renames', '--', ...committedPlanes()])
  const dirty = porcelain.split('\0').filter(Boolean)
  const refusals = judgeCommitted(dirty)

  // FACE 2 — local seats.
  const links = new Map()
  for (const line of run(['ls-files', '-s', '--', 'vendor/comfyui_extensions']).split('\n')) {
    const m = line.match(/^(160000) ([0-9a-f]{40}) 0\s+(.*)$/u)
    if (m !== null) links.set(m[3], m[2])
  }
  const submodules = new Map()
  for (const line of run(['config', '--file', '.gitmodules', '--list']).split('\n')) {
    const m = line.match(/^submodule\.(.*)\.url=(.*)$/u)
    if (m !== null) submodules.set(m[1], m[2])
  }
  const manifest = JSON.parse(readFileSync(join(root, 'packages/engines/comfyui-cordis/data/extension-manifest.json'), 'utf8'))
  refusals.push(...judgePins({ links, submodules, manifest }))

  // FACE 3 — remote liveness (network; bounded pool of 6).
  const pins = pinCensus({ links, submodules, manifest })
  console.error(`comfyui-push-gate: probing ${pins.length} pins (${manifest.length} manifest rows + ${pins.length - manifest.length} twinless gitlinks; ${links.size} vendored total)`)
  const answers = new Map()
  const queue = [...pins]
  const worker = async () => {
    for (;;) {
      const pin = queue.shift()
      if (pin === undefined) return
      const r = probeRemote(pin.url, pin.ref)
      answers.set(`${pin.url} ${pin.ref}`, r)
      console.error(`  ${r.ok ? 'ok  ' : 'DEAD'} ${pin.name} ${pin.ref.slice(0, 12)} (${pin.why})${r.ok ? '' : ` — ${r.detail}`}`)
    }
  }
  void Promise.all(Array.from({ length: 6 }, worker)).then(() => {
    refusals.push(...judgeRemotes(pins, (url, ref) => answers.get(`${url} ${ref}`) ?? { ok: false, detail: 'probe never ran' }))
    if (refusals.length > 0) {
      console.error('comfyui-push-gate: REFUSED — the custom-node fleet is not fully committed and pushed:')
      for (const r of refusals) console.error(`  ${r}`)
      process.exit(1)
    }
    console.error('comfyui-push-gate: every pin committed locally and alive on its remote')
  })
}

/** The real network probe — exit 0 means the server can serve that
 *  exact ref. Each probe runs in its own scratch repo: concurrent
 *  fetches in a shared .git collide on .git/shallow, and probing
 *  from the melite root would write FETCH_HEAD into the fleet's own
 *  git dir. One retry: a dropped connection is a flake, not a dead
 *  pin — the second failure is the verdict.
 *  @param {string} url @param {string} ref
 *  @returns {{ ok: boolean, detail: string }} */
function probeRemote(url, ref) {
  let detail = 'probe failed'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const dir = mkdtempSync(join(tmpdir(), 'comfyui-pin-probe-'))
    try {
      execFileSync('git', ['init', '-q', '.'], { encoding: 'utf8', cwd: dir })
      execFileSync('git', ['fetch', '--dry-run', '--depth=1', url, ref], { encoding: 'utf8', timeout: 45000, cwd: dir, stdio: ['ignore', 'ignore', 'pipe'] })
      return { ok: true, detail: '' }
    } catch (err) {
      const stderr = String(err.stderr ?? '')
      detail = stderr.split('\n').filter(Boolean).pop() ?? String(err.message ?? 'probe failed')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  return { ok: false, detail }
}

if (process.argv[1] && process.argv[1].endsWith('comfyui-push-gate.mjs')) main()
