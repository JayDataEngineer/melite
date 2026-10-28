// index.ts — the package's HOST half. A FORM card: no client face,
// no studio — the schema form renders; this face registers NOTHING
// (the card def rides ./card, composed by the cardPackages SSOT).
import type { Context } from '@melite/comfyui-card-kit/card-definition'

export const name = '@melite/video-frames'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the form face needs no host rows */
}
