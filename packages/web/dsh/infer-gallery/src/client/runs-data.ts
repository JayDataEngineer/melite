/**
 * Gallery data access: one same-origin fetch of the host-half runs proxy.
 * Every failure becomes a rendered state — never a throw into the slot tree.
 */
export interface RunArtifact {
  url?: string
  type?: string
  size?: number
}

/** One row of the gateway runs list (only the fields the view reads). */
export interface RunRecord {
  run_id?: string
  name?: string
  status?: string
  flow?: string
  created_at?: number
  prompt?: string
  thumbnail?: string
  artifacts?: RunArtifact[]
  families?: string[]
  params?: Record<string, unknown>
  completed?: number
  total?: number
}

export type RunsState =
  | { phase: 'loading' }
  | { phase: 'ready'; runs: RunRecord[] }
  | { phase: 'error'; status: number; body: string }

/**
 * Fetch the runs list through the same-origin proxy.
 * @param fetchImpl - injectable fetch (tests pass a pointed impl; production uses global).
 */
export async function fetchRuns(fetchImpl: typeof fetch = fetch): Promise<RunsState> {
  let response: Response
  try {
    response = await fetchImpl('/infer-gallery/runs')
  } catch (error) {
    return { phase: 'error', status: 0, body: String(error instanceof Error ? error.message : error) }
  }
  const body = await response.text()
  if (!response.ok) return { phase: 'error', status: response.status, body }
  try {
    const payload = JSON.parse(body) as { runs?: RunRecord[] }
    return { phase: 'ready', runs: Array.isArray(payload.runs) ? payload.runs : [] }
  } catch {
    return { phase: 'error', status: response.status, body }
  }
}