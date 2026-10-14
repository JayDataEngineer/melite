import { Client } from "@stable-canvas/comfyui-client";
/** One engine client over a resolved server URL. Create, call,
 *  drop — the SDK owns connection state; nothing is cached here. */
export declare function sdkClient(server: string): Client;
/** Race one wire call against a hard bound: whichever fires
 *  first, the other arm is released (the settle-once guard). There
 *  is no wire-level cancel primitive for an in-flight SDK call —
 *  the loser keeps running to its natural end; the bound releases
 *  the CALLER, which is the fuse's job (the oiFuse law, shared:
 *  audits P-E1/E2/E5/E7 — supervisor probe, stop-path interrupt,
 *  submit, model unload all rode unbounded SDK calls). */
export declare function withBound<T>(work: () => Promise<T>, boundMs: number, voice: string): Promise<T>;
export declare function liveObjectInfo(server: string, signal?: AbortSignal, boundMs?: number): Promise<Record<string, unknown>>;
/** Drop the cached node-definitions doc for one server. The next
 *  liveObjectInfo(server) re-fetches; a fetch already in flight
 *  discards its result instead of re-poisoning the cache.
 *  @param server — the engine base url whose cache entry dies. */
export declare function invalidateObjectInfo(server: string): void;
