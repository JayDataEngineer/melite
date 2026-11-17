// l2-journey-driver.mjs — the L2 composite wall's driver: boots the
// REAL estate with one family package pruned (the resolve hook
// registered by --import; MELITE_L2_PRUNE names it, default music3)
// and drives the card-without-family journey, printing one JSON
// verdict line per hop.
//
//   load-serve   — bootModels arms the seat WITHOUT the pruned
//                  family (retired alone, NAMED in the log — the
//                  voice is captured and judged, never swallowed);
//                  a survivor proves the boot itself lived.
//   form-open    — the card plane serves: loadCardDefs answers with
//                  the music card (and under a flavor-bearing prune
//                  like krea-2, the flavor table retired its rows
//                  alone — the mod plane never dies for a family).
//   add_stage    — the queue's compose admission accepts the music
//                  stage (prepare lands; nothing dies at boarding).
//   run-refusal  — composing a music3-family model REFUSES LOUD
//                  naming 'music3' (the seat's own voice).
//
//   When MELITE_L2_PRUNE names a family other than music3 (the
//   krea-2 flavor-bearing arm), only load-serve and form-open run —
//   the compose hops are the music3 journey's own.
const PRUNE = process.env.MELITE_L2_PRUNE ?? 'music3'
const verdicts = []
const say = (hop, ok, detail) => {
  verdicts.push({ hop, ok, detail })
  console.log(JSON.stringify({ hop, ok, detail }))
}

// THE ANCHOR LAW (2026-11-17): the driver resolves through the REPO
// it drives — never createRequire(import.meta.url) from its own seat
// (a /tmp or fixtures home has no workspace node_modules above it, so
// every @melite/* resolve dies ENOENT before the journey starts). The
// wall spawns this driver with cwd = the repo root (the same anchor
// every lane script uses); the built lib JS is the plane the bench
// executes (source .ts imports are vitest's world, not plain node's).
import { realpathSync } from 'node:fs'
const root = realpathSync(process.env.MELITE_REPO_ROOT ?? process.cwd())
const cordis = `${root}/packages/engines/comfyui-cordis`

// ── hop 1: load-serve (the boot isolates the dead family) ──
try {
  const { bootModels } = await import(`${cordis}/lib/models/service.js`).catch(() => ({}))
  if (typeof bootModels !== 'function') throw new Error('bootModels not reachable from the engine lib')
  // THE VOICE CAPTURE: the retired-alone warn must NAME the family —
  // an absence swallowed silently is a cure nobody can operate.
  const warnings = []
  const realWarn = console.warn
  console.warn = (...args) => { warnings.push(args.join(' ')); realWarn(...args) }
  let ids
  try {
    const svc = await bootModels()
    ids = svc.registryIds()
  } finally {
    console.warn = realWarn
  }
  const survivor = ids.includes('yue2')
  const absent = !ids.includes(PRUNE)
  const voice = warnings.find((w) => w.includes(`'${PRUNE}'`) && /retired alone/.test(w))
  say('load-serve', survivor && absent && voice !== undefined,
    `boot armed with ${ids.length} families; ${PRUNE} ${absent ? 'absent' : 'PRESENT (the prune did not bite)'}, yue2 ${survivor ? 'present' : 'MISSING'}; the retired-alone voice ${voice !== undefined ? `named it: ${voice}` : 'NEVER FIRED (the absence was swallowed)'}`)
} catch (err) {
  say('load-serve', false, `the boot refused: ${String(err && err.message)}`)
}

// ── hop 2: form-open (the card + tool plane serves without the family) ──
try {
  const { loadCardDefs } = await import(`${cordis}/lib/cardDefs.js`)
  const defs = await loadCardDefs()
  const def = defs.get('music')
  if (def === undefined) throw new Error('the music card def did not serve')
  if (PRUNE === 'music3') {
    const musicTool = await import(`${root}/packages/audio/music/lib/tool.js`)
    const tool = await musicTool.buildMusicTool(async () => { throw new Error('the driver never calls the seam') })
    if (typeof tool.execute !== 'function') throw new Error('the tool face did not build')
    say('form-open', true, `card 'music' serves (label ${String(def.identity?.label)}) and the tool builds (knob falls back to the BOARDED literal)`)
  } else {
    say('form-open', true, `the card plane serves with '${PRUNE}' pruned (defs served: ${defs.size}; the flavor rows of a flavor-bearing family retired alone, the mod plane lived)`)
  }
} catch (err) {
  say('form-open', false, `the card or tool plane died for its family: ${String(err && err.message)}`)
}

if (PRUNE !== 'music3') {
  console.log(JSON.stringify({ verdicts }))
  process.exitCode = verdicts.every((v) => v.ok) ? 0 : 1
} else {
  // ── hops 3 + 4: add_stage-land, run-refusal (music3's own) ──
  try {
    const defs = await import(`${cordis}/lib/cardDefs.js`).then((m) => m.loadCardDefs())
    const def = defs.get('music')
    const { GraphBuilder } = await import(`${root}/packages/engines/comfyui-card-kit/lib/graph.js`)
    const model = { id: 'music3', card: 'music', family: 'music3', defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] }
    try {
      const g = new GraphBuilder()
      def.compose({ prompt: 'a song' }, model, g, 'r_l2journey')
      say('add_stage', true, 'the stage admission landed (compose entered)')
      const nodes = Object.keys(g.toJSON())
      say('run-refusal', false, `compose SILENTLY graphed ${nodes.length} nodes for a dead family — the loud refusal never fired`)
    } catch (err) {
      const voice = String(err && err.message)
      const names = /music3/.test(voice)
      say('add_stage', true, 'the stage admission landed (compose entered; the refusal is the seat\'s, not the door\'s)')
      say('run-refusal', names, names ? `the seat refused loud naming the family: ${voice}` : `the refusal does not name the family: ${voice}`)
    }
  } catch (err) {
    say('add_stage', false, `the queue door died before compose: ${String(err && err.message)}`)
    say('run-refusal', false, 'not reached')
  }

  console.log(JSON.stringify({ verdicts }))
  process.exitCode = verdicts.every((v) => v.ok) ? 0 : 1
}
