// seats-probe.plugin.ts — a DIAGNOSTIC drop-in (the false-death
// hunt, 2026-10-08), parked in examples/ as DOCUMENTATION BY CONFIG:
// it mounts only while a patch insert row names it (hot/README — no
// directory magic), and it should never ride a steady-state lane.
//
// WHY IT EXISTS: the /v1 door answered 502 on the runs lanes while
// every service was alive. This probe, mounted in the LIVE lane's
// fiber tree, printed what its ctx could see on a 2s cadence —
// pass 1 showed only host seats (timer/webServer/llm/tools), pass 2
// showed EVERY estate seat: the boot-settle window, measured where
// it happens (the lane log carries the passes: grep
// '\[hot-seats-probe\] pass'). The "dead seat" was the door's error
// map rendering refusals as 502 (fixed in melite-tools doors.ts —
// failEstate maps the code's class; see THE FALSE-DEATH LAW in
// docs/CONFORMANCE_LEDGER.md).
//
// THE MOUNT SHAPES (hard-won; the two wrong ones crash-looped the
// lane at boot — Restart=always turned each into ~900 log lines of
// EADDRINUSE cascades):
//
//   WORKING (cordis.patch.yml — the row is ALL it takes):
//     - insert:
//         - id: hot-seats-probe
//           name: /abs/path/to/seats-probe.plugin.ts
//
//   CRASHES (loader: ensureId "Cannot create property 'id' on
//   string" — insert entries are OBJECTS, never bare path strings):
//     - insert:
//         - /abs/path/to/seats-probe.plugin.ts
//
//   CRASHES (app-boot: "patch.insert?.forEach is not a function" —
//   insert is a LIST, never a {file:} mapping):
//     - insert:
//         file: /abs/path/to/seats-probe.plugin.ts
//
// Use: name it in the patch, watch the lane log for ~40s (20
// passes), remove the row. The interval is fiber-disposed via
// ctx.effect; every patch save reconciles the fiber anyway.
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hot-seats-probe'

export function apply(ctx: Context): void {
  const seats = [
    'queue', 'runs', 'runsRemote', 'draftsRemote', 'benchRemote',
    'cardRegistry', 'disclose', 'manage', 'meliteSkills', 'load',
    'timer', 'webServer', 'llm', 'tools', 'craft',
  ]
  // PATIENT cadence: apply runs before sibling entries' services
  // settle — pass 1 will show only host seats; that gap IS the
  // boot-settle window this probe exists to measure.
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
