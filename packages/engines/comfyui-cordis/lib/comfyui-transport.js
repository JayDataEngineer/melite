// comfyui-transport.ts — the @stable-canvas/comfyui-client seat.
// The SDK owns the wire (fetch, ws, endpoints, error voices); the
// estate owns only its own laws (deadlines, stop, verdicts). The
// hand-rolled node:http primitive and its pinned cadences and
// error texts are deleted with it (2026-09-18).
import { Client } from "@stable-canvas/comfyui-client";
import { ComfyError } from "./comfyui-types.js";
/** One engine client over a resolved server URL. Create, call,
 *  drop — the SDK owns connection state; nothing is cached here. */
export function sdkClient(server) {
    const url = new URL(server);
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
const oiCache = new Map();
const oiDrops = new Map();
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
/** oiCache is bounded too (the I-E5 fuse, 2026-10-22): the doc is
 *  ~3.5MB, so a long-lived seat fanned across many server urls is
 *  an unbounded heap. Map insertion order IS the recency order — a
 *  hit re-inserts, the eviction drops the least-recently-used
 *  entry (its next read re-fetches, never serves a dead doc). */
const OI_CACHE_MAX = 8;
/** Race the SDK call (whose getNodeDefs takes no signal) against
 *  the caller's abort and an optional deadline: whichever fires
 *  first rejects, and the loser's timer/listener is released. The
 *  SDK fetch itself keeps running to its own natural end — there
 *  is no wire-level cancel primitive to reach — but the caller is
 *  released either way, which is the fuse's job. */
function oiFuse(work, signal, boundMs) {
    if (signal === undefined && boundMs === undefined)
        return work();
    return new Promise((resolve, reject) => {
        let failed = false;
        const settle = (err, value) => {
            if (failed)
                return;
            failed = true;
            if (timer !== undefined)
                clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
            if (err !== null)
                reject(err);
            else
                resolve(value);
        };
        const timer = boundMs === undefined
            ? undefined
            : setTimeout(() => {
                settle(new ComfyError("GET /object_info did not answer within its deadline — refusing closed", "deadline"));
            }, boundMs);
        const onAbort = () => {
            settle(signal?.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted", "AbortError"));
        };
        if (signal?.aborted === true) {
            onAbort();
            return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        work().then((value) => settle(null, value), (err) => settle(err));
    });
}
/** Race one wire call against a hard bound: whichever fires
 *  first, the other arm is released (the settle-once guard). There
 *  is no wire-level cancel primitive for an in-flight SDK call —
 *  the loser keeps running to its natural end; the bound releases
 *  the CALLER, which is the fuse's job (the oiFuse law, shared:
 *  audits P-E1/E2/E5/E7 — supervisor probe, stop-path interrupt,
 *  submit, model unload all rode unbounded SDK calls). */
export function withBound(work, boundMs, voice) {
    return new Promise((resolve, reject) => {
        let failed = false;
        const settle = (err, value) => {
            if (failed)
                return;
            failed = true;
            clearTimeout(timer);
            if (err !== null)
                reject(err);
            else
                resolve(value);
        };
        const timer = setTimeout(() => {
            settle(new ComfyError(voice + " did not answer within its bound (" + String(boundMs) + "ms) — refusing closed"));
        }, boundMs);
        work().then((value) => settle(null, value), (err) => settle(err));
    });
}
function oiCacheSet(server, rec) {
    oiCache.delete(server); // refresh recency before the eviction read
    oiCache.set(server, rec);
    if (oiCache.size > OI_CACHE_MAX) {
        const oldest = oiCache.keys().next();
        if (!oldest.done && oldest.value !== server)
            oiCache.delete(oldest.value);
    }
}
/** One in-flight miss per server (audit M-S3): concurrent first
 *  readers JOIN the starter's flight instead of stampedeing the
 *  engine with K x ~3.5MB fetches. The starter deletes the entry
 *  when its flight settles; a joiner that arrives before the
 *  settle rides the same doc (the flight carries its starter's
 *  signal — the census/boot callers share one). */
const oiInFlight = new Map();
export async function liveObjectInfo(server, signal, boundMs) {
    if (signal?.aborted === true)
        throw signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted", "AbortError");
    const hit = oiCache.get(server);
    if (hit !== undefined) {
        oiCacheSet(server, hit); // a hit is a use — refresh its recency
        return hit;
    }
    const joined = oiInFlight.get(server);
    if (joined !== undefined)
        return joined;
    const flight = (async () => {
        for (let attempt = 0;; attempt++) {
            const dropsBefore = oiDrops.get(server) ?? 0;
            const doc = await oiFuse(() => sdkClient(server).getNodeDefs(), signal, boundMs);
            if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
                throw new ComfyError("GET /object_info returned a non-object body — refusing closed");
            }
            const rec = doc;
            const dropped = (oiDrops.get(server) ?? 0) !== dropsBefore;
            if (!dropped) {
                oiCacheSet(server, rec);
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
    })();
    oiInFlight.set(server, flight);
    try {
        return await flight;
    }
    finally {
        oiInFlight.delete(server);
    }
}
/** Drop the cached node-definitions doc for one server. The next
 *  liveObjectInfo(server) re-fetches; a fetch already in flight
 *  discards its result instead of re-poisoning the cache.
 *  @param server — the engine base url whose cache entry dies. */
export function invalidateObjectInfo(server) {
    oiCache.delete(server);
    oiDrops.set(server, (oiDrops.get(server) ?? 0) + 1);
    if (oiDrops.size > OI_DROPS_MAX) {
        const oldest = oiDrops.keys().next();
        if (!oldest.done && oldest.value !== server)
            oiDrops.delete(oldest.value);
    }
}
//# sourceMappingURL=comfyui-transport.js.map
