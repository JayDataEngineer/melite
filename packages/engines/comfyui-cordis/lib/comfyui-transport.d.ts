import { Client } from "@stable-canvas/comfyui-client";
/** One engine client over a resolved server URL. Create, call,
 *  drop — the SDK owns connection state; nothing is cached here. */
export declare function sdkClient(server: string): Client;
export declare function liveObjectInfo(server: string): Promise<Record<string, unknown>>;
/** Drop the cached node-definitions doc for one server. The next
 *  liveObjectInfo(server) re-fetches. @param server — the engine
 *  base url whose cache entry dies. */
export declare function invalidateObjectInfo(server: string): void;
//# sourceMappingURL=comfyui-transport.d.ts.map
