/**
 * (E7, KF-A(2), keyframes-audio journey audit — plan row 85) THE
 * REOPEN-REFIT PRODUCT SEAT: refitKeyframePinImage (refUtils.ts — the
 * reopen/refit seam) carried wall arms but no product caller, so a
 * persisted off-aspect pin (a pre-fit doc, a name commit, a legacy
 * spelling) re-rendered unfitted forever. This hook seats the seam in
 * the studio: whenever the doc's pins or the film's target size land,
 * every non-empty pin rides the refit once; pins whose refit differs
 * are written back in ONE updateKeyframes.
 */
import { useEffect, useRef } from "react"
import type { DocKeyframe } from "./docModel.ts"
import { refitKeyframePinImage } from "./refUtils.ts"

/** Re-fit every persisted keyframe pin image through the refit seam
 *  and commit the differing pins back to the doc.
 *  @param keyframes the doc's pins (the effect re-runs when this
 *  array's identity changes).
 *  @param byName the artifact index's name → servable url map (bare
 *  artifact names resolve through it; unchanged identity skips no
 *  pass — the seam itself is cheap on already-fitted pins).
 *  @param tw the film's target width (undefined rides the 1344
 *  default the pin-commit seam uses).
 *  @param th the film's target height (undefined rides the 768
 *  default).
 *  @param updateKeyframes the doc writer the commit lands through. */
export function useReopenRefit(
  keyframes: DocKeyframe[],
  byName: Map<string, string>,
  tw: number | undefined,
  th: number | undefined,
  updateKeyframes: (next: DocKeyframe[]) => void,
): void {
  // The write base read AFTER the decodes: a gesture (a pick, a drag)
  // may land while refits run, and the commit must judge the doc's
  // CURRENT pins, not the array this pass started from.
  const latest = useRef({ keyframes, byName, updateKeyframes })
  latest.current = { keyframes, byName, updateKeyframes }

  useEffect(() => {
    let live = true
    void (async () => {
      const pins = keyframes.filter((k) => k.image !== "")
      const refits = await Promise.all(
        pins.map((k) => refitKeyframePinImage(k.image, byName, tw ?? 1344, th ?? 768)),
      )
      if (!live) return
      const changed = new Map<number, string>()
      for (let i = 0; i < pins.length; i++) {
        const refit = refits[i]
        if (refit !== undefined && refit !== pins[i].image) changed.set(pins[i].frame, refit)
      }
      if (changed.size === 0) return
      // Re-judge against the doc's current pins before writing: a
      // pin healed during the decodes keeps its value, and an empty
      // diff writes nothing.
      const now = latest.current.keyframes
      if (!now.some((pin) => changed.get(pin.frame) !== undefined && changed.get(pin.frame) !== pin.image)) return
      // ONE commit; the healed pin refits verbatim on the next pass,
      // so the write does not loop.
      latest.current.updateKeyframes(
        now.map((pin) => {
          const refit = changed.get(pin.frame)
          return refit !== undefined && refit !== pin.image ? { ...pin, image: refit } : pin
        }),
      )
    })()
    return () => {
      live = false
    }
  }, [keyframes, tw, th, byName])
}
