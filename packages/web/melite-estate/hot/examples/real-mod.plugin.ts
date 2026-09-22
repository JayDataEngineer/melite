// real-mod.plugin.ts — a REAL hot mod row (#39, the ultimate test).
//
// `h3_silu_temb_grid.safetensors` is provisioned on this estate and
// linked in the h3 family's provisions table (survivor-id
// correction, 2026-09-22: the family is the checkpoint id `h3`,
// was h3-timeline), but the family's packaged loras flavor does
// not serve it. This drop-in
// boards it onto the live singleton — mounted by the dsh native
// patch reload (the profile's cordis.patch.yml inserts this file by
// path; no restart, no rebuild, no bundle).
//
// It loads at the ROOT include level, so it does NOT inject
// 'comfyui' (that name binds ComfyUIHostService there, not the card
// plane). It talks to the card-plane SINGLETON by import — the same
// module instance the estate's doors serve from. THE FLAVOR MERGE
// (#39): this flavor rides WITH the family's own table (id-keyed,
// family rows first) — before, a second flavor for one (pack,
// family) was invisible behind the first. Mods rows serve on the
// NEXT form-spec request, exactly like every packaged row.
import type { Context } from '@deepseek-ai/cordis'
import { theService } from '@melite/comfyui-cordis'

export function apply(ctx: Context): void {
  console.log('[hot] real-mod.plugin.ts LIVE — h3_silu_temb_grid served by a drop-in')
  ctx.effect(() => {
    const off = theService().registerFlavor({
      pack: 'loras',
      families: ['h3'],
      rows: [{
        id: 'h3_silu_temb_grid',
        filename: 'h3/h3_silu_temb_grid.safetensors',
        source_url: 'https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors',
        label: 'SiLU Temb Grid',
        category: 'toolkit',
      }],
    })
    return () => {
      off()
      console.log('[hot] real-mod.plugin.ts retracted')
    }
  })
}
