// index.ts — the package's HOST half (the composition marker).
//
// THE DUAL-FACE LAW (2026-09-12, the composition-root correction —
// adopted from the h3-timeline precedent after the loader proved the
// coordinator shape unlawful: a row-mounted root that registers both
// faces collides with the web profile's own registrars — "tool
// motion is already registered"):
// this package is ROW-MOUNTED in the web profile so its dsh.client
// declaration carries the browser studio (lib/client.js — the
// cards.stage.view registration under key 'motion'). The loader
// applies THIS face node-side; it registers NOTHING (no card def,
// no tool):
//
// - the card def rides the CARD face (./card — the cardPackages
//   SSOT composes it in the engine plane, where the registry seat
//   lives: '@melite/motion-motion/card')
// - the tool ride is melite-tools' (the web profile's one tool
//   registrar — buildMotionTool from ./tool, threaded with the
//   EstateCall seam)
//
// One package, three faces, one truth each — no guards, no probes.
import type { Context } from '@melite/comfyui-card-kit/card-definition'

export const name = '@melite/motion-motion'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the browser studio rides the client face (src/client) */
}
