import type { ManagerInstallRequest, ManagerInstallResult, ManagerModelInstallRequest, ManagerModelInstallResult, ManagerPort } from "./ports.ts";
import { ComfyUiManagerHttpClient, ManagerClientError, type ManagerQueueWaitOptions } from "./manager-client.ts";
export type ManagerProviderErrorCode = "invalid-request" | "pin-mismatch" | "model-unregistered" | "model-metadata" | "head-mismatch" | "ref-unverifiable";
export declare class ManagerProviderError extends Error {
    readonly code: ManagerProviderErrorCode;
    constructor(code: ManagerProviderErrorCode, message: string, cause?: unknown);
}
export interface ComfyUiManagerProviderOptions {
    readonly queue?: ManagerQueueWaitOptions;
}
/** THE GIT-URL INSTALL BUDGET. Manager's /customnode/install/git_url
 *  route is SYNCHRONOUS — it clones, checks out the commit, and runs the
 *  pack's pip leg inside the request (manager_server.py:1557-1584 →
 *  manager_core.py:2360-2368). The client's default request timeout
 *  cannot cover that: a cold pack blew the fuse before this was
 *  measured. The CLI uses 900 s; the estate matches it. */
export declare const EXTENSION_INSTALL_TIMEOUT_MS = 900000;
/** Conservative floor rate for declared model downloads: the queue
 *  budget grants at least this many bytes per second of wall time
 *  (residential HF pulls measure ~3 MiB/s; 1 MiB/s leaves slack). */
export declare const MODEL_QUEUE_BYTES_PER_SEC = 1048576;
/** Hard ceiling on a single model install's queue-drain wait — a
 *  dead queue must still surface within an operator's shift. */
export declare const MODEL_QUEUE_MAX_TIMEOUT_MS = 14400000;
/**
 * Queue-drain budget for a model install: the default (extension-
 * sized) floor, raised by the declared artifact size at the floor
 * rate, clamped to the ceiling.
 *
 * @param sizeBytes declared artifact size in bytes, when known
 * @param defaultMs the wait budget used when no size is declared
 * @returns the per-install queue-drain timeout in milliseconds
 */
export declare function modelQueueTimeoutMs(sizeBytes: number | undefined, defaultMs: number): number;
export declare function postManagerPip(client: ComfyUiManagerHttpClient, requirements: readonly string[], signal?: AbortSignal): Promise<void>;
export declare class ComfyUiManagerProvider implements ManagerPort {
    readonly client: ComfyUiManagerHttpClient;
    private readonly queue;
    constructor(client: ComfyUiManagerHttpClient, options?: ComfyUiManagerProviderOptions);
    canInstall(request: ManagerInstallRequest, signal?: AbortSignal): Promise<boolean>;
    /** The landed commit for a declared pack, or null when Manager
     *  reports no such pack. Matched by repo identity, never by the
     *  installed directory name (Manager derives that from the url). */
    private landedVer;
    install(request: ManagerInstallRequest, signal?: AbortSignal): Promise<ManagerInstallResult>;
    installModel(request: ManagerModelInstallRequest, signal?: AbortSignal): Promise<ManagerModelInstallResult>;
    private resolveRegistryRow;
}
export declare class ManagerProvider extends ComfyUiManagerProvider {
}
export declare function isManagerProviderError(error: unknown): error is ManagerProviderError;
export declare function isManagerClientError(error: unknown): error is ManagerClientError;
//# sourceMappingURL=manager-provider.d.ts.map