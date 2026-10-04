/**
 * extension-upstream.e2e.ts — THE UPSTREAM VERIFICATION GATE (the
 * nomenclature ruin the operator named, 2026-10-15): the estate is
 * infrastructure-as-code over third-party ComfyUI extensions, and
 * every offline wall proves only TREE-INTERNAL agreement — nothing
 * watched that the declared upstreams still EXIST, that each pinned
 * sha still RESOLVES on its remote, or that the pinned engine core
 * still SERVES the classes core_node_types claims. A renamed repo,
 * a force-pushed branch, a retracted commit: each ruins a fresh
 * provision silently. This gate answers upstream, at the doors the
 * provisioner itself uses (git ls-remote; GitHub's public REST and
 * raw content at the pinned core sha).
 *
 * Gated on the network being alive (skip, never false-fail, when
 * github.com is unreachable — keyless CI stays green; the managed
 * box runs this on every estate round).
 */
import { execFile } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FACTS = join(ROOT, 'packages/engines/comfyui-cordis/data/model-facts.json')
const CORE_PIN = join(ROOT, 'infra/comfyui/core.pin')
const CORE_URL = 'https://github.com/comfyanonymous/ComfyUI.git'

// TOP-LEVEL AWAIT (the lane-defaults law): describe.skipIf evaluates
// at COLLECTION time — a later probe would silently skip against a
// live network.
const netUp = await fetch('https://github.com', {
  method: 'HEAD',
  signal: AbortSignal.timeout(8000),
}).then((r) => r.ok).catch(() => false)

interface Row { name: string; file: string; url?: string; ref?: string }

/** Every extension row across the manifests (the census wall's own
 *  walk, restated: walls and e2e answer different questions and do
 *  not import each other). */
function manifestRows(dir: string, out: Row[] = []): Row[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'lib' || entry === 'dist') continue
      manifestRows(full, out)
    } else if (entry === 'nodes.yaml' || entry === 'extensions.yaml') {
      const text = readFileSync(full, 'utf8')
      for (const m of text.matchAll(/^[ \t]*-[ \t]+name:[ \t]*([^\s#]+)([\s\S]*?)(?=^[ \t]*-[ \t]+name:|(?![\s\S]))/gmu)) {
        const url = /^[ \t]*url:[ \t]*(\S+)/mu.exec(m[2] ?? '')
        const ref = /^[ \t]*ref:[ \t]*(\S+)/mu.exec(m[2] ?? '')
        out.push({ name: m[1]!, file: full.slice(ROOT.length + 1), url: url?.[1], ref: ref?.[1] })
      }
    }
  }
  return out
}

/** Run thunks with bounded parallelism (git spawns and API calls
 * share the host; 4 keeps the gate quick without flooding). Each
 * worker AWAITS its thunk — an un-awaited fire would let the
 * caller's assert race ahead of the probes (a vacuous pass). */
async function pooled<T>(items: readonly T[], limit: number, thunk: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await thunk(items[next++]!)
  })
  await Promise.all(workers)
}

/** The pinned sha must resolve on its remote: GitHub urls prove it
 * through the commit's .patch door, the WEB tier (the REST API's
 * 60/hr unauthenticated budget rate-limits the estate's own gate
 * cadence, the 429s this spec's mutation runs proved); any other
 * host falls back to ls-remote's ref list. */
async function refResolves(url: string, ref: string): Promise<string | null> {
  const gh = /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/u.exec(url)
  if (gh) {
    const res = await fetch(`https://github.com/${gh[1]}/${gh[2]}/commit/${ref}.patch`, {
      signal: AbortSignal.timeout(15000),
    })
    return res.ok ? null : `pin ${ref} does not resolve at ${url} (HTTP ${res.status})`
  }
  const { stdout } = await run('git', ['ls-remote', url], { timeout: 30000 })
  return stdout.includes(ref) ? null : `pin ${ref} not advertised by ${url}`
}

describe.skipIf(!netUp)('THE UPSTREAM VERIFICATION GATE (extensions as code)', () => {
  it('every declared row answers upstream and its pin resolves on the remote', async () => {
    const rows = manifestRows(join(ROOT, 'packages')).filter((r) => r.url !== undefined)
    expect(rows.length, 'no manifest rows found to verify').toBeGreaterThan(0)
    const failures: string[] = []
    await pooled(rows, 4, async (row) => {
      try {
        await run('git', ['ls-remote', row.url!, 'HEAD'], { timeout: 30000 })
      } catch (err) {
        failures.push(`${row.name} (${row.file}): upstream ${row.url} does not answer — ${(err as Error).message}`)
        return
      }
      if (row.ref !== undefined) {
        const bad = await refResolves(row.url!, row.ref).catch((err: Error) => `probe failed: ${err.message}`)
        if (bad !== null) failures.push(`${row.name} (${row.file}): ${bad}`)
      }
    })
    expect(failures.sort(), 'these declared upstreams are dead or their pins do not resolve — fresh provisions will ruin').toEqual([])
  }, 180_000)

  it('the pinned engine core serves every core_node_types class (the core-served proof)', async () => {
    const pin = readFileSync(CORE_PIN, 'utf8').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) ?? ''
    expect(pin, 'no core.pin in infra/comfyui — the core-served proof has no sha to prove against').toMatch(/^[0-9a-f]{40}$/u)
    const facts = JSON.parse(readFileSync(FACTS, 'utf8')) as { core_node_types?: Record<string, readonly string[]> }
    const files = facts.core_node_types ?? {}
    expect(Object.keys(files).length, 'core_node_types is empty — the phantom-pack cure left nothing core-served?').toBeGreaterThan(0)
    const failures: string[] = []
    await pooled(Object.entries(files), 2, async ([file, classes]) => {
      const res = await fetch(`https://raw.githubusercontent.com/comfyanonymous/ComfyUI/${pin}/${file}`, {
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) {
        failures.push(`${file}: absent from the pinned core ${pin.slice(0, 12)} (HTTP ${res.status})`)
        return
      }
      const text = await res.text()
      for (const cls of classes) {
        if (!new RegExp(`^class ${cls}\\b`, 'mu').test(text)) {
          failures.push(`${file}: class ${cls} not defined at the pinned core ${pin.slice(0, 12)}`)
        }
      }
    })
    expect(failures.sort(), 'these core-served claims are false at the pinned engine — families gated on them are broken').toEqual([])
  }, 120_000)
})
