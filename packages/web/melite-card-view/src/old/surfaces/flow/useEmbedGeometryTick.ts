// useEmbedGeometryTick — bump a counter whenever THIS document's viewport
// geometry changes (embed-only companion to the card zoom).
//
// WHY IT EXISTS (2026-08-22, "the zoom out lands in the wrong spot" verdict):
// in the DSH chat embed the toolview PROMOTES the whole iframe to
// fixed/100vw×100vh while the card zoom overlay is open (zoomPromotion.ts)
// and demotes it after. The promotion RESIZES this document's viewport,
// which reflows every tile — WITHOUT any React render. framer-motion's
// shared-element projections only re-measure on render, so the zoomed box's
// stack kept the PRE-promotion tile rects and the close morph shrank toward
// where the card WAS, not where it IS. A state bump here re-renders the
// surface down to the tiles (none of the layers are memoized), framer
// re-measures every projection node, and the morph always targets the live
// rect. The returned number is meaningless — the RE-RENDER is the product.
import { useEffect, useState } from "react"

export function useEmbedGeometryTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    // The root element's box IS the iframe viewport: observing it catches
    // the promotion/demotion resize (and any host-driven frame resize).
    const ro = new ResizeObserver(bump)
    ro.observe(document.documentElement)
    // Window resize covers non-embed hosts if this hook is ever reused.
    window.addEventListener("resize", bump)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", bump)
    }
  }, [])
  return tick
}
