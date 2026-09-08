/**
 * apply-guard — single-mount claim (module singleton). A duplicated client
 * injection would mount a second sidebar entry + overlay; the claim makes
 * the second apply a logged no-op.
 */
let claimed = false

export function claimDeckApply(): boolean {
  if (claimed) {
    console.warn('[ray-card-deck] apply called twice — second mount skipped')
    return false
  }
  claimed = true
  return true
}

export function releaseDeckApply(): void {
  claimed = false
}
