// index.ts — the package's HOST half. A FORM card: no client face,
// no studio — the mod section (card-base core) renders the declared
// kinds; this face registers NOTHING (the card def rides ./card,
// composed by the cardPackages SSOT).
import type { Context } from '@deepseek-ai/cordis'

export const name = '@melite/image-mask'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the form face needs no host rows */
}
