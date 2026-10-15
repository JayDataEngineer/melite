/**
 * RailBackButton — the submenu law's exit door, ONE spelling
 * (Sahar-conformance R2, 2026-11-06: the button was triplicated
 * byte-identical inside this package — component.tsx's audio
 * submenu + CallCardsPanel's kf subview and call submenu — safe
 * only by view mutual exclusion). Every submenu carries its back
 * to global at the top (operator 2026-11-06, order b); the rail
 * owns the verb, each door owns its onClick.
 */
import { Button, IconChevronLeftOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives"
import { Tip } from "@melite/card-base/client"
import type { MouseEvent } from "react"
import s from "./studio.module.css"
import { studioCopy } from "./studioCopy"

/** The one back-to-global door: ghost chevron + the global verb,
 * tip explains the click-away shortcut (the bar's empty spot). */
export function RailBackButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <Tip tip={studioCopy.backToGlobalTip}>
      <Button variant="ghost"
        onClick={(e: MouseEvent) => { e.stopPropagation(); onClick() }}
        aria-label={studioCopy.backToGlobal}
        data-testid="tl-back-to-global"
        className={s.backBtn}
      >
        <IconChevronLeftOutlineRegular className={s.sz12} /> {studioCopy.globalAction}
      </Button>
    </Tip>
  )
}
