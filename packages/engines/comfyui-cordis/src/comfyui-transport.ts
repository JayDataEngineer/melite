// comfyui-transport.ts — the node:http primitive (urllib parity: status + parsed-or-bytes).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { request as httpRequest } from "node:http";
import type { EngineJson } from "./comfyui-types.ts";

// ── node:http primitive (urllib parity: status + parsed-or-bytes) ──

export interface HttpResult {
  readonly status: number;
  readonly body: EngineJson | Buffer;
}

/** One HTTP request -> {status, parsed-json-or-bytes}. Mirrors
 *  native._http (90-106): HTTP errors resolve (never reject) with
 *  the error body's bytes parsed the same way; transport failures
 *  reject (py: URLError propagates). */
export function httpCall(
  method: string,
  url: string,
  body: Uint8Array | null = null,
  contentType: string = "application/json",
  timeoutMs: number = 30000,
): Promise<HttpResult> {
  return new Promise<HttpResult>((resolveP, rejectP) => {
    const req = httpRequest(
      url,
      {
        method,
        headers:
          body !== null
            ? {
                "content-type": contentType,
                "content-length": String(body.length),
              }
            : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer): void => {
          chunks.push(c);
        });
        res.on("end", (): void => {
          const raw: Buffer = Buffer.concat(chunks);
          // statusCode is always set on a client response — the
          // read casts (the ?? 0 toll is an uncoverable arm, never
          // a runtime path; 2026-09-12).
          const status: number = res.statusCode as number;
          let parsed: EngineJson | Buffer;
          try {
            const text: string = raw.toString("utf8");
            parsed = (text === "" ? null : JSON.parse(text)) as EngineJson;
          } catch {
            parsed = raw;
          }
          resolveP({ status, body: parsed });
        });
      },
    );
    req.on("error", (exc: Error): void => {
      rejectP(exc);
    });
    req.setTimeout(timeoutMs, (): void => {
      req.destroy(new Error("request timed out after " + timeoutMs + "ms"));
    });
    if (body !== null) req.write(body);
    req.end();
  });
}
