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
  discloseProvider,
  manageProvider,
  runsRegistryPlugin,
  skillProvider,
  loadProvider,
} from "@melite/estate-queue";
import { manageRemotePlugin } from "@melite/estate-manage";
import { runsRemotePlugin } from "@melite/estate-runs";
// The runs media route (the /v1/assets face's DSH-native
// replacement): run artifacts served same-origin from the queue
// seat's own runs tree.
import mediaPlugin from "@melite/estate-media";
// The models provisions route (the /v1/models face's DSH-native
// replacement): family DECL provision files served same-origin
// from the booted models table + the weights mount — no remotes,
// no proxies (the 2026-09-12 motion-skin 502).
import modelsPlugin from "@melite/estate-models";

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
  // The disclosure seat (REBUILD-14): discover over both planes,
  // derived live — gates on the card registry seat (its inject).
  discloseProvider,
  // The management seat (REBUILD-15): the ComfyUI-Manager plane —
  // gates on the timer seat (the rail's timeouts).
  manageProvider,
  // The manage remote (the browser tab's plane): the Typert
  // namespace `manage` over the seat above.
  manageRemotePlugin,
  // The skills seat (REBUILD-16): the index + read over the
  // doc-tree walks — gates on the queue seat (the ledger seam).
  skillProvider,
  // The load seat (REBUILD-17): Melite load opens ONE card or
  // flow — the bundle (agents md + signature + skill lines).
  loadProvider,
  runsRegistryPlugin,
  runsRemotePlugin,
  // The media route last: it probes the queue seat at the use site
  // (optional-dependency law), so order carries no meaning — it just
  // reads well after the estate rows it serves.
  mediaPlugin,
  // The provisions route after it: it boots the models table itself
  // (bootModels' singleton, the card registry's own boot), so order
  // carries no meaning either.
  modelsPlugin,
];

export const name = "melite-estate";

/** The estate's config face (stroke 45c): repoRoot PINS the runs
 *  state tree — the queue seat refuses unpinned boots (a cwd-guessed
 *  root silently serves an empty runs tree; the profile patch names
 *  the repo). */
export interface Config {
  repoRoot?: string;
}

export function apply(ctx: Context, config: Config = {}): void {
  for (const row of rows) {
    // the queue row receives the pin (its QueueConfig.repoRoot)
    if (row === queuePlugin) {
      ctx.plugin(row, { repoRoot: config.repoRoot });
      continue;
    }
    ctx.plugin(row);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
