#!/usr/bin/env node
// agent-trace-audit.mjs — THE LIVE AGENT TRACE AUDIT (operator order,
// 2026-09-13: "you need to do test runs, where you see the ai agent
// traces and you audit if the tools are working as intended").
//
// Walls prove faces against composed seats; ONLY a real one-shot agent
// run proves the model-facing plane end-to-end (the trace's tool/result
// content blocks are what the model actually read). This script found
// three defects no wall caught: the stale lib build (renders frozen a
// day behind src), the melite_load schema-invalid success shape (walls
// drove execute() directly, bypassing the registry's output
// validation), and the 'skills' seat-name collision with DSH core.
//
// What it does:
//   1. provisions (or reuses) a scratch DSH_HOME + headless profile
//   2. runs the one-shot audit task (a real LLM agent; needs
//      credentials — refuses with a named error without them)
//   3. parses the newest session.v3.jsonl.zstd READ-ONLY (zstd frames
//      are never rewritten) and asserts the four disclosure laws on
//      the tool/result CONTENT blocks:
//        discover → routing rows (flow/card ids ride, not counts)
//        skill_index → skill ids ride
//        skill_read → the markdown body rides
//        melite_load → params + models + digest ride, isError false
//   4. prints every tool call + the head of what the model saw
//
// Run: node tools/agent-trace-audit.mjs
// (cwd is FORCED to a scratch dir — the estate queue's boot gate
// refuses a second live process over the lane's state root, and the
// audit must never contend with the operator's lane.)

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { mkdtempSync, rmSync } from 'node:fs'

const REPO = dirname(dirname(fileURLToPath(import.meta.url)))
// MINT, NEVER A FIXED NAME (the flake audit, 2026-10-15): both were
// join(tmpdir(), 'melite-agent-audit') and '...-run', so two
// concurrent invocations shared ONE scratch DSH home and one cwd —
// and neither name is in the sweeper's prefix table, so neither was
// ever reclaimed. mkdtemp gives each run its own tree.
const RUN_ROOT = mkdtempSync(join(tmpdir(), 'melite-agent-audit-'))
const HOME = join(RUN_ROOT, 'home')
const RUN_CWD = join(RUN_ROOT, 'cwd')
const DSH = process.env.DSH_BIN ?? 'dsh'

const TASK = 'AUDIT RUN — no generation, no runs, no melite_flow. '
  + '1) Call melite_discover with lookup=all. '
  + '2) From its response pick the card whose id relates to music; call melite_load with name=<that exact id> and inference_type=card. '
  + '3) Call skill_index. 4) Pick any one id from skill_index\'s response and call skill_read with it. '
  + '4b) Also pick one id from the skills line melite_load printed and read THAT with skill_read too. '
  + '5) Reply with four bullets: (a) how many flows+cards discover reported and THREE card ids it listed, '
  + '(b) the music card\'s params and model ids that load showed, (c) two skill ids the index listed, '
  + '(d) the first sentence of the body skill_read returned. Use ONLY what the tool responses say; never guess an id.'

const log = (...a) => console.log(...a)

// ── 1. provision (idempotent) ───────────────────────────────────────────
function provision() {
  mkdirSync(HOME, { recursive: true })
  mkdirSync(RUN_CWD, { recursive: true })
  execSync(`node ${join(REPO, 'packages/harness/provisioner/bin/infer-provision.mjs')} profile headless --dsh-home ${HOME}`, { stdio: 'inherit' })
  const srcCred = join(process.env.DSH_REAL_HOME ?? join(process.env.HOME ?? '', '.dsh'), '.credentials.yaml')
  const srcSet = join(process.env.DSH_REAL_HOME ?? join(process.env.HOME ?? '', '.dsh'), 'settings.yaml')
  for (const [src, dst] of [[srcCred, join(HOME, '.credentials.yaml')], [srcSet, join(HOME, 'settings.yaml')]]) {
    if (existsSync(src) && !existsSync(dst)) { copyFileSync(src, dst); chmodSync(dst, 0o600) }
  }
  execSync('pnpm install --silent', { cwd: join(HOME, 'profiles/headless'), stdio: 'inherit' })
}

