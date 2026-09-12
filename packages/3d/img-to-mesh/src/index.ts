// index.ts — the package's HOST half (the composition marker).
//
// THE DUAL-FACE LAW (2026-09-12, the composition-root correction):
// this package is ROW-MOUNTED in the web profile so its dsh.client
// declaration carries the browser studio (lib/client.js — the
// cards.stage.view registration). The loader applies THIS face
// node-side; it registers NOTHING: the card def rides the CARD face
// (./card — the cardPackages SSOT composes it in the engine plane,
// where the registry seat lives: '@melite/3d-img-to-mesh/card').
//
// One package, three faces, one truth each — no guards, no probes.
import type { Context } from '@deepseek-ai/cordis'

export const name = '@melite/3d-img-to-mesh'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the browser studio rides the client face (src/client) */
}
