/**
 * runs-window.mjs — ARTIFACT-BLINDNESS regression suite (2026-09-01).
 *
 * THE INCIDENT (do not repeat): the gateway door /v1/pipelines/runs
 * returns only the NEWEST N runs (default 200, max 500). A chaos-test
 * flood + error burst filled the window with sidecar-only rows; every
 * artifact-bearing run fell out and the media sidebar went
 * "116 runs · 0 artifacts" while 58 real artifacts sat on disk.
 *
 * Laws under test (any failure = a real regression):
 *   1. BYTE   — the built plugin lib fetches the door at limit=500
 *               (the door's hard max), never the blind 200 default.
 *   2. WINDOW — live: artifacts visible at limit=500 must be >= the
 *               old default window. The window may never HIDE what a
 *               wider pull reveals.
 *   3. BLINDNESS — if media files exist in run dirs of the root the
 *               gateway serves, the DEFAULT window (no limit param —
 *               what a pinned/old client fetches) must surface at
 *               least one real artifact row. Media on disk + zero in
 *               the listing = the exact incident, FAIL loudly.
 *   4. FLOOD  — warn (not fail) when terminal media-less junk runs in
 *               the served root exceed 150: the default window is
 *               200 and a flood re-blinds the panel. Archived junk
 *               lives outside the scanned root by convention.
 *
 * Run: npm run test:runs   (env GATEWAY overrides, default 33081)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const GATEWAY = process.env.GATEWAY ?? 'http://127.0.0.1:33081'
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const ROOTS = [join(REPO, 'build', 'output'), join(REPO, 'output')]
const MEDIA = new Set(['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp', '.wav', '.flac', '.ogg', '.mp3', '.glb'])
let failures = 0
const check = (name, ok, detail) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name.padEnd(30) + ' ' + detail)
  if (!ok) failures++
}
const warn = (name, detail) => console.log('  ! ' + name.padEnd(30) + ' ' + detail)

const realRows = (runs) => {
  let n = 0
  for (const r of runs) for (const a of (r?.artifacts ?? [])) if (a && typeof a.url === 'string' && a.url !== '') n++
  return n
}
const runDirsWithMedia = (root) => {
  if (!existsSync(root)) return []
  const out = []
  for (const name of readdirSync(root)) {
    if (!name.startsWith('run-')) continue
    const d = join(root, name)
    try {
      if (!statSync(d).isDirectory()) continue
      if (readdirSync(d).some((f) => MEDIA.has(f.slice(f.lastIndexOf('.')).toLowerCase()))) out.push(name)
    } catch { /* unreadable dir: skip */ }
  }
  return out
}
const pull = async (q) => {
  const res = await fetch(GATEWAY + '/v1/pipelines/runs' + q, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return (await res.json()).runs ?? []
}

// --- 1. BYTE: built lib carries the 500 pull ---
{
  const lib = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
  check('lib pulls limit=500', lib.includes('500'), 'byte present in built lib')
  check('lib default not 200', !lib.includes('DEFAULT_LIMIT = 200') && !lib.includes('DEFAULT_LIMIT=200'), 'old window default gone')
}

// --- 2/3/4. LIVE against the real gateway + real disk ---
{
  try {
    const [wide, def] = await Promise.all([pull('?limit=500'), pull('')])
    const wideN = realRows(wide), defN = realRows(def)
    check('window: 500 >= default', wideN >= defN, wideN + ' vs ' + defN + ' artifact rows')
    if (wideN > defN) warn('fix load-bearing', '+' + (wideN - defN) + ' artifacts hidden by the default window')

    // which root does the door serve? match listed run ids against dirs
    const listed = new Set(def.map((r) => r?.run_id).filter(Boolean))
    let served = null
    for (const root of ROOTS) {
      if (!existsSync(root)) continue
      const dirs = new Set(readdirSync(root).filter((n) => n.startsWith('run-')))
      let hits = 0
      for (const id of listed) if (dirs.has(id)) hits++
      if (listed.size > 0 && hits >= Math.min(3, listed.size)) { served = root; break }
    }
    if (served === null && listed.size > 0) {
      warn('served root unknown', 'no candidate root matched the listed run ids')
    }

    // BLINDNESS: media in the served root (or any root, if unknown) must surface
    const rootsToCheck = served !== null ? [served] : ROOTS
    const mediaDirs = rootsToCheck.flatMap((r) => runDirsWithMedia(r))
    if (mediaDirs.length === 0 && wideN === 0) {
      warn('nothing to assert', 'no media run dirs and no artifacts at the gateway')
    } else {
      check('blindness: media visible', defN > 0,
        defN > 0
          ? defN + ' rows visible; ' + mediaDirs.length + ' media run dirs on disk'
          : 'BLIND: ' + mediaDirs.length + ' media run dirs on disk, 0 rows in the default listing (window flood or wrong root — archive terminal media-less runs out of ' + (served ?? 'the output root') + ')')
    }

    // FLOOD: junk load in the served root
    if (served !== null) {
      let junk = 0
      for (const name of readdirSync(served)) {
        if (!name.startsWith('run-')) continue
        const d = join(served, name)
        try {
          if (!statSync(d).isDirectory()) continue
          if (!readdirSync(d).some((f) => MEDIA.has(f.slice(f.lastIndexOf('.')).toLowerCase()))) junk++
        } catch { /* skip */ }
      }
      if (junk > 150) warn('flood risk', junk + ' media-less run dirs in the served root (default window is 200 — archive terminal junk before it blinds the panel)')
      else warn('junk load ok', junk + ' media-less run dirs (threshold 150)')
    }
  } catch (e) {
    check('live door reachable', false, String(e?.message ?? e).slice(0, 90))
  }
}

console.log(failures === 0 ? '\nRUNS-WINDOW: PASS' : '\nRUNS-WINDOW: FAIL (' + failures + ')')
process.exit(failures === 0 ? 0 : 1)
