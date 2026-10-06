// host.ts — @melite/three-client: the HOST half (the composition marker).
//
// THE ONE-ROW LAW FOR 3D (roadmap "multiple three.js copies", the
// lane wire probe 2026-10-13): three rode `dependencies` in every
// 3D-touching web package, so each client bundle inlined its own
// compiled copy and the served page warned
// `THREE.WARNING: Multiple instances of Three.js being imported`.
// This package is the cure's mount — the exact shape card-base set
// for the studio atoms (packages/web/card-base/cordis.patch.yml,
// operator order 2026-10-01): ONE module-table graph row every 3D
// consumer REQUIRES through `dsh.client.external`. The loader
// applies THIS face node-side; it registers NOTHING — the browser
// graph row (lib/client.js) is the ONE compiled instance of three
// plus the four addon modules the estate consumes.
//
// The package root (`exports['.']`) IS this marker: the loader's
// row import must stay node-safe, so the three surface lives
// entirely behind the /client specifier: the browser graph row
// (lib/client.js) is the ONE compiled instance of three plus the
// six addon modules the estate consumes.
import type { Context } from '@deepseek-ai/cordis'

export const name = '@melite/three-client'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* three rides the client face (lib/client.js — the graph row) */
}
