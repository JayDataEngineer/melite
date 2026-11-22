// gpu-diet-law.spec.ts — THE GPU MINIMUM-TIME + NO-DUPES LAW
// (operator order 2026-11-17: "EVERY TIME THE GPU IS USED, IT MUST
// BE ASSERTED THROUGH TESTS THAT WE ARE USING THE MINIMUM TIME
// TAKEN POSSIBLE WITH NO DUPES").
//
// Video cost scales with frames × patches — a row that renders 90
// frames to prove what 22 would prove burns 4× the minimum, and a
// second row rendering the same family burns the whole cost again.
// This wall walks the GPU e2e fleet's own source — BOTH seats: the
// estate fleet (tests/e2e/*.e2e.ts) AND the package-local fleet
// (packages/**/tests/*.e2e.ts — the film rows lived there invisible
// to the first cut of this wall) — and refuses:
//   (a) a shape row (title carries the diet mark) that awaits a
//       render (runCard) instead of queueing (queueCard);
//   (b) an h3 RENDER row whose window is not the grid floor — the
//       floor is READ from timelineContract.ts (GRID_BASE_FRAMES),
//       never a hand-typed literal;
//   (c) two RENDER rows paying the same family for the SAME proof —
//       keyed by the weights gate the row itself names (the gate IS
//       the family declaration; the model literal only keys rows
//       with no gate), and by the PROOF CLASS derived from the
//       span's own asserts:
//         history      reads the engine's /history/<id> after settle
//         live-events  polls activity/progress mid-run (the fold)
//         timing       measures elapsed wall-clock around a render
//         content      decodes and measures the ARTIFACT's own
//                      content (ffprobe/volumedetect/roar/pngSize) —
//                      a film-tail or waveform law, never a plain
//                      bytes proof
//         bytes        everything else that renders (the default)
//       Distinct classes may coexist per family; a second row of the
//       same class is a billed duplicate. The class is READ from the
//       span, never granted by title — a title is a claim, the span
//       is the bill.
//   (d) a raw engine press (fetch POST /prompt) outside the
//       estate's run doors is still a RENDER row — the film rows
//       press the engine directly and are billed like any other.
// There is no such thing as a flake and no such thing as a cheap
// duplicate: every render is billed, this wall is the audit.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const E2E = join(ROOT, 'tests', 'e2e')

/** The fleet's two seats: the estate fleet + the package-local
 *  fleet (recursive walk — the wall never again goes blind to a
 *  package-local GPU row). */
function fleetFiles(): string[] {
  const out: string[] = []
  for (const f of readdirSync(E2E)) {
    if (f.endsWith('.e2e.ts')) out.push(join(E2E, f))
  }
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && e.name.endsWith('.e2e.ts')) out.push(p)
    }
  }
  walk(join(ROOT, 'packages'))
  return out
}

/** The it-blocks of one spec file: title + full argument span,
 * extracted with balanced parens from the file's real text (the
 * wall judges the truth, not a parsed copy that can drift). */
function itBlocks(src: string): { title: string, span: string, guard: string }[] {
  const out: { title: string, span: string, guard: string }[] = []
  // The skipIf guard carries NESTED parens (weightsPresent('x')),
  // so a [^)]* close can never find it( — the lazy dot with the
  // \)\s*\( anchor self-balances: it extends until a close paren
  // directly precedes the it( opening. The balanced scanner below
  // owns the span; this only finds the opening seat.
  const re = /\bit\s*(?:\.skipIf\(.*?\)\s*)?\(/gs
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let end = -1
    let inStr: string | null = null
    for (let i = open; i < src.length; i++) {
      const c = src[i]!
      // Comments are SKIPPED: a // comment carrying an apostrophe
      // ("the source's own") would otherwise open phantom string
      // mode and swallow whole rows into the span — the extractor
      // once read music3's runCard inside the refine row's span.
      if (inStr === null && c === '/' && src[i + 1] === '/') {
        const nl = src.indexOf('\n', i)
        if (nl === -1) break
        i = nl
        continue
      }
      if (inStr === null && c === '/' && src[i + 1] === '*') {
        const close = src.indexOf('*/', i)
        if (close === -1) break
        i = close + 1
        continue
      }
      if (inStr !== null) {
        if (c === '\\') { i++; continue }
        if (c === inStr) inStr = null
        continue
      }
      if (c === '\'' || c === '"' || c === '`') { inStr = c; continue }
      if (c === '(') depth++
      else if (c === ')') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }
    if (end === -1) continue
    const span = src.slice(open + 1, end)
    // The skipIf GUARD names the family (weightsPresent) but sits
    // BEFORE it( — scan it too, or every row keys on its model
    // literal and the same family under two names never dupes.
    const guard = src.slice(m.index, open)
    const t = span.match(/^['"`]([^'`"]*)['"`]/)
    if (t !== null) out.push({ title: t[1]!, span, guard })
    re.lastIndex = end
  }
  return out
}

