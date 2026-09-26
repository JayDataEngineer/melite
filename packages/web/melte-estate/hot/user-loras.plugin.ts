// user-loras.plugin.ts — THE USER'S OWN LORA ROWS, mounted (the
// operator's question, 2026-09-26: "is there a way to add custom
// loras to models from the user perspective?" → "Do it all go").
//
// WHAT THIS IS NOT: not a loras remote (the standing law — "THERE
// SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN", melite-tools/
// src/discovery.ts:12-16), and not a way to hand-spell a name (the
// studio leaf refuses that on purpose — "pick from the catalog, never
// hand-spell", card-base/src/mods.tsx:241). Nothing here fetches:
// a row's `source_url` stays documentary.
//
// WHAT IT IS: a LOCAL rows file (JSON) registered as a runtime
// flavor, which is the same registration the family files and hot
// drop-ins use (the flavor merge, comfyui-cordis service.ts:628-652,
// id-keyed, family rows first). Because the studio's modifier picker
// already renders catalog rows (card-base/src/mods.tsx), a user's
// LoRA arrives as a REAL PICKER ROW — label, category, strength
// default — with no client change at all.
//
// THE USER FLOW:
//   1. put your .safetensors where the ENGINE looks for LoRAs
//      (`installUserLora` in comfyui-cordis/src/userLoras.ts copies a
//      file you already have; it never downloads). The engine's combo
//      is core's `folder_paths` list, and the only in-repo refresh
//      primitive is a full engine reboot (POST /manager/reboot).
//   2. add a row to the file below, naming the exact `filename` the
//      engine lists and the family you want it offered for.
//   3. mount this drop-in: add ONE line to the profile's
//      cordis.patch.yml (the hot contract — the patch file is the load
//      list, there is no implicit glob).
//
// Rows whose `filename` is absent from the engine's own list are
// reported here at boot with the reason: ComfyUI validates the combo
// at /prompt, so a name the engine lacks is a 400 AFTER the money is
// spent.
import type { Context } from '@deepseek-ai/cordis'
import { theService } from '@melite/comfyui-cordis'
import { readUserLoraRows, userLoraFlavor } from '@melite/comfyui-cordis/user-loras'

/** Where the operator's rows live. Override with MELITE_USER_LORAS. */
const ROWS_PATH = process.env['MELITE_USER_LORAS'] ?? './data/loras/user-loras.json'

export function apply(ctx: Context): void {
  const file = readUserLoraRows(ROWS_PATH)
  if (file.absent) {
    console.log('[hot] user-loras.plugin.ts — no rows file at ' + ROWS_PATH + ' (the door is opt-in)')
    return
  }
  for (const problem of file.problems) {
    console.log('[hot] user-loras.plugin.ts REFUSED a row — ' + problem)
  }
  const flavor = userLoraFlavor(file)
  if (flavor === null) {
    console.log('[hot] user-loras.plugin.ts — ' + ROWS_PATH + ' served no rows')
    return
  }
  // THE PROOF, not a promise — run it yourself, any time, with the
  // engine's own object_info (comfyui-cordis/user-loras ships the two
  // pure helpers; see hot/README-user-loras.md for the one-liner):
  //   node --experimental-strip-types -e "import('@melite/comfyui-cordis/user-loras')..."
  // Rows the engine does not have would refuse at /prompt (a 400 after
  // the money is spent), so the cross-check is the user's last step.
  ctx.effect(() => {
    const off = theService().registerFlavor(flavor as never)
    console.log(
      '[hot] user-loras.plugin.ts LIVE — ' + String(flavor.rows.length) + ' user row(s) for ' +
      flavor.families.join(', ') + ' served beside the family table',
    )
    return () => {
      off()
      console.log('[hot] user-loras.plugin.ts retracted')
    }
  })
}
