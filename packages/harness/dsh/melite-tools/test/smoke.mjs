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
  let draftId = ''
  let skillId = ''

  // --- the 9 melite tools, in registration order ---
  const tools = [
    ['model_catalog', lib.modelCatalog(GW), {}, {}],
    ['lane_bundle_peek', lib.laneBundlePeek(GW), {}, {}],
    ['lane_bundle_peek(templates)', lib.laneBundlePeek(GW), { kind: 'template' }, {}],
    ['lane_bundle_load(action_card image-gen)', lib.laneBundleLoad(GW), { kind: 'action_card', name: 'image-gen' }, {}],
    ['build_flow', lib.buildFlow(GW),
      { model: 'krea-2', prompt: 'smoke test card — a red cube on white', params: { seed: 7 } }, {}],
    ['refine_draft', lib.refineDraft(GW), null, {}], // args filled after build
    ['comfy_manage(status)', lib.comfyManage(GW), { action: 'status' }, {}],
    ['comfy_manage(provision loud-fail)', lib.comfyManage(GW), { action: 'provision_model', model: '__smoke_no_such_model__' }, {}],
    ['skill_index', lib.skillIndex(GW), {}, {}],
    ['skill_read', lib.skillRead(GW), null, {}], // id filled from index
    ['ledger_tail', lib.ledgerTail(GW), { limit: 3 }, {}],
    // --- the HEADLESS run doors (MELITE_HEADLESS=1 registration) —
    // refusal-surface proofs: no GPU burn, the named 4xx rides the value.
    ['card_run(loud-fail: no such draft)', lib.cardRun(GW), { draftId: 'draft-__smoke_no_such__' }, {}],
    ['flow_run(loud-fail: no such template)', lib.flowRun(GW), { template: '__smoke_no_such__' }, {}],
    ['run_status(unknown run)', lib.runStatus(GW), { runId: 'run-__smoke_none__' }, {}],
  ]

  for (const [label, tool, args, _] of tools) {
    try {
      if (label === 'refine_draft') {
        if (draftId === '') throw new Error('no draft from build_flow to refine')
        const r = await runTool(tool, { draftId, params: { seed: 9 } }, label)
        note(label, r.value?.card === 'draft' && r.value?.draftId === draftId, 'merged in place')
        continue
      }
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
      if (label.startsWith('card_run(')) {
        // CONTRACT: a named refusal rides the value (draft not found) — never a throw.
        const r = await runTool(tool, args, label)
        note(label, r.value?.error === 'draft not found' && r.text.includes('REFUSED'),
             'refused: ' + String(r.value?.error ?? ''))
        continue
      }
      if (label.startsWith('flow_run(')) {
        // CONTRACT: QUEUE LANE LAW — unknown template = named 4xx BEFORE registration.
        const r = await runTool(tool, args, label)
        note(label, String(r.value?.error ?? '').includes('__smoke_no_such__') && r.text.includes('REFUSED'),
             'refused: ' + String(r.value?.error ?? '').slice(0, 70))
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
      if (label === 'model_catalog') {
        note(label, Object.keys(r.value?.models ?? {}).length > 0, Object.keys(r.value.models).length + ' models')
      } else if (label === 'build_flow') {
        draftId = r.value?.draftId ?? ''
        // THE CHAT PARSER CONTRACT: token after the FIRST 'card ' must be
        // the draft id (this exact check caught the "cards · earlier draft"
        // regression — keep it forever).
        const at = r.text.indexOf('card ')
        const tok = at >= 0 ? r.text.slice(at + 5).split(' ')[0] : ''
        const parses = tok.startsWith('draft-') || tok.startsWith('p_')
        note(label, draftId.startsWith('draft-') && parses,
          'draftId ' + draftId + ' | render "' + r.text.slice(0, 60) + '…" parses: ' + parses)
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
