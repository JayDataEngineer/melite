// host.ts — @melite/card-base: the HOST half (the composition marker).
//
// THE DUAL-FACE LAW (the img-to-mesh/motion precedent, 2026-09-12):
// this package is ROW-MOUNTED in the web profile so its dsh.client
// declaration carries the browser graph row (lib/client.js — the
// ONE compiled instance of the studio atoms, THE ONE-ROW LAW,
// operator order 2026-10-01). The loader applies THIS face
// node-side; it registers NOTHING: the atoms, seams, and studio
// ride the CLIENT face (`exports['./client']` — types at
// src/client/index.ts, the built row at lib/client.js), exactly
// the way @deepseek-ai/dsh-api-gateway shapes its own client door.
//
// The package root (`exports['.']`) IS this marker — the loader's
// row import must stay node-safe (no tsx, no css), so the client
// surface lives behind the /client specifier and the node-plane
// subpaths (`./spec`, `./toast-store`, …) below it.
//
// One package, three faces, one truth each — no guards, no probes.
import type { Context } from '@deepseek-ai/cordis'

export const name = '@melite/card-base'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the atoms ride the client face (lib/client.js — the graph row) */
}
