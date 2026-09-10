// index.ts — the estate bundle's host row.
//
// DSH is the only web app. This row mounts the estate's engine tier
// INTO the DSH host as child plugins — the loader's own composition
// mechanism (ctx.plugin).
//
// THE GATEWAY KILL (2026-09-10): the gateway is dead (operator
// order — the gateway package as an app made 1:1 DSH impossible).
// Every gateway row this bundle used to mount (error service, all
// doors, queue rows, the wire remotes, the lane root) is GONE with
// it. What remains is the engine tier the rebuild rides on; the
// domain remotes land here as they are rebuilt DSH-native.
//
// REBUILD-1 lands here: the persistence tier (hub → json backend →
// domain facility) plus the drafts Remote owner. The backend root is
// env-derived at composition (never pinned).
//
// Erasable-syntax TS only: no enums, `import type` for types, bare
// package specifiers only.

import type { Context } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";

import modelsProvider from "@melite/comfyui-cordis/catalog-registry";
import comfyuiHost from "@melite/comfyui-cordis/comfyui-host";
import draftsPlugin, {
  resolveStorageRoot,
  storageDomainFacility,
  storageHub,
  storageJsonBackend,
} from "@melite/estate-drafts";
import queuePlugin, {
  cardRegistryProvider,
  runsRegistryPlugin,
} from "@melite/estate-queue";
import { runsRemotePlugin } from "@melite/estate-runs";

/** The estate composition: the engine tier plus the rebuilt
 *  persistence tier, the drafts remote, and the serial run queue
 *  as the estate's own host service (REBUILD-5: lock-first, no
 *  doors, no port; the runs remote exposes the lanes over its
 *  seat. runs/flows/assets/manage/discovery land as named Typert
 *  services in later rebuild strokes — never as a second app,
 *  never as fetch routes). The queue takes no row config: its
 *  state root is MELITE_STATE_ROOT else <cwd>/data/runs — the
 *  same resolution the dead gateway shell used. */
const rows: readonly Plugin[] = [
  modelsProvider,
  comfyuiHost,
  storageHub,
  storageJsonBackend,
  storageDomainFacility,
  draftsPlugin,
  queuePlugin,
  // The card registry (REBUILD-9: the primed defs + facts + the
  // compose pipeline — the {model:} arms' engine) then the runs
  // registry + its Typert remote: the estate process serves the
  // runs lanes itself (start/status/stop/list/validate, both the
  // inline and the card door). The registry gates on the queue +
  // drafts + cards seats — mount order is load order here.
  cardRegistryProvider,
  runsRegistryPlugin,
  runsRemotePlugin,
];

export const name = "melite-estate";

export function apply(ctx: Context): void {
  for (const row of rows) {
    if (row === storageJsonBackend) {
      ctx.plugin(row, { root: resolveStorageRoot() });
      continue;
    }
    if (row === storageDomainFacility) {
      ctx.plugin(row, { backend: "json" });
      continue;
    }
    ctx.plugin(row);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
