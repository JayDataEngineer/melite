import { deadline, timeoutOf } from "@deepseek-ai/dsh-timeout";

export type ManagerClientErrorCode =
  | "invalid-request"
  | "cancelled"
  | "request-timeout"
  | "http-refused"
  | "invalid-response"
  | "request-too-large"
  | "response-too-large"
  | "transport"
  | "queue-timeout";

export interface ManagerClientErrorOptions {
  readonly status?: number;
  readonly method?: string;
  readonly path?: string;
  readonly detail?: string;
  readonly cause?: unknown;
}

export class ManagerClientError extends Error {
  readonly code: ManagerClientErrorCode;
  readonly status: number | undefined;
  readonly method: string | undefined;
  readonly path: string | undefined;
  readonly detail: string;

  constructor(
    code: ManagerClientErrorCode,
    message: string,
    options: ManagerClientErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ManagerClientError";
    this.code = code;
    this.status = options.status;
    this.method = options.method;
    this.path = options.path;
    this.detail = options.detail ?? message;
  }
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

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_QUEUE_TIMEOUT_MS = 300_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_MAX_REQUEST_BYTES = 256 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected <= 0) {
    throw new ManagerClientError("invalid-request", `${name} must be a positive integer`);
  }
  return selected;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedBaseUrl(value: string): { readonly href: string } {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error: unknown) {
    throw new ManagerClientError("invalid-request", "ComfyUI-Manager base URL is invalid", { cause: error });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ManagerClientError("invalid-request", "ComfyUI-Manager base URL must use HTTP or HTTPS");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new ManagerClientError("invalid-request", "ComfyUI-Manager base URL must not contain credentials");
  }
  const href = value.trim().replace(/\/+$/u, "");
  return { href };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function signalAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

async function readBoundedText(
  response: Response,
  maximumBytes: number,
  method: string,
  path: string,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > maximumBytes) {
      throw new ManagerClientError(
        "response-too-large",
        `ComfyUI-Manager response exceeds ${String(maximumBytes)} bytes`,
        { method, path, detail: `content-length: ${declaredLength}` },
      );
    }
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ManagerClientError(
          "response-too-large",
          `ComfyUI-Manager response exceeds ${String(maximumBytes)} bytes`,
          { method, path, detail: `read more than ${String(maximumBytes)} bytes` },
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
}

