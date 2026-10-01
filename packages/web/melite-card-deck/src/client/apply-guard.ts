/**
 * apply-guard — THIS PLUGIN'S single-mount claim. The guard itself is
 * one implementation in @melite/contracts (createApplyGuard); this
 * module exists so the deck's claim is its OWN module instance (a
 * shared boolean would make the deck's apply refuse the gallery's).
 */
import { createApplyGuard } from '@melite/contracts/applyGuard'

const guard = createApplyGuard('melite-card-deck', { warnOnRefusal: true })

export function claimDeckApply(): boolean {
  return guard.claim()
}

export function releaseDeckApply(): void {
  guard.release()
}
