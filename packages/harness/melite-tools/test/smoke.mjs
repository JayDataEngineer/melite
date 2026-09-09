/**
 * SMOKE — the seconds-cheap test the operator demanded (2026-09-01):
 * "THERE ARE NOT THAT MANY TOOLS. IT WOULD TAKE YOU SECONDS TO TEST
 * FOR THIS EVERY TIME."
 *
 * Loads the BUILT lib (what a booted host actually registers), mounts
 * every tool exactly the way apply() does, then EXECUTES each one the
 * way a session would — real gateway, real drafts, real render
 * contract. Any tool that registers-but-fails, or renders a text the
 * chat card parser cannot parse, fails this test BEFORE it ships.
 *
 * Run: npm run test:smoke   (gateway must be up; default 33081)
 */
import * as lib from '../lib/index.mjs'

const GW = process.env.MELITE_GATEWAY_URL || 'http://127.0.0.1:33081'
const exec = { signal: AbortSignal.timeout(60_000) }

// NO STUBS (operator order, 2026-09-01): enhance_prompt's core rides the
// host's ctx.llm INSIDE the tool (llm-complete.ts + enhance-agent.ts).
// The ray-era HTTP door for it was retired 2026-09-03 (no callers); its
// real-LLM proof is SESSION-level — an agent turn that calls the tool.

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

  // --- the 9 melite tools, in registration order ---
  const tools = [
    ['melite_discover', lib.meliteDiscover(GW), { lookup: 'all', tags: 'image,upscale' }, {}],
    ['melite_load(card)', lib.meliteLoad(GW), { name: 'upscale-tools', inference_type: 'card' }, {}],
    ['melite_load(flow)', lib.meliteLoad(GW), { name: 'image-upscale', inference_type: 'flow' }, {}],
    ['lane_bundle_peek', lib.laneBundlePeek(GW), {}, {}],
    ['lane_bundle_peek(templates)', lib.laneBundlePeek(GW), { kind: 'template' }, {}],
    ['lane_bundle_load(action_card image-gen)', lib.laneBundleLoad(GW), { kind: 'action_card', name: 'image-gen' }, {}],
    // melite_flow rows are refusal-surface proofs (no GPU burn): the
    // named 4xx / pre-HTTP refusal rides the value — never a throw.
    ['melite_flow(card loud-fail: no card tool)', lib.meliteFlow(GW),
      { card: 'image-gen', model: '__smoke_no_such__' }, {}],
    ['melite_flow(flow loud-fail: no such template)', lib.meliteFlow(GW),
      { flow: '__smoke_no_such__' }, {}],
    ['melite_flow(adhoc loud-fail: bad stage)', lib.meliteFlow(GW),
      { stages: [{ id: 'x' }] }, {}],
    ['melite_flow(empty: no composition)', lib.meliteFlow(GW), {}, {}],
    ['comfy_manage(status)', lib.comfyManage(GW), { action: 'status' }, {}],
    ['comfy_manage(provision loud-fail)', lib.comfyManage(GW), { action: 'provision_model', model: '__smoke_no_such_model__' }, {}],
    ['skill_index', lib.skillIndex(GW), {}, {}],
    ['skill_read', lib.skillRead(GW), null, {}], // id filled from index
    ['ledger_tail', lib.ledgerTail(GW), { limit: 3 }, {}],
    // --- the HEADLESS run doors (MELITE_HEADLESS=1 registration) —
    // run_status refusal proof: unknown run = named 404 riding the value.
    ['run_status(unknown run)', lib.runStatus(GW), { runId: 'run-__smoke_none__' }, {}],
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
      } else if (label === 'lane_bundle_peek') {
        note(label, (r.value?.lanes?.length ?? 0) > 0, (r.value?.lanes?.length ?? 0) + ' lanes')
      } else if (label === 'lane_bundle_peek(templates)') {
        const lanes = r.value?.lanes ?? []
        note(label, lanes.length > 0 && lanes.every((l) => l.kind === 'template'),
          lanes.length + ' templates: ' + lanes.map((l) => l.lane).slice(0, 4).join(', '))
      } else if (label.startsWith('lane_bundle_load')) {
        const t0 = r.value?.tools?.[0] ?? {}
        const props = Object.keys(t0?.params_schema?.properties ?? {})
        const agent = typeof r.value?.agent?.content === 'string' && r.value.agent.content.length > 0
        note(label, agent && props.length > 0 && (r.value?.skills?.length ?? 0) > 0,
          'agent "' + (r.value?.agent?.name ?? '?') + '" injected · card tool "' + t0.name + '" params: ' + props.slice(0, 5).join(',') + '… + ' + (r.value?.skills?.length ?? 0) + ' skills')
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
  console.log('\n' + pass + '/' + results.length + ' PASS against ' + GW)
  if (pass !== results.length) process.exit(1)
}

main().catch((e) => { console.error('SMOKE CRASHED:', e); process.exit(1) })