function parseBody(text: string, contentType: string | null, method: string, path: string): unknown {
  if (text.trim() === "") return null;
  const expectsJson = contentType?.toLowerCase().includes("json") === true;
  try {
    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    if (expectsJson || /^[\[{]/u.test(text.trim())) {
      throw new ManagerClientError(
        "invalid-response",
        "ComfyUI-Manager returned malformed JSON",
        { method, path, detail: errorMessage(error), cause: error },
      );
    }
    return text;
  }
}

function queueCount(status: Record<string, unknown>, key: string, path: string): number {
  const value = status[key];
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ManagerClientError(
      "invalid-response",
      `ComfyUI-Manager queue status has an invalid ${key}`,
      { method: "GET", path, detail: `${key}: ${String(value)}` },
    );
  }
  return value as number;
}

function parseQueueStatus(value: unknown, path: string): ManagerQueueStatus {
  if (!record(value) || typeof value["is_processing"] !== "boolean") {
    throw new ManagerClientError(
      "invalid-response",
      "ComfyUI-Manager queue status has an invalid shape",
      { method: "GET", path },
    );
  }
  const totalCount = queueCount(value, "total_count", path);
  const doneCount = queueCount(value, "done_count", path);
  const inProgressCount = queueCount(value, "in_progress_count", path);
  if (doneCount > totalCount || inProgressCount > totalCount) {
    throw new ManagerClientError(
      "invalid-response",
      "ComfyUI-Manager queue status has inconsistent counts",
      { method: "GET", path, detail: JSON.stringify({ totalCount, doneCount, inProgressCount }) },
    );
  }
  return {
    totalCount,
    doneCount,
    inProgressCount,
    isProcessing: value["is_processing"],
  };
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) {
    return Promise.reject(new ManagerClientError("cancelled", "ComfyUI-Manager wait was cancelled"));
  }
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    }, milliseconds);
    const onAbort = (): void => {
      clearTimeout(timer);
      rejectPromise(new ManagerClientError("cancelled", "ComfyUI-Manager wait was cancelled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export class ComfyUiManagerHttpClient {
  readonly baseUrl: string;
  readonly requestTimeoutMs: number;
  readonly queueTimeoutMs: number;
  readonly pollIntervalMs: number;
  readonly maxRequestBytes: number;
  readonly maxResponseBytes: number;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: ComfyUiManagerClientOptions) {
    const base = normalizedBaseUrl(options.baseUrl);
    this.baseUrl = base.href;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.requestTimeoutMs = positiveInteger(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, "requestTimeoutMs");
    this.queueTimeoutMs = positiveInteger(options.queueTimeoutMs, DEFAULT_QUEUE_TIMEOUT_MS, "queueTimeoutMs");
    this.pollIntervalMs = positiveInteger(options.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS, "pollIntervalMs");
    this.maxRequestBytes = positiveInteger(options.maxRequestBytes, DEFAULT_MAX_REQUEST_BYTES, "maxRequestBytes");
    this.maxResponseBytes = positiveInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES, "maxResponseBytes");
  }

  async get(path: string, options: ManagerRequestOptions = {}): Promise<unknown> {
    return await this.request("GET", path, undefined, options);
  }

  async post(path: string, body: unknown, options: ManagerRequestOptions = {}): Promise<unknown> {
    return await this.request("POST", path, body, options);
  }

  async postText(path: string, body: string, options: ManagerRequestOptions = {}): Promise<unknown> {
    return await this.request("POST", path, body, { ...options, bodyFormat: "text" });
  }

  async getJson<T = unknown>(path: string, options: ManagerRequestOptions = {}): Promise<T> {
    const value = await this.get(path, options);
    if (value === null || typeof value !== "object") {
      throw new ManagerClientError(
        "invalid-response",
        "ComfyUI-Manager endpoint did not return a JSON value",
        { method: "GET", path, detail: typeof value },
      );
    }
    return value as T;
  }

  async postJson<T = unknown>(path: string, body: unknown, options: ManagerRequestOptions = {}): Promise<T> {
    const value = await this.post(path, body, options);
    if (value === null || typeof value !== "object") {
      throw new ManagerClientError(
        "invalid-response",
        "ComfyUI-Manager endpoint did not return a JSON value",
        { method: "POST", path, detail: typeof value },
      );
    }
    return value as T;
  }

  async waitForQueue(options: ManagerQueueWaitOptions = {}): Promise<ManagerQueueStatus> {
    const timeoutMs = positiveInteger(options.timeoutMs, this.queueTimeoutMs, "queue timeoutMs");
    const pollIntervalMs = positiveInteger(options.pollIntervalMs, this.pollIntervalMs, "queue pollIntervalMs");
    const deadline = Date.now() + timeoutMs;
    const path = "/manager/queue/status";
    for (;;) {
      if (Date.now() >= deadline) {
        throw new ManagerClientError(
          "queue-timeout",
          `ComfyUI-Manager queue did not drain within ${String(timeoutMs)} ms`,
          { method: "GET", path },
        );
      }
      let value: unknown;
      try {
        value = await this.getJson(path, {
          ...(options.signal === undefined ? {} : { signal: options.signal }),
          timeoutMs: Math.min(options.timeoutMs ?? this.requestTimeoutMs, Math.max(1, deadline - Date.now())),
        });
      } catch (error: unknown) {
        if (error instanceof ManagerClientError && error.code === "request-timeout") {
          throw new ManagerClientError(
            "queue-timeout",
            `ComfyUI-Manager queue did not drain within ${String(timeoutMs)} ms`,
            { method: "GET", path, cause: error },
          );
        }
        throw error;
      }
      const status = parseQueueStatus(value, path);
      if (Date.now() > deadline) {
        throw new ManagerClientError(
          "queue-timeout",
          `ComfyUI-Manager queue did not drain within ${String(timeoutMs)} ms`,
          { method: "GET", path },
        );
      }
      if (!status.isProcessing && status.inProgressCount === 0 && status.totalCount === status.doneCount) {
        return status;
      }
      await sleep(Math.min(pollIntervalMs, Math.max(1, deadline - Date.now())), options.signal);
    }
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body: unknown,
    options: ManagerRequestOptions,
  ): Promise<unknown> {
    if (!path.startsWith("/")) {
      throw new ManagerClientError("invalid-request", "ComfyUI-Manager request path must be absolute", {
        method,
        path,
      });
    }
    const url = new URL(`${this.baseUrl}${path}`);
    let encodedBody: string | undefined;
    if (body !== undefined) {
      if (options.bodyFormat === "text") {
        if (typeof body !== "string") {
          throw new ManagerClientError("invalid-request", "ComfyUI-Manager text body must be a string", { method, path });
        }
        encodedBody = body;
      } else {
        try {
          encodedBody = JSON.stringify(body);
        } catch (error: unknown) {
          throw new ManagerClientError("invalid-request", "ComfyUI-Manager request body is not JSON serializable", {
            method,
            path,
            cause: error,
          });
        }
        if (encodedBody === undefined) {
          throw new ManagerClientError("invalid-request", "ComfyUI-Manager request body is not JSON serializable", {
            method,
            path,
          });
        }
      }
      const bytes = new TextEncoder().encode(encodedBody).byteLength;
      if (bytes > this.maxRequestBytes) {
        throw new ManagerClientError(
          "request-too-large",
          `ComfyUI-Manager request exceeds ${String(this.maxRequestBytes)} bytes`,
          { method, path, detail: `request bytes: ${String(bytes)}` },
        );
      }
    }
    if (signalAborted(options.signal)) {
      throw new ManagerClientError("cancelled", "ComfyUI-Manager request was cancelled", { method, path });
    }
    const timeoutMs = positiveInteger(options.timeoutMs, this.requestTimeoutMs, "request timeoutMs");
    // The fuse is dsh-timeout's deadline (AbortSignal.any + a TimeoutReason
    // the classification below reads back); the cancelled/timeout/transport
    // voices are ours.
    const dl = deadline(options.signal, timeoutMs, "COMFY_MANAGER_REQUEST");
    try {
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method,
          headers: encodedBody === undefined ? undefined : { "content-type": options.bodyFormat === "text" ? "text/plain" : "application/json" },
          body: encodedBody,
          signal: dl.signal,
        });
      } catch (error: unknown) {
        if (signalAborted(options.signal)) {
          throw new ManagerClientError("cancelled", "ComfyUI-Manager request was cancelled", {
            method,
            path,
            cause: error,
          });
        }
        if (timeoutOf(dl.signal, "COMFY_MANAGER_REQUEST")) {
          throw new ManagerClientError(
            "request-timeout",
            `ComfyUI-Manager request exceeded ${String(timeoutMs)} ms`,
            { method, path, cause: error },
          );
        }
        throw new ManagerClientError(
          "transport",
          `ComfyUI-Manager request failed: ${errorMessage(error)}`,
          { method, path, cause: error },
        );
      }
      const text = await readBoundedText(response, this.maxResponseBytes, method, path);
      if (response.status < 200 || response.status >= 300) {
        throw new ManagerClientError(
          "http-refused",
          `ComfyUI-Manager refused ${method} ${path} with HTTP ${String(response.status)}`,
          { status: response.status, method, path, detail: text.slice(0, 2_000) },
        );
      }
      return parseBody(text, response.headers.get("content-type"), method, path);
    } catch (error: unknown) {
      if (error instanceof ManagerClientError) throw error;
      if (signalAborted(options.signal)) {
        throw new ManagerClientError("cancelled", "ComfyUI-Manager request was cancelled", {
          method,
          path,
          cause: error,
        });
      }
      if (timeoutOf(dl.signal, "COMFY_MANAGER_REQUEST")) {
        throw new ManagerClientError(
          "request-timeout",
          `ComfyUI-Manager request exceeded ${String(timeoutMs)} ms`,
          { method, path, cause: error },
        );
      }
      throw new ManagerClientError(
        "transport",
        `ComfyUI-Manager response failed: ${errorMessage(error)}`,
        { method, path, cause: error },
      );
    } finally {
      dl[Symbol.dispose]();
    }
  }
}

export const ManagerHttpClient = ComfyUiManagerHttpClient;
