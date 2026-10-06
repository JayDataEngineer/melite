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
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const DSH_HOME = process.env.MELITE_DRIVE_DSH_HOME ??
  '/home/user/Documents/programs/active/inference.cpp/data/runtime/dsh-harness-home'
// provider credentials: the operator's machine env file (the same
// exports the GUI launcher uses). Parsed at spawn time, never copied
// into this file. Without them the provider adapter never mounts and
// initialize answers `no adapter registered for provider "zai"`.
const keyEnv = {}
const KEYENV = process.env.MELITE_DRIVE_KEYENV ?? '/home/user/start-dsh.sh'
for (const m of readFileSync(KEYENV, 'utf8').matchAll(/^export ([A-Z0-9_]+)="([^"]*)"/gm)) {
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
import { appendFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const RAW = '/tmp/estate-drive-frames.jsonl'
let nextId = 1
const pending = new Map()
let settled = false

try { appendFileSync(RAW, '') } catch {}
// LANE LAW (li-bu class, the audit's F-11): no hard-coded machine
// binary — the drive honors DSH_BIN (else `dsh` on PATH) and REFUSES
// a binary below the repo's floor (>=0.2.0-rc.1, the provisioner's
// own pin). A below-floor shell is the banned class (the typert
// codec mismatch burn). The sanctioned door for a lane remains the
// sibling provisioner; this drive only ever proves the estate
// profile the provisioner installed.
const DSH_BIN = process.env.DSH_BIN ?? 'dsh'
const vprobe = spawnSync(DSH_BIN, ['--version'], { encoding: 'utf8' })
const vm = /(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?/.exec((vprobe.stdout ?? '') + ' ' + (vprobe.stderr ?? ''))
const vcur = vm ? [Number(vm[1]), Number(vm[2]), Number(vm[3]), vm[4] !== undefined ? Number(vm[4]) : 1e6] : null
const vfloor = [0, 2, 0, 1]
if (vcur === null || vcur < vfloor) {
  console.error('[drive] ' + DSH_BIN + ' is not a dsh at the version floor (>=0.2.0-rc.1) — boot only through the provision')
  process.exit(1)
}
// the brain adapter rides a machine-local overlay next to the profile
// (pi-ai.patch.yml — gateway rows belong to the machine's key env, the
// same law as the web profile's hand-maintained base; the renderer
// owns cordis.patch.yml, so the overlay stays a sibling it never
// rewrites). --patch is repeatable and applies after the profile layer.
const OVERLAY = join(DSH_HOME, 'profiles', 'estate', 'pi-ai.patch.yml')
const child = spawn(DSH_BIN, ['--profile', 'estate', ...(existsSync(OVERLAY) ? ['--patch', OVERLAY] : [])], {
  env: {
    ...process.env, ...keyEnv, DSH_HOME,
    // dsh 0.1.2-rc.1 imports out-of-tree melite plugins as TS sources;
    // Node 22.15 needs the flag until the box runs >=22.18.
    NODE_OPTIONS: '--experimental-strip-types',
    // The drive owns its OWN runs state root: the queue seat is
    // serial-by-design over one root (one gateway.lock holder), and
    // this box's live studio lane already holds the repo root — a
    // second lane over the same root refuses its queue seat at
    // mount (silently: a non-awaited row) and melite_flow answers
    // ABSENCE. MELITE_STATE_ROOT wins over the repoRoot pin.
    MELITE_STATE_ROOT: join(DSH_HOME, 'estate-drive-runs'),
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
    provider: 'openrouter', model: 'deepseek/deepseek-v4.1-flash',
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
      // 4. hold the lane until the run EXECUTES: the queue's serial
      //    executor lives in this same child — killing it at the
      //    receipt would orphan the queued run (the 2026-10-13
      //    drive-que-then-die: run.queued, no artifacts). The image
      //    receipt is the PNG itself, hashed. test:true runs land
      //    under <state root>/test-output/<run_id>/.
      const runId = (String(flowResult.params?.event?.data?.message?.content?.[0]?.text ?? '')
        .match(/run-[0-9a-f]+-[0-9a-f]+/) ?? [])[0]
      if (runId) {
        const stateRoot = join(DSH_HOME, 'estate-drive-runs')
        const runDir = join(stateRoot, 'test-output', runId)
        const t1 = Date.now()
        // artifacts land NESTED (the comfy executor writes under
        // generate/ inside the run dir) — walk the whole subtree.
        const findImages = (dir) => {
          const out = []
          for (const f of readdirSync(dir, { withFileTypes: true })) {
            if (f.isDirectory()) out.push(...findImages(join(dir, f.name)))
            else if (f.name.endsWith('.png') || f.name.endsWith('.jpg')) out.push(join(dir, f.name))
          }
          return out
        }
        while (Date.now() - t1 < 240_000) {
          await new Promise((r) => setTimeout(r, 3000))
          const pngs = existsSync(runDir) ? findImages(runDir) : []
          if (pngs.length > 0) {
            const bytes = statSync(pngs[0]).size
            const sha = createHash('sha256').update(readFileSync(pngs[0])).digest('hex')
            log('image receipt:', pngs[0].slice(runDir.length + 1), bytes + 'B', 'sha256=' + sha.slice(0, 16))
            await send('shutdown').catch(() => {})
            finish(0, 'job accepted → run executed → image produced (' + runDir + ')')
          }
        }
        finish(1, 'run ' + runId + ' queued but no image in 240s (executor stalled?)')
      }
      await send('shutdown').catch(() => {}
      )
      finish(0, 'job accepted → melite_flow fired → run queued (server + queue live)')
    }
  }
  finish(1, sawFlowCall ? 'flow called but no run receipt in 180s' : 'agent never called melite_flow in 180s')
} catch (e) {
  finish(1, 'drive error: ' + String(e.message).slice(0, 300))
}
