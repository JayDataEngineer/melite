// estate-drive.mjs — the HEADLESS JOB SERVER proof (2026-09-10 order:
// "a server that accepts jobs and lumps them in the queue").
//
// Boots the estate profile (dsh-base + dsh-sdk-app + the provisioner,
// infer-tools headless) over its own stdio and drives ONE JOB through
// the SDK JSON-RPC wire (three requests: initialize → session/prompt
// → shutdown; notifications stream back — packages/sdk/protocol).
// The job orders an agent-driven card run: melite_flow must fire, the
// job must LAND IN THE ESTATE QUEUE (the lump — the host cordis
// service, in-process), and the run receipt must ride the
// tool/result frame.
//
// Live drive: needs the estate profile's provider credentials (the
// runtime home's env — a spawned `dsh --profile estate`, no second
// process, no :33081). Run:
//   node packages/harness/melite-tools/test/estate-drive.mjs
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const DSH_HOME = '/home/user/Documents/programs/active/inference.cpp/data/runtime/dsh-harness-home'
// provider credentials: the operator's machine env file (the same
// exports the GUI launcher uses). Parsed at spawn time, never copied
// into this file. Without them the provider adapter never mounts and
// initialize answers `no adapter registered for provider "zai"`.
const keyEnv = {}
for (const m of readFileSync('/home/user/start-dsh.sh', 'utf8').matchAll(/^export ([A-Z0-9_]+)="([^"]*)"/gm)) {
  keyEnv[m[1]] = m[2]
}
const SESSION = 'estate-job-' + Date.now().toString(36)
const JOB_TEXT = [
  'Run one test image job now, exactly as specified:',
  'call melite_flow with card="image-gen", model="krea-2",',
  'prompt="estate job server proof — a blue octahedron", test=true.',
  'Then report the draft_id and run_id from the result value.',
].join(' ')

const log = (...a) => console.log('[drive]', ...a)
const frames = []
import { appendFileSync } from 'node:fs'
const RAW = '/tmp/estate-drive-frames.jsonl'
let nextId = 1
const pending = new Map()
let settled = false

try { appendFileSync(RAW, '') } catch {}
const child = spawn('/home/user/.local/bin/dsh', ['--profile', 'estate'], {
  env: {
    ...process.env, ...keyEnv, DSH_HOME,
    // dsh 0.1.2-rc.1 imports out-of-tree melite plugins as TS sources;
    // Node 22.15 needs the flag until the box runs >=22.18.
    NODE_OPTIONS: '--experimental-strip-types',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
})

const send = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++
  pending.set(id, { resolve, reject })
  const frame = JSON.stringify({ jsonrpc: '2.0', id, method, params })
  child.stdin.write(frame + '\n')
})

const onFrame = (line) => {
  if (line.trim() === '') return
  let msg
  try { msg = JSON.parse(line) } catch { return }
  frames.push(msg)
  try { appendFileSync(RAW, line.trimEnd() + '\n') } catch { /* diagnostic only */ }
  if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
    const p = pending.get(msg.id)
    if (p !== undefined) {
      pending.delete(msg.id)
      msg.error !== undefined ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result)
    }
    return
  }
  if (msg.method === 'session.event') {
    const ev = msg.params?.event ?? {}
    const d = ev.data ?? {}
    // tool calls + results are the observable agent surface (payloads
    // ride .data — the session.event envelope is {type,seq,time,data})
    if (ev.type === 'tool/call') log('tool/call', d.name, JSON.stringify(d.args ?? d.input ?? {}).slice(0, 120))
    if (ev.type === 'tool/result') log('tool/result', String(JSON.stringify(d.content ?? d.output ?? '')).slice(0, 160))
  }
  if (msg.method === 'session.status') log('status', msg.params?.status)
}

let buf = ''
child.stdout.on('data', (d) => {
  buf += String(d)
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) { onFrame(buf.slice(0, nl)); buf = buf.slice(nl + 1) }
})
child.stderr.on('data', (d) => {
  const s = String(d).trim()
  if (s !== '') log('stderr:', s.slice(0, 200))
})

const finish = (code, why) => {
  if (settled) return
  settled = true
  try { child.kill('SIGTERM') } catch { /* already gone */ }
  if (code === 0) { log('PASS —', why); process.exit(0) }
  console.error('[drive] FAIL —', why)
  process.exit(code || 1)
}
process.on('SIGTERM', () => finish(1, 'drive killed'))

// ── the drive ─────────────────────────────────────────────────────
try {
  // 1. handshake (the runtime-readiness boundary)
  const init = await send('initialize', {
    cwd: '/home/user/Documents/programs/active/inference.cpp',
    provider: 'opencode-go', model: 'muse-spark-1.3-contributor',
  })
  log('initialized:', init?.serverInfo?.name ?? '?')

  // 2. submit the job (durable enqueue receipt)
  const receipt = await send('session/prompt', {
    sessionId: SESSION,
    contentBlocks: [{ type: 'text', text: JOB_TEXT }],
  })
  log('job queued: messageId', receipt?.messageId)

  // 3. await the agent turn: melite_flow fired AND a run receipt
  //    observed in the tool/result frame (the queue lives in-process
  //    now — no HTTP poll; the dead gateway fetch died 2026-09-10),
  //    max 180s.
  const t0 = Date.now()
  let sawFlowCall = false
  while (Date.now() - t0 < 180_000) {
    await new Promise((r) => setTimeout(r, 2000))
    sawFlowCall = sawFlowCall || frames.some((m) => m.method === 'session.event'
      && m.params?.event?.type === 'tool/call' && m.params?.event?.data?.name === 'melite_flow')
    if (!sawFlowCall) continue
    // the job landed: the tool/result frame carrying a run_id IS the
    // queue receipt (in-process queue — no second surface to poll).
    const flowResult = frames.find((m) => m.method === 'session.event'
      && m.params?.event?.type === 'tool/result'
      && String(JSON.stringify(m.params?.event?.data ?? '')).includes('run-'))
    if (flowResult !== undefined) {
      log('queue receipt observed in tool result')
      await send('shutdown').catch(() => {})
      finish(0, 'job accepted → melite_flow fired → run queued (server + queue live)')
    }
  }
  finish(1, sawFlowCall ? 'flow called but no run receipt in 180s' : 'agent never called melite_flow in 180s')
} catch (e) {
  finish(1, 'drive error: ' + String(e.message).slice(0, 300))
}
