// index.ts — the composition marker: the row-mounted root face.
// THE DUAL-FACE LAW (2026-09-12 marker law, extended here
// 2026-10-18 — the V1/F1 cure): a row-mounted root registers
// NOTHING itself; it is the loader's composition handle. The card
// def registers here only when the comfyui seat exists (the estate
// composition mounts this row for the card face); the TOOL face
// registers from exactly ONE place — melite-tools' cardTools gate
// (`buildImageGenTool` from `./tool`; joining the gate in the same
// cure — the gate's own "one tool per card manifest" promise
// already claimed it). A root that also registered the tool
// dual-owned the name in any composition mounting both (the
// 2026-09-17 twin-crash shape).
//
// The comfyui seat is an optional dependency (tutorial ch.3: skip
// inject, probe at the use site). A hard comfyui gate would hold
// the plugin PENDING in a standalone dsh agent host — no
// in-process ComfyUI service, the estate composition provides it.
//
// THE VIEW IS NOT HERE: this card is all defaults — @melite/viewer's
// composition claims the image_gen toolview with the shared run-card
// row (@melite/viewer-base). A card ships a client half only to
// OVERRIDE its view (the takeover arm of the keyed slot).
import type { EstateCall } from '@melite/estate-call'
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import Schema from '@deepseek-ai/schemastery'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { registerCard } from './card.ts'

export const name = '@melite/image-gen'

export const inject: string[] = []

/** The documented Config idiom (tutorial ch.5): the interface is
 *  the type, the const is the runtime schema, one name. The env
 *  var resolves INSIDE the schema default — a schema-side
 *  .default() would otherwise mask it at every use site. */
export interface Config {
  /** The lane seam (R2b law): the registrar (melite-tools) hands the
   *  call shape; the card never owns transport. The schema keeps the
   *  idiom for structure while the seam itself is threaded, not
   *  configured — Schema.any() admits the injected function. */
  call: EstateCall
}

export const Config: Schema<Config> = Schema.object({
  call: Schema.any(),
})

export function apply(ctx: Context, config: Config): void {
  void config
  const comfy = ctx.get('comfyui') as ComfyUIServiceFace | undefined
  if (comfy !== undefined) registerCard(ctx, comfy)
}
