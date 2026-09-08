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

/**
 * Sidebar service captured at apply() time (the apply ctx carries the live
 * registry). Lets panel components reach matchFileViewer without depending
 * on the tab-component prop contract.
 */
interface SidebarService {
  matchFileViewer?(path: string, head?: unknown): unknown
}

let sidebarService: SidebarService | null = null

export function setSidebarService(bs: SidebarService | null | undefined): void {
  if (bs != null && typeof bs.matchFileViewer === 'function') sidebarService = bs
}

export function getSidebarService(): SidebarService | null {
  return sidebarService
}

/**
 * Cards-studio seam (CARD REPLAY DOOR contract, provider:
 * melite-card-deck deck-sidebar-entry.tsx — sets
 * `window[DECK_OPEN_WITH_DRAFT] = (draftId: string) => boolean` at deck
 * entry mount, deletes it on dispose). The ONLY definition site of the
 * seam name repo-wide: every consumer imports this const (never a
 * restated literal) and fails LOUDLY via setError when the seam is
 * absent (deck plugin not loaded). Pinned by test_media_sidebar.py.
 */
export const DECK_OPEN_WITH_DRAFT = '__meliteDeckOpenWithDraft'

export function openWithDraft(draftId: string): 'ok' | 'no-seam' | 'refused' {
  const open = (window as unknown as Record<string, unknown>)[DECK_OPEN_WITH_DRAFT]
  if (typeof open !== 'function') return 'no-seam'
  return (open as (id: string) => boolean)(draftId) ? 'ok' : 'refused'
}
