/**
 * Single-mount claim. The client bundle can be evaluated more than once per
 * page load (HMR, tab re-mount, duplicate injection); without a claim the
 * sidebar would register the same tab twice. Acquired once per bundle
 * lifetime and released from the apply effect cleanup.
 */
const CLAIM_KEY = '__infer_media_applied__'

export function claimMediaApply(): boolean {
  const w = globalThis as Record<string, unknown>
  const prev = w[CLAIM_KEY] as { v?: string } | undefined
  if (prev !== undefined && prev.v === '1') return false
  w[CLAIM_KEY] = { v: '1' }
  return true
}

export function releaseMediaApply(): void {
  const w = globalThis as Record<string, unknown>
  delete w[CLAIM_KEY]
}

