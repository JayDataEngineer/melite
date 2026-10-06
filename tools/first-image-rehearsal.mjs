// first-image-rehearsal.mjs — THE FIRST-IMAGE PLAYBOOK PROOF (the
// runbook: dev_docs/runbooks/first-image-playbook-2026-10-13.md).
//
// Replicates the NEW USER's whole journey against a COLD engine — a
// ComfyUI with ComfyUI-Manager and NOTHING else: no melite packs, no
// model weights in its own tree — and proves every step with a
// byte-level receipt:
//
//   R0 the engine is cold and wired to the store
//   R1 melite_load discloses the weight presence surface
//   R2 the consented provision lands byte-verified (sha256 == DECL pin)
//   R3 the run executes on the cold engine (run.completed + PNG hash)
//
// ONE COMMAND, MACHINE AS FOUND (the release-rehearsal law): PREPARE
// stops this box's stock engine unit (it auto-respawns a bare kill),
// builds + boots the cold clone wired to the estate's shared model
// store; RESTORE (always, even on FAIL) kills the clone and returns
// the stock unit to the state it found it in. Idempotent across runs.
//
// The lane is the estate job server over stdio (the estate-drive
// shape); the three prompts are the user's three asks. Every tool
// frame lands in /tmp/first-image-frames.jsonl for audit.
//
// Machine facts (env, defaults are this box):
//   COMFYUI_URL              engine base (default http://127.0.0.1:8188)
//   COMFYUI_SRC              the stock engine tree to clone from
//   FIRST_IMAGE_ENGINE_TREE  the cold clone's home (scratch)
//   FIRST_IMAGE_STORE        the estate's shared model store
//   FIRST_IMAGE_UNIT         the stock engine's systemd --user unit
//
// Run: node tools/first-image-rehearsal.mjs
import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, createReadStream, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DSH_HOME = process.env.MELITE_DRIVE_DSH_HOME ??
  '/home/user/Documents/programs/active/inference.cpp/data/runtime/dsh-harness-home'
const ENGINE = (process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188').replace(/\/+$/, '')
// the engine's own tree (R0 asserts the tree stays cold; the store
// below is the machine's shared weights root the estate provisions
// into — the engine reaches it through extra_model_paths.yaml)
const ENGINE_TREE = process.env.FIRST_IMAGE_ENGINE_TREE ?? '/var/tmp/melite-scratch/comfyui-cold'
const STORE = process.env.FIRST_IMAGE_STORE ?? '/mnt/data/models/image-gen/comfyui'
const COMFYUI_SRC = process.env.COMFYUI_SRC ?? '/home/user/tools/comfyui'
const STOCK_UNIT = process.env.FIRST_IMAGE_UNIT ?? 'melite-comfyui.service'
const DECL_SHA = '8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1' // krea-2 turbo int8 pin
const DECL_FILE = 'krea2_turbo_int8_convrot.safetensors'
const RAW = '/tmp/first-image-frames.jsonl'

const log = (...a) => console.log('[first-image]', ...a)
const frames = []
const receipts = []
const receipt = (id, name, ok, detail) => {
  receipts.push({ id, name, ok })
  log(`receipt R${id} ${ok ? 'PASS' : 'FAIL'} — ${name}: ${detail}`)
}
// hoisted: the cold engine's exit handler reads it during PREPARE's
// awaits, before the lane section below runs (top-level await pauses
// sequential module evaluation)
let settled = false

// ── key env (the operator's machine env file, parsed at spawn time) ──
const keyEnv = {}
const KEYENV = process.env.MELITE_DRIVE_KEYENV ?? '/home/user/start-dsh.sh'
for (const m of readFileSync(KEYENV, 'utf8').matchAll(/^export ([A-Z0-9_]+)="([^"]*)"/gm)) {
  keyEnv[m[1]] = m[2]
}

