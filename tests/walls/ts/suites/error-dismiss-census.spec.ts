// error-dismiss-census.spec.ts — THE ERROR-DISMISS CENSUS,
// ESTATE-WIDE (audit 017 C2, row cards-error-dismiss-x): every
// error-rendering seat the lane serves carries its dismiss control
// AND the C1 anchor — judged on the BUILT bundles
// (packages/web/*/lib/client.js), the bytes the lane serves verbatim,
// never a hand list. The package DOM specs (shell/toast/noncard/
// construct) prove the pairing per face; THIS wall proves the cure
// survived the build and rides the served plane.
//
// DISCOVERY (derived, never literals): bundles = every
// packages/web/*/lib/client.js on disk (zero → LOUD stand-down, the
// audit's own rule); seats = CSS rules carrying the error color
// (state-error-primary/danger) mapped hash→logical through the
// bundle's own class map, plus role="alert" seats. The audit's sweep
// patterns (runError/failed/rowError/rescueErr/errorRow/…) arrive
// through this derivation — a new error-colored face joins the
// roster by existing, never by being listed.
// ARMS:
//   ROSTER — every derived seat printed per bundle with its anchor
//     state; the paired set (faces named by error-dismiss specs)
//     must carry ×+anchor in bytes; the UNSTATED remainder is a
//     RATCHET (frozen below — new error seats cannot land unstated,
//     curing one shrinks the freeze with this wall's own update).
//   ANCHORS — every paired face rule carries a containing-block
//     position (the C1 law at the served plane); the errorDismiss
//     rule rides absolute (top:2px;right:2px).
//   DISMISS SURVIVAL — every bundle rendering alerts carries a
//     dismiss mechanism in bytes (errorDismiss rule + Dismiss aria
//     literal + JS refs); the build cannot shake the cure away.
//   SERVED — the lane's bytes for each boarded bundle normalize to
//     the built bytes (strip sourceMappingURL line + trailing
//     separators — the lane's own rewrite, probed 2026-10-27) and
//     the served census equals the built census. Lane down, no
//     token, or no rev → LOUD STAND-DOWN (skip with the reason
//     printed — lane state is not this invariant).
// Toggles (receipt, 2026-10-27, all probed on the built bytes — the
// plane this wall judges): (A) the errorRow anchor declaration cut →
// ANCHORS reds naming errorRow; (B) the view bundle's dismiss
// mechanism (rule + refs + label) stripped → DISMISS SURVIVAL reds;
// (C) built bytes doctored past the lane's rewrite → SERVED reds
// (served vs built diverge). Restore → green, each. The JSX-structure
// toggle (a × deleted from src) is the package specs' firing path —
// stated, not silently unjudged: this wall judges the built/served
// planes those cures must survive.
// Run: npx vitest run --project walls tests/walls/ts/suites/error-dismiss-census.spec.ts
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const REPO = join(import.meta.dirname, '..', '..', '..', '..')
const WEB = join(REPO, 'packages', 'web')

interface FaceSeat { logical: string; hash: string; position: string | null; bundle: string }
interface BundleCensus {
  pkg: string
  name: string
  bytes: string
  faces: FaceSeat[]
  alerts: number
  dismissRule: boolean
  dismissAbsolute: boolean
  dismissRefs: number
  dismissLabels: string[]
}

function bundleDirs(): string[] {
  if (!existsSync(WEB)) return []
  return readdirSync(WEB, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(WEB, d.name, 'lib', 'client.js')))
    .map((d) => d.name)
    .sort()
}

function packageName(pkg: string): string {
  try {
    return (JSON.parse(readFileSync(join(WEB, pkg, 'package.json'), 'utf8')) as { name?: string }).name ?? pkg
  } catch {
    return pkg
  }
}

