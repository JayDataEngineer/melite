// seats-probe.plugin.ts — a DIAGNOSTIC hot drop-in (the runs-seat
// death, 2026-10-08): mounted by the patch reload into the RUNNING
// lane, it reports which estate seats ITS fiber can see — the same
// loader-mounted view the tools' estate.ts probe and the doors
// read. The walls seat everything (verbatim bundle + the real
// copied tree: runs PRESENT), so the delta is the lane's loader
// tree — this file makes that tree SPEAK. Removed after the hunt.
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hot-seats-probe'

export function apply(ctx: Context): void {
  const seats = [
    'queue', 'runs', 'runsRemote', 'draftsRemote', 'benchRemote',
    'cardRegistry', 'disclose', 'manage', 'meliteSkills', 'load',
    'timer', 'webServer', 'llm', 'tools', 'craft',
  ]
  // Apply runs before sibling entries' services settle — probe on a
  // PATIENT cadence instead: every 2s for 40s, logging every pass.
  let pass = 0
  const timer = setInterval(() => {
    pass += 1
    const seen: string[] = []
    const missing: string[] = []
    for (const s of seats) {
      const v = ctx.get(s, false)
      if (v === undefined) missing.push(s)
      else seen.push(s)
    }
    console.log('[hot-seats-probe] pass ' + pass + ' SEEN: ' + seen.join(', '))
    console.log('[hot-seats-probe] pass ' + pass + ' MISSING: ' + (missing.join(', ') || 'nothing'))
    if (pass >= 20) clearInterval(timer)
  }, 2000)
  ctx.effect(() => (): void => clearInterval(timer))
}
