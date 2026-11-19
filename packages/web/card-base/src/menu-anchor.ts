/** menu-anchor.ts — the version-tolerant anchor seam for
 *  owner-detached DSH Menus: a Menu whose trigger lives elsewhere in
 *  the tree (the input square, the add tile) and is opened from an
 *  event, so the Menu cannot render the trigger itself.
 *
 *  THREE kernel contracts this seam spans (the 2026-11-18 popup burn
 *  and the 2026-11-19 rc.5 pin wave):
 *  - the repo pin (jsdom walls, local dev): portal placement reads
 *    `getAnchorRect()` — the captured rect measured at pick time.
 *  - the newer kernel: the rect prop is gone; a portaled list
 *    CSS-anchors (`position-anchor`) to the element held in
 *    `anchorRef.current`, which the kernel stamps inline with
 *    `anchor-name` while open.
 *  - the rc.5 kernel: a defined-but-null `anchorRef` never positions
 *    (the external-anchor effect reads `current`, finds null, and the
 *    list stays suppressed — `positioned` is false forever). A
 *    detached menu with NO live element must instead hand the kernel
 *    `anchorPoint` (client coordinates): the kernel parks a 0×0
 *    fixed point there, self-stamps its `anchor-name`, and the
 *    portaled list anchors to that.
 *
 *  The seam passes the contract the pick actually has: a live
 *  element (read at render time — the ref is written BEFORE the open
 *  state flips) rides `anchorRef`; a detached default rect rides
 *  `anchorPoint` derived from the captured rect. `anchor: null`
 *  (the anchor ReactNode the pinned type requires) and
 *  `getAnchorRect` (the pinned kernel's placement) always ride too —
 *  each contract ignores the keys it does not know. */

import type { RefObject } from 'react'

/** Props handoff for one owner-detached Menu render.
 *  @param anchorRef - holds the picked trigger element; written by
 *  the owner's pick handler before opening (null when the pick was
 *  event-detached with no element).
 *  @param rect - the rect captured from that element at pick time.
 *  @returns the anchor subset to spread into the Menu props
 *  alongside `open: true, portal: true`. */
export function menuAnchorProps(
  anchorRef: RefObject<HTMLElement | null>,
  rect: DOMRect,
): {
  anchor: null
  anchorRef?: RefObject<HTMLElement | null>
  anchorPoint?: { readonly x: number; readonly y: number }
  getAnchorRect: () => DOMRect
} {
  const live = anchorRef.current instanceof HTMLElement && anchorRef.current.isConnected
  return {
    anchor: null,
    ...(live
      ? { anchorRef }
      // the list opens BELOW the captured box (side 'bottom'): the
      // point sits at its lower-left corner, the rect's own anchor edge
      : { anchorPoint: { x: rect.left, y: rect.bottom } }),
    getAnchorRect: () => rect,
  }
}
