// panelSlide — the shared sidebar slide animation.
//
// The card system animates via framer-motion (FlowCard.tsx — AnimatePresence
// + motion + layoutId). This module applies the SAME library to the editor's
// side panels so they slide in/out instead of magically appearing.
//
// WIDTH-BASED ANIMATION (2026-08-10): the prior x-transform slides caused a
// TELEPORT — the motion.div (shrink-0) entered/exited the flex layout
// instantly (flex recalculated the moment it mounted), while the x-transform
// only moved the panel visually. Result: the center content JUMPED to its new
// the center shouldn't teleport into the new spot, but also slide as well."
//
// The fix: animate `width` from 0 to "auto" instead of `x` from ±100% to 0.
// Framer-motion measures the "auto" target (the panel's natural content width)
// and animates width smoothly. The flex parent recalculates on every frame,
// so the center content SLIDES in lockstep with the panel. `overflow-hidden`
// on the motion.div clips the panel content during the transition. The panel
// content stays at its natural width via `w-max` on RightPanel/LeftPanel (or
// `shrink-0` on drawer components) — it gets CLIPPED, not squished.
//
// Direction (left vs right) is determined by FLEX POSITION, not the animation:
// a left drawer is the first flex child (anchored left, grows rightward); a
// right rail is the last flex child (anchored right, grows leftward). Both
// use the SAME width variant.
//
// Surfaces using this:
// 1. LEFT drawer (WorkspaceLayout — AppSidebar): AnimatePresence +
// motion.div + collapseWidth.
// 2. Library right rail (LibraryTab): same, collapseWidth.
// 3. ThreePaneLayout / TwoPaneLayout (WorkspaceShell): both rails.
// 4. The settings pane chrome (RightPanelHost rails): same.
//
// The transition matches the card tile-pop ease (cubic-bezier .22,.61,.36,1)
// — fast start, soft settle, the same feel as the rest of the app's motion.
import type { Transition } from "framer-motion"

export const PANEL_SLIDE: Transition = {
 duration: 0.22,
 ease: [0.22, 0.61, 0.36, 1],
}

/**
 * Width-based collapse — the layout-friendly slide. Animates `width` from 0
 * to "auto" (framer-motion measures the natural width). REQUIRES
 * `overflow-hidden` on the motion.div and either `w-max` on the panel content
 * (RightPanel/LeftPanel base class) or `shrink-0` on drawer components, so
 * the content stays at its natural width during the transition (CLIPPED, not
 * squished).
 *
 * Used for BOTH left and right panels — the visual direction comes from the
 * flex position, not the animation.
 */
export const collapseWidth = {
 initial: { width: 0 },
 animate: { width: "auto" },
 exit: { width: 0 },
} as const

/**
 * Legacy aliases — kept so the 6 existing import sites don't all need their
 * import lines changed in the same edit. Both map to collapseWidth now
 * (direction is flex-position-based, not transform-based). New code should
 * import collapseWidth directly.
 */
export const slideFromLeft = collapseWidth
export const slideFromRight = collapseWidth
