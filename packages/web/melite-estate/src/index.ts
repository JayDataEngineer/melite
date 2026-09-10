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
//
// Erasable-syntax TS only: no enums, `import type` for types, bare
// package specifiers only.

import type { Context } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";

import modelsProvider from "@melite/comfyui-cordis/catalog-registry";
import comfyuiHost from "@melite/comfyui-cordis/comfyui-host";
// The drafts service only — the storage PROVIDERS (hub, json
// backend, domain form) belong to the composition site: dsh-base
// mounts them in profiles (bundle/base/cordis.patch.yml's
// storage/storage-json/storage-domain rows — "it belongs to the
// shared base"), the boot rigs mount them in tests. A consumer
// row never re-provides a base-owned seat
// (storage-domain/README.md: consumers "never touch a backend").
import draftsPlugin from "@melite/estate-drafts";
import queuePlugin, {
  cardRegistryProvider,
  runsRegistryPlugin,
} from "@melite/estate-queue";
import { runsRemotePlugin } from "@melite/estate-runs";

/** The estate composition: the engine tier, the drafts service,
 *  the serial run queue, and the runs plane (REBUILD-5/9). A
 *  CONSUMER row, never a provider: the storage stack (hub +
 *  backend + the domain form) belongs to the composition site —
 *  dsh-base owns it in profiles (dshHomePath storages); wall and
 *  probe boots mount it themselves. The queue takes no row
 *  config: its state root is MELITE_STATE_ROOT else <cwd>/data/runs. */
const rows: readonly Plugin[] = [
  modelsProvider,
  comfyuiHost,
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
    ctx.plugin(row);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