// ── 2. the one-shot run ────────────────────────────────────────────────
function runAgent() {
  const r = spawnSync(DSH, ['--profile', 'headless', TASK], {
    cwd: RUN_CWD,
    env: { ...process.env, DSH_HOME: HOME },
    timeout: 540_000,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  if (r.status !== 0) {
    log('AGENT RUN FAILED (exit ' + r.status + '):\n' + (r.stderr ?? '').slice(-800))
    process.exit(1)
  }
  log('agent run complete. final answer head:\n  ' + (r.stdout ?? '').split('\n').slice(0, 3).join('\n  '))
}

// ── 3. trace audit (read-only) ─────────────────────────────────────────
function newestSession() {
  const root = join(HOME, 'sessions', '--tmp-melite-agent-audit-run--')
  const dirs = readdirSync(root)
    .filter((d) => d.startsWith('session-'))
    .map((d) => ({ d, m: statSync(join(root, d)).mtimeMs }))
    .sort((a, b) => a.m - b.m)
  if (dirs.length === 0) throw new Error('no session dir under ' + root)
  // mtime order, NOT name order — uuid dirs don't sort chronologically
  // (audited a stale pre-fix session on the first run of this law)
  return join(root, dirs[dirs.length - 1].d, 'session.v3.jsonl.zstd')
}

function audit() {
  const trace = execSync(`zstd -dc ${JSON.stringify(newestSession())}`, { maxBuffer: 128 * 1024 * 1024 }).toString('utf8')
  const calls = new Map()
  const results = []
  for (const line of trace.split('\n')) {
    if (line === '') continue
    let ev
    try { ev = JSON.parse(line) } catch { continue }
    if (ev.type === 'tool/call') calls.set(ev.data.callId, { name: ev.data.name, args: ev.data.arguments })
    if (ev.type === 'tool/result') {
      const blocks = ev.data.message?.content ?? []
      for (const b of blocks) {
        if (b?.type === 'tool-result') {
          results.push({ callId: b.toolCallId, isError: b.isError === true, text: (b.content ?? []).map((x) => x?.text ?? '').join('\n') })
        }
      }
    }
  }
  const byName = new Map()
  for (const r of results) {
    const c = calls.get(r.callId)
    if (c === undefined) continue
    if (!byName.has(c.name)) byName.set(c.name, [])
    byName.get(c.name).push({ ...r, args: c.args })
  }
  const laws = []
  const law = (ok, label) => laws.push([ok, label])

  const disc = byName.get('melite_discover')?.[0]
  law(disc !== undefined && /flows:\n  \S+ —/.test(disc.text) && /cards:\n  \S+ —/.test(disc.text),
    'melite_discover: routing ROWS ride (flow + card ids, not counts)')
  const idx = byName.get('skill_index')?.[0]
  law(idx !== undefined && /skills — read one with skill_read\n  \S+/.test(idx.text),
    'skill_index: skill IDS ride')
  const rd = byName.get('skill_read')?.[0]
  law(rd !== undefined && rd.text.includes('\n') && rd.text.length > rd.args.length + 80 && !rd.isError,
    'skill_read: the markdown BODY rides')
  const ld = byName.get('melite_load')?.find((x) => !x.isError)
  law(ld !== undefined && ld.text.includes('params:') && /models?: /.test(ld.text) && ld.text.includes('digest:'),
    'melite_load: params + models + digest ride (schema-valid success)')
  law(ld !== undefined && /skills: \d+ — read one with skill_read: \S/.test(ld.text),
    'melite_load: the skills line NAMES skill_read (no bare id lists — wrong-door risk)')
  const loadSkillIds = ld !== undefined ? (ld.text.match(/skill_read: ([^\n]+)/)?.[1] ?? '').split(/[\s,]+/) : []
  const readIds = (byName.get('skill_read') ?? []).filter((x) => !x.isError).map((x) => JSON.parse(x.args || '{}').id)
  law(readIds.some((id) => loadSkillIds.includes(id)),
    'a load-advertised skill id was read through skill_read (the routing loop closes)')

  log('\n── tool calls the model made ──')
  for (const [name, rs] of byName) log(`  ${name} ×${rs.length}`)
  log('\n── what the model saw (heads) ──')
  for (const r of results.slice(0, 6)) {
    const c = calls.get(r.callId)
    log(`\n${c?.name} ${c?.args ?? ''} isError=${r.isError}`)
    log('  ' + r.text.slice(0, 200).split('\n').join('\n  '))
  }
  log('\n── THE LAWS ──')
  let failed = 0
  for (const [ok, label] of laws) {
    log(`${ok ? '✓' : '✗'} ${label}`)
    if (!ok) failed++
  }
  process.exit(failed === 0 ? 0 : 1)
}

const skipProvision = process.argv.includes('--no-provision')
if (!skipProvision && !existsSync(join(HOME, 'profiles/headless/node_modules'))) provision()
else if (!skipProvision) provision()
runAgent()
audit()

// The run's own tree is the caller's to reclaim: MTRACE_KEEP=1 keeps
// it for inspection. Every other exit path (a refusal mid-run) leaves
// the tree for the sweeper, whose prefix table carries this name.
if (process.env.MTRACE_KEEP !== '1') {
  rmSync(RUN_ROOT, { recursive: true, force: true })
}
