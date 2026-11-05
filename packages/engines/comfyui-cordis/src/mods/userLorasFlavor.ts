// src/mods/userLorasFlavor.ts — THE USER ROWS FILE, COMPOSED (the
// 2026-10-15 cure for the two-step door: the audit's finding was
// that a user's LoRA needed BOTH a hand-written rows file AND a
// patch-yml edit before it served. The file at userLorasPath()
// now registers at composition time — the same composeModPlane
// the family flavors ride — so rows serve with no profile edit
// and no drop-in. The hot plugin (web/melte-estate/hot) remains
// the door for a SECOND file, not the only door.
//
// The law is unchanged: nothing fetches (the rows carry
// documentation urls only), and the leaf still refuses a
// hand-spelled name — a user's LoRA arrives as a picker row
// because the row says so, never because a name was typed.
import type { Context } from '@deepseek-ai/cordis'
import { boardUserLoraRows, readUserLoraRows, userLoraFlavor, userLorasPath } from '../userLoras.ts'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  const path = userLorasPath()
  const file = readUserLoraRows(path)
  if (file.absent) {
    // the shipped state: absent is opt-in, not an error — and it
    // must not log per compose (composeOnce runs per request)
    return
  }
  for (const problem of file.problems) {
    ctx.logger('user-loras').warn('row refused — ' + problem)
  }
  // THE BOARDING GUARD (the poison cure, 2026-11-15): a row naming
  // a family that does not board the loras pack DROPS here — a
  // junk row in the rows file must never take the boot (or the
  // good rows) down; the drop is named, never silent
  const { rows, dropped } = boardUserLoraRows(file.rows, new Set(ctx.comfyui.lorasBoardingFamilies()))
  for (const drop of dropped) {
    ctx.logger('user-loras').warn('row dropped — ' + drop)
  }
  const flavor = userLoraFlavor({ ...file, rows })
  if (flavor === null) {
    ctx.logger('user-loras').info(path + ' served no rows')
    return
  }
  ctx.effect(() => ctx.comfyui.registerFlavor(flavor))
  ctx.logger('user-loras').info(
    flavor.rows.length + ' user row(s) for ' + flavor.families.join(', ') + ' served from ' + path,
  )
}
