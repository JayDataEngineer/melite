#!/usr/bin/env node
// THE SESSION LEAF LEDGER (§36.6's zstd tooling, 2026-09-24 — 035
// attempts 8/14/15/16's receipts: every maker burned ~10 calls
// hand-decompressing its own session log to prove the call count —
// the commission brief demands an ordered tool-call receipt and
// the raw log is zstd-compressed with double-encoded arguments).
//
// ONE call replaces the forensic detour:
//   node scripts/session-leaf-ledger.mjs <session-dir-or-log> [out.txt]
//   (no args → the NEWEST session log under this repo's dsh root)
//
// The walk: decompress → tool/call records in seq order → expand
// invoke_tool envelopes into their LEAF rows (the inner name +
// one-line args) → count envelopes separately → write the sidecar
// (one row per leaf: index, name, arg digest) + print the summary.
// Failures (tool/result records with error text) mark their rows.
// Long argument values are DIGESTED (first 160 chars) — the full
// raw values stay in the compressed log; the sidecar is the index.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = dirname(here)
// the dsh slug keeps the leading '--' (path separators become '-')
// the slug is dash-munged (path separators become '-') but its
// exact dash count is dsh's own — resolve the dir by SUFFIX match,
// never by recomputing it.
const sessionsHome = join(homedir(), '.dsh', 'sessions')
// dsh munges the cwd path with dash padding at both ends (and the
// maker profiles append their own suffixes — '-build', trailing
// dashes). Resolve by CONTAINS, exact-tree first (the bare repo
// before any profile variant).
const tail = repo.replace(/^\//, '').replace(/\//g, '-')
let sessionsRoot = ''
const hits = existsSync(sessionsHome) ? readdirSafe(sessionsHome).filter((d) => d.includes(tail)) : []
// the bare repo's dir is the shortest hit (no profile suffix)
if (hits.length > 0) sessionsRoot = join(sessionsHome, hits.sort((a, b) => a.length - b.length)[0])

// THE SESSION LOG GENERATIONS (the 0.1.7 bump, 2026-10-11): a
// 0.1.5 host writes session.v3.jsonl.zstd; a 0.1.7 host writes
// session.v4.jsonl.zstd (SESSION_FORMAT_VERSION = 4 — the
// dsh-session-format filename law). The ledger reads BOTH, never
// one: a v4-only lane silently reported "no session logs" and a
// mixed root keyed every v4 result to '' (failures zero).
const LOG_NAMES = ['session.v4.jsonl.zstd', 'session.v3.jsonl.zstd']
const logIn = (dir) => LOG_NAMES.map((n) => join(dir, n)).find((p) => existsSync(p)) ?? ''

const arg = (i) => process.argv[i + 2] ?? ''
let target = arg(0)
if (target === '' || target === '-') {
  // newest session dir carrying a log (either generation)
  let best = null
  for (const d of existsSync(sessionsRoot) ? readdirSafe(sessionsRoot) : []) {
    const log = logIn(join(sessionsRoot, d))
    if (log !== '') {
      const m = statMtime(log)
      if (best === null || m > best.m) best = { log, m }
    }
  }
  if (best === null) { console.error('no session logs under ' + sessionsRoot); process.exit(1) }
  target = best.log
} else if (!target.endsWith('.zstd')) {
  const log = logIn(target)
  if (log !== '') target = log
}
if (!existsSync(target)) { console.error('log not found: ' + target); process.exit(1) }

// a busy session log runs past 64 MB decompressed — the streaming
// pipe (not a capped buffer) keeps the walk honest
const safe = target.replace(/'/g, "'\\''")
const raw = execFileSync('sh', ['-c', "zstdcat '" + safe + "' | head -c 268435456"], { maxBuffer: 268435456 }).toString('utf8')

// ── the walk ────────────────────────────────────────────────────
const calls = new Map()   // callId -> { seq, name, args }
const results = new Map() // callId -> error text | null
let envelopes = 0
for (const line of raw.split('\n')) {
  if (line.trim() === '') continue
  let r
  try { r = JSON.parse(line) } catch { continue }
  const d = r?.['data']
  if (r?.['type'] === 'tool/call' && d && typeof d['name'] === 'string') {
    calls.set(d['callId'] ?? String(r['seq']), { seq: r['seq'] ?? 0, name: d['name'], args: d['arguments'] })
  } else if (r?.['type'] === 'tool/result' && d) {
    // V3 rides callId/isError at the data root; V4 nests the tool
    // role under data.message (callId at message.source.callId —
    // session invariant.ts:140, isError at message.isError). Read
    // BOTH spellings; a v4 result on the v3 arm keyed '' and every
    // failure reported as zero.
    const msg = d['message']
    const callId = typeof d['callId'] === 'string'
      ? d['callId']
      : (msg && typeof msg === 'object' && msg['source'] && typeof msg['source']['callId'] === 'string'
          ? msg['source']['callId']
          : '')
    const isError = typeof d['isError'] === 'boolean'
      ? d['isError']
      : (msg && typeof msg === 'object' && msg['isError'] === true)
    const content = msg && typeof msg === 'object' && typeof msg['content'] === 'string' && typeof d['content'] !== 'string'
      ? msg['content']
      : d['content']
    results.set(callId, isError ? String(content ?? '').slice(0, 120) : null)
  }
}

const digest = (s, n = 160) => {
  // the wire args ride as JSON strings; fixtures and some turns
  // carry parsed objects — objects digest via JSON, never
  // '[object Object]'
  const t = (typeof s === 'string' ? s : JSON.stringify(s ?? '')).replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

const rows = []
for (const [callId, c] of [...calls.entries()].sort((a, b) => a[1].seq - b[1].seq)) {
  const err = results.get(callId)
  // invoke_tool envelopes: arguments is a JSON string with an inner
  // {name, arguments} — expand to the LEAF row (the maker's face).
  let innerName = ''
  let innerArgs = ''
  if (c.name === 'invoke_tool') {
    try {
      const outer = JSON.parse(c.args ?? '{}')
      innerName = typeof outer['name'] === 'string' ? outer['name'] : ''
      const a2 = outer['arguments']
      innerArgs = typeof a2 === 'string' ? digest(JSON.parse(a2)) : digest(a2)
      envelopes += 1
    } catch { innerArgs = digest(c.args) }
  }
  const args = innerName !== '' ? innerArgs : digest(c.args)
  rows.push({
    index: rows.length + 1,
    name: innerName !== '' ? innerName : c.name,
    args,
    err: err ?? (innerName !== '' ? '' : ''),
  })
}

// ── the sidecar ─────────────────────────────────────────────────
const out = arg(1) !== '' ? arg(1) : join(repo, 'data', 'agent-video-test', '.session-leaf-ledger.txt')
mkdirSync(dirname(out), { recursive: true })
const head = [
  '# session leaf ledger — ' + basename(target),
  '# generated by scripts/session-leaf-ledger.mjs (one call, §36.6)',
  '# leaves: ' + String(rows.length) + ' · invoke_tool envelopes: ' + String(envelopes) + ' · failures: ' + String(rows.filter((r) => r.err !== '').length),
  '# long values digested (first 160 chars) — full raw in the compressed log',
  '',
]
const body = rows.map((r) => {
  const n = String(r.index).padStart(3, ' ')
  const e = r.err !== '' ? '  ! ' + digest(r.err, 100) : ''
  return n + '. ' + r.name + ' ' + r.args + e
})
writeFileSync(out, head.concat(body).join('\n') + '\n')
console.log('leaves: ' + String(rows.length) + ' · envelopes: ' + String(envelopes) + ' · failures: ' + String(rows.filter((r) => r.err !== '').length))
console.log('sidecar: ' + out)

// ── helpers (node:readdir/stat kept tiny — no deps) ─────────────
function readdirSafe(p) {
  try { return execFileSync('ls', ['-1', p]).toString('utf8').trim().split('\n').filter((x) => x !== '') } catch { return [] }
}
function statMtime(p) {
  try { return Number(execFileSync('stat', ['-c', '%Y', p]).toString('utf8').trim()) } catch { return 0 }
}