// model-literal → weights-gate name (the family's one true key);
// a family named two ways is still one billable render.
const FAMILY_ALIAS: Record<string, string> = { h3: 'h3-timeline' }

interface GpuRow {
  file: string
  title: string
  renders: boolean          // awaits a completed render (runCard or a raw /prompt POST)
  queues: boolean           // queueCard
  model: string             // the model face the row names
  weights: string[]         // the weightsPresent gates the row names
  cardDefs: string[]        // loadCardDefs().get("X") literals (raw-press rows)
  h3Window: number | null   // the last end_frame literal, h3 rows
  proofClass: string        // history | live-events | timing | bytes
  /** The billable family: the weights gates when present (the gate
   *  IS the family declaration), else the model/card-def literal
   *  under its alias. Empty = no family named (not billable). */
  family: string
}

function rowsOf(file: string, src: string): GpuRow[] {
  const out: GpuRow[] = []
  for (const b of itBlocks(src)) {
    const whole = b.guard + b.span
    const weights = [...whole.matchAll(/weightsPresent\('([^']+)'\)/g)].map((w) => w[1]!)
    const model = whole.match(/model:\s*'([^']+)'/)?.[1] ?? ''
    // The raw-press idiom: the engine's /prompt door named in the span
    // is a render the estate idiom never names (the film rows press
    // fetch(`${ENGINE}/prompt`) — a template literal, so no quote
    // anchor; any /prompt mention in a span bills as a press).
    const rawPress = b.span.includes('/prompt')
    if (weights.length === 0 && !whole.includes('queueCard') && !whole.includes('runCard') && !rawPress) continue
    const renders = /\brunCard\(/.test(b.span) || rawPress
    const queues = /\bqueueCard\(/.test(b.span)
    let window = b.span.match(/end_frame:\s*(\d+)/)
    // A row may carry its window through a module constant (the
    // arena's shared CLIP): resolve `calls: NAME` against the file's
    // own const declaration — the floor law reads the real payload,
    // never the span's spelling of it.
    if (window === null) {
      const viaConst = b.span.match(/calls:\s*([A-Z][A-Z0-9_]*)\b/)
      if (viaConst !== null) {
        const decl = src.match(new RegExp('const ' + viaConst[1]! + '\\s*=\\s*\\[[\\s\\S]*?end_frame:\\s*(\\d+)'))
        if (decl !== null) window = decl as unknown as RegExpMatchArray
      }
    }
    // THE PROOF CLASS (mechanical, from the span): the engine-history
    // witness fetches /history/<id> after settlement; the live-events
    // row polls activity/progress mid-run (the fold); the content row
    // decodes and measures the artifact itself (ffprobe/volumedetect/
    // roar/pngSize — film tails and waveforms; checked BEFORE timing
    // because a content row may log elapsed seconds on its way to the
    // real measurement); the timing dial measures elapsed wall-clock
    // (Date.now() minus a saved mark) around the render; everything
    // else that renders is the bytes proof.
    const proofClass = b.span.includes('/history/') ? 'history'
      : /\.activity|\.progress\b/.test(b.span) ? 'live-events'
        : /ffprobe|volumedetect|audioFileStats|roarViolation|pngSize/.test(b.span) ? 'content'
          : /Date\.now\(\)\s*-\s*\w+|performance\.now\(\)\s*-\s*\w+/.test(b.span) ? 'timing'
            : 'bytes'
    // THE FAMILY (the billable one): the weights gate IS the family
    // declaration when present (qwen3-tts-base and
    // qwen3-tts-voicedesign are ONE family — four rows under four
    // model keys was the blindness this cured); rows with no gate
    // bill on their model literal, and raw-press rows on their
    // card-def seat ((await loadCardDefs()).get("X")), under alias.
    const cardDefs = [...whole.matchAll(/loadCardDefs\(\)\)?\s*\.get\(['"]([^'"]+)['"]\)/g)].map((g) => g[1]!)
    let famSet: Set<string>
    if (weights.length > 0) {
      famSet = new Set<string>(weights)
    } else {
      famSet = new Set<string>()
      const alias = FAMILY_ALIAS[model]
      if (alias !== undefined) famSet.add(alias)
      else if (model !== '') famSet.add(model)
      for (const g of cardDefs) famSet.add(FAMILY_ALIAS[g] ?? g)
    }
    const family = [...famSet].sort().join('+')
    out.push({
      file,
      title: b.title,
      renders, queues, model, weights,
      cardDefs,
      h3Window: window !== null ? Number(window[1]) : null,
      proofClass,
      family,
      spanRaw: b.span,
    })
  }
  return out
}

const files = fleetFiles().map((p) => ({ abs: p, rel: p.slice(ROOT.length + 1) }))
const allRows = files.flatMap((f) => rowsOf(f.rel, readFileSync(f.abs, 'utf8')))
const renderRows = allRows.filter((r) => r.renders)

describe('gpu diet law — minimum time taken, no dupes', () => {
  it('the walk found the GPU fleet — a vacuous pass is the wall dying silently', () => {
    expect(files.length).toBeGreaterThanOrEqual(2)
    expect(allRows.length).toBeGreaterThanOrEqual(20)
    expect(renderRows.length).toBeGreaterThanOrEqual(8)
  })

  it('every diet-marked shape row QUEUES — none awaits a render', () => {
    // A row whose title claims the GPU diet and whose body still
    // awaits runCard pays full render time for a shape proof.
    const liars = allRows
      .filter((r) => r.title.includes('QUEUES (the GPU diet)') && r.renders)
      .map((r) => `${r.file}: "${r.title}" awaits runCard under a diet title`)
    expect(liars, liars.join('\n')).toEqual([])
  })

  it('every h3 RENDER row presses the grid-floor window — read from timelineContract, not a literal', () => {
    // THE CONTRACT'S HOME (47515d7f6): the grid-floor literals moved
    // to @melite/contracts — this wall reads the FILE TEXT (the
    // lattice law is the literals' own spelling), so it reads the
    // truthful home, not the models/h3 re-export shim (which carries
    // no literals — reading it turned the floor NaN and red this arm
    // on push7).
    const contract = readFileSync(join(ROOT, 'packages', 'web-kit', 'contracts', 'src', 'timelineContract.ts'), 'utf8')
    const floor = Number(contract.match(/export const GRID_BASE_FRAMES = (\d+)/)?.[1])
    const step = Number(contract.match(/export const GRID_STEP_FRAMES = (\d+)/)?.[1])
    expect(Number.isFinite(floor)).toBe(true)
    expect(Number.isFinite(step)).toBe(true)
    // ANY h3 render — estate seat (weights gate) or raw-press seat
    // (card def) — bills a LEGAL lattice window: the single-window
    // rows press the floor itself; the film row's multi-window
    // lattice (the 73-field diet, 2026-11-16) rides lattice POINTS
    // (end = 22 + 17k, the same contract's rung spacing) — an
    // off-grid end is a diet violation whatever the count.
    const offenders = renderRows
      .filter((r) => r.family.split('+').includes('h3-timeline'))
      .filter((r) => r.h3Window === null ? false : (r.h3Window - floor) % step !== 0)
      .map((r) => `${r.file}: "${r.title}" renders window ${r.h3Window} — off the ${floor}+${step}k grid`)
    expect(offenders, offenders.join('\n')).toEqual([])
    const singles = renderRows
      .filter((r) => r.family.split('+').includes('h3-timeline'))
      // multi-window rows declare more than one end_frame in the span
      .filter((r) => (r.spanRaw?.match(/end_frame:/g) ?? []).length <= 1)
      .filter((r) => r.h3Window !== floor)
      .map((r) => `${r.file}: "${r.title}" renders window ${r.h3Window} — the single-window floor is ${floor}`)
    expect(singles, singles.join('\n')).toEqual([])
  })

  it('no two RENDER rows pay the same family for the same proof class — every render is billed once', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const r of renderRows) {
      if (r.family === '') continue
      // Same family, DIFFERENT proof classes may coexist (bytes +
      // history + live-events + timing); a second row of the same
      // class is a dupe.
      const key = r.family + '@' + r.proofClass
      const first = seen.get(key)
      if (first !== undefined) {
        dupes.push(`${r.file}: "${r.title}" re-renders [${key}] already rendered by "${first}"`)
      } else {
        seen.set(key, r.title)
      }
    }
    expect(dupes, dupes.join('\n')).toEqual([])
  })

  it('the end_frame literals the wall reads exist in the fleet source (the extractor is not blind)', () => {
    const src = readFileSync(join(E2E, 'recipes-gpu.e2e.ts'), 'utf8')
    expect(src).toMatch(/end_frame: 22/)
  })
})
