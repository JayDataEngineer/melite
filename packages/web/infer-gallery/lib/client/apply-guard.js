/**
 * apply-guard — THIS PLUGIN'S single-mount claim. The guard itself is
 * one implementation in @melite/contracts (createApplyGuard); this
 * module exists so the gallery's claim is its OWN module instance (a
 * shared boolean would make the gallery's apply refuse the deck's).
 */
import { createApplyGuard } from '@melite/contracts/applyGuard';
const guard = createApplyGuard('melite-plugin/dsh-gallery');
export function claimGalleryApply() {
    return guard.claim();
}
export function releaseGalleryApply() {
    guard.release();
}
//# sourceMappingURL=apply-guard.js.map
