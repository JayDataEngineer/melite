/** Checkbox — the kit's boolean primitive. The native checkbox is
 *  already the right device (check glyph, screen readers, forms, mobile
 *  touch targets); the kit's job is to own the LOOK (brand accent, the
 *  sizing scale, the focus ring) so tenants never hand-roll one.
 *  Registry: registry:ui. */
import * as React from "react"

import { cn } from "./utils"

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "size-3.5 shrink-0 cursor-pointer accent-brand outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Checkbox }
