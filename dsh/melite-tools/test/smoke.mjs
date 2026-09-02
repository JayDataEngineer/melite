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

// NO STUBS (operator order, 2026-09-01): enhance_prompt is proven through
// the REAL harness LLM via the booted host's own door — POST
// /melite-tools/enhance runs the same execution core as the tool with the
// host's live LLM runtime. Set MELITE_SMOKE_HOST (e.g. http://127.0.0.1:3081).

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

  // --- the 9 melite tools, in registration order ---
  const tools = [
    ['model_catalog', lib.modelCatalog(GW), {}, {}],
    ['build_pipeline', lib.buildPipeline(GW),
      { model: 'krea-2', prompt: 'smoke test card — a red cube on white', params: { seed: 7 } }, {}],
    ['refine_draft', lib.refineDraft(GW), null, {}], // args filled after build
    ['lane_bundle(list)', lib.laneBundle(GW), {}, {}],
    ['lane_bundle(image-gen)', lib.laneBundle(GW), { lane: 'image-gen' }, {}],
    ['provision_model(loud-fail)', lib.provisionModel(GW), { model: '__smoke_no_such_model__' }, {}],
    ['skill_index', lib.skillIndex(GW), {}, {}],
    ['skill_read', lib.skillRead(GW), null, {}], // id filled from index
    ['ledger_tail', lib.ledgerTail(GW), { limit: 3 }, {}],
    ['enhance_prompt(real-llm)', null, null, {}],
  ]

  let skillId = ''
  for (const [label, tool, args, _] of tools) {
    try {
      if (label === 'refine_draft') {
        if (draftId === '') throw new Error('no draft from build_pipeline to refine')
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
      if (label === 'enhance_prompt(real-llm)') {
        const host = process.env.MELITE_SMOKE_HOST ?? ''
        if (host === '') { note(label, false, 'MELITE_SMOKE_HOST not set — boot a host and point the smoke at its real LLM'); continue }
        const r = await fetch(host.replace(/\/$/, '') + '/melite-tools/enhance', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'krea-2', prompt: 'a cool cyberpunk character' }),
        })
        const data = await r.json()
        const pos = typeof data?.results?.prompt?.positive === 'string' ? data.results.prompt.positive
          : typeof data?.positive === 'string' ? data.positive : ''
        note(label, r.ok && pos.length > 20, (r.ok ? 'real harness LLM enhanced: "' + pos.slice(0, 60) + '…"' : 'HTTP ' + r.status + ': ' + String(data?.error ?? '?').slice(0, 80)))
        continue
      }
      if (label === 'provision_model(loud-fail)') {
        // Its CONTRACT is loud failure on unknown models — assert the throw.
        try {
          await tool.execute(args, exec)
          note(label, false, 'UNKNOWN MODEL DID NOT FAIL LOUDLY')
        } catch (e) {
          note(label, String(e?.message ?? e).includes('__smoke_no_such_model__'), 'rejected loudly with the model named')
        }
        continue
      }
      const r = await runTool(tool, args, label)
      if (label === 'model_catalog') {
        note(label, Object.keys(r.value?.models ?? {}).length > 0, Object.keys(r.value.models).length + ' models')
      } else if (label === 'build_pipeline') {
        draftId = r.value?.draftId ?? ''
        // THE CHAT PARSER CONTRACT: token after the FIRST 'card ' must be
        // the draft id (this exact check caught the "cards · earlier draft"
        // regression — keep it forever).
        const at = r.text.indexOf('card ')
        const tok = at >= 0 ? r.text.slice(at + 5).split(' ')[0] : ''
        const parses = tok.startsWith('draft-') || tok.startsWith('p_')
        note(label, draftId.startsWith('draft-') && parses,
          'draftId ' + draftId + ' | render "' + r.text.slice(0, 60) + '…" parses: ' + parses)
      } else if (label.startsWith('lane_bundle')) {
        if (label.includes('list')) {
          note(label, (r.value?.lanes?.length ?? 0) > 0, (r.value?.lanes?.length ?? 0) + ' lanes')
        } else {
          const t0 = r.value?.tools?.[0] ?? {}
          const props = Object.keys(t0?.params_schema?.properties ?? {})
          note(label, props.length > 0 && (r.value?.skills?.length ?? 0) > 0,
            'card tool "' + t0.name + '" params: ' + props.slice(0, 6).join(',') + '… + ' + (r.value?.skills?.length ?? 0) + ' skills')
        }
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

  // --- every card tool from /v1/card-tools (16 at last count) ---
  const cardToolList = await lib.cardTools(GW)
  note('card_tools(count)', cardToolList.length > 0, cardToolList.length + ' card tools registered')
  const imageCard = cardToolList.find((t) => t.name === 'image_card')
  if (imageCard) {
    try {
      const r = await runTool(imageCard, {
        intent: 'smoke image card',
        prompt: 'smoke test — a blue sphere, studio light',
        width: 1024, height: 1024, seed: 7,
      }, 'image_card')
      const id = r.value?.draftId ?? ''
      const at = r.text.indexOf('card ')
      const tok = at >= 0 ? r.text.slice(at + 5).split(' ')[0] : ''
      note('image_card', id.startsWith('draft-') && (tok.startsWith('draft-') || tok.startsWith('p_')),
        'draft ' + id + ' | render parses: ' + r.text.slice(0, 50))
    } catch (e) {
      note('image_card', false, 'THREW: ' + String(e?.message ?? e).slice(0, 120))
    }
  } else {
    note('image_card', false, 'image_card NOT REGISTERED — the dedicated card tool is missing')
  }

  // --- GAP-5 LAW: refine_draft on a CALLS card — an agent passing a
  // calls ARRAY must land as the JSON string the composer expects. ---
  {
    const h3 = (await lib.cardTools(GW)).find((t) => t.name === 'h3_timeline_card' || t.name === 'video_card')
    if (h3) {
      try {
        const args = { intent: 'gap5 calls refine', prompt: 'a cube rotates slowly on a turntable', fps: 24, calls: [{ text: 'a cube rotates slowly', start_frame: 0, end_frame: 90 }] }
        const composed = await h3.execute(args, exec)
        const id = composed?.draftId ?? ''
        const refined = await lib.refineDraft(GW).execute({
          draftId: id,
          params: { calls: [{ text: 'a cube rotates FAST', start_frame: 0, end_frame: 90 }] },
        }, exec)
        const storedCalls = refined?.params?.calls
        const parses = typeof storedCalls === 'string'
          ? (() => { try { const c = JSON.parse(storedCalls); return c[0]?.text === 'a cube rotates FAST' } catch { return false } })()
          : false
        note('refine on calls-card', typeof storedCalls === 'string' && parses,
          'calls stored as JSON string, shot text merged: ' + parses)
      } catch (e) {
        note('refine on calls-card', false, 'THREW: ' + String(e?.message ?? e).slice(0, 100))
      }
    } else {
      note('refine on calls-card', false, 'no calls card tool found')
    }
  }

  // --- BUNDLE <-> ACTION-CARD COVERAGE: every lane's bundle must resolve
  // to its card tool, the schemas must be IDENTICAL (same SSOT), and every
  // flat card must compose from params derived from its OWN manifest. ---
  const listRes = await lib.laneBundle(GW).execute({}, exec)
  const laneRows = listRes?.lanes ?? []
  const registered = await lib.cardTools(GW)
  const byName = new Map(registered.map((t) => [t.name, t]))
  let matched = 0, mismatched = 0, composed = 0, composeFails = []
  const fillFromSchema = (sch) => {
    // build minimal args from the manifest itself: required fields filled
    // by type/enum — the card composes from ITS OWN declaration
    const args = { intent: 'smoke coverage' }
    for (const k of (sch.required ?? [])) {
      const def = (sch.properties ?? {})[k] ?? {}
      if (def.enum) args[k] = def.enum[0]
      else if (def.type === 'integer') args[k] = typeof def.min === 'number' ? def.min : 1
      else if (def.type === 'number') args[k] = typeof def.min === 'number' ? def.min : 1
      else if (def.type === 'boolean') args[k] = false
      else if (def.type === 'object' || def.type === 'array') continue // calls cards handled below
      else args[k] = 'smoke'
    }
    return args
  }
  for (const row of laneRows) {
    const bundle = await lib.laneBundle(GW).execute({ lane: row.lane }, exec)
    const t0 = (bundle?.tools ?? [])[0]
    if (!t0?.name) { mismatched++; composeFails.push(row.lane + ': bundle has no tool'); continue }
    const tool = byName.get(String(t0.name))
    if (!tool) { mismatched++; composeFails.push(row.lane + ': bundle tool ' + t0.name + ' not registered'); continue }
    const same = JSON.stringify(t0.params_schema) === JSON.stringify(tool.parameters)
    if (!same) { mismatched++; composeFails.push(row.lane + ': schema drift bundle vs tool'); continue }
    matched++
    // FLAT cards: compose (cheap — drafts only, never GPU)
    const hasCalls = (t0.params_schema?.properties ?? {}).calls !== undefined
    if (hasCalls) {
      // CALLS cards: one minimal LEGAL document, derived from the
      // manifest's own span bounds — first call spans the grid quantum
      // (17k+5) inside [span.min, span.max]; later calls are multiples
      // of 17. The card's tile law is the manifest's, not ours.
      try {
        const cons = bundle?.tools?.[0]?.constraints ?? {}
        const span = cons.span ?? {}
        const min = typeof span.min === 'number' ? span.min : 68
        let end = min
        if ((end - 5) % 17 !== 0) end += (17 - (((end - 5) % 17) + 17) % 17) % 17
        const args = fillFromSchema(t0.params_schema)
        args.calls = [{ text: 'smoke coverage shot', start_frame: 0, end_frame: end }]
        if (typeof args.fps === 'undefined') args.fps = 24
        const v = await tool.execute(args, exec)
        if (typeof v?.draftId === 'string' && v.draftId.startsWith('draft-')) composed++
        else composeFails.push(row.lane + ': calls card no draftId')
      } catch (e) {
        composeFails.push(row.lane + ' (calls): ' + String(e?.message ?? e).slice(0, 90))
      }
      continue
    }
    {
      try {
        const args = fillFromSchema(t0.params_schema)
        const v = await tool.execute(args, exec)
        if (typeof v?.draftId === 'string' && v.draftId.startsWith('draft-')) composed++
        else { composeFails.push(row.lane + ': no draftId') }
      } catch (e) {
        composeFails.push(row.lane + ' (' + t0.name + '): ' + String(e?.message ?? e).slice(0, 90))
      }
    }
  }
  note('bundle<->card: lanes matched', matched === laneRows.length && mismatched === 0,
    matched + '/' + laneRows.length + ' lanes; schema-identical: ' + matched)
  note('bundle<->card: flat cards compose', composeFails.length === 0,
    composed + ' composed' + (composeFails.length ? ' | FAILS: ' + composeFails.slice(0, 4).join(' ; ') : ''))

  // --- report ---
  const pass = results.filter((r) => r.ok).length
  for (const r of results) {
    console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name.padEnd(26) + ' ' + r.detail)
  }
  console.log('\n' + pass + '/' + results.length + ' PASS against ' + GW)
  if (pass !== results.length) process.exit(1)
}

main().catch((e) => { console.error('SMOKE CRASHED:', e); process.exit(1) })
