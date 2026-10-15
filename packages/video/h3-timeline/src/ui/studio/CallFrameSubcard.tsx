/**
 * CallFrameSubcard — SeamControls only (the call's seam law: how
 * this call joins the previous one — cut re-feeds the previous
 * VIDEO tail; extend chains the previous LATENT).
 *
 * (2026-11-05) FirstFrameSlot and GuideSlot are DEAD — keyframe
 * pins own anchors, the timeline's own lanes own conditioning, and
 * the SourceRow grammar owns every pick/upload law the slots
 * carried (square-grammar + call-card specs seat those walls).
 */
import { useState } from "react"
import { Input, Switch } from "@deepseek-ai/dsh-client-ui-primitives"
import { SpecAtom } from "@melite/card-base/client"
import { cn } from '@melite/card-base/client'
import s from "./studio.module.css"
import { studioCopy } from "./studioCopy.ts"

/** The call's seam law — carried vs cut (rule 3b). Renders under the
 *  image bus (the seam is the CALL'S join, not a bundle slot).
 *  (2026-09-20: the seam is AUTOMATIC — the drift-control continuation
 *  carries every non-cut join at the director's proven 22-frame
 *  overlap with the soft AV audio release; the seconds picker died
 *  with the MotionContext seam. The one authorable fact left is
 *  whether the join carries at all.) */
export function SeamControls({
  callIndex,
  transition,
  onTransition,
}: {
  callIndex: number
  transition?: "extend" | "cut"
  onTransition?: (t: "extend" | "cut") => void
}) {
  return (
    <>
      {onTransition !== undefined && (
        <div
          className={s.seamRow}
          title={studioCopy.seamHelp}
        >
          <span className={s.seamLabel}>{studioCopy.seamWord}</span>
          <SpecAtom
            f={{
              name: "seam_mode", label: studioCopy.seamModeLabel(callIndex), type: "select",
              options: [
                { value: "extend", label: studioCopy.seamCarried },
                { value: "cut", label: studioCopy.seamCut },
              ],
            }}
            value={transition === "cut" ? "cut" : "extend"}
            onEdit={(_, v) => onTransition?.(v === "extend" ? "extend" : "cut")}
          />
        </div>
      )}
    </>
  )
}
