/**
 * SMOKE — the seconds-cheap test the operator demanded (2026-09-01):
 * "THERE ARE NOT THAT MANY TOOLS. IT WOULD TAKE YOU SECONDS TO TEST
 * FOR THIS EVERY TIME."
 *
 * THE GATEWAY KILL (2026-09-10): the smoke's HTTP target died with
 * the gateway — no :33081, no second process. The estate answers
 * IN-PROCESS now: this rig boots the storage stack + the estate row
 * (the same rows the profiles mount), builds the tools' request over
 * makeEstateRequest(ctx), then EXECUTES each tool the way a session
 * would. Any tool that registers-but-fails, or renders a text the
 * chat card parser cannot parse, fails this test BEFORE it ships.
 *
 * Run: npm run test:smoke   (in-process; the engine is live where
 * the host runs it — comfy_manage status answers the live truth)
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as lib from '../src/index.ts'

const { Context } = await import('../../../../packages/estate/drafts/node_modules/@deepseek-ai/cordis/lib/index.js')
const { default: timerPlugin } = await import('../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis-plugin-timer/lib/index.js')
const { default: Storage } = await import('../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage/lib/index.js')
const { default: estateRow } = await import('../../../web/melite-estate/src/index.ts')
const json = await import('../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-json/lib/index.js')
const domain = await import('../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-domain/lib/index.js')
const { makeEstateRequest } = await import('../src/estate.ts')

// Boot the estate in-process: the storage stack (composition-site
// law — the consumer row never re-provides it) + the estate row.
const stateRoot = mkdtempSync(join(tmpdir(), 'smoke-estate-'))
process.env.MELITE_STATE_ROOT = stateRoot
process.env.MELITE_STORAGE_ROOT = ''
const ctx = new Context()
await ctx.plugin(timerPlugin)
await ctx.plugin(Storage)
await ctx.plugin(
  { name: json.name, inject: json.inject, apply: json.apply, Config: json.Config },
  { root: join(stateRoot, 'storage') },
)
await ctx.plugin(
  { name: domain.name, inject: domain.inject, apply: domain.apply, Config: domain.Config },
  { backend: 'json' },
)
await ctx.plugin(estateRow)
// SETTLE (the estate row fans out without awaiting: the async
// card-registry prime gates disclose/load/runs via inject — a tool
// that runs before they register gets a LOUD no-remote refusal
// riding its {error} value, not a throw). Poll for the seats.
{
  const want = ['disclose', 'load', 'skills', 'queue', 'manage', 'runs', 'cardRegistry']
  const t0 = Date.now()
  for (;;) {
    const missing = want.filter((s) => {
      try { return ctx.get(s, false) === undefined } catch { return true }
    })
    if (missing.length === 0) break
    if (Date.now() - t0 > 120_000) throw new Error('estate seats never settled, missing: ' + missing.join(','))
    await new Promise((r) => setTimeout(r, 250))
  }
}
const request = makeEstateRequest(ctx)
const exec = { signal: AbortSignal.timeout(60_000) }

// NO STUBS (operator order, 2026-09-01): enhance_prompt's core rides the
// host's ctx.llm INSIDE the tool (llm-complete.ts + enhance-agent.ts).
// Its real-LLM proof is SESSION-level — an agent turn that calls the tool.

const results = []
const note = (name, ok, detail) => { results.push({ name, ok, detail }) }

async function runTool(tool, args, label) {
  // CONTRACT 1: registration shape — name, description, parameters root,
  // output {schema, render}. A malformed tool never reaches a session.
  const shapeOk = typeof tool?.name === 'string' && tool.name.length > 0
    && typeof tool?.description === 'string' && tool.description.length > 40
    && tool?.parameters?.type === 'object'
    && tool?.parameters?.properties && typeof tool.parameters.properties === 'object'
    && tool?.output?.schema && typeof tool?.output?.render === 'function'
  if (!shapeOk) throw new Error(label + ': malformed registration shape')

  // CONTRACT 2: execution — the exact call a session makes.
  const value = await tool.execute(args, exec)

  // CONTRACT 3: render — the text the chat card parser sees.
  const parts = tool.output.render(args, value)
  const text = Array.isArray(parts) ? parts.map((p) => p?.text ?? '').join('\n') : ''
  return { value, text }
}

const main = async () => {
  let skillId = ''

  // --- the melite tools, in registration order (request = the
  //     estate's own lane grammar over the ctx seats) ---
  const tools = [
    ['melite_discover', lib.meliteDiscover(request), { lookup: 'all', tags: 'image,upscale' }, {}],
    ['melite_load(card)', lib.meliteLoad(request), { name: 'upscale-tools', inference_type: 'card' }, {}],
    ['melite_load(flow)', lib.meliteLoad(request), { name: 'image-upscale', inference_type: 'flow' }, {}],
    ['melite_construct(read: births the bench)', lib.meliteConstruct(request), { verb: 'read' }, {}],
    ['melite_construct(bad verb refuses)', lib.meliteConstruct(request), { verb: 'explode' }, {}],
    // melite_flow rows are refusal-surface proofs (no GPU burn): the
    // named 4xx / pre-HTTP refusal rides the value — never a throw.
    ['melite_flow(card loud-fail: no card tool)', lib.meliteFlow(request),
      { card: 'image-gen', model: '__smoke_no_such__' }, {}],
    ['melite_flow(flow loud-fail: no such template)', lib.meliteFlow(request),
      { flow: '__smoke_no_such__' }, {}],
    ['melite_flow(adhoc loud-fail: bad stage)', lib.meliteFlow(request),
      { stages: [{ id: 'x' }] }, {}],
    ['melite_flow(empty: no composition)', lib.meliteFlow(request), {}, {}],
    ['comfy_manage(status)', lib.comfyManage(request), { action: 'status' }, {}],
    ['comfy_manage(provision loud-fail)', lib.comfyManage(request), { action: 'provision_model', model: '__smoke_no_such_model__' }, {}],
    ['skill_index', lib.skillIndex(request), {}, {}],
    ['skill_read', lib.skillRead(request), null, {}], // id filled from index
    ['ledger_tail', lib.ledgerTail(request), { limit: 3 }, {}],
    // --- the HEADLESS run doors (MELITE_HEADLESS=1 registration) —
    // run_status refusal proof: unknown run = named 404 riding the value.
    ['run_status(unknown run)', lib.runStatus(request), { runId: 'run-__smoke_none__' }, {}],
  ]

  for (const [label, tool, args, _] of tools) {
    try {
      if (label === 'skill_read') {
        if (skillId === '') throw new Error('no skill id from skill_index')
        const r = await runTool(tool, { id: skillId }, label)
        note(label, typeof r.value?.body === 'string' || typeof r.text === 'string', 'body loaded')
        continue
      }
      if (label === 'comfy_manage(status)') {
        const r = await runTool(tool, args, label)
        note(label, r.value?.ok === true && typeof r.value?.detail === 'string',
             String(r.value?.detail ?? ''))
        continue
      }
      if (label.startsWith('melite_flow(')) {
        // CONTRACT: the unified verb refuses LOUD on every bad
        // composition — the named refusal rides the value, never a
        // throw; the render names the refusal for the chat parser.
        const r = await runTool(tool, args, label)
        const ok = typeof r.value?.error === 'string' && r.value.error.length > 0
          && r.text.includes('REFUSED')
        note(label, ok, 'refused: ' + String(r.value?.error ?? '').slice(0, 70))
        continue
      }
      if (label.startsWith('run_status(')) {
        // CONTRACT: unknown run = named 404 riding the value.
        const r = await runTool(tool, args, label)
        note(label, String(r.value?.error ?? '').includes('unknown run_id'),
             'refused: ' + String(r.value?.error ?? ''))
        continue
      }
      if (label === 'comfy_manage(provision loud-fail)') {
        // Its CONTRACT is a surfaced refusal naming the model (not a throw —
        // the SSOT's 404 body rides the value).
        const r = await runTool(tool, args, label)
        note(label, r.value?.ok === false && String(r.value?.detail ?? '').includes('__smoke_no_such_model__'),
             'refused with the model named')
        continue
      }
      const r = await runTool(tool, args, label)
      if (label === 'melite_discover') {
        note(label, (r.value?.cards?.length ?? 0) > 0 && r.value.cards.some((c) => c.id === 'upscale-tools'), 'upscale-tools retrieved by tags')
      } else if (label === 'melite_load(card)') {
        const b = r.value?.bundle ?? {}
        note(label, Object.keys(b).join() === 'name,kind,signature,agents,skills,model_hints,digest' && b.name === 'upscale-tools', 'the card bundle')
      } else if (label === 'melite_load(flow)') {
        const b = r.value?.bundle ?? {}
        const sig = b.signature ?? {}
        note(label, b.name === 'image-upscale' && sig.name === 'image_upscale' && (b.stages?.length ?? 0) === 2, 'the prebuilt signature + stages')
      } else if (label === 'skill_index') {
        const skills = r.value?.skills ?? []
        skillId = skills[0]?.id ?? ''
        note(label, skills.length > 0, skills.length + ' skills; first: ' + skillId)
      } else if (label === 'ledger_tail') {
        note(label, Array.isArray(r.value?.entries), 'ledger readable')
      } else {
        note(label, true, r.text.slice(0, 50))
      }
    } catch (e) {
      note(label, false, 'THREW: ' + String(e?.message ?? e).slice(0, 120))
    }
  }

  // --- report ---
  const pass = results.filter((r) => r.ok).length
  for (const r of results) {
    console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name.padEnd(26) + ' ' + r.detail)
  }
  console.log('\n' + pass + '/' + results.length + ' PASS against the in-process estate seats')
  if (pass !== results.length) process.exit(1)
}

main().catch((e) => { console.error('SMOKE CRASHED:', e); process.exit(1) })
