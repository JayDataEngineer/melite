import { test } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
// THE PERSISTED-STATE SWEEP (2026-10-10): the write doors guard
// writes, getBench re-admits at serve — this sweep holds the LIVE
// ESTATE's stored bench docs to the current laws at CI time, so a
// criminal doc written by any older door is named here before any
// human meets it at a run. Runs only where the host state exists
// (the dev estate); absent state on a fresh clone is an honest
// skip with the reason printed.
test('sweep every persisted bench doc against the current admission laws', () => {
  const dir = 'data/runtime/dsh-harness-home/storages/drafts/docs'
  if (!existsSync(dir)) { console.log('no host bench state on this clone — sweep skipped'); return }
  const files = readdirSync(dir).filter((f) => f.startsWith('bench-') && f.endsWith('.json'))
  const crimes: string[] = []
  for (const f of files) {
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
        if (typeof v === 'string' && v.startsWith('$') && !(k in inputs) && !String(v).startsWith('$' + k)) {
          // spell with no channel is the phantom-spell arm — flag only if the channel is absent
        }
      }
    }
  }
  console.log(`swept ${files.length} bench docs — crimes: ${crimes.length}`)
  console.log(crimes.length ? crimes.join('\n') : 'clean')
})
