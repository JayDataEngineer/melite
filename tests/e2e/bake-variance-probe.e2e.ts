// bake-variance-probe.e2e.ts — THE OPERATOR'S VARIANCE PROBE (one-off,
// 2026-11-09): the direct answer to "is it getting the same parameters
// because the UI/system can't send other parameters?" — the SAME run
// lane as the committed hop-[6] witness row, with ALL FOUR dials moved
// to a DIFFERENT stated combo (Compressed Reference / 24 / 750 / true
// vs the witness row's Full Reference / 32 / 1000 / false). If the
// system could only ever send one parameter set, the engine history
// here would read the witness row's poles (or the defaults). It must
// read THESE. Not committed — the variance law lives GPU-free in
// refmod-value-arms ARM 14; this probe receipts it on silicon once.
import { describe, expect, it } from 'vitest'
import '../helpers/boot-models.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runCard, stageAnchorPng, weightsPresent, withWorld } from './gpu-harness.ts'

describe.skipIf(!ENGINE_FREE || !weightsPresent('h3-timeline'))('the bake variance probe (operator: can the system send OTHER parameters?)', () => {
  it('dials B (Compressed/24/750/save) reach the engine verbatim — different from the witness row\'s dials A', async () => {
    await withWorld('bake-variance-probe', async (w) => {
      const anchor = stageAnchorPng('bake-variance-probe')
      const s = await runCard(w, {
        model: 'h3', width: 768, height: 448, steps: 8,
        refmod_mode: 'Compressed Reference',
        refmod_pool: 24,
        refmod_identity: 750,
        refmod_save: true,
        ref_mods: [anchor],
        calls: [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90 }],
      }, 'bake variance probe B')
      const flow = JSON.parse(readFileSync(join(s.runDir, '_flow.json'), 'utf8')) as {
        graph_receipt?: { prompt_id?: string }
      }
      const pid = flow.graph_receipt?.prompt_id ?? ''
      expect(pid).not.toBe('')
      const res = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/history/${pid}`)
      expect(res.ok).toBe(true)
      const body = (await res.json()) as Record<string, {
        prompt?: [unknown, unknown, Record<string, { class_type?: string, inputs?: Record<string, unknown> }>]
      }>
      const entry = body[pid]
      expect(entry).toBeTruthy()
      const executed = entry?.prompt?.[2] ?? {}
      const ext = Object.entries(executed).filter(([, r]) => r.class_type === 'MiniMaxH3RefModExtract')
      expect(ext.length).toBeGreaterThanOrEqual(1)
      const inputs = ext[0]?.[1].inputs ?? {}
      // THE VARIANCE: all four read the B combo — never the witness
      // row's A combo (Full Reference/32/1000/false), never defaults.
      expect(inputs['mode']).toBe('Compressed Reference')
      expect(inputs['pool_h']).toBe(24)
      expect(inputs['pool_w']).toBe(24)
      expect(inputs['identity']).toBe(750)
      expect(inputs['save']).toBe(true)
    })
  }, 900_000)
})
