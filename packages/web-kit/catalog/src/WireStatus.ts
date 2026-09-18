// WireStatus.ts — THE WIRE ADOPTION P3 client seam (ledger, operator
// decision 2026-09-10): run-status probes over the DSH Connection
// transport frame protocol.
//
// WHY A DIRECT CALLER (not @deepseek-ai/dsh-client-connection/client):
// the store package's client export is a DSH WEB-KERNEL artifact — its
// lib/client.js opens with `window.__ModuleLoader__.load({...})` and
// only executes inside the hosted runtime's module system (row 4's
// dual-boot boundary). A standalone page cannot import it as ESM. The
// wire frame protocol itself is small, documented (api-gateway.md),
// and pinned from BOTH sides in this repo: the server half by the
// runs-remote wall (tests/walls/ts/suites/runs-remote.spec.ts — the
// adapter whose parameter name IS the wire field). The editor-side
// client half died with the editor package, so the wall pins it solo.
// This is the ledger's clause-(b) shape (DSH principle, handrolled seam). The hosted boot can later swap in the
// kernel's own caller at this seam without touching consumers.
//
// FALLBACK LAW: the transport is an ADDITION, never a hard dep. A
// host without the runs remote (or a dev mock without /api) answers
// 404/refused — probeRunStatus resolves null and the consumer says
// nothing, changes nothing. The wire only WINS when the channel
// actually answers.
//
// WIRE FIELD TRUTH (2026-09-10 fix): the wire argument is the
// adapter's PARAMETER NAME, verbatim — runs/status names it `runId`.
// This probe once sent `run_id` (fetch-era snake_case muscle memory)
// and NEVER won: every probe fell back to null, silently. The wall's
// parameter-name pin is the contract; the arg key below matches it.

/** Wire probe result: the wire row shape, or null when the channel is
 * absent (consumers fall back to fetch-era semantics). */
export interface WireRunStatus {
  readonly known: boolean;
  readonly status: string | null;
}

/** Correlation id for one client-request frame (the reference caller
 * uses a random uuid per call; crypto.randomUUID is the browser
 * standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto;
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID();
  return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

/** Validate a server-response envelope body and narrow the wire row.
 * Returns null for ANY surprise (wrong shape, id mismatch, non-ok
 * result) — a probe must never throw its caller into a broken state. */
function readWireRow(body: unknown, sentRpcId: string): WireRunStatus | null {
  if (typeof body !== "object" || body === null) return null;
  if (Reflect.get(body, "type") !== "server-response") return null;
  if (Reflect.get(body, "rpcId") !== sentRpcId) return null;
  const result: unknown = Reflect.get(body, "result");
  if (typeof result !== "object" || result === null) return null;
  if (Reflect.get(result, "ok") !== true) return null;
  const value: unknown = Reflect.get(result, "value");
  if (typeof value !== "object" || value === null) return null;
  const known: unknown = Reflect.get(value, "known");
  const status: unknown = Reflect.get(value, "status");
  if (typeof known !== "boolean") return null;
  if (status !== null && typeof status !== "string") return null;
  return { known, status: status as string | null };
}

/** Phantom-reconciliation verdict for one probed run.
 * - `live`: the gateway still holds the run as running/queued —
 *   server-side truth that beats the reload-phantom pending flip.
 * - `gone`: unknown run, or a terminal status — the pending flip stands.
 * - `unknown`: the channel didn't answer (fallback law) or the row was
 *   contract-surprising — say nothing, change nothing. */
export type PhantomVerdict = "live" | "gone" | "unknown"

/** Pure mapping from a probe row to the phantom verdict (no I/O —
 * fully unit-testable). The live set is exactly the statuses a reload
 * can strand mid-flight: running/queued. known:true with a null or
 * foreign status is contract-surprising → unknown, never a claim. */
export function reconcilePhantomRun(row: WireRunStatus | null): PhantomVerdict {
  if (row === null) return "unknown"
  if (!row.known) return "gone"
  if (row.status === "running" || row.status === "queued") return "live"
  if (row.status === null) return "unknown"
  return "gone"
}

/** Probe `runs/status` over the Connection transport (same-origin
 * POST /api/runs/status, the frame pair the wall pins).
 *
 * Resolves null — NEVER throws — when the transport is unavailable
 * (no /api route, network refusal, malformed envelope). AbortSignal
 * propagates for caller cancellation. */
export async function probeRunStatus(
  runId: string,
  signal?: AbortSignal,
): Promise<WireRunStatus | null> {
  const rpcId = nextRpcId();
  try {
    const response = await fetch("/api/runs/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "client-request",
        rpcId,
        method: "runs/status",
        payload: { args: { runId } },
      }),
      ...(signal === undefined ? {} : { signal }),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return readWireRow(body, rpcId);
  } catch {
    return null;
  }
}
