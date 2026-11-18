/** menu-anchor.ts — the version-tolerant anchor seam for
 *  owner-detached DSH Menus: a Menu whose trigger lives elsewhere in
 *  the tree (the input square, the add tile) and is opened from an
 *  event, so the Menu cannot render the trigger itself.
 *
 *  TWO kernel contracts this seam spans (the 2026-11-18 popup burn:
 *  the harness restart served a newer dsh-client-ui-primitives to
 *  plugin bundles at runtime, and the popup fell to the bottom of
 *  the card):
 *  - the repo pin (jsdom walls, local dev): portal placement reads
 *    `getAnchorRect()` — the captured rect measured at pick time.
 *  - the newer kernel: the rect prop is gone; the portaled list
 *    CSS-anchors (`position-anchor`) to the element held in
 *    `anchorRef.current`, which the kernel stamps inline with
 *    `anchor-name` while open. With neither, the list anchors to
 *    the Menu's own empty wrapper span — rendered in the form's
 *    flow, i.e. the bottom of the card. That was the burn.
 *
 *  The seam passes ALL THREE: the live element (new kernels), the
 *  captured rect (pinned kernels), and `anchor: null` (the anchor
 *  ReactNode the pinned type requires, unused by a detached menu).
 *  Each contract ignores the keys it does not know.
 *
 *  The ref is the component's own `useRef`, written at pick time —
 *  BEFORE the open state flips, so the kernel's open effect never
 *  reads a null anchor and suppresses the list. */
import type { RefObject } from 'react';
/** Props handoff for one owner-detached Menu render.
 *  @param anchorRef - holds the picked trigger element; written by
 *  the owner's pick handler before opening.
 *  @param rect - the rect captured from that element at pick time.
 *  @returns the anchor subset to spread into the Menu props
 *  alongside `open: true, portal: true`. */
export declare function menuAnchorProps(anchorRef: RefObject<HTMLElement | null>, rect: DOMRect): {
    anchor: null;
    anchorRef: RefObject<HTMLElement | null>;
    getAnchorRect: () => DOMRect;
};
//# sourceMappingURL=menu-anchor.d.ts.map