// gateway.ts — the gateway wiring viewer claims share.
//
// REAL DOORS ONLY (the estate-queue doors):
//   GET /v1/flows/runs/{run_id} → {run_id, status, stages,
//        skipped_stages, artifacts: string[], error, queue_position}
//   GET /v1/assets/runs/{run}/{rel} → bytes (Range-capable)
// ASSET_URL_PREFIX is "/v1/assets/runs" and the status body's
// artifacts are REL paths — the asset URL composes prefix/run/rel
// exactly as the doors' own per-stage url/gallery does.
//
// This leaf is framework-free (fetch only) so both halves consume it:
// the host half proxies it, the client half fetches the proxy.

/** The runs-door status body, named-explicitly (never the whole row). */
export interface RunStatusBody {
  run_id: string
  status: string
  /** Relative artifact paths; compose with assetUrl(). */
  artifacts: readonly string[]
  error: string
  queue_position: number
}

/** A non-JSON or non-2xx status response (the run door's own 404
 * carries {error: "unknown run_id"} — surfaced as .named when parseable). */
export class RunDoorError extends Error {
  readonly status: number
  readonly named: string
  constructor(status: number, named: string) {
    super(`run door ${status}${named !== '' ? `: ${named}` : ''}`)
    this.status = status
    this.named = named
  }
}

/** The runs status door path, spelled once. */
export function runStatusPath(runId: string): string {
  return `/v1/flows/runs/${encodeURIComponent(runId)}`
}

/** The asset door URL for one run artifact (rel path from the status body). */
export function assetUrl(gateway: string, runId: string, rel: string): string {
  const base = gateway.replace(/\/+$/, '')
  return `${base}/v1/assets/runs/${encodeURIComponent(runId)}/${rel
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

/** Fetch one run's status body. Throws RunDoorError on non-2xx. */
export async function fetchRunStatus(
  gateway: string,
  runId: string,
  signal?: AbortSignal,
): Promise<RunStatusBody> {
  const res = await fetch(gateway.replace(/\/+$/, '') + runStatusPath(runId), {
    signal,
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    let named = ''
    try {
      named = String((JSON.parse(await res.text()) as { error?: unknown }).error ?? '')
    } catch { /* non-JSON body rides empty */ }
    throw new RunDoorError(res.status, named)
  }
  return (await res.json()) as RunStatusBody
}
