export type ManagerClientErrorCode = "invalid-request" | "cancelled" | "request-timeout" | "http-refused" | "invalid-response" | "request-too-large" | "response-too-large" | "transport" | "queue-timeout";
export interface ManagerClientErrorOptions {
    readonly status?: number;
    readonly method?: string;
    readonly path?: string;
    readonly detail?: string;
    readonly cause?: unknown;
}
export declare class ManagerClientError extends Error {
    readonly code: ManagerClientErrorCode;
    readonly status: number | undefined;
    readonly method: string | undefined;
    readonly path: string | undefined;
    readonly detail: string;
    constructor(code: ManagerClientErrorCode, message: string, options?: ManagerClientErrorOptions);
}
export interface ComfyUiManagerClientOptions {
    readonly baseUrl: string;
    readonly fetch?: typeof globalThis.fetch;
    readonly requestTimeoutMs?: number;
    readonly queueTimeoutMs?: number;
    readonly pollIntervalMs?: number;
    readonly maxRequestBytes?: number;
    readonly maxResponseBytes?: number;
}
export interface ManagerRequestOptions {
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly bodyFormat?: "json" | "text";
}
export interface ManagerQueueStatus {
    readonly totalCount: number;
    readonly doneCount: number;
    readonly inProgressCount: number;
    readonly isProcessing: boolean;
}
export interface ManagerQueueWaitOptions extends ManagerRequestOptions {
    readonly timeoutMs?: number;
    readonly pollIntervalMs?: number;
}
export declare class ComfyUiManagerHttpClient {
    readonly baseUrl: string;
    readonly requestTimeoutMs: number;
    readonly queueTimeoutMs: number;
    readonly pollIntervalMs: number;
    readonly maxRequestBytes: number;
    readonly maxResponseBytes: number;
    private readonly fetcher;
    constructor(options: ComfyUiManagerClientOptions);
    get(path: string, options?: ManagerRequestOptions): Promise<unknown>;
    post(path: string, body: unknown, options?: ManagerRequestOptions): Promise<unknown>;
    postText(path: string, body: string, options?: ManagerRequestOptions): Promise<unknown>;
    getJson<T = unknown>(path: string, options?: ManagerRequestOptions): Promise<T>;
    postJson<T = unknown>(path: string, body: unknown, options?: ManagerRequestOptions): Promise<T>;
    waitForQueue(options?: ManagerQueueWaitOptions): Promise<ManagerQueueStatus>;
    private request;
}
export declare const ManagerHttpClient: typeof ComfyUiManagerHttpClient;
//# sourceMappingURL=manager-client.d.ts.map