// ── PREPARE: the machine as the rehearsal needs it ────────────────
// The stock engine is a systemd --user unit that auto-respawns a bare
// kill (proven live 2026-10-13: kill → a new pid owned the port
// within seconds). Stop the UNIT, remember its prior state, restore
// it in finish() — the machine-as-found law.
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.status !== 0) log('prepare:', cmd, args.join(' '), '→', (r.stderr ?? r.stdout ?? '').slice(0, 120))
  return r
}
let stockWasActive = false
{
  const s = sh('systemctl', ['--user', 'is-active', STOCK_UNIT])
  stockWasActive = (s.stdout ?? '').trim() === 'active'
}
if (stockWasActive) {
  log('PREPARE — stopping the stock engine unit ' + STOCK_UNIT + ' (it auto-respawns a bare kill)')
  sh('systemctl', ['--user', 'stop', STOCK_UNIT])
}
// a stale cold engine from an interrupted run is OURS — dispose of it
{
  const stale = sh('curl', ['-sm', '4', ENGINE + '/customnode/installed'])
  if (stale.status === 0 && (stale.stdout ?? '').startsWith('{"comfyui-manager"')) {
    sh('pkill', ['-f', 'python main.py --listen 127.0.0.1 --port 8188'])
    await new Promise((r) => setTimeout(r, 2000))
  }
}
// build the clone once (same ComfyUI ref as the stock tree, Manager
// only, empty models — untracked weights/packs never ride a clone)
if (!existsSync(join(ENGINE_TREE, 'main.py'))) {
  log('PREPARE — cloning the cold engine from', COMFYUI_SRC)
  mkdirSync(ENGINE_TREE, { recursive: true })
  sh('git', ['clone', '-q', COMFYUI_SRC, ENGINE_TREE])
  mkdirSync(join(ENGINE_TREE, 'custom_nodes'), { recursive: true })
  sh('git', ['clone', '-q', join(COMFYUI_SRC, 'custom_nodes', 'comfyui-manager'), join(ENGINE_TREE, 'custom_nodes', 'comfyui-manager')])
}
// the store wiring (regenerated every run — a generated file is
// never hand-edited, never stale)
writeFileSync(join(ENGINE_TREE, 'extra_model_paths.yaml'), [
  '# generated by first-image-rehearsal — the estate\'s shared model store',
  '# mounted into the cold engine through ComfyUI\'s own wiring door.',
  'melite_store:',
  '  base_path: ' + STORE,
  '  checkpoints: checkpoints',
  '  clip: clip',
  '  clip_vision: clip_vision',
  '  controlnet: controlnet',
  '  diffusion_models: diffusion_models',
  '  loras: loras',
  '  unet: unet',
  '  vae: vae',
  '  upscale_models: upscale_models',
  '  text_encoders: text_encoders',
  ''].join('\n'))
// boot the cold engine and wait for readiness
const PY = join(COMFYUI_SRC, '.venv', 'bin', 'python')
if (!existsSync(PY)) {
  // nothing to restore yet (the unit stop is above, so start it back)
  if (stockWasActive) sh('systemctl', ['--user', 'start', STOCK_UNIT])
  console.error('[first-image] FAIL — no engine venv at ' + PY + ' (set COMFYUI_SRC)')
  process.exit(1)
}
const cold = spawn(PY, ['main.py', '--listen', '127.0.0.1', '--port', '8188', '--extra-model-paths-config', 'extra_model_paths.yaml'], {
  cwd: ENGINE_TREE,
  stdio: ['ignore', 'ignore', 'ignore'],
})
/** Machine as found: kill the clone, return the stock unit to its
 *  prior state. Runs on every exit path (the release-rehearsal law). */
const restore = () => {
  try { cold.kill('SIGTERM') } catch { /* already gone */ }
  if (stockWasActive) {
    log('RESTORE — returning the stock engine unit ' + STOCK_UNIT + ' to active')
    sh('systemctl', ['--user', 'start', STOCK_UNIT])
  } else {
    log('RESTORE — the stock unit was not active before; leaving it stopped')
  }
}
cold.on('exit', () => { if (!settled) { log('cold engine exited during the rehearsal') } })
log('PREPARE — cold engine booting (pid ' + cold.pid + '), waiting for readiness')
{
  const t0 = Date.now()
  let up = false
  while (Date.now() - t0 < 90_000 && !up) {
    await new Promise((r) => setTimeout(r, 2000))
    const probe = sh('curl', ['-sm', '4', ENGINE + '/system_stats'])
    up = probe.status === 0 && (probe.stdout ?? '').includes('comfyui_version')
  }
  if (!up) { restore(); console.error('[first-image] FAIL — cold engine never became ready'); process.exit(1) }
}

