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
 *  that change the node set (a reboot, a copied file), so the
 *  next read re-fetches instead of serving the pre-restart doc. */
const oiCache = new Map();
export async function liveObjectInfo(server) {
    const hit = oiCache.get(server);
    if (hit !== undefined)
        return hit;
    const doc = await sdkClient(server).getNodeDefs();
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
        throw new ComfyError("GET /object_info returned a non-object body — refusing closed");
    }
    const rec = doc;
    oiCache.set(server, rec);
    return rec;
}
/** Drop the cached node-definitions doc for one server. The next
 *  liveObjectInfo(server) re-fetches. @param server — the engine
 *  base url whose cache entry dies. */
export function invalidateObjectInfo(server) {
    oiCache.delete(server);
}
//# sourceMappingURL=comfyui-transport.js.map