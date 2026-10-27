// index.ts — the package's HOST half (the composition marker).
//
// THE DUAL-FACE LAW (the input-prep precedent): this package is
// schema-form — no studio, no client bundle — so the loader applies
// THIS face node-side and it registers NOTHING (no card def):
//
// - the card def rides the CARD face (./card — the cardPackages
//   SSOT composes it in the engine plane, where the registry seat
//   lives: '@melite/video-openjutsu/card')
//
// One package, two faces, one truth each — no guards, no probes.
import type { Context } from '@melite/comfyui-card-kit/card-definition'

export const name = '@melite/video-openjutsu'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the card def rides the ./card face (the cardPackages SSOT) */
}