// ── R0: the engine is COLD (refuse a warm one — a warm rehearsal
//    proves nothing) ──────────────────────────────────────────────
const j = async (path) => (await fetch(ENGINE + path, { signal: AbortSignal.timeout(8000) })).json()
let sys
try { sys = await j('/system_stats') } catch (e) {
  console.error('[first-image] FAIL — engine not reachable at ' + ENGINE + ' (' + e.message + ')')
  process.exit(1)
}
const packs = Object.keys(await j('/customnode/installed'))
// the store wiring: the engine must RESOLVE store weights through
// extra_model_paths.yaml (the new-user step the first cut missed —
// the estate provisions into the shared store, the ENGINE only sees
// it through the wiring)
const unet = (await j('/object_info/UNETLoader')).UNETLoader.input.required.unet_name[0]
const wired = unet.includes(DECL_FILE)
// the engine's OWN tree stays cold (the store is shared, not copied)
const walk = (dir, pred) => {
  const out = []
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) out.push(...walk(join(dir, f.name), pred))
    else if (pred(f.name)) out.push(join(dir, f.name))
  }
  return out
}
const ownWeights = walk(join(ENGINE_TREE, 'models'), (n) => n.startsWith('krea2'))
const isCold = packs.length === 1 && packs[0] === 'comfyui-manager' && ownWeights.length === 0 && wired
receipt(0, 'engine is cold and wired to the store', isCold,
  `comfyui ${sys.system?.comfyui_version ?? '?'} | packs=[${packs.join(',')}] | own-tree krea2: ${ownWeights.length} | store krea2 via wiring: ${wired}`)
if (!isCold) { restore(); console.error('[first-image] FAIL — R0 unmet (the cold clone booted warm? inspect ' + ENGINE_TREE + ')'); process.exit(1) }

// ── the lane (the estate-drive spawn law, verbatim) ──────────────
const DSH_BIN = process.env.DSH_BIN ?? 'dsh'
const vprobe = spawnSync(DSH_BIN, ['--version'], { encoding: 'utf8' })
const vm = /(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?/.exec((vprobe.stdout ?? '') + ' ' + (vprobe.stderr ?? ''))
const vcur = vm ? [Number(vm[1]), Number(vm[2]), Number(vm[3]), vm[4] !== undefined ? Number(vm[4]) : 1e6] : null
if (vcur === null || vcur < [0, 2, 0, 1]) {
  console.error('[first-image] ' + DSH_BIN + ' is not a dsh at the version floor (>=0.2.0-rc.1)')
  process.exit(1)
}
const OVERLAY = join(DSH_HOME, 'profiles', 'estate', 'pi-ai.patch.yml')
const STATE_ROOT = join(DSH_HOME, 'first-image-runs')
const child = spawn(DSH_BIN, ['--profile', 'estate', ...(existsSync(OVERLAY) ? ['--patch', OVERLAY] : [])], {
  env: {
    ...process.env, ...keyEnv, DSH_HOME,
    NODE_OPTIONS: '--experimental-strip-types',
    // the delegated operator (the run-door law): estate profile
    // config already sets headless:true — this is the same law,
    // explicit at spawn, so the seating never depends on the
    // profile layer alone. (The repo's AGENTS.md agent-mode section
    // — "no melite_flow in this mode" — reaches the lane's context
    // via initialize cwd and can outweigh it; ask 3 names the
    // contract for the same reason.)
    MELITE_HEADLESS: '1',
    // own state root (the queue is serial-by-design over one root;
    // the studio lane holds the repo root — see the estate drive)
    MELITE_STATE_ROOT: STATE_ROOT,
  },
  stdio: ['pipe', 'pipe', 'pipe'],
})
let nextId = 1
let buf = ''
const pending = new Map()
const send = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++
  pending.set(id, { resolve, reject })
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
})
const finish = (code, why) => {
  if (settled) return
  settled = true
  try { child.kill('SIGTERM') } catch { /* already gone */ }
  restore()
  if (code === 0) log('PASS —', why)
  else console.error('[first-image] FAIL —', why)
  process.exit(code || 1)
}
process.on('SIGTERM', () => finish(1, 'rehearsal killed'))
child.on('exit', (c) => { if (!settled) finish(1, 'lane exited early, code ' + c) })
child.stdout.on('data', (d) => {
  buf += String(d)
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) { onFrame(buf.slice(0, nl)); buf = buf.slice(nl + 1) }
})
child.stderr.on('data', (d) => {
  const s = String(d).trim()
  if (s !== '') log('lane stderr:', s.slice(0, 160))
})
function onFrame(line) {
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
    if (ev.type === 'tool/call') log('tool/call', ev.data?.name, JSON.stringify(ev.data?.args ?? '').slice(0, 100))
    if (ev.type === 'tool/result') log('tool/result', JSON.stringify(ev.data?.content ?? ev.data ?? '').slice(0, 140))
  }
}

