/**
 * Apply guard: a duplicated client injection (module factory executed twice in
 * one page lifetime) would otherwise register a second sidebar entry and
 * overlay. First application wins; later calls become no-ops. The claim is
 * released when the owning fiber unloads, so a rebuilt bundle can claim again.
 */
let claimed = false

export function claimGalleryApply(): boolean {
  if (claimed) return false
  claimed = true
  return true
}

export function releaseGalleryApply(): void {
  claimed = false
}