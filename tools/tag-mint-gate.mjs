#!/usr/bin/env node
// tag-mint-gate.mjs — A PUSHED TAG MUST BE A RECORDED RELEASE DECISION.
//
// The burn (2026-11-14): v0.2.3-rc.1 and v0.2.3-rc.2 shipped to the
// remote as bare tags — no GitHub release, no assets, no record, no
// red. Consumers following "the newest tag" hit a dead install door
// for days. This gate refuses the PUSH carrying an unrecorded tag:
// every local tag not yet on the remote (what this push would carry)
// must be named in tools/seat-census.json — as the seat (minted,
// installable) or as an exclusion row carrying its reason. The census
// is the ledger the seat-pin wall (tests/walls/ts/suites/
// readme-seat-pin.spec.ts) judges for coherence and, in CI, verifies
// against GitHub itself.
//
// Wholesale by design: this gate carries NO file template — tag-only
// pushes fire the pre-push stage but skip every {push_files}-scoped
// job ("no matching push files"), and a release burn is exactly a
// tag-only push. No skip is silent.
//
// Usage: node tools/tag-mint-gate.mjs   (exit 0 = push may proceed)

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function die(msg, fix) {
  console.error(`tag-mint-gate: ${msg}`)
  console.error(fix ?? '  fix: mint the release and move census.seat to the tag in the same')
  console.error('       change, or delete the tag — then commit and push again')
  process.exit(1)
}

const run = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' })

// Remote tag set, peeled (annotated tags resolve to their commit).
let remote = ''
try {
  remote = run(['ls-remote', '--tags', 'origin'])
} catch (err) {
  die(`cannot read the remote tag list (network?): ${err.message}`)
}
const remoteShas = new Set()
for (const line of remote.split('\n')) {
  const sha = line.split('\t')[0]?.replace(/\^\{\}$/, '').trim()
  if (sha) remoteShas.add(sha)
}

const census = JSON.parse(readFileSync(resolve(REPO, 'tools/seat-census.json'), 'utf8'))
const recorded = new Set([census.seat, ...Object.keys(census.excluded)])

// THE ABSOLUTION LAW (2026-11-14, second burn): an exclusion row is
// for HISTORY — tags the seat superseded. A row naming a tag NEWER
// than the seat is a bare tag excused by prose while it outranks the
// install door; the census was used to walk the previous gate wide
// open exactly this way (rc.1/rc.2). No reason string is a mint.
const cmpTag = (a, b) => {
  const parse = (t) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(t)
    if (!m) return null
    return { core: [+m[1], +m[2], +m[3]], pre: m[4] ?? null }
  }
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return a.localeCompare(b)
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] < pb.core[i]) return -1
    if (pa.core[i] > pb.core[i]) return 1
  }
  if (pa.pre === null && pb.pre === null) return 0
  if (pa.pre === null) return 1
  if (pb.pre === null) return -1
  const ia = pa.pre.split('.')
  const ib = pb.pre.split('.')
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const xa = ia[i]
    const xb = ib[i]
    if (xa === undefined) return -1
    if (xb === undefined) return 1
    const na = /^\d+$/.test(xa) ? Number(xa) : null
    const nb = /^\d+$/.test(xb) ? Number(xb) : null
    if (na !== null && nb !== null) {
      if (na < nb) return -1
      if (na > nb) return 1
    } else {
      const c = xa.localeCompare(xb)
      if (c !== 0) return c
    }
  }
  return 0
}
const absolved = Object.keys(census.excluded).filter((t) => cmpTag(t, census.seat) > 0)
if (absolved.length > 0) {
  die(`census carries exclusions NEWER than the seat (${absolved.join(', ')} vs seat ${census.seat}) — an exclusion covers history, never the future: mint the release and move the seat, or delete the tag`)
}

const unrecorded = []
for (const tag of run(['tag', '-l']).split('\n').map((s) => s.trim()).filter(Boolean)) {
  let sha = ''
  try {
    sha = run(['rev-parse', `${tag}^{commit}`]).trim()
  } catch {
    continue
  }
  if (remoteShas.has(sha)) continue // already on the remote: this push carries it no further
  if (recorded.has(tag)) continue // a recorded release decision
  unrecorded.push(tag)
}

if (unrecorded.length > 0) {
  die(`push would carry unrecorded tags: ${unrecorded.join(', ')}`)
}

console.log(`tag-mint-gate: every pushed tag is a recorded release decision (seat ${census.seat})`)
