import "../../../../tests/helpers/boot-models.ts";
import { test, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { CardRegistryService } from '@melite/estate-queue'
// THE PERSISTED-STATE SWEEP (2026-10-10): the write doors guard
// writes, getBench re-admits at serve — this sweep holds the LIVE
// ESTATE's stored bench docs to the current laws at CI time, so a
// criminal doc written by any older door is named here before any
// human meets it at a run. Absent host state on a fresh clone is an
// honest skip with the reason printed (never a silent pass claim).
//
// IT IS A WALL, NOT A LOG (li-o's second stroke): the first cut
// printed its crimes and passed either way — a sweep that cannot
// fail is a comment. It judges the DECL's lane laws over every stored
// stage through the same seat the run door rides, which is the arm
// that catches the operator's incident-A state sitting in an
// ARCHIVE: the write door exempts restored rows (the archive must
// load), so this sweep is where an old poison is named instead of
// discovered at Run.
interface RegistryLike { admitStageRelations(card: string, params: Record<string, unknown>): { ok: true } | { ok: false; error: string } }

function sweepDir(dir: string, registry: RegistryLike): string[] {
  const crimes: string[] = []
  for (const f of readdirSync(dir).filter((f) => f.startsWith('bench-') && f.endsWith('.json'))) {
    let doc: any
    try { doc = JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch { crimes.push(f + ': unparseable'); continue }
    const stages = Array.isArray(doc.stages) ? doc.stages : []
    const liveIds = stages.map((s: any) => String(s?.id ?? ''))
    for (const st of stages) {
      const id = String(st?.id ?? '')
      const inputs = (st?.inputs && typeof st.inputs === 'object' && !Array.isArray(st.inputs)) ? st.inputs : {}
      for (const [chan, ref] of Object.entries(inputs)) {
        const rr = ref as any
        if (rr && typeof rr === 'object' && typeof rr.stage === 'string') {
          if (rr.stage === id) crimes.push(`${f} ${id}#${chan}: SELF-WIRE <- ${rr.stage}.${rr.output ?? ''}`)
          else if (!liveIds.includes(rr.stage)) crimes.push(`${f} ${id}#${chan}: PHANTOM-WIRE <- ${rr.stage} (no such stage)`)
        }
      }
      const params = (st?.params && typeof st.params === 'object') ? st.params : {}
      for (const [k, v] of Object.entries(params)) {
        // THE PHANTOM-SPELL ARM: a $-spelled value with no channel
        // to receive it never composes (the run door refuses it
        // there); a doc that carries one is named here first.
        if (typeof v === 'string' && v.startsWith('$') && !(k in inputs)) {
          crimes.push(`${f} ${id}: PHANTOM-SPELL ${k}='${v}' (no input channel receives it)`)
        }
      }
      const card = typeof st?.card === 'string' ? st.card : ''
      if (card !== '') {
        const verdict = registry.admitStageRelations(card, params as Record<string, unknown>)
        if (!verdict.ok) crimes.push(`${f} ${id}: LANE — ${verdict.error}`)
      }
    }
  }
  return crimes
}

const bootRegistry = async (): Promise<CardRegistryService> => {
  const ctx = new Context()
  // J12: the registry's dangling sweep reads the queue seat's
  // stateRoots manifest (config-named call data — no env seam); the
  // boot stub pins a temp tree so the sweep never touches real runs.
  ;(ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), 'sweep-boot-')),
    stateRoots: [] as string[],
  }
  const registry = new CardRegistryService(ctx)
  await registry.prime()
  return registry
}

test('sweep every tracked bench doc against the current admission laws', async () => {
  // (single-setup law 2026-10-18: this swept the deleted fossil
  // home's storages and so retired itself to a permanent skip —
  // the corpus is now the TRACKED fixture tree, real-shaped bench
  // docs the tree carries, and the sweep runs on every clone)
  const dir = 'tests/walls/ts/fixtures'
  const files = readdirSync(dir).filter((f) => f.startsWith('bench-') && f.endsWith('.json'))
  const crimes = sweepDir(dir, await bootRegistry())
  console.log(`swept ${files.length} bench docs — crimes: ${crimes.length}`)
  console.log(crimes.length ? crimes.join('\n') : 'clean')
  expect(files.length, 'the tracked bench corpus is empty — the sweep went vacuous').toBeGreaterThan(0)
  expect(crimes, `tracked bench docs hold current-law crimes:\n${crimes.join('\n')}`).toEqual([])
}, 30000)

test('the sweep WALL bites: a poisoned doc is named, not printed', async () => {
  const dir = join(tmpdir(), 'melite-sweep-wall-' + String(process.pid))
  mkdirSync(dir, { recursive: true })
  try {
    writeFileSync(join(dir, 'bench-poison.json'), JSON.stringify({
      stages: [
        // THE OPERATOR'S INCIDENT A, sitting in an archive: the
        // write door exempts restored rows, so this is where it is
        // caught before a human meets it at a run.
        { id: 's_0', card: 'tts', params: { model: 'qwen3-tts', variant: 'customvoice', text: 'hi', design_prompt: 'a warm narrator' } },
        { id: 's_1', card: 'tts', params: { text: 'hi', image1: '$image1' } },
        { id: 's_2', card: 'tts', inputs: { image1: { stage: 'ghost' } }, params: { text: 'hi' } },
      ],
    }))
    const crimes = sweepDir(dir, await bootRegistry())
    // THE QVOICE BOOLEAN LAW recut (operator 2026-10-22): the export
    // pair is dead — the customvoice lane's LANE crime names the
    // stale knob the poisoned doc itself carries ('design_prompt'
    // fires nothing on this lane), never the dead voice_name pair.
    expect(crimes.some((c) => c.includes('LANE') && c.includes('design_prompt')), crimes.join('\n')).toBe(true)
    expect(crimes.some((c) => c.includes('PHANTOM-SPELL')), crimes.join('\n')).toBe(true)
    expect(crimes.some((c) => c.includes('PHANTOM-WIRE')), crimes.join('\n')).toBe(true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}, 30000)