/** Await the agent turn's end: the first session.status=idle frame
 * past the mark (frames arrive in order). @param {number} mark @param {number} ms */
const waitIdle = async (mark, ms) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    await new Promise((r) => setTimeout(r, 2000))
    for (let i = mark; i < frames.length; i++) {
      if (frames[i].method === 'session.status' && frames[i].params?.status === 'idle') return true
    }
  }
  return false
}
const toolResultsSince = (mark) => frames.slice(mark)
  .filter((m) => m.method === 'session.event' && m.params?.event?.type === 'tool/result')
  .map((m) => JSON.stringify(m.params.event.data ?? {}))

// ── the journey ───────────────────────────────────────────────────
try {
  const init = await send('initialize', {
    cwd: '/home/user/Documents/programs/active/inference.cpp',
    provider: 'openrouter', model: 'deepseek/deepseek-v4.1-flash',
  })
  log('initialized:', init?.serverInfo?.name ?? '?')
  const SESSION = 'first-image-' + Date.now().toString(36)
  const ask = (text) => send('session/prompt', { sessionId: SESSION, contentBlocks: [{ type: 'text', text }] })

  // ASK 1 — the user asks for an image; the agent must SEE the gap at
  // load time (R1: krea-2 offered present:false, before any run).
  {
    const mark = frames.length
    const r = await ask([
      'I just installed everything. Before running anything:',
      'call melite_load with name="image-gen", inference_type="card",',
      'then quote its model_hints and pack_hints tables verbatim.',
    ].join(' '))
    log('ask 1 queued:', r?.messageId)
    if (!(await waitIdle(mark, 240_000))) finish(1, 'ask 1 never went idle in 240s')
    // the hint surface is PROSE (the first cut hunted a JSON row the
    // bundle never emits): the presence line "weights: N/M boarded
    // checkpoints present" + the krea-2 lane row. The OFFER is the
    // mechanism — on a truly empty store N < M names the gap; here
    // the receipt proves the surface fires and is quotable.
    const rows = toolResultsSince(mark)
    const loadRow = rows.find((t) => t.includes('krea-2'))
    const presenceLine = loadRow !== undefined ? /weights: \d+\/\d+ boarded checkpoints present/.exec(loadRow) : null
    receipt(1, 'melite_load discloses the weight presence surface', loadRow !== undefined && presenceLine !== null,
      presenceLine !== null ? '"' + presenceLine[0] + '" + lane krea-2 row observed in the tool frame' : 'no presence line in load result')
  }

  // ASK 2 — consent given: provision through the estate's own door at
  // the full rail (timeout_seconds 850). R2 verifies BYTES on disk.
  {
    const mark = frames.length
    const r = await ask([
      'Yes, download it. Call comfy_manage with action="provision_model",',
      'model="krea-2", timeout_seconds=850 — then report the result state.',
    ].join(' '))
    log('ask 2 queued:', r?.messageId)
    if (!(await waitIdle(mark, 1_500_000))) finish(1, 'ask 2 never went idle in 1500s (provision hung?)')
    // the estate provisions into the SHARED STORE (the writer root —
    // inference.config.json's models roots), never the engine's own
    // tree; the engine reaches the store through the wiring R0 proved.
    const landed = walk(STORE, (n) => n === DECL_FILE)
    if (landed.length === 0) {
      receipt(2, 'provision lands byte-verified', false, DECL_FILE + ' never landed in the engine models tree')
    } else {
      const bytes = statSync(landed[0]).size
      const h = createHash('sha256')
      await new Promise((resolve, reject) => {
        createReadStream(landed[0]).on('data', (c) => h.update(c)).on('end', resolve).on('error', reject)
      })
      const sha = h.digest('hex')
      receipt(2, 'provision lands byte-verified', sha === DECL_SHA,
        `${landed[0].slice(ENGINE_TREE.length + 1)} ${bytes}B sha256=${sha.slice(0, 16)} (decl ${DECL_SHA.slice(0, 16)})`)
    }
  }

  // ASK 3 — the run (R3): the run id, the ledger's completed row, and
  // the PNG receipt — bytes + sha256 — under the drive's state root.
  {
    const mark = frames.length
    const r = await ask([
      'Run it now. This is a HEADLESS JOB LANE — you are the delegated',
      'operator and melite_flow IS in your tools (the agent-mode',
      '"runs start at the user press" contract is for browser lanes).',
      'Call melite_flow with card="image-gen", model="krea-2",',
      'prompt="first image on a cold machine — a blue octahedron", test=true.',
      'Report the run_id.',
    ].join(' '))
    log('ask 3 queued:', r?.messageId)
    if (!(await waitIdle(mark, 300_000))) finish(1, 'ask 3 never went idle in 300s')
    const rows = toolResultsSince(mark)
    const runRow = rows.find((t) => /run-[0-9a-f]+-[0-9a-f]+/.test(t))
    if (runRow === undefined) {
      receipt(3, 'the run executes on the cold engine', false, 'no run id in any tool result')
      finish(1, receipts.some((x) => !x.ok) ? 'receipts above' : 'unknown')
    }
    const runId = (runRow.match(/run-[0-9a-f]+-[0-9a-f]+/) ?? [])[0]
    log('run receipt:', runId)
    const runDir = join(STATE_ROOT, 'test-output', runId)
    const t1 = Date.now()
    let png = null
    while (Date.now() - t1 < 300_000) {
      await new Promise((res) => setTimeout(res, 3000))
      const pngs = existsSync(runDir) ? walk(runDir, (n) => n.endsWith('.png') || n.endsWith('.jpg')) : []
      if (pngs.length > 0) { png = pngs[0]; break }
    }
    if (png === null) {
      receipt(3, 'the run executes on the cold engine', false, 'run ' + runId + ' produced no image in 300s')
      finish(1, 'receipts above')
    }
    const bytes = statSync(png).size
    const sha = createHash('sha256').update(readFileSync(png)).digest('hex')
    const ledger = readFileSync(join(STATE_ROOT, 'output', '_ledger.jsonl'), 'utf8')
    const completed = /run\.completed/.test(ledger)
    receipt(3, 'the run executes on the cold engine', completed,
      `${runId} | ledger run.completed=${completed} | ${png.slice(runDir.length + 1)} ${bytes}B sha256=${sha.slice(0, 16)}`)
  }

  await send('shutdown').catch(() => {})
  const bad = receipts.filter((x) => !x.ok)
  finish(bad.length === 0 ? 0 : 1, bad.length === 0
    ? 'the first-image playbook held: R0-R3 green on a cold engine'
    : 'failed receipts: ' + bad.map((x) => 'R' + x.id).join(', '))
} catch (e) {
  finish(1, 'rehearsal error: ' + String(e.message).slice(0, 300))
}
