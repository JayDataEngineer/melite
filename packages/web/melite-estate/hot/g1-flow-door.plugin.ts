// g1-flow-door.plugin.ts — THE G1 ARM (ledger li-bi, proven here LIVE
// per design/live-reload-surface-2026-09-28.md): the same `- insert:`
// drop-in law as the G2 card door, aimed at the FLOW seat — the one
// surface the doc called "the least defensible part of the design"
// until registerRegistryFlow landed. This file exists to be mounted
// and unmounted by a patch save on a RUNNING lane: no restart, no
// rebuild, the fiber owns the flow's lifetime.
//
// THE TRADE (identical to g2-maker-door): zero-install authoring. The
// flow row is cloned from the live registry at runtime (fit-seat) and
// re-id'd — the seat's interlocks (duplicate ids refuse LOUD, empty
// stages refuse LOUD) are the gate, exactly as the walls prove.
//
// Receipt path (all live, NO restart):
//   arms     → the insert row lands in cordis.patch.yml; the watcher
//              mounts this fiber; scan/validate doors see the flow
//   retracts → remove the row; the disposer removes EXACTLY this row
//              and the doors answer unknown-flow again
import type { Context } from '@deepseek-ai/cordis'
import { getRegistryFlow, registerRegistryFlow } from '@melite/estate-queue'

export async function apply(ctx: Context): Promise<void> {
  const base = getRegistryFlow('fit-seat')
  if (base === undefined) {
    throw new Error('[hot-g1-flow-door] the boot seed is not seated — fit-seat missing from the live registry')
  }
  const flow = { ...base, id: 'g1-live-probe', description: 'G1 live seat proof — registered by a patch save, retracted by another' }
  const off = registerRegistryFlow(flow)
  console.log(`[hot-g1-flow-door] LIVE — the flow seat serves '${flow.id}' (${flow.stages.length} stages, cloned from fit-seat)`)
  // The disposer LOGS TOO (the lane-audit lesson: a proof artifact that
  // only logs its arming is half-blind — the lane died with "g1 LIVE"
  // as its last line while the door had already proven the retraction;
  // the log could not show it).
  ctx.effect(() => {
    return () => {
      off()
      console.log(`[hot-g1-flow-door] RETRACTED — the disposer removed exactly '${flow.id}' from the live seat`)
    }
  })
}
