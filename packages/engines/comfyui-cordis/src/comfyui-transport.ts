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
 *  engine (QUEUE LANE LAW: no defaults, no silent empty). */
const oiCache = new Map<string, Record<string, unknown>>();

export async function liveObjectInfo(server: string): Promise<Record<string, unknown>> {
  const hit: Record<string, unknown> | undefined = oiCache.get(server);
  if (hit !== undefined) return hit;
  const doc: unknown = await sdkClient(server).getNodeDefs();
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new ComfyError(
      "GET /object_info returned a non-object body — refusing closed",
    );
  }
  const rec: Record<string, unknown> = doc as Record<string, unknown>;
  oiCache.set(server, rec);
  return rec;
}