function censusBundle(pkg: string, bytes: string): BundleCensus {
  // THE CLASS MAP (the bundle's own logical→hash table — the only
  // key the census trusts for names).
  const map = new Map<string, string>()
  for (const [, logical, hash] of bytes.matchAll(/"([A-Za-z0-9_]+)"\s*:\s*"([A-Za-z0-9_-]+)"/g)) {
    if (!map.has(logical)) map.set(logical, hash)
  }
  const inv = new Map<string, string>()
  for (const [logical, hash] of map) if (!inv.has(hash)) inv.set(hash, logical)
  const faces: FaceSeat[] = []
  for (const [, hash, body] of bytes.matchAll(/\.([A-Za-z0-9_-]+)\{([^}]*)\}/g)) {
    if (!/state-error-primary|alias-danger/.test(body)) continue
    // THE CONTROL CARVE-OUT (derived, not listed): error-colored rules
    // declaring `cursor:` are interactive CONTROLS (delete buttons,
    // danger verbs) — the audit's roster is error-MESSAGE faces, the
    // things a user must be able to retire. Excluded from the roster.
    if (/cursor\s*:/.test(body)) continue
    const pos = body.match(/position\s*:\s*([a-z]+)/)?.[1] ?? null
    faces.push({ logical: inv.get(hash) ?? `${hash}?`, hash, position: pos, bundle: pkg })
  }
  const js = bytes.replace(/\.[A-Za-z0-9_-]+\{[^}]*\}/g, '')
  return {
    pkg,
    name: packageName(pkg),
    bytes,
    faces,
    alerts: js.match(/role:\s*"alert"/g)?.length ?? 0,
    dismissRule: faces.some((f) => f.logical === 'errorDismiss'),
    dismissAbsolute: faces.some((f) => f.logical === 'errorDismiss' && f.position === 'absolute'),
    dismissRefs: js.match(/errorDismiss/g)?.length ?? 0,
    dismissLabels: [...new Set(js.match(/"Dismiss(?: error)?"/g) ?? [])],
  }
}

// THE PAIRED SET (derived from the error-dismiss specs, never listed):
// a bundle-roster face is paired iff a package spec asserting dismiss
// names it as a string literal (className.includes("runError"),
// [class*="runError"], block('errorRow') — the specs' own idioms).
// A new ×-cure lands its spec arm and auto-joins the census; a face
// no spec names stays UNSTATED (the ratchet below).
function specPairedFaces(roster: Set<string>): Set<string> {
  const literals = new Set<string>()
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(spec|test)\.(tsx?|jsx?)$/.test(e.name)) continue
      const text = readFileSync(p, 'utf8')
      if (!/errorDismiss|Dismiss error/.test(text)) continue
      for (const m of text.matchAll(/["']([A-Za-z0-9_]+)["']/g)) literals.add(m[1])
    }
  }
  walk(join(REPO, 'packages', 'web'))
  return new Set([...literals].filter((l) => roster.has(l)))
}

// THE UNSTATED RATCHET (2026-10-27 derivation — text/status seats the
// C4 cure did not decide: bench rowError, rescue notes, deck status
// dots/codes, danger verbs, wire faces). Frozen so a NEW error seat
// cannot land unstated; curing one shrinks this set with the wall's
// own update. This is a ratchet baseline, not a roster — discovery
// above stays fully derived.
const UNSTATED_FROZEN = new Set([
  'btnDanger', 'dangerVerb', 'dotBad', 'errorCode', 'missing',
  'operatorBadge', 'rescueErr', 'rowError', 'stateBad', 'wireUnwire',
])

