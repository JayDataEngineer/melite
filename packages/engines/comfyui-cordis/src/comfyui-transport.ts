// comfyui-transport.ts — the @stable-canvas/comfyui-client seat.
// The SDK owns the wire (fetch, ws, endpoints, error voices); the
// estate owns only its own laws (deadlines, stop, verdicts). The
// hand-rolled node:http primitive and its pinned cadences and
// error texts are deleted with it (2026-09-18).

import { Client } from "@stable-canvas/comfyui-client";
import { ComfyError } from "./comfyui-types.ts";

/** One engine client over a resolved server URL. Create, call,
 *  drop — the SDK owns connection state; nothing is cached here. */
export function sdkClient(server: string): Client {
  const url: URL = new URL(server);
  return new Client({
    api_host: url.host,
    api_base: url.pathname.replace(/\/+$/, ""),
    ssl: url.protocol === "https:",
  });
}

/** The live node-definitions doc (/object_info) via the SDK,
 *  cached per server for the process life: the doc is ~3.5MB (one
 *  fetch per engine per boot) and a node set only changes on
 *  extension install — which needs an engine restart anyway, i.e.
 *  a new process. The frozen in-repo snapshot is deleted; this is
 *  the only spelling of engine truth. LOUD on an unreachable
 *  engine (QUEUE LANE LAW: no defaults, no silent empty).
 *
 *  The premise "a restart means a new process" is FALSE for the
 *  long-lived harness seat: the engine reboots under systemd while
 *  this process stays. invalidateObjectInfo() is the explicit
 *  refresh — the restart and lora doors call it after the events
 *  that change the node set (a reboot, a copied file), and so do
 *  the estate's acquisition doors after a weight landing under a
 *  living process (managePlane hProvisionModel / hDownloadModel /
 *  the acquire_weight poll), so the next read re-fetches instead
 *  of serving the pre-landing doc. */
const oiCache = new Map<string, Record<string, unknown>>();
const oiDrops = new Map<string, number>();
/** Re-fetch ceiling for a fetch that keeps losing drop races. The
 *  ceiling bounds the await (a pathological invalidator can never
 *  livelock a census); past it the latest doc is served UNCACHED —
 *  a doc that may predate a drop never enters the cache. */
const OI_REFETCH_CEIL = 5;
/** oiDrops is bounded: a host with churningly many ephemeral test
 *  servers must not grow it forever. Evicting the oldest entry can
 *  only reset a counter to 0, which reads as a drop to any fetch
 *  that saw a higher count — the safe direction (one extra fetch,
 *  never a stale cache). */
const OI_DROPS_MAX = 64;

export async function liveObjectInfo(server: string): Promise<Record<string, unknown>> {
  const hit: Record<string, unknown> | undefined = oiCache.get(server);
  if (hit !== undefined) return hit;
  for (let attempt = 0; ; attempt++) {
    const dropsBefore = oiDrops.get(server) ?? 0;
    const doc: unknown = await sdkClient(server).getNodeDefs();
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new ComfyError(
        "GET /object_info returned a non-object body — refusing closed",
      );
    }
    const rec: Record<string, unknown> = doc as Record<string, unknown>;
    const dropped = (oiDrops.get(server) ?? 0) !== dropsBefore;
    if (!dropped) {
      oiCache.set(server, rec);
      return rec;
    }
    if (attempt >= OI_REFETCH_CEIL) {
      // The drop keeps racing the fetch; serve the latest body but
      // leave the cache empty so the next census re-fetches.
      return rec;
    }
    // An invalidation ran while this fetch was in flight — the doc
    // predates the drop, and caching it would resurrect the stale
    // node set the drop exists to bury. Re-fetch (bounded above).
  }
}

/** Drop the cached node-definitions doc for one server. The next
 *  liveObjectInfo(server) re-fetches; a fetch already in flight
 *  discards its result instead of re-poisoning the cache.
 *  @param server — the engine base url whose cache entry dies. */
export function invalidateObjectInfo(server: string): void {
  oiCache.delete(server);
  oiDrops.set(server, (oiDrops.get(server) ?? 0) + 1);
  if (oiDrops.size > OI_DROPS_MAX) {
    const oldest = oiDrops.keys().next();
    if (!oldest.done && oldest.value !== server) oiDrops.delete(oldest.value);
  }
}
