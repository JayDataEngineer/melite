import type { EstateDoorUrl } from "./generated/gatewayDoors.ts";
/** A URL outside the door table (another service or a same-host row
 * door like /melite-tools/*). Constructible ONLY via externalUrl()
 * — never spell one inline at a fetch call site. */
declare const externalBrand: unique symbol;
export type ExternalUrl = string & {
    readonly [externalBrand]: true;
};
/** The named escape for non-table URLs. Every use is deliberate and
 * greppable. */
export declare function externalUrl(u: `/${string}` | `http${string}` | `data:${string}`): ExternalUrl;
/** Everything apiFetch/apiJson may fetch. */
export type FetchUrl = EstateDoorUrl | ExternalUrl;
export type BackendState = 'online' | 'degraded' | 'offline';
export declare function getBackendState(): BackendState;
/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
export declare function onBackendState(cb: (s: BackendState) => void): () => void;
/**
 * Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
 * global liveness signal. Throws only on persistent network failure (after
 * MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
 * status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
 */
export declare function apiFetch(input: FetchUrl, init?: RequestInit): Promise<Response>;
/**
 * Convenience for JSON endpoints. Throws an Error on non-2xx (message
 * includes status + body excerpt) so callers can use try/catch directly.
 */
export declare function apiJson<T = unknown>(input: FetchUrl, init?: RequestInit): Promise<T>;
export {};
//# sourceMappingURL=api.d.ts.map