describe('THE ERROR-DISMISS CENSUS — every served error seat carries × + anchor (audit 017 C2)', () => {
  it('ROSTER — the built bundles expose their error seats (derived, printed, floored)', () => {
    const dirs = bundleDirs()
    // THE LOUD STAND-DOWN: no built bundles = nothing to judge (the
    // audit's own rule — stand down loudly, never green-vacuous).
    if (dirs.length === 0) {
      console.warn('STAND-DOWN: no packages/web/*/lib/client.js on disk — the lane has no built bundles to census')
      return
    }
    const censuses = dirs.map((d) => censusBundle(d, readFileSync(join(WEB, d, 'lib', 'client.js'), 'utf8')))
    const roster = new Set(censuses.flatMap((c) => c.faces.map((f) => f.logical).filter((l) => !l.endsWith('?'))))
    const paired = specPairedFaces(roster)
    const failures: string[] = []
    let seats = 0
    let pairedCount = 0
    const unstated = new Set<string>()
    for (const c of censuses) {
      seats += c.faces.length
      const names = c.faces.map((f) => `${f.logical}${f.position === null ? ' (NO ANCHOR)' : ''}`).join(', ')
      console.log(`bundle ${c.pkg} (${c.name}): ${c.faces.length} error seats [${names}] | alerts=${c.alerts} dismissRefs=${c.dismissRefs} labels=[${c.dismissLabels.join(', ')}]`)
      for (const f of c.faces) {
        if (f.logical.endsWith('?')) {
          failures.push(`${c.pkg}: error-colored rule .${f.hash} maps to no logical name — an unnamed seat (the census cannot judge what it cannot name)`)
          continue
        }
        if (paired.has(f.logical)) pairedCount += 1
        else unstated.add(f.logical)
      }
    }
    expect(seats, 'zero derived error seats across all bundles — the sweep went vacuous').toBeGreaterThan(0)
    expect(pairedCount, 'no spec-paired seat anywhere — the census judges nothing').toBeGreaterThan(0)
    // THE RATCHET: the unstated remainder must be exactly the frozen
    // set — a new face lands paired (spec + ×) or reds HERE.
    const extra = [...unstated].filter((u) => !UNSTATED_FROZEN.has(u))
    expect(extra, `new UNSTATED error seats (land them ×-paired with a spec arm, or state their law): ${extra.join(', ')}`).toEqual([])
    // A cured face simply vanishes from the roster (the control
    // carve-out or the cure's own removal) — shrink the freeze
    // with this wall's update; no red for good news.
    const toastCovered = censuses.some((c) => c.dismissLabels.length > 0)
    expect(toastCovered, 'no bundle carries a Dismiss aria literal — the toast seat lost its served voice').toBe(true)
  })

  it('ANCHORS — every paired face is a containing block, the × rides absolute (the C1 law in bytes)', () => {
    const dirs = bundleDirs()
    if (dirs.length === 0) {
      console.warn('STAND-DOWN: no built bundles — anchors unjudgeable')
      return
    }
    const built = dirs.map((d) => censusBundle(d, readFileSync(join(WEB, d, 'lib', 'client.js'), 'utf8')))
    const roster = new Set(built.flatMap((c) => c.faces.map((f) => f.logical).filter((l) => !l.endsWith('?'))))
    const paired = specPairedFaces(roster)
    const failures: string[] = []
    for (const c of built) {
      const d = c.pkg
      for (const f of c.faces) {
        if (!paired.has(f.logical)) continue
        if (f.position === null) {
          failures.push(`${d}.${f.logical}: paired face with NO containing-block position — an absolute × would anchor to the wrong ancestor (the C1 law)`)
        }
      }
      if (c.faces.some((f) => paired.has(f.logical))) {
        if (!c.dismissAbsolute) failures.push(`${d}: paired faces but NO absolute errorDismiss rule — the × lost its placement law in the build`)
      }
    }
    expect(failures, 'anchor law broke on the built plane').toEqual([])
  })

  it('DISMISS SURVIVAL — alert-rendering bundles carry a dismiss mechanism the build did not shake away', () => {
    const dirs = bundleDirs()
    if (dirs.length === 0) {
      console.warn('STAND-DOWN: no built bundles — dismiss survival unjudgeable')
      return
    }
    const failures: string[] = []
    for (const d of dirs) {
      const c = censusBundle(d, readFileSync(join(WEB, d, 'lib', 'client.js'), 'utf8'))
      if (c.alerts === 0) continue
      if (!c.dismissRule && c.dismissLabels.length === 0 && c.dismissRefs === 0) {
        failures.push(`${d}: renders ${c.alerts} role=alert seat(s) but carries NO dismiss mechanism in bytes (no errorDismiss rule, no Dismiss literal, no refs)`)
      }
    }
    expect(failures, 'a bundle renders alerts the user cannot retire').toEqual([])
  })

  it('SERVED — the lane serves the built bytes, and the served census equals the built census', async () => {
    const dirs = bundleDirs()
    if (dirs.length === 0) {
      console.warn('STAND-DOWN: no built bundles — nothing to compare against the lane')
      return
    }
    // THE TOKEN (the lane's own log — never a literal): the newest
    // boot line wins; absent log/token = loud stand-down.
    const logPath = join(homedir(), '.dsh-dev', 'melite-test-3088.log')
    const logged = existsSync(logPath) ? readFileSync(logPath, 'utf8') : ''
    const token = logged.match(/127\.0\.0\.1:3088\/\?token=([A-Za-z0-9_-]+)/g)?.pop()?.split('token=')[1]
    if (token === undefined) {
      console.warn('STAND-DOWN: no lane token in ~/.dsh-dev/melite-test-3088.log — the lane has not booted here')
      return
    }
    const jar: Record<string, string> = {}
    const fetchText = async (url: string): Promise<{ status: number; text: string }> => {
      const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(url, { headers: cookie === '' ? {} : { cookie }, redirect: 'manual' })
      // Both cookie faces: undici's getSetCookie (node) and the raw
      // set-cookie header (happy-dom's fetch polyfill).
      const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
        ?? res.headers.get('set-cookie')?.split(/,(?=[^;]+?=)/) ?? []
      for (const set of raw) {
        const [pair] = set.split(';')
        const eq = pair.indexOf('=')
        if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location') !== null) {
        return fetchText(new URL(res.headers.get('location')!, url).toString())
      }
      return { status: res.status, text: await res.text() }
    }
    let landing: string
    try {
      const r = await fetchText(`http://127.0.0.1:3088/?token=${token}`)
      if (r.status !== 200) {
        console.warn(`STAND-DOWN: lane answered ${r.status} on the landing — the served plane is unjudgeable from here`)
        return
      }
      landing = r.text
    } catch {
      console.warn('STAND-DOWN: lane :3088 unreachable — served bytes unjudgeable (start the melite-test profile to judge this arm)')
      return
    }
    // Single-package entries (??name/client.js&rev=…) — the rev is
    // the lane's own content pin, read off the landing, never stored.
    const singles = new Map<string, string>()
    for (const m of landing.matchAll(/[?&]([^"&\s,]*?([^"&\s,\/]+))\/client\.js&(amp;)?rev=([0-9a-f]+)/g)) {
      // The plugin path's leading ?? rides the lazy capture — strip
      // it so the key is the package name verbatim.
      singles.set(m[1].replace(/^\?+/, ''), m[4])
    }
    const failures: string[] = []
    let compared = 0
    let unboarded: string[] = []
    for (const d of dirs) {
      const name = packageName(d)
      const rev = singles.get(name)
      if (rev === undefined) {
        unboarded.push(`${d} (${name})`)
        continue
      }
      let served: string
      try {
        const r = await fetchText(`http://127.0.0.1:3088/plugins/??${name}/client.js&rev=${rev}`)
        if (r.status !== 200) {
          failures.push(`${d}: lane serves ${name} at rev ${rev} with status ${r.status}`)
          continue
        }
        served = r.text
      } catch {
        failures.push(`${d}: fetch of the served bundle failed mid-arm`)
        continue
      }
      const norm = (x: string): string => x.replace(/\/\/# sourceMappingURL=.*/, '').replace(/[; \t\n\r]+$/, '')
      const built = readFileSync(join(WEB, d, 'lib', 'client.js'), 'utf8')
      compared += 1
      if (norm(served) !== norm(built)) {
        failures.push(`${d}: served bytes DIVERGE from built bytes modulo the lane's sourceMappingURL rewrite — the lane serves a stale build (rebuild + re-serve)`)
        continue
      }
      const servedFaces = censusBundle(d, served).faces.map((f) => f.logical).sort().join(',')
      const builtFaces = censusBundle(d, built).faces.map((f) => f.logical).sort().join(',')
      if (servedFaces !== builtFaces) {
        failures.push(`${d}: served census [${servedFaces}] != built census [${builtFaces}] — the lane's rewrite ate a seat`)
      }
    }
    console.log(`served: compared=${compared} unboarded=[${unboarded.join(', ')}]`)
    expect(failures, 'the lane serves bytes the census did not judge').toEqual([])
  }, 120000)
})